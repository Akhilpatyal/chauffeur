import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { recordAudit } from '../../services/audit.js';
import { getReservation } from './reservations.service.js';
import {
  createVersion,
  updateDraft,
  send,
  listForBooking,
} from '../quotations/service.js';
import {
  createQuotationBody,
  updateQuotationBody,
  adminQuotationParams,
} from '../quotations/schemas.js';
import { z } from 'zod';

const reservationParams = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.'),
});

/*
 * Quotations, for the desk.
 *
 * Guarded by `bookings.manage` — the same permission as moving a booking
 * through the pipeline, because quoting is a commitment of the same kind.
 * A caller who may read a reservation may read its quotations; pricing one
 * is a different thing.
 *
 * Reads go through `getReservation` first so the record scope that governs
 * reservations governs these too, rather than a second set of rules that
 * would drift from it.
 */
export default async function adminQuotationRoutes(fastify) {
  fastify.get(
    '/reservations/:id/quotations',
    {
      preHandler: fastify.requirePermission('bookings.view'),
      preValidation: validate({ params: reservationParams }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'Every quotation version on a booking',
        description:
          'Newest first, including drafts and our supplier costs — none of which the ' +
          'customer-facing endpoints return.',
        security: [{ bearerAuth: [] }],
        params: docSchema(reservationParams, 'ReservationIdParams'),
        response: { 200: { description: 'Quotations', type: 'object' } },
      },
    },
    async (request) => {
      /* Throws 404 if this admin is out of scope for the booking, so the
       * quotations are unreachable for exactly the same people. */
      await getReservation(request.params.id, request.user);
      const quotations = await listForBooking(request.params.id);
      return { data: quotations };
    },
  );

  fastify.post(
    '/reservations/:id/quotations',
    {
      preHandler: fastify.requirePermission('bookings.manage'),
      preValidation: validate({ params: reservationParams, body: createQuotationBody }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'Start a new quotation version',
        description:
          'Created as a draft, which the customer cannot see. Any existing draft or sent ' +
          'version is superseded in the same transaction, so a booking never carries two ' +
          'live offers. Totals are computed from the lines and ignored if sent.',
        security: [{ bearerAuth: [] }],
        params: docSchema(reservationParams, 'ReservationIdParams'),
        body: docSchema(createQuotationBody, 'QuotationCreate'),
        response: {
          201: { description: 'Draft created', type: 'object' },
          409: { description: 'Booking is closed', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      await getReservation(request.params.id, request.user);

      const quotation = await createVersion(request.params.id, request.body, request.user);

      await recordAudit({
        request,
        action: 'quotation.create',
        entity: 'quotation',
        entityId: quotation._id,
        entityLabel: `v${quotation.version}`,
        after: { booking: String(quotation.booking), total: quotation.totalAmount },
      });

      return reply.status(201).send({ data: quotation });
    },
  );

  fastify.patch(
    '/quotations/:quotationId',
    {
      preHandler: fastify.requirePermission('bookings.manage'),
      preValidation: validate({ params: adminQuotationParams, body: updateQuotationBody }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'Edit a draft quotation',
        description:
          'Drafts only. Once a quotation has been sent it is a record of what the customer ' +
          'was shown, so a change means a new version rather than an edit.',
        security: [{ bearerAuth: [] }],
        params: docSchema(adminQuotationParams, 'AdminQuotationParams'),
        body: docSchema(updateQuotationBody, 'QuotationUpdate'),
        response: {
          200: { description: 'Updated', type: 'object' },
          409: { description: 'Already sent', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const quotation = await updateDraft(request.params.quotationId, request.body);
      return { data: quotation };
    },
  );

  fastify.post(
    '/quotations/:quotationId/send',
    {
      preHandler: fastify.requirePermission('bookings.manage'),
      preValidation: validate({ params: adminQuotationParams }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'Send a quotation to the customer',
        description:
          'Moves the booking to quoted and starts the expiry clock. Sending commits no ' +
          'money: the price is written onto the booking only when the customer accepts.',
        security: [{ bearerAuth: [] }],
        params: docSchema(adminQuotationParams, 'AdminQuotationParams'),
        response: {
          200: { description: 'Sent', type: 'object' },
          409: { description: 'Not a draft, or booking closed', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const quotation = await send(request.params.quotationId, request.user);

      await recordAudit({
        request,
        action: 'quotation.send',
        entity: 'quotation',
        entityId: quotation._id,
        entityLabel: `v${quotation.version}`,
        after: { total: quotation.totalAmount, expiresAt: quotation.expiresAt },
      });

      return { data: quotation };
    },
  );
}
