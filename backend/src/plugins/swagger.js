import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from '../config/env.js';

/*
 * The OpenAPI document is generated from the route schemas, so it cannot drift
 * from the implementation the way a hand-maintained spec does. Exported to a
 * file by `npm run openapi:export` for CI and client generation.
 */
async function swaggerPlugin(fastify) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Taifer API',
        description:
          'Lead capture, public content and admin operations for the Taifer travel platform.',
        version: '1.0.0',
        contact: { name: 'Taifer engineering', email: 'hello@taifer.com' },
      },
      servers: [
        { url: env.API_PUBLIC_URL, description: env.NODE_ENV },
      ],
      tags: [
        { name: 'health', description: 'Liveness and readiness probes' },
        { name: 'leads', description: 'Enquiry capture from the public site' },
        { name: 'newsletter', description: 'Double opt-in newsletter subscriptions' },
        { name: 'content', description: 'Public, cached content reads' },
        { name: 'auth', description: 'Admin authentication' },
        { name: 'admin:leads', description: 'Lead management' },
        { name: 'admin:content', description: 'Content management' },
        { name: 'admin:ops', description: 'Analytics, audit log, flags, uploads, compliance' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true, persistAuthorization: true },
    staticCSP: true,
  });
}

export default fp(swaggerPlugin, { name: 'swagger' });
