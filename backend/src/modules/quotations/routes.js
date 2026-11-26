import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { notFound } from '../../lib/errors.js';
import {
  accept,
  respond,
  customerVisibleFor,
  findCustomerBooking,
} from './service.js';
import { bookingIdParams, quotationParams, respondBody } from './schemas.js';
import { perAccountKey } from '../../lib/rateLimitKeys.js';

/*
 * Quotations, as the customer sees them.
 *
 * Drafts never appear here — a draft is the desk still deciding, and showing
 * one would put a price in front of somebody that nobody has agreed to offer.
 * `toCustomerJSON` additionally strips our vendor costs, so margin cannot
 * leave the server even if a document were loaded with it attached.
 */
export default async function customerQuotationRoutes(fastify) {
  fastify.get(
    '/account/bookings/:id/quotations',
    {
      preValidation: [fastify.authenticateCustomer, validate({ params: bookingIdParams })],
      schema: {
        tags: ['account'],
        summary: 'Quotations on this booking',
        description:
          'Newest version first. Drafts are never returned, and our own supplier costs are ' +
          'never included.',
        security: [{ bearerAuth: [] }],
        params: docSchema(bookingIdParams, 'BookingIdParams'),
        response: { 200: { description: 'Quotations', type: 'object' } },
      },
    },
    async (request) => {
      const booking = await findCustomerBooking(request.params.id, request.customer.id);
      if (!booking) throw notFound('Booking');

      const quotations = await customerVisibleFor(booking._id);
      return { data: quotations.map((quotation) => quotation.toCustomerJSON()) };
    },
  );

  fastify.post(
    '/account/bookings/:id/quotations/:quotationId/accept',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          keyGenerator: (request) => perAccountKey('quote-accept', request),
        },
      },
      preValidation: [fastify.authenticateCustomer, validate({ params: quotationParams })],
      schema: {
        tags: ['account'],
        summary: 'Accept a quotation',
        description:
          'The moment a price is agreed. The figures are copied onto the booking from the ' +
          'version accepted here, so a later revision cannot change what was agreed.',
        security: [{ bearerAuth: [] }],
        params: docSchema(quotationParams, 'QuotationParams'),
        response: {
          200: { description: 'Accepted', type: 'object' },
          409: { description: 'Expired or no longer open', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const { booking, quotation } = await accept(
        request.params.id,
        request.params.quotationId,
        request.customer.id,
      );
      return {
        data: quotation.toCustomerJSON(),
        meta: { booking: booking.toCustomerJSON() },
      };
    },
  );

  fastify.post(
    '/account/bookings/:id/quotations/:quotationId/respond',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          keyGenerator: (request) => perAccountKey('quote-respond', request),
        },
      },
      preValidation: [
        fastify.authenticateCustomer,
        validate({ params: quotationParams, body: respondBody }),
      ],
      schema: {
        tags: ['account'],
        summary: 'Decline a quotation, or ask for changes',
        description:
          'Neither closes the booking. Somebody who refuses a price is usually still a ' +
          'customer, so the desk decides what happens next rather than the refusal doing it.',
        security: [{ bearerAuth: [] }],
        params: docSchema(quotationParams, 'QuotationParams'),
        body: docSchema(respondBody, 'QuotationRespond'),
        response: { 200: { description: 'Recorded', type: 'object' } },
      },
    },
    async (request) => {
      const quotation = await respond(
        request.params.id,
        request.params.quotationId,
        request.customer.id,
        request.body,
      );
      return { data: quotation.toCustomerJSON() };
    },
  );
}
