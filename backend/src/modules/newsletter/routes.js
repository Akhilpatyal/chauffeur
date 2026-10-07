import { env } from '../../config/env.js';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { subscribeBody, tokenQuery } from './schemas.js';
import { subscribe, confirm, unsubscribe } from './service.js';

/*
 * The confirm and unsubscribe routes are GET because they are opened from a
 * link in an email client, and they redirect back to the marketing site so the
 * subscriber lands on a branded page rather than raw JSON.
 */
function redirectTo(reply, path, params) {
  const url = new URL(path, env.SITE_PUBLIC_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return reply.redirect(url.toString(), 302);
}

export default async function newsletterRoutes(fastify) {
  fastify.post(
    '/newsletter',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_LEADS_MAX,
          timeWindow: env.RATE_LIMIT_LEADS_WINDOW,
          keyGenerator: (request) => `newsletter:${request.ipHash ?? request.ip}`,
        },
      },
      preValidation: validate({ body: subscribeBody }),
      schema: {
        tags: ['newsletter'],
        summary: 'Request a newsletter subscription',
        description:
          'Starts double opt-in. Always responds 202 with status `pending`; the address is ' +
          'only added to the list once the emailed confirmation link is opened. Responds 200 ' +
          'with `already_subscribed` for a confirmed address.',
        body: docSchema(subscribeBody, 'Subscribe'),
        response: {
          202: {
            description: 'Opt-in email queued',
            type: 'object',
            properties: {
              data: { type: 'object', properties: { status: { type: 'string' } } },
            },
          },
          200: { description: 'Address is already confirmed', type: 'object' },
          422: { description: 'Validation failed', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const result = await subscribe(request.body, {
        ip: request.ip,
        ipHash: request.ipHash,
        userAgent: request.headers['user-agent'],
      });
      return reply.status(result.statusCode).send(result.body);
    },
  );

  fastify.get(
    '/newsletter/confirm',
    {
      preValidation: validate({ query: tokenQuery }),
      schema: {
        tags: ['newsletter'],
        summary: 'Confirm a subscription (opt-in link target)',
        description: 'Redirects to the marketing site with a `newsletter` status parameter.',
        querystring: docSchema(tokenQuery, 'ConfirmToken'),
        response: { 302: { description: 'Redirect to the site', type: 'null' } },
      },
    },
    async (request, reply) => {
      try {
        const { alreadyConfirmed } = await confirm(request.query.token);
        return redirectTo(reply, '/', {
          newsletter: alreadyConfirmed ? 'already-confirmed' : 'confirmed',
        });
      } catch (error) {
        request.log.info({ err: error }, 'newsletter confirmation rejected');
        return redirectTo(reply, '/', { newsletter: 'invalid' });
      }
    },
  );

  fastify.get(
    '/newsletter/unsubscribe',
    {
      preValidation: validate({ query: tokenQuery }),
      schema: {
        tags: ['newsletter'],
        summary: 'Unsubscribe (one-click link target)',
        querystring: docSchema(tokenQuery, 'UnsubscribeToken'),
        response: { 302: { description: 'Redirect to the site', type: 'null' } },
      },
    },
    async (request, reply) => {
      try {
        await unsubscribe(request.query.token, request.query.reason);
        return redirectTo(reply, '/', { newsletter: 'unsubscribed' });
      } catch (error) {
        request.log.info({ err: error }, 'unsubscribe rejected');
        return redirectTo(reply, '/', { newsletter: 'invalid' });
      }
    },
  );
}
