import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/*
 * A single shared connection for the whole process. Mongoose pools sockets
 * internally, so every model, worker and script reuses this one call.
 *
 * `strictQuery` keeps a typo in a filter field from silently matching
 * everything, which is how a "delete these old rows" query becomes a very bad
 * afternoon.
 *
 * Note on sanitizeFilter: it is deliberately NOT enabled globally. It wraps any
 * object-valued filter in $eq, which breaks every legitimate operator the
 * server itself builds ({ createdAt: { $gte: cutoff } } becomes
 * { createdAt: { $eq: { $gte: cutoff } } }). Injection is instead blocked where
 * untrusted data enters: request bodies run through stripMongoOperators
 * (utils/sanitize.js) and every query parameter is coerced to a primitive or a
 * Date by its Zod schema, so no user-controlled object ever reaches a filter.
 */
mongoose.set('strictQuery', true);

let connectPromise = null;

export async function connectMongo(uri = env.MONGODB_URI) {
  if (connectPromise) return connectPromise;

  connectPromise = mongoose
    .connect(uri, {
      maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
      minPoolSize: env.MONGODB_MIN_POOL_SIZE,
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      retryWrites: true,
      // Reads are served by the primary by default; lead writes must never
      // land on a stale secondary, and the read-heavy paths go through Redis.
      autoIndex: !env.isProduction,
    })
    .then((connection) => {
      logger.info({ db: connection.connection.name }, 'mongodb connected');
      return connection;
    })
    .catch((error) => {
      connectPromise = null;
      throw error;
    });

  return connectPromise;
}

mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));
mongoose.connection.on('reconnected', () => logger.info('mongodb reconnected'));
mongoose.connection.on('error', (error) => logger.error({ err: error }, 'mongodb error'));

export function mongoHealth() {
  // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
  const state = mongoose.connection.readyState;
  return { ok: state === 1, state };
}

export async function disconnectMongo() {
  connectPromise = null;
  await mongoose.connection.close(false);
}

/*
 * In production indexes are built by `npm run seed` or a migration step rather
 * than on every boot, so that N app instances starting at once do not all race
 * to build the same index. This is called explicitly by those scripts.
 */
export async function syncIndexes() {
  const results = [];
  for (const model of Object.values(mongoose.models)) {
    await model.syncIndexes();
    results.push(model.modelName);
  }
  return results;
}

export { mongoose };
