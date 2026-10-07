import { FeatureFlag, FLAG_DEFAULTS } from '../models/FeatureFlag.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { serviceUnavailable } from '../lib/errors.js';

/*
 * Feature flags are read on nearly every write request, so they are cached in
 * process for a few seconds rather than hitting MongoDB each time. The window
 * is short enough that flipping a switch in the dashboard takes effect while
 * the operator is still watching.
 *
 * On a database error the cached (or default) value is used: a flag lookup
 * failing must not take down form submissions, which is the exact outage this
 * mechanism exists to manage.
 */
const TTL_MS = 5_000;
let cache = { values: null, expiresAt: 0 };

function defaults() {
  const values = Object.fromEntries(
    Object.entries(FLAG_DEFAULTS).map(([key, config]) => [key, config.value]),
  );
  // The env var is the boot-time default for maintenance mode; the database
  // row, once written, wins.
  if (env.MAINTENANCE_MODE) values.maintenance_mode = true;
  return values;
}

export async function getFlags({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache.values && cache.expiresAt > now) return cache.values;

  try {
    const rows = await FeatureFlag.find({}).lean();
    const values = { ...defaults() };
    for (const row of rows) values[row.key] = row.value;
    cache = { values, expiresAt: now + TTL_MS };
    return values;
  } catch (error) {
    logger.error({ err: error }, 'feature flag read failed, using last known values');
    return cache.values ?? defaults();
  }
}

export async function isEnabled(key) {
  const flags = await getFlags();
  return flags[key] ?? FLAG_DEFAULTS[key]?.value ?? false;
}

export async function setFlag(key, value, { userId, message } = {}) {
  const update = { value, updatedBy: userId ?? null };
  if (message !== undefined) update.message = message;

  /* A field may not appear in both $set and $setOnInsert, so the default
   * message is only seeded when the caller did not supply one. */
  const onInsert = { key, description: FLAG_DEFAULTS[key]?.description };
  if (message === undefined) onInsert.message = FLAG_DEFAULTS[key]?.message;

  const row = await FeatureFlag.findOneAndUpdate(
    { key },
    { $set: update, $setOnInsert: onInsert },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  cache = { values: null, expiresAt: 0 };
  logger.warn({ key, value }, 'feature flag changed');
  return row;
}

/*
 * Guard used by public write routes. Throws a 503 carrying a message the
 * frontend can render, so a paused form tells the visitor what is happening
 * instead of appearing to work and dropping the data.
 */
export async function assertWritesAllowed(flagKey = 'submissions_enabled') {
  const flags = await getFlags();

  if (flags.maintenance_mode) {
    const row = await FeatureFlag.findOne({ key: 'maintenance_mode' }).lean().catch(() => null);
    throw serviceUnavailable(
      row?.message || FLAG_DEFAULTS.maintenance_mode.message,
      'MAINTENANCE_MODE',
    );
  }

  if (flags[flagKey] === false) {
    const row = await FeatureFlag.findOne({ key: flagKey }).lean().catch(() => null);
    throw serviceUnavailable(
      row?.message || FLAG_DEFAULTS[flagKey]?.message || 'This form is temporarily unavailable.',
      'FEATURE_DISABLED',
    );
  }
}

export function resetFlagCache() {
  cache = { values: null, expiresAt: 0 };
}

export async function listFlags() {
  const rows = await FeatureFlag.find({}).lean();
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return Object.entries(FLAG_DEFAULTS).map(([key, config]) => ({
    key,
    value: byKey.get(key)?.value ?? (key === 'maintenance_mode' ? env.MAINTENANCE_MODE : config.value),
    description: config.description,
    message: byKey.get(key)?.message ?? config.message,
    updatedAt: byKey.get(key)?.updatedAt ?? null,
    overridden: byKey.has(key),
  }));
}
