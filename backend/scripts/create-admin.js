#!/usr/bin/env node
/*
 * Creates (or promotes) an admin user.
 *
 *   npm run admin:create -- --email you@taifer.com --name "Your Name" --role super_admin
 *
 * Omit --password and a strong one is generated and printed once. The account is
 * flagged to require a password change on first sign-in, so the generated value
 * never stays in use.
 */
import crypto from 'node:crypto';
import { connectMongo, disconnectMongo } from '../src/db/mongoose.js';
import { AdminUser, ROLES } from '../src/models/AdminUser.js';

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return process.env[`ADMIN_${name.toUpperCase()}`] ?? fallback;
}

/* Avoids look-alike characters so the password can be read off a screen and
 * typed without ambiguity. */
function generatePassword(length = 20) {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_';
  const bytes = crypto.randomBytes(length);
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
}

async function main() {
  const email = arg('email');
  const name = arg('name');
  const role = arg('role', 'super_admin');
  const providedPassword = arg('password');

  if (!email || !name) {
    console.error('usage: npm run admin:create -- --email <email> --name <name> [--role super_admin|sales_agent] [--password <password>]');
    process.exit(1);
  }
  if (!ROLES.includes(role)) {
    console.error(`--role must be one of: ${ROLES.join(', ')}`);
    process.exit(1);
  }
  if (providedPassword && providedPassword.length < 12) {
    console.error('--password must be at least 12 characters');
    process.exit(1);
  }

  const password = providedPassword ?? generatePassword();

  await connectMongo();

  const existing = await AdminUser.findOne({ email: email.toLowerCase() });

  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.isActive = true;
    existing.passwordHash = await AdminUser.hashPassword(password);
    existing.mustChangePassword = !providedPassword;
    existing.failedLoginAttempts = 0;
    existing.lockedUntil = null;
    existing.tokenVersion += 1; // any existing session is invalidated
    await existing.save();
    console.log(`updated ${email} (role: ${role})`);
  } else {
    await AdminUser.create({
      name,
      email: email.toLowerCase(),
      role,
      passwordHash: await AdminUser.hashPassword(password),
      mustChangePassword: !providedPassword,
    });
    console.log(`created ${email} (role: ${role})`);
  }

  if (!providedPassword) {
    console.log(`\n  temporary password: ${password}`);
    console.log('  This is shown once. It must be changed at first sign-in.\n');
  }

  await disconnectMongo();
}

main().catch(async (error) => {
  console.error('failed:', error.message);
  await disconnectMongo().catch(() => {});
  process.exit(1);
});
