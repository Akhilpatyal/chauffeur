import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
/*
 * Imported for the side effect of registering every schema.
 *
 * Mongoose resolves a `ref` through its model registry at populate time, so a
 * model nothing imports is invisible to a populate even though the file is
 * right there. VendorAllocation -> Vendor failed exactly this way.
 */
import './models/index.js';
import { logger } from './config/logger.js';
import { zodValidatorCompiler, zodSerializerCompiler } from './lib/validate.js';

import securityPlugin from './plugins/security.js';
import requestContextPlugin from './plugins/requestContext.js';
import errorHandlerPlugin from './plugins/errorHandler.js';
import performancePlugin from './plugins/performance.js';
import authPlugin from './plugins/auth.js';
import observabilityPlugin from './plugins/observability.js';
import customerAuthPlugin from './plugins/customerAuth.js';
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
import adminTeamRoutes from './modules/admin/teams.routes.js';
import uploadRoutes from './modules/admin/uploads.routes.js';
import complianceRoutes from './modules/admin/compliance.routes.js';
import adminObservabilityRoutes from './modules/admin/observability.routes.js';
import adminReservationRoutes from './modules/admin/reservations.routes.js';
import adminQuotationRoutes from './modules/admin/quotations.routes.js';
import telemetryRoutes from './modules/telemetry/routes.js';
import customerAuthRoutes from './modules/customerAuth/routes.js';
import bookingRoutes from './modules/bookings/routes.js';
import customerQuotationRoutes from './modules/quotations/routes.js';
import departureRoutes from './modules/departures/routes.js';
import availabilityRoutes from './modules/content/availability.routes.js';

export const API_PREFIX = '/api/v1';

/*
 * Builds the app without starting it, so tests can drive it through
 * `inject()`/supertest and scripts can reuse the same wiring.
 *
 * Everything is versioned under /api/v1 from the first commit. Retrofitting a
 * version prefix later means either breaking the live frontend or maintaining
 * an unversioned alias forever.
 */
export async function buildApp({ logger: loggerOption = logger, observability = true } = {}) {
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
  await app.register(observabilityPlugin, { enabled: observability });
  await app.register(customerAuthPlugin);
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
      await publicApi.register(telemetryRoutes);
      await publicApi.register(customerAuthRoutes);
      await publicApi.register(bookingRoutes);
      await publicApi.register(customerQuotationRoutes);
      await publicApi.register(departureRoutes);
      await publicApi.register(availabilityRoutes);
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
      await adminApi.register(adminTeamRoutes);
      await adminApi.register(uploadRoutes);
      await adminApi.register(complianceRoutes);
      await adminApi.register(adminObservabilityRoutes);
      await adminApi.register(adminReservationRoutes);
      await adminApi.register(adminQuotationRoutes);
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
