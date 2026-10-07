import { env } from '../../config/env.js';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { createLeadBody } from './schemas.js';
import { createLead } from './service.js';

/*
 * Public enquiry capture. One endpoint serves the contact form, the Plan My
 * Trip modal and every inline "enquire about this journey" button; they differ
 * only by `source` and which optional fields they fill.
 */
export default async function leadRoutes(fastify) {
  fastify.post(
    '/leads',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_LEADS_MAX,
          timeWindow: env.RATE_LIMIT_LEADS_WINDOW,
          keyGenerator: (request) => `leads:${request.ipHash ?? request.ip}`,
        },
      },
      preValidation: validate({ body: createLeadBody }),
      schema: {
        tags: ['leads'],
        summary: 'Submit an enquiry',
        description:
          'Captures a lead from any public form. Send an `Idempotency-Key` header to make ' +
          'retries safe: the same key returns the original result instead of creating a ' +
          'second lead. Responds 201 for a new lead and 200 when a duplicate submission ' +
          'was collapsed into an existing one.',
        body: docSchema(createLeadBody, 'CreateLead'),
        response: {
          201: {
            description: 'Lead stored and notifications queued',
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  id: { type: ['string', 'null'] },
                  status: { type: 'string', enum: ['received'] },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  deduplicated: { type: 'boolean' },
                  threaded: { type: 'boolean' },
                },
              },
            },
          },
          200: { description: 'Duplicate submission collapsed', type: 'object' },
          422: { description: 'Validation failed', ...errorResponseSchema },
          429: { description: 'Rate limited', ...errorResponseSchema },
          503: { description: 'Submissions paused by a feature flag', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const idempotencyKey = request.headers['idempotency-key'];

      const result = await createLead(request.body, {
        ip: request.ip,
        ipHash: request.ipHash,
        userAgent: request.headers['user-agent'],
        requestId: request.correlationId,
        idempotencyKey:
          typeof idempotencyKey === 'string' && idempotencyKey.length <= 200
            ? idempotencyKey
            : null,
      });

      return reply.status(result.statusCode).send(result.body);
    },
  );
}
