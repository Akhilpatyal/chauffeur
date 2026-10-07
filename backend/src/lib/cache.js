import { getRedis } from '../db/redis.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * Cache-aside helper for the public read endpoints.
 *
 * Two rules make this safe to sprinkle around:
 *   1. A Redis failure is never fatal — on any error we fall through to the
 *      loader, so a cache outage degrades latency, not availability.
 *   2. Keys are grouped by a tag (`journeys`, `hotels`, …) so an admin write
 *      can drop everything derived from that collection in one call, instead
 *      of waiting for TTLs to expire and serving stale content in between.
 */
const TAG_SET = (tag) => `tags:${tag}`;

export async function cacheGet(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(`cache:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn({ err: error, key }, 'cache read failed');
    return null;
  }
}

export async function cacheSet(key, value, { ttl = env.CACHE_TTL_SECONDS, tags = [] } = {}) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const pipeline = redis.pipeline();
    pipeline.set(`cache:${key}`, JSON.stringify(value), 'EX', ttl);
    for (const tag of tags) {
      pipeline.sadd(TAG_SET(tag), `cache:${key}`);
      // Tag sets outlive their members slightly; this keeps them from growing
      // forever if invalidation never runs.
      pipeline.expire(TAG_SET(tag), ttl * 4);
    }
    await pipeline.exec();
  } catch (error) {
    logger.warn({ err: error, key }, 'cache write failed');
  }
}

/*
 * Read-through wrapper. `loader` runs on a miss and its result is cached.
 * Null/undefined results are not cached, so a transient empty read cannot
 * pin an empty list in the cache for the full TTL.
 */
export async function cached(key, loader, options = {}) {
  const hit = await cacheGet(key);
  if (hit !== null) return hit;
  const value = await loader();
  if (value !== null && value !== undefined) await cacheSet(key, value, options);
  return value;
}

/* Called on every admin write. Invalidation is by tag, not by TTL. */
export async function invalidateTags(...tags) {
  const redis = getRedis();
  if (!redis || tags.length === 0) return 0;
  try {
    let removed = 0;
    for (const tag of tags.flat()) {
      const members = await redis.smembers(TAG_SET(tag));
      if (members.length > 0) {
        await redis.del(...members);
        removed += members.length;
      }
      await redis.del(TAG_SET(tag));
    }
    logger.debug({ tags, removed }, 'cache invalidated');
    return removed;
  } catch (error) {
    logger.warn({ err: error, tags }, 'cache invalidation failed');
    return 0;
  }
}

/* Deterministic key from a route name plus its query parameters. */
export function cacheKey(scope, params = {}) {
  const normalised = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join('|') : value}`)
    .join('&');
  return normalised ? `${scope}?${normalised}` : scope;
}
