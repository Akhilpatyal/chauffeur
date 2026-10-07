#!/usr/bin/env node
/*
 * Runs the retention policy by hand.
 *
 * The worker runs this nightly; this entrypoint exists for the first run (when
 * the backlog can be large) and for verifying the effect before enabling it:
 *
 *   node scripts/run-retention.js --dry-run
 */
import { connectMongo, disconnectMongo } from '../src/db/mongoose.js';
import { runRetention } from '../src/services/retention.js';
import { env } from '../src/config/env.js';

const dryRun = process.argv.includes('--dry-run');

await connectMongo();

console.log(
  `retention: leads older than ${env.LEAD_RETENTION_DAYS} days, ` +
    `unconfirmed subscribers older than ${env.NEWSLETTER_UNCONFIRMED_RETENTION_DAYS} days` +
    (dryRun ? ' (dry run)' : ''),
);

const summary = await runRetention({ dryRun });
console.log(summary);

await disconnectMongo();
