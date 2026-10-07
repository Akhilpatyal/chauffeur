import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { zodValidatorCompiler, zodSerializerCompiler } from './lib/validate.js';

import securityPlugin from './plugins/security.js';
import requestContextPlugin from './plugins/requestContext.js';
import errorHandlerPlugin from './plugins/errorHandler.js';
import performancePlugin from './plugins/performance.js';
import authPlugin from './plugins/auth.js';
import swaggerPlugin from './plugins/swagger.js';

import healthRoutes from './modules/health/routes.js';
import leadRoutes from './modules/leads/routes.js';
import newsletterRoutes from './modules/newsletter/routes.js';
import contentRoutes from './modules/content/routes.js';
import authRoutes from './modules/auth/routes.js';
import adminLeadRoutes from './modules/admin/leads.routes.js';
import adminContentRoutes from './modules/admin/content.routes.js';
import adminOpsRoutes from './modules/admin/ops.routes.js';
import adminUserRoutes from './modules/admin/users.routes.js';
import uploadRoutes from './modules/admin/uploads.routes.js';
import complianceRoutes from './modules/admin/compliance.routes.js';

export const API_PREFIX = '/api/v1';

/*
 * Builds the app without starting it, so tests can drive it through
 * `inject()`/supertest and scripts can reuse the same wiring.
 *
 * Everything is versioned under /api/v1 from the first commit. Retrofitting a
 * version prefix later means either breaking the live frontend or maintaining
 * an unversioned alias forever.
 */
export async function buildApp({ logger: loggerOption = logger } = {}) {
  /*
   * Fastify 5 distinguishes between logger *options* and a pre-built logger
   * *instance*; passing our configured pino instance under `logger` is rejected
   * at boot. Tests and scripts pass `false` to silence logging entirely.
   */
  const loggerConfig = loggerOption === false
    ? { logger: false }
    : { loggerInstance: loggerOption };

  const app = Fastify({
    ...loggerConfig,
    /* Fastify generates request ids; ours are propagated in requestContext. */
    genReqId: (request) => request.headers['x-request-id'] ?? undefined,
    /*
     * Behind a load balancer the socket address is the balancer's. Trusting the
     * forwarded header is what makes rate limiting and IP hashing meaningful,
     * and it is only safe because the balancer is the sole ingress.
     */
    trustProxy: true,
    bodyLimit: 256 * 1024,
    ajv: { customOptions: { removeAdditional: false } },
  });

  // Zod owns validation and serialisation; see lib/validate.js for why.
  app.setValidatorCompiler(zodValidatorCompiler);
  app.setSerializerCompiler(zodSerializerCompiler);

  await app.register(errorHandlerPlugin);
  await app.register(requestContextPlugin);
  await app.register(performancePlugin);
  await app.register(securityPlugin);
  await app.register(authPlugin);
  await app.register(multipart, {
    limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1, fields: 10 },
  });
  await app.register(swaggerPlugin);

  /* Probes sit outside the version prefix: monitors and orchestrators should
   * never need to know about API versions. */
  await app.register(healthRoutes);

  await app.register(
    async (publicApi) => {
      await publicApi.register(leadRoutes);
      await publicApi.register(newsletterRoutes);
      await publicApi.register(contentRoutes);
      await publicApi.register(authRoutes);
    },
    { prefix: API_PREFIX },
  );

  await app.register(
    async (adminApi) => {
      // Authentication for the whole admin surface in one place, so a new route
      // file cannot accidentally ship unauthenticated.
      adminApi.addHook('preHandler', adminApi.authenticate);

      await adminApi.register(adminLeadRoutes);
      await adminApi.register(adminContentRoutes);
      await adminApi.register(adminOpsRoutes);
      await adminApi.register(adminUserRoutes);
      await adminApi.register(uploadRoutes);
      await adminApi.register(complianceRoutes);
    },
    { prefix: `${API_PREFIX}/admin` },
  );

  app.get('/', { schema: { hide: true } }, async () => ({
    name: 'Taifer API',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health',
  }));

  return app;
}

export default buildApp;
