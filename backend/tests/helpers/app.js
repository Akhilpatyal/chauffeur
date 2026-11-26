import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { buildApp } from '../../src/app.js';
import { connectMongo, disconnectMongo } from '../../src/db/mongoose.js';
import { setInlineHandler } from '../../src/lib/queue.js';
import { processNotificationJob } from '../../src/services/notifications.js';
import { resetFlagCache } from '../../src/services/flags.js';
import { AdminUser } from '../../src/models/AdminUser.js';

/*
 * Each test file gets its own database and its own app instance, so files
 * cannot leak state into each other and can run in any order.
 *
 * Jobs run inline (no Redis in tests), which means a test that submits a lead
 * also exercises the notification handlers and the outbox bookkeeping rather
 * than stopping at "it was queued".
 *
 * TWO WAYS TO GET A DATABASE
 *
 * By default an in-memory mongod, which needs nothing installed and is what
 * CI uses. But it works by downloading and executing a mongod binary, and
 * some machines will not allow that — Windows Application Control blocks it
 * outright, with an error that looks like a timeout rather than a refusal.
 *
 * So setting MONGODB_TEST_URI points the suite at a real MongoDB instead
 * (the docker container used for development is ideal). Each file still gets
 * its own uniquely named database and drops it afterwards, so a shared server
 * is as isolated as a private one and the dev data is never touched.
 */
let mongod = null;
let scratchDatabase = null;
let scratchUri = null;

const STALE_AFTER_MS = 60 * 60 * 1000;

async function sweepStaleDatabases() {
  try {
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();

    for (const { name } of databases) {
      const stamp = /^taifer_test_([a-z0-9]+)_/.exec(name)?.[1];
      if (!stamp || name === scratchDatabase) continue;

      const createdAt = Number.parseInt(stamp, 36);
      if (Number.isNaN(createdAt) || Date.now() - createdAt < STALE_AFTER_MS) continue;

      await mongoose.connection.getClient().db(name).dropDatabase();
    }
  } catch {
    /* Sweeping is housekeeping, never a reason to fail a run — a user without
     * listDatabases permission should still be able to run the tests. */
  }
}

export async function startTestApp({ inlineJobs = true, extraRoutes = null } = {}) {
  /*
   * launchTimeout is an option on create(), not an environment variable.
   * mongodb-memory-server's default is 10s, which is plenty on an idle
   * machine and not nearly enough on one already running Docker, two dev
   * servers and a virus scanner — the failure then reads "Instance failed to
   * start within 10000ms", which sounds like a broken test rather than a busy
   * laptop.
   */
  const sharedServer = process.env.MONGODB_TEST_URI;

  if (sharedServer) {
    /* Unique per run and per file, so parallel files never collide and a
     * crashed run cannot poison the next one. */
    scratchDatabase = `taifer_test_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    /*
     * Parsed rather than string-sliced: hand-rolled trimming turned
     * "mongodb://127.0.0.1:27017" into "mongodb:/" and the scratch database
     * name was then treated as a hostname. URL handles credentials, ports,
     * query options and +srv correctly.
     */
    const url = new URL(sharedServer);
    url.pathname = `/${scratchDatabase}`;
    scratchUri = url.toString();
    await connectMongo(scratchUri);

    /*
     * Sweep up after previous runs.
     *
     * A run that crashes — or is stopped with ctrl-C — never reaches its
     * cleanup, so scratch databases accumulate on a shared server forever.
     * Dropping stale ones at startup makes the suite self-healing instead of
     * relying on every run exiting cleanly, which no test suite does.
     *
     * Only databases older than an hour are touched, so a parallel run
     * happening right now is never pulled out from under itself.
     */
    await sweepStaleDatabases();
  } else {
    /*
     * launchTimeout is an option on create(), not an environment variable.
     * The package default is 10s, which is plenty on an idle machine and not
     * nearly enough on one already running Docker and two dev servers.
     */
    /*
     * A one-member replica set, not a standalone.
     *
     * Booking creation writes the reservation and its first history event in
     * a transaction, and MongoDB refuses transactions outside a replica set —
     * so a standalone server turns every one of those paths into a 500 that
     * reads as a broken feature rather than a missing server capability.
     * One member is enough to satisfy the requirement and costs nothing.
     */
    mongod = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
      instanceOpts: [
        { launchTimeout: Number(process.env.MONGOMS_LAUNCH_TIMEOUT ?? 60_000) },
      ],
    });
    await connectMongo(mongod.getUri('taifer_test'));
  }

  if (inlineJobs) setInlineHandler(processNotificationJob);
  else setInlineHandler(null);

  const app = await buildApp({ logger: false });

  /*
   * Routes a test needs that the real app does not have — one that throws on
   * purpose, for instance. Registered here because Fastify refuses new routes
   * once an instance is ready, and a test that wants to drive the error
   * handler end to end has to go through a real route to do it.
   */
  if (extraRoutes) await app.register(extraRoutes);

  await app.ready();
  return app;
}

export async function stopTestApp(app) {
  if (app) await app.close();

  await disconnectMongo();

  /*
   * Drop AFTER disconnecting, over a throwaway connection.
   *
   * Dropping on the live connection looked like it worked — the call resolved
   * and nothing threw — but the database came back with its collections
   * intact. Mongoose builds indexes in the background (autoIndex is on
   * outside production), and those pending builds recreate the collections
   * moments after the drop. The test files with the most models leaked; the
   * smaller ones finished their index builds in time and appeared fine.
   *
   * Once the connection is closed nothing can recreate anything, so the drop
   * is final.
   */
  if (scratchUri) {
    const client = new MongoClient(scratchUri);
    try {
      await client.connect();
      await client.db().dropDatabase();
    } catch (error) {
      /* Cleanup must never fail a passing suite, but it should say so — the
       * silent catch this replaces is how the leak went unnoticed. The sweep
       * in startTestApp collects anything missed. */
      console.warn(`[tests] could not drop ${scratchDatabase}: ${error.message}`);
    } finally {
      await client.close().catch(() => {});
    }
    scratchDatabase = null;
    scratchUri = null;
  }
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
  teams = [],
  permissionOverrides,
} = {}) {
  const user = await AdminUser.create({
    name,
    email,
    role,
    teams,
    ...(permissionOverrides ? { permissionOverrides } : {}),
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
