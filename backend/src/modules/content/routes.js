import { env } from '../../config/env.js';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { CONTENT_TYPES, CONTENT_KEYS } from './registry.js';
import { listQuery, slugParams } from './schemas.js';
import { listContent, getContentBySlug, featuredFor } from './service.js';
import { cached, cacheKey } from '../../lib/cache.js';

/*
 * Public content reads. Every response is cacheable and carries Cache-Control
 * so a CDN in front of the API can serve most of this traffic without the
 * request ever reaching Node.
 *
 * `stale-while-revalidate` is deliberate: after the TTL a visitor gets the
 * slightly stale copy instantly while the CDN refreshes behind them, instead
 * of waiting on a cold origin read.
 */
const PUBLIC_CACHE_HEADER = `public, max-age=60, s-maxage=${env.CACHE_TTL_SECONDS}, stale-while-revalidate=600`;

export default async function contentRoutes(fastify) {
  for (const [key, type] of Object.entries(CONTENT_TYPES)) {
    fastify.get(
      `/${key}`,
      {
        preValidation: validate({ query: listQuery }),
        schema: {
          tags: ['content'],
          summary: `List ${type.label.toLowerCase()}s`,
          description:
            'Paginated, filterable and sortable. Only published records are returned. ' +
            `Sortable fields: ${type.sortable.join(', ')} (prefix with - for descending).`,
          querystring: docSchema(listQuery, `List${key}Query`),
          response: {
            200: {
              description: 'A page of results',
              type: 'object',
              properties: {
                data: { type: 'array', items: { type: 'object' } },
                meta: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    pages: { type: 'integer' },
                    hasNext: { type: 'boolean' },
                    hasPrev: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
      async (request, reply) => {
        reply.header('cache-control', PUBLIC_CACHE_HEADER);
        return listContent(key, type, request.query);
      },
    );

    fastify.get(
      `/${key}/:slug`,
      {
        preValidation: validate({ params: slugParams }),
        schema: {
          tags: ['content'],
          summary: `Get one ${type.label.toLowerCase()} by slug`,
          params: docSchema(slugParams, `${key}SlugParams`),
          response: {
            200: { description: 'The record', type: 'object' },
            404: { description: 'No published record with that slug', ...errorResponseSchema },
          },
        },
      },
      async (request, reply) => {
        reply.header('cache-control', PUBLIC_CACHE_HEADER);
        return getContentBySlug(key, type, request.params.slug);
      },
    );
  }

  /*
   * One request for everything above the fold on the homepage. Without this
   * the landing page makes five round trips before it can render, which is
   * the difference between a fast first paint and a visible stagger.
   */
  fastify.get(
    '/home',
    {
      schema: {
        tags: ['content'],
        summary: 'Homepage bundle',
        description:
          'Featured journeys, destinations, group tours, testimonials and journal articles ' +
          'in a single cached response.',
        response: { 200: { description: 'Homepage content', type: 'object' } },
      },
    },
    async (request, reply) => {
      reply.header('cache-control', PUBLIC_CACHE_HEADER);

      return cached(
        cacheKey('content:home'),
        async () => {
          const [journeys, destinations, groupTours, testimonials, articles] = await Promise.all([
            featuredFor(CONTENT_TYPES.journeys, 6),
            featuredFor(CONTENT_TYPES.destinations, 8),
            featuredFor(CONTENT_TYPES['group-tours'], 4),
            CONTENT_TYPES.testimonials.model
              .find({ status: 'published', placements: 'home' })
              .select(CONTENT_TYPES.testimonials.listFields)
              .sort({ sortOrder: 1 })
              .limit(6)
              .lean(),
            CONTENT_TYPES.articles.model
              .find({ status: 'published' })
              .select(CONTENT_TYPES.articles.listFields)
              .sort({ isFeatured: -1, publishedAt: -1 })
              .limit(4)
              .lean(),
          ]);

          return { data: { journeys, destinations, groupTours, testimonials, articles } };
        },
        // Tagged with every collection it draws from, so editing any one of
        // them drops this bundle too.
        { tags: CONTENT_KEYS.map((contentKey) => CONTENT_TYPES[contentKey].cacheTag) },
      );
    },
  );
}
