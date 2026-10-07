import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * Redis is used for three separate things (cache, rate limiting, BullMQ), and
 * BullMQ requires its own connection with `maxRetriesPerRequest: null`. So we
 * hand out named connections from here instead of sharing one client.
 *
 * When REDIS_URL is empty (local dev, tests) every getter returns null and the
 * callers degrade: cache misses, in-memory rate limits, inline job execution.
 * Production refuses to boot without it — see config/env.js.
 */
const clients = new Map();

function build(name, overrides = {}) {
  const client = new Redis(env.REDIS_URL, {
    keyPrefix: `${env.REDIS_KEY_PREFIX}:`,
    lazyConnect: false,
    enableReadyCheck: true,
    // Cap reconnection backoff so a long Redis outage does not turn into a
    // tight reconnect loop that starves the event loop.
    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
    ...overrides,
  });

  client.on('error', (error) => {
    // ioredis emits on every failed reconnect; log at warn so an outage is
    // visible without drowning the log at error level.
    logger.warn({ err: error, client: name }, 'redis error');
  });
  client.on('ready', () => logger.info({ client: name }, 'redis ready'));

  return client;
}

export function getRedis(name = 'default') {
  if (!env.redisEnabled) return null;
  if (!clients.has(name)) clients.set(name, build(name));
  return clients.get(name);
}

/* BullMQ needs blocking commands and its own retry semantics. */
export function getQueueConnection(name = 'queue') {
  if (!env.redisEnabled) return null;
  const key = `bull:${name}`;
  if (!clients.has(key)) {
    clients.set(
      key,
      build(key, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        // BullMQ manages its own key namespacing via queue prefix.
        keyPrefix: undefined,
      }),
    );
  }
  return clients.get(key);
}

export async function redisHealth() {
  if (!env.redisEnabled) return { ok: true, enabled: false };
  const client = getRedis();
  try {
    const started = Date.now();
    await client.ping();
    return { ok: true, enabled: true, latencyMs: Date.now() - started };
  } catch (error) {
    return { ok: false, enabled: true, error: error.message };
  }
}

export async function disconnectRedis() {
  await Promise.all(
    [...clients.values()].map((client) => client.quit().catch(() => client.disconnect())),
  );
  clients.clear();
}
