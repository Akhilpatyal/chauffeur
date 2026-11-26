import { Journey } from '../../models/Journey.js';
import { Destination } from '../../models/Destination.js';
import { GroupTour } from '../../models/GroupTour.js';
import { perAddressKey } from '../../lib/rateLimitKeys.js';

/*
 * What is on sale right now, as one small map.
 *
 * The site needs this before it can render a single card, and it needs it for
 * every collection at once — a journey, a destination and a group tour all
 * appear on the homepage and each can be closed independently. Three list
 * calls to get it would be three round trips before the first paint, so it is
 * one endpoint returning one object keyed by slug.
 *
 * WHY IT IS PUBLIC AND UNAUTHENTICATED
 *
 * It says what anybody can already see by looking at the site. There is
 * nothing here that is not on a card.
 *
 * WHAT IT IS NOT
 *
 * It is not the thing that stops a booking. The API checks availability again
 * when a booking is actually created, against the same records, because a
 * response the client cached ten minutes ago is not a permission. See
 * config/catalogue.js.
 */
const COLLECTIONS = [Journey, Destination, GroupTour];

export default async function availabilityRoutes(fastify) {
  fastify.get(
    '/availability',
    {
      config: {
        rateLimit: {
          max: 240,
          timeWindow: '1 minute',
          keyGenerator: (request) => perAddressKey('availability', request),
        },
      },
      schema: {
        tags: ['public'],
        summary: 'What is open, coming soon or out of season',
        description:
          'Keyed by slug across journeys, destinations and group tours. `state` already has ' +
          'any scheduled opening date applied, so a season that started this morning reads as ' +
          'open without anything having had to run.',
        response: { 200: { description: 'Availability by slug', type: 'object' } },
      },
    },
    async (_request, reply) => {
      const now = new Date();

      const results = await Promise.all(
        COLLECTIONS.map((Model) =>
          Model.find(Model.publicFilter()).select('slug availability').lean({ virtuals: false }),
        ),
      );

      const data = {};
      for (const rows of results) {
        for (const row of rows) {
          const stored = row.availability ?? {};
          const opensOn = stored.opensOn ? new Date(stored.opensOn) : null;
          const open = stored.state === 'open' || Boolean(opensOn && opensOn <= now);

          /*
           * Duplicated from contentBase's `effectiveAvailability` rather than
           * calling it, because these rows are lean objects and not
           * documents. The rule is one line and the alternative is hydrating
           * every record on a hot public endpoint.
           */
          data[row.slug] = {
            state: open ? 'open' : stored.state ?? 'coming_soon',
            opensOn: opensOn ? opensOn.toISOString() : null,
            opensLater: Boolean(opensOn && opensOn > now),
            headline: stored.headline ?? null,
            note: stored.note ?? null,
          };
        }
      }

      /* Short, because the desk opening a season expects to see it on the
       * site rather than in ten minutes. */
      reply.header('cache-control', 'public, max-age=60, stale-while-revalidate=300');
      return { data };
    },
  );
}
