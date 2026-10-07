import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { buildApp } from '../../src/app.js';
import { connectMongo, disconnectMongo } from '../../src/db/mongoose.js';
import { setInlineHandler } from '../../src/lib/queue.js';
import { processNotificationJob } from '../../src/services/notifications.js';
import { resetFlagCache } from '../../src/services/flags.js';
import { AdminUser } from '../../src/models/AdminUser.js';

/*
 * Each test file gets its own in-memory MongoDB and its own app instance, so
 * files cannot leak state into each other and can run in any order.
 *
 * Jobs run inline (no Redis in tests), which means a test that submits a lead
 * also exercises the notification handlers and the outbox bookkeeping rather
 * than stopping at "it was queued".
 */
let mongod = null;

export async function startTestApp({ inlineJobs = true } = {}) {
  mongod = await MongoMemoryServer.create();
  await connectMongo(mongod.getUri('taifer_test'));

  if (inlineJobs) setInlineHandler(processNotificationJob);
  else setInlineHandler(null);

  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

export async function stopTestApp(app) {
  if (app) await app.close();
  await disconnectMongo();
  if (mongod) await mongod.stop();
  mongod = null;
}

export async function clearCollections() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
  resetFlagCache();
}

export async function createAdmin({
  email = 'admin@taifer.test',
  name = 'Test Admin',
  role = 'super_admin',
  password = 'correct-horse-battery',
} = {}) {
  const user = await AdminUser.create({
    name,
    email,
    role,
    passwordHash: await AdminUser.hashPassword(password),
  });
  return { user, password };
}

/* Signs in and returns the bearer token plus the cookies the refresh and CSRF
 * flows need. */
export async function signIn(app, { email = 'admin@taifer.test', password = 'correct-horse-battery' } = {}) {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email, password },
  });

  if (response.statusCode !== 200) {
    throw new Error(`sign-in failed (${response.statusCode}): ${response.body}`);
  }

  const cookies = response.cookies.reduce((acc, cookie) => {
    acc[cookie.name] = cookie.value;
    return acc;
  }, {});

  return {
    accessToken: response.json().data.accessToken,
    cookies,
    cookieHeader: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; '),
    authHeader: { authorization: `Bearer ${response.json().data.accessToken}` },
  };
}
