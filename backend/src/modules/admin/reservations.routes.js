import { z } from 'zod';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { conflict } from '../../lib/errors.js';
import { recordAudit } from '../../services/audit.js';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '../../models/Booking.js';
import {
  listReservations,
  getReservation,
  transition,
  assignReservation,
  addNote,
  confirmationBlockers,
  allowedTransitionsFrom,
} from './reservations.service.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.');
const reservationParams = z.object({ id: objectId });

const listQuery = z.object({
  /* The pipeline views the desk works from. */
  view: z
    .enum([
      'all',
      'new',
      'checking',
      'quoted',
      'awaiting_payment',
      'confirmed',
      'departing',
      'closed',
      'open',
      'cancellation_requested',
    ])
    .default('all'),
  status: z.enum(BOOKING_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  kind: z.enum(['fixed_departure', 'custom']).optional(),
  assignedTo: objectId.optional(),
  search: z.string().trim().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  departingFrom: z.coerce.date().optional(),
  departingTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const transitionBody = z.object({
  to: z.enum(BOOKING_STATUSES),
  /* Required by the service for REJECTED and CANCELLED. Optional here so the
   * error names the reason rather than the schema rejecting a field the
   * caller could not know was conditional. */
  reason: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(2000).optional(),
  customerVisible: z.boolean().default(true),
});

const assignBody = z.object({ assignedTo: objectId.nullable() });

const noteBody = z.object({
  body: z.string().trim().min(1, 'Write something.').max(2000),
  title: z.string().trim().max(120).optional(),
  /* Defaults to internal. The safe direction for a mistake is a note the
   * customer never sees rather than one they should not have. */
  customerVisible: z.boolean().default(false),
});

/*
 * Reservations, for the desk.
 *
 * Guarded by the same permission catalogue as everything else in the admin
 * API, and scoped by the same rules as leads — a team manager sees their
 * team's bookings, a caller sees what is assigned to them. Reusing those
 * rules rather than writing a second set is deliberate: two definitions of
 * "whose records are these" drift, and the one that drifts is the one nobody
 * tested.
 */
export default async function adminReservationRoutes(fastify) {
  fastify.get(
    '/reservations',
    {
      preHandler: fastify.requirePermission('bookings.view'),
      preValidation: validate({ query: listQuery }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'The reservation pipeline',
        description:
          'Scoped by role. `view` selects a pipeline stage; `counts` in the response are for ' +
          'the same scope, so a manager’s tabs add up to their own list rather than the ' +
          'whole company’s.',
        security: [{ bearerAuth: [] }],
        response: { 200: { description: 'Reservations', type: 'object' } },
      },
    },
    async (request) => {
      const { items, total, page, pageSize, counts } = await listReservations(
        request.query,
        request.user,
      );
      return { data: items, meta: { total, page, pageSize, counts, view: request.query.view } };
    },
  );

  fastify.get(
    '/reservations/:id',
    {
      preHandler: fastify.requirePermission('bookings.view'),
      preValidation: validate({ params: reservationParams }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'One reservation in full',
        description:
          'Includes the complete event history and the supplier allocations with their costs — ' +
          'none of which the customer-facing endpoints return.',
        security: [{ bearerAuth: [] }],
        params: docSchema(reservationParams, 'ReservationIdParams'),
        response: {
          200: { description: 'Reservation', type: 'object' },
          404: { description: 'Not found', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const { booking, timeline, allocations } = await getReservation(
        request.params.id,
        request.user,
      );
      /* Surfaced alongside, so the UI can explain why a confirm button is
       * disabled rather than letting somebody press it and get an error. */
      const blockers = await confirmationBlockers(request.params.id);
      return {
        data: booking,
        meta: {
          timeline,
          allocations,
          confirmationBlockers: blockers,
          /* So the UI offers exactly the moves this booking can make, from
           * the same table the server enforces. */
          allowedTransitions: allowedTransitionsFrom(booking.status),
        },
      };
    },
  );

  fastify.patch(
    '/reservations/:id/status',
    {
      preHandler: fastify.requirePermission('bookings.manage'),
      preValidation: validate({ params: reservationParams, body: transitionBody }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'Move a reservation through the pipeline',
        description:
          'Only transitions the lifecycle allows. Rejecting or cancelling needs a reason, and ' +
          'that reason is what the customer is shown. Confirming is refused while any supplier ' +
          'booking is unconfirmed — paying does not make a trip real.',
        security: [{ bearerAuth: [] }],
        params: docSchema(reservationParams, 'ReservationIdParams'),
        body: docSchema(transitionBody, 'ReservationTransition'),
        response: {
          200: { description: 'Moved', type: 'object' },
          400: { description: 'A reason is required', ...errorResponseSchema },
          409: { description: 'Not a legal transition, or blocked', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      /*
       * The confirmation gate, checked here rather than inside `transition`
       * so that the generic mover stays about lifecycle legality and this
       * stays about operational readiness. A booking can be legally movable
       * to CONFIRMED and still not be ready.
       */
      if (request.body.to === 'CONFIRMED') {
        const blockers = await confirmationBlockers(request.params.id);
        if (blockers.length > 0) {
          throw conflict(blockers.join(' '), { blockers });
        }
      }

      const booking = await transition(request.params.id, request.body, request.user);

      await recordAudit({
        request,
        action: 'booking.status',
        entity: 'booking',
        entityId: booking._id,
        entityLabel: booking.reference,
        after: { status: booking.status, reason: request.body.reason ?? null },
      });

      return { data: booking.toObject({ virtuals: true }) };
    },
  );

  fastify.patch(
    '/reservations/:id/assign',
    {
      preHandler: fastify.requirePermission('bookings.assign'),
      preValidation: validate({ params: reservationParams, body: assignBody }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'Assign a reservation to someone',
        security: [{ bearerAuth: [] }],
        params: docSchema(reservationParams, 'ReservationIdParams'),
        body: docSchema(assignBody, 'ReservationAssign'),
        response: { 200: { description: 'Assigned', type: 'object' } },
      },
    },
    async (request) => {
      const booking = await assignReservation(
        request.params.id,
        request.body.assignedTo,
        request.user,
      );
      await recordAudit({
        request,
        action: 'booking.assign',
        entity: 'booking',
        entityId: booking._id,
        entityLabel: booking.reference,
        after: { assignedTo: request.body.assignedTo },
      });
      return { data: booking.toObject({ virtuals: true }) };
    },
  );

  fastify.post(
    '/reservations/:id/notes',
    {
      preHandler: fastify.requirePermission('bookings.manage'),
      preValidation: validate({ params: reservationParams, body: noteBody }),
      schema: {
        tags: ['admin:bookings'],
        summary: 'Add a note, internal or to the customer',
        description:
          '`customerVisible` decides who reads it and defaults to false. An internal note the ' +
          'customer sees is a worse mistake than one they do not.',
        security: [{ bearerAuth: [] }],
        params: docSchema(reservationParams, 'ReservationIdParams'),
        body: docSchema(noteBody, 'ReservationNote'),
        response: { 201: { description: 'Noted', type: 'object' } },
      },
    },
    async (request, reply) => {
      const event = await addNote(request.params.id, request.body, request.user);
      return reply.status(201).send({ data: event.toObject() });
    },
  );
}
