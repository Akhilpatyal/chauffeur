import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { perAccountKey } from '../../lib/rateLimitKeys.js';
import {
  createBookingBody,
  listBookingsQuery,
  bookingIdParams,
  cancellationBody,
} from './schemas.js';
import {
  createBooking,
  listCustomerBookings,
  getCustomerBooking,
  requestCancellation,
} from './service.js';

/*
 * A customer's own reservations.
 *
 * Every route here is scoped to the signed-in customer by the query itself,
 * not by a check after loading — see the service. There is no route that
 * takes a customer id as a parameter, because a route that does is a route
 * somebody will eventually call with someone else's.
 */
export default async function bookingRoutes(fastify) {
  fastify.post(
    '/account/bookings',
    {
      config: {
        /* Generous for a person, tight for a script. Somebody genuinely
         * planning several trips in an evening is fine; a loop is not. */
        rateLimit: {
          max: 20,
          timeWindow: '1 hour',
          /*
           * Per account, not per address. `request.customer` is not set yet —
           * rate limiting runs on onRequest, well before authentication — so
           * reading it here would silently degrade to a per-IP limit and lock
           * out strangers sharing an office or carrier NAT. See
           * lib/rateLimitKeys.js for why reading the token unverified is safe
           * for bucketing.
           */
          keyGenerator: (request) => perAccountKey('booking', request),
        },
      },
      /* Auth first: preValidation runs before preHandler, so leaving the
       * check in preHandler answers an unauthenticated request with a schema
       * error rather than a 401. */
      preValidation: [fastify.authenticateCustomer, validate({ body: createBookingBody })],
      schema: {
        tags: ['account'],
        summary: 'Request a trip',
        description:
          'Creates a reservation REQUEST. Nothing is held and nothing is confirmed — the desk ' +
          'checks availability with suppliers first. Send an `idempotencyKey` so a retried ' +
          'submission returns the same booking rather than creating a second.',
        security: [{ bearerAuth: [] }],
        body: docSchema(createBookingBody, 'CreateBooking'),
        response: {
          201: { description: 'Request received', type: 'object' },
          409: { description: 'That departure is full or no longer running', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const { booking, replayed } = await createBooking({
        customerId: request.customer.id,
        body: request.body,
        requestMeta: { ipHash: request.ipHash, userAgent: request.headers['user-agent'] },
      });

      return reply.status(replayed ? 200 : 201).send({
        data: booking.toCustomerJSON(),
        meta: {
          replayed,
          /* Said plainly in the response, not only in the email. The single
           * most expensive misunderstanding this system can create is a
           * traveller treating a request as a confirmed trip. */
          message: replayed
            ? 'We already have this request.'
            : 'Request received. Nothing is booked yet — we are checking availability and will come back to you.',
        },
      });
    },
  );

  fastify.get(
    '/account/bookings',
    {
      /* Auth first: preValidation runs before preHandler, so leaving the
       * check in preHandler answers an unauthenticated request with a schema
       * error rather than a 401. */
      preValidation: [fastify.authenticateCustomer, validate({ query: listBookingsQuery })],
      schema: {
        tags: ['account'],
        summary: 'Your reservations',
        description:
          '`scope=upcoming` means confirmed trips that have not happened yet. Rejected, ' +
          'cancelled and expired requests are never counted as upcoming.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Bookings', type: 'object' } },
      },
    },
    async (request) => {
      const { items, total, page, pageSize } = await listCustomerBookings(
        request.customer.id,
        request.query,
      );
      return { data: items, meta: { total, page, pageSize, scope: request.query.scope } };
    },
  );

  fastify.get(
    '/account/bookings/:id',
    {
      /* Auth first: preValidation runs before preHandler, so leaving the
       * check in preHandler answers an unauthenticated request with a schema
       * error rather than a 401. */
      preValidation: [fastify.authenticateCustomer, validate({ params: bookingIdParams })],
      schema: {
        tags: ['account'],
        summary: 'One booking, with its timeline',
        description:
          'The timeline is the recorded history of this booking, oldest first. A stage that ' +
          'has not happened has no entry — nothing here is a placeholder for a future step.',
        security: [{ bearerAuth: [] }],
        params: docSchema(bookingIdParams, 'BookingIdParams'),
        response: {
          200: { description: 'Booking', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const { booking, timeline, nextAction } = await getCustomerBooking(
        request.customer.id,
        request.params.id,
      );
      return { data: booking, meta: { timeline, nextAction } };
    },
  );

  fastify.post(
    '/account/bookings/:id/cancellation',
    {
      /* Auth first: preValidation runs before preHandler, so leaving the
       * check in preHandler answers an unauthenticated request with a schema
       * error rather than a 401. */
      preValidation: [fastify.authenticateCustomer, validate({ params: bookingIdParams, body: cancellationBody })],
      schema: {
        tags: ['account'],
        summary: 'Ask to cancel',
        description:
          'Records the request; it does not cancel the booking. What comes back depends on the ' +
          'terms accepted and on what suppliers will release, and both are decisions a person ' +
          'makes — so the desk responds rather than the button deciding.',
        security: [{ bearerAuth: [] }],
        params: docSchema(bookingIdParams, 'BookingIdParams'),
        body: docSchema(cancellationBody, 'CancellationRequest'),
        response: {
          200: { description: 'Request recorded', type: 'object' },
          400: { description: 'Already closed or already requested', ...errorResponseSchema },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const booking = await requestCancellation(
        request.customer.id,
        request.params.id,
        request.body,
      );
      return {
        data: booking,
        meta: {
          message:
            'We have your cancellation request. We will confirm what it means for your booking.',
        },
      };
    },
  );
}
