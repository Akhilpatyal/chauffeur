import { z } from 'zod';
import { validate, docSchema } from '../../lib/validate.js';
import { Departure } from '../../models/Departure.js';
import { perAddressKey } from '../../lib/rateLimitKeys.js';

/*
 * Published departures for one trip.
 *
 * Public and unauthenticated, because the booking panel needs it before
 * anybody has signed in — asking for an account to see what dates exist is
 * the fastest way to lose a visitor who was only looking.
 *
 * WHAT IS AND IS NOT PUBLISHED
 *
 * `toPublicJSON` strips the seat counts from an `on_request` departure
 * entirely. Those numbers are our own guess at what a guesthouse can take,
 * not a figure the supplier has confirmed, and a client given a number will
 * display it as fact. Where there is nothing trustworthy to say, there is
 * nothing in the payload to misreport — the UI then says availability is
 * confirmed on request, which is true.
 *
 * Past and cancelled departures are never returned. A listing that shows a
 * date which has already gone is worse than an empty one.
 */
const listQuery = z.object({
  trip: z.string().trim().min(1).max(140),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export default async function departureRoutes(fastify) {
  fastify.get(
    '/departures',
    {
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
          keyGenerator: (request) => perAddressKey('departures', request),
        },
      },
      preValidation: validate({ query: listQuery }),
      schema: {
        tags: ['public'],
        summary: 'Published departures for a trip',
        description:
          'Future, running departures only. Seat counts are included only where they are real — ' +
          'an on-request departure publishes no count, because the number would be our estimate ' +
          'rather than the supplier’s.',
        response: { 200: { description: 'Departures', type: 'object' } },
      },
    },
    async (request) => {
      const departures = await Departure.find({
        tripSlug: request.query.trip,
        /* Today, not now: a departure leaving this morning is still the one
         * somebody is asking about this afternoon. */
        startDate: { $gte: startOfToday() },
        status: { $in: ['open', 'guaranteed'] },
      })
        .sort({ startDate: 1 })
        .limit(request.query.limit);

      return { data: departures.map((departure) => departure.toPublicJSON()) };
    },
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}
