import { z } from 'zod';

/*
 * Validation for quotations.
 *
 * Money arrives as integer minor units (paise) and is validated as such.
 * Accepting rupees here and converting would put a floating point number in
 * the path between the desk typing a price and the customer agreeing to it,
 * which is the one place it must not be.
 */
const minor = z.number().int();
const positiveMinor = minor.min(0);

export const quotationItem = z.object({
  label: z.string().trim().min(1, 'Every line needs a label.').max(200),
  detail: z.string().trim().max(500).optional().nullable(),
  category: z
    .enum(['accommodation', 'transport', 'activity', 'permit', 'meals', 'service', 'discount', 'tax', 'other'])
    .default('other'),
  quantity: z.number().min(0).default(1),
  unitLabel: z.string().trim().max(60).optional().nullable(),
  /* Negative is legitimate: a discount is a line like any other. */
  unitAmount: minor,
  vendorCost: minor.optional().nullable(),
});

const itineraryDay = z.object({
  day: z.number().int().min(1),
  title: z.string().trim().max(200).optional(),
  detail: z.string().trim().max(2000).optional(),
  stay: z.string().trim().max(200).optional(),
  meals: z.string().trim().max(120).optional(),
});

const quotationBody = {
  summary: z.string().trim().max(2000).optional().nullable(),
  itinerary: z.array(itineraryDay).max(40).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  travellerCount: z.number().int().min(1).max(40).optional().nullable(),
  roomConfiguration: z.string().trim().max(300).optional().nullable(),
  transportDetail: z.string().trim().max(500).optional().nullable(),
  inclusions: z.array(z.string().trim().max(300)).max(40).optional(),
  exclusions: z.array(z.string().trim().max(300)).max(40).optional(),
  currency: z.string().trim().length(3).optional(),
  advanceAmount: positiveMinor.optional(),
  paymentDeadline: z.coerce.date().optional().nullable(),
  cancellationTerms: z.string().trim().max(3000).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  revisionReason: z.string().trim().max(1000).optional().nullable(),
};

export const createQuotationBody = z.object({
  ...quotationBody,
  items: z.array(quotationItem).min(1, 'A quotation needs at least one line.').max(60),
});

/* Every field optional on an update, including items — a draft is saved
 * repeatedly while it is being written. */
export const updateQuotationBody = z.object({
  ...quotationBody,
  items: z.array(quotationItem).max(60).optional(),
});

export const respondBody = z.object({
  outcome: z.enum(['decline', 'request_changes']),
  message: z.string().trim().max(2000).optional(),
});

export const bookingIdParams = z.object({
  id: z.string().trim().min(1).max(64),
});

export const quotationParams = z.object({
  id: z.string().trim().min(1).max(64),
  quotationId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid quotation id.'),
});

export const adminQuotationParams = z.object({
  quotationId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid quotation id.'),
});
