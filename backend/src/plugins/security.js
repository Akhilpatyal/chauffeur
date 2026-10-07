import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { getRedis } from '../db/redis.js';

/*
 * Security headers, CORS, cookies and rate limiting.
 *
 * The rate limiter is backed by Redis rather than process memory, because with
 * N instances behind a load balancer an in-memory limiter effectively
 * multiplies every limit by N and stops being a limit at all.
 */
async function securityPlugin(fastify) {
  await fastify.register(helmet, {
    // The API serves JSON and the Swagger UI; it is not an embed target.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: env.isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

  await fastify.register(cors, {
    /*
     * An explicit allow-list, never "*". Credentials are on because the admin
     * dashboard sends the refresh-token cookie cross-origin, and the browser
     * refuses credentialed requests against a wildcard origin anyway.
     */
    origin(origin, callback) {
      // Same-origin and server-to-server calls arrive without an Origin header.
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      if (!env.isProduction && /^http:\/\/localhost:\d+$/.test(origin)) {
        return callback(null, true);
      }
      logger.warn({ origin }, 'cors rejected origin');
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'content-type',
      'authorization',
      'x-request-id',
      'idempotency-key',
      'x-csrf-token',
    ],
    exposedHeaders: ['x-request-id', 'ratelimit-remaining', 'ratelimit-reset'],
    maxAge: 86_400,
  });

  await fastify.register(cookie, {
    secret: env.COOKIE_SECRET,
    parseOptions: { sameSite: 'lax', httpOnly: true, path: '/' },
  });

  const redis = getRedis('ratelimit');
  await fastify.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_MAX,
    timeWindow: env.RATE_LIMIT_GLOBAL_WINDOW,
    ...(redis ? { redis } : {}),
    // Health checks come from the load balancer on a fixed schedule and must
    // never be throttled, or a busy minute looks like an outage.
    allowList: (request) => request.url === '/health' || request.url === '/ready',
    keyGenerator: (request) => request.ipHash ?? request.ip,
    /*
     * What this returns is thrown as an error, not sent as a body, so it has
     * to look like an error the central handler understands: a `statusCode`
     * and a `code`. Returning the finished `{ error: { ... } }` envelope here
     * instead meant the handler saw an unrecognised object, classified it as
     * an unhandled exception, and told rate-limited visitors "something went
     * wrong on our side" with a 500 — blaming us for their own retry and
     * giving them no reason to wait rather than hammer the form.
     *
     * errorHandler.js turns this into the standard envelope.
     */
    errorResponseBuilder: (request, context) => {
      const error = new Error(`Too many requests. Try again in ${context.after}.`);
      error.statusCode = 429;
      error.code = 'RATE_LIMITED';
      return error;
    },
  });

  if (!redis && env.isProduction) {
    logger.fatal('rate limiting is running in-memory in production');
  }
}

export default fp(securityPlugin, { name: 'security' });
