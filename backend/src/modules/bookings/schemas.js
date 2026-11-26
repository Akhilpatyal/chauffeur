import { z } from 'zod';

/*
 * What a customer may send when asking for a trip.
 *
 * Everything commercial is absent by design. There is no price, no status, no
 * discount and no amount anywhere in these schemas: those are set by the desk
 * and by an accepted quotation. A booking body that could carry a price is a
 * booking body somebody will eventually use to set one.
 */

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.');

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === '' ? null : value));

const travellerBody = z.object({
  fullName: z.string().trim().min(1, 'Each traveller needs a name.').max(120),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: optionalText(40),
  isLead: z.boolean().optional(),
});

const preferencesBody = z
  .object({
    roomSharing: optionalText(80),
    roomsRequested: z.coerce.number().int().min(0).max(20).optional().nullable(),
    pickupPoint: optionalText(200),
    transport: optionalText(200),
    accommodation: optionalText(200),
    budgetRange: optionalText(80),
    destinations: z.array(z.string().trim().max(120)).max(20).optional(),
    durationDays: z.coerce.number().int().min(1).max(60).optional().nullable(),
    addOns: z.array(z.string().trim().max(120)).max(20).optional(),
    specialRequests: optionalText(2000),
  })
  .optional();

/* Snapshot of the trip as the customer saw it. Taken from the client because
 * a custom request may reference no catalogue record at all — and verified
 * against the real trip on the server where a slug is given. */
const tripBody = z
  .object({
    slug: optionalText(140),
    title: optionalText(200),
    destination: optionalText(200),
    durationLabel: optionalText(80),
    imageUrl: optionalText(500),
  })
  .optional();

const baseBooking = {
  travellerCount: z.coerce.number().int().min(1, 'At least one traveller.').max(40),
  travellers: z.array(travellerBody).max(40).optional(),
  contact: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      email: z.string().trim().toLowerCase().email().max(254).optional(),
      phone: z.string().trim().min(8).max(32).optional(),
    })
    .optional(),
  trip: tripBody,
  preferences: preferencesBody,
  /*
   * Supplied by the client so a double-tapped button returns the booking it
   * already made rather than making a second one. Optional: a request without
   * it still works, it is simply not replay-safe.
   */
  idempotencyKey: z.string().trim().min(8).max(100).optional(),
};

/*
 * A fixed departure. The date is chosen by picking a real departure record,
 * not by typing a date — which is what lets the server check the trip is
 * actually running then.
 */
export const createFixedBookingBody = z.object({
  kind: z.literal('fixed_departure'),
  departureId: objectId,
  ...baseBooking,
});

/*
 * A custom trip. Dates are a wish rather than a selection, so they are
 * optional and carry a flexibility window — "mid-June, give or take a week"
 * is how these requests actually arrive.
 */
export const createCustomBookingBody = z.object({
  kind: z.literal('custom'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  dateFlexibilityDays: z.coerce.number().int().min(0).max(60).optional(),
  ...baseBooking,
});

/* Discriminated on `kind` so the error names the missing field for the right
 * shape rather than reporting both branches' failures at once. */
export const createBookingBody = z.discriminatedUnion('kind', [
  createFixedBookingBody,
  createCustomBookingBody,
]);

export const listBookingsQuery = z.object({
  scope: z.enum(['all', 'pending', 'upcoming', 'completed', 'cancelled']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

/*
 * An id or a booking reference.
 *
 * The reference is what the customer has in their email and can read down
 * the phone, so a link in a notification should use it. Accepting both means
 * the dashboard can link by reference without a second endpoint, and an
 * internal caller with an id does not have to look one up.
 */
export const bookingIdParams = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine(
      (value) => /^[a-f0-9]{24}$/i.test(value) || /^[A-Za-z0-9 -]{8,20}$/.test(value),
      'Not a booking id or reference.',
    ),
});

export const cancellationBody = z.object({
  reason: z.string().trim().max(1000).optional(),
});
