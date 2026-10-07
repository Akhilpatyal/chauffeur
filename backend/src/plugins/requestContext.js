import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import { hashIp } from '../utils/identity.js';
import { stripMongoOperators } from '../utils/sanitize.js';

/*
 * Request-scoped context.
 *
 *  - A correlation id, taken from `x-request-id` when a proxy supplies one so
 *    a trace survives across the load balancer, and echoed on the response.
 *    Every log line and error body carries it, which is what makes "customer
 *    says their form failed at 14:05" answerable.
 *  - A hashed client IP, derived once from the trusted forwarded address.
 *  - NoSQL operator stripping on every JSON body, before any handler sees it.
 */
async function requestContextPlugin(fastify) {
  fastify.addHook('onRequest', async (request, reply) => {
    const inbound = request.headers['x-request-id'];
    request.correlationId =
      typeof inbound === 'string' && inbound.length <= 128 && /^[\w.:-]+$/.test(inbound)
        ? inbound
        : request.id ?? crypto.randomUUID();

    request.ipHash = hashIp(request.ip);
    reply.header('x-request-id', request.correlationId);
  });

  fastify.addHook('preValidation', async (request) => {
    if (request.body && typeof request.body === 'object') {
      request.body = stripMongoOperators(request.body);
    }
  });

  /* Slow-request visibility without turning on trace logging everywhere. */
  fastify.addHook('onResponse', async (request, reply) => {
    const elapsed = reply.elapsedTime;
    if (elapsed > 1000) {
      request.log.warn(
        { url: request.url, method: request.method, ms: Math.round(elapsed) },
        'slow request',
      );
    }
  });
}

export default fp(requestContextPlugin, { name: 'request-context' });
