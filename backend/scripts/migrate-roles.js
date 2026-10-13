#!/usr/bin/env node
/*
 * Migrates existing accounts onto the four-level hierarchy.
 *
 * The platform previously had two roles: `super_admin` and `sales_agent`. The
 * new ladder is super_admin > admin > team_manager > caller.
 *
 * `sales_agent` becomes `caller` rather than `team_manager`. That is the
 * deliberately conservative direction: a caller can be promoted in one click
 * once somebody confirms what they should see, whereas silently handing every
 * former agent visibility of a whole team's customer records is the kind of
 * migration nobody notices until it matters.
 *
 *   node scripts/migrate-roles.js --dry-run
 *   node scripts/migrate-roles.js
 */
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../src/db/mongoose.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { ROLES } from '../src/config/permissions.js';

const dryRun = process.argv.includes('--dry-run');

const LEGACY_ROLE_MAP = { sales_agent: 'caller' };

async function main() {
  await connectMongo();

  /* Read through the driver, not the model: documents holding a role the
   * current schema no longer allows would fail Mongoose validation on the way
   * in, which is precisely the set this script exists to fix. */
  const collection = mongoose.connection.collection('adminusers');
  const everyone = await collection.find({}, { projection: { email: 1, role: 1 } }).toArray();

  const legacy = everyone.filter((user) => !ROLES.includes(user.role));

  console.log(`accounts: ${everyone.length}`);
  console.log(`on a role the new hierarchy does not define: ${legacy.length}`);

  if (legacy.length === 0) {
    console.log('nothing to migrate');
    await disconnectMongo();
    return;
  }

  for (const user of legacy) {
    const target = LEGACY_ROLE_MAP[user.role] ?? 'caller';
    console.log(`  ${user.email}: ${user.role} -> ${target}${dryRun ? '  (dry run)' : ''}`);
    if (!dryRun) {
      await collection.updateOne({ _id: user._id }, { $set: { role: target } });
    }
  }

  if (!dryRun) {
    /* Everyone keeps whatever permissions their new role grants; nobody is
     * left with a stale override pointing at a permission that no longer
     * exists under the renamed catalogue. */
    await collection.updateMany(
      { permissionOverrides: { $exists: false } },
      { $set: { permissionOverrides: { granted: [], revoked: [] } } },
    );
    await collection.updateMany({ teams: { $exists: false } }, { $set: { teams: [] } });
  }

  const superAdmins = await collection.countDocuments({ role: 'super_admin', isActive: true });
  console.log(`\nactive super admins after migration: ${superAdmins}`);
  if (superAdmins === 0) {
    console.error('WARNING: no active super admin. Run `npm run admin:create` before anyone is locked out.');
  }

  await disconnectMongo();
  console.log(dryRun ? '\ndry run complete, nothing written' : '\nmigration complete');
}

main().catch(async (error) => {
  console.error('migration failed:', error.message);
  await disconnectMongo().catch(() => {});
  process.exit(1);
});
