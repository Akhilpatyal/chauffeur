import { mongoHealth } from '../../db/mongoose.js';
import { redisHealth } from '../../db/redis.js';
import { queueHealth } from '../../lib/queue.js';
import { env } from '../../config/env.js';

const startedAt = Date.now();

/*
 * Two probes, because they answer different questions and a load balancer
 * needs both:
 *
 *  /health  — is this process alive? Never touches a dependency. If it fails,
 *             the orchestrator should restart the container.
 *  /ready   — can this instance serve traffic? Checks MongoDB and Redis. If it
 *             fails, the load balancer should stop sending requests here but
 *             NOT restart it, because the fault is downstream.
 *
 * Conflating the two is how a brief database blip turns into a restart storm.
 */
export default async function healthRoutes(fastify) {
  fastify.get(
    '/health',
    {
      logLevel: 'warn', // uptime monitors hit this every 30s; do not log each one
      schema: {
        tags: ['health'],
        summary: 'Liveness probe',
        response: {
          200: {
            description: 'Process is alive',
            type: 'object',
            properties: {
              status: { type: 'string' },
              uptimeSeconds: { type: 'number' },
              version: { type: 'string' },
              env: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      version: process.env.npm_package_version ?? '1.0.0',
      env: env.NODE_ENV,
    }),
  );

  fastify.get(
    '/ready',
    {
      logLevel: 'warn',
      schema: {
        tags: ['health'],
        summary: 'Readiness probe',
        description:
          'Returns 503 when a dependency this instance needs is unavailable, so the load ' +
          'balancer drains it instead of serving errors.',
        response: {
          200: { description: 'Ready to serve', type: 'object' },
          503: { description: 'A dependency is down', type: 'object' },
        },
      },
    },
    async (request, reply) => {
      const [mongo, redis, queues] = await Promise.all([
        Promise.resolve(mongoHealth()),
        redisHealth(),
        queueHealth(),
      ]);

      // Queue depth is reported but does not gate readiness: a backed-up queue
      // is a worker problem, and the API can still accept and persist leads.
      const ready = mongo.ok && redis.ok;

      return reply.status(ready ? 200 : 503).send({
        status: ready ? 'ready' : 'degraded',
        checks: { mongo, redis, queues },
      });
    },
  );
}
