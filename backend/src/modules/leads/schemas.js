import { z } from 'zod';
import { INTEREST_KINDS, LEAD_SOURCES, LEAD_STATUSES } from '../../models/Lead.js';
import { stripTags } from '../../utils/sanitize.js';
import { paginationQuery } from '../../utils/pagination.js';

/*
 * Server-side rules mirror the frontend's, deliberately. The frontend copy is
 * for fast feedback; this copy is the one that decides what gets stored,
 * because anything can POST to this endpoint.
 */
const text = (max) =>
  z.string().transform((value) => stripTags(value)).pipe(z.string().max(max));

const optionalText = (max) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? stripTags(value) : undefined))
    .pipe(z.string().max(max).optional());

export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'That email address does not look right.');

/* Matches the characters the contact form allows, plus a length floor that
 * rejects the "1234" a bot types without rejecting real international forms. */
export const phoneField = z
  .string()
  .trim()
  .regex(/^[\d\s+()-]{7,20}$/, 'Use digits, spaces and + ( ) - only.')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createLeadBody = z
  .object({
    name: text(120).refine((value) => value.trim().length > 0, 'Please tell us your name.'),
    email: emailField,
    phone: phoneField,

    source: z.enum(LEAD_SOURCES).default('contact_form'),
    topic: optionalText(120),
    message: optionalText(5000),
    travelDates: optionalText(120),
    groupSize: optionalText(60),

    tripPreferences: z
      .object({
        destination: optionalText(120),
        vibe: optionalText(120),
        duration: optionalText(120),
        budget: optionalText(120),
        month: optionalText(60),
      })
      .partial()
      .optional(),

    interest: z
      .object({
        kind: z.enum(INTEREST_KINDS).optional(),
        slug: optionalText(120),
        title: optionalText(200),
      })
      .optional(),

    context: z
      .object({
        sourcePage: optionalText(500),
        referrer: optionalText(500),
      })
      .optional(),

    utm: z
      .object({
        source: optionalText(120),
        medium: optionalText(120),
        campaign: optionalText(200),
        term: optionalText(200),
        content: optionalText(200),
        gclid: optionalText(200),
        fbclid: optionalText(200),
      })
      .partial()
      .optional(),

    consent: z
      .object({
        marketing: z.boolean().optional(),
        terms: z.boolean().optional(),
      })
      .optional(),

    /*
     * Honeypot. A hidden input no human ever fills; anything here is a bot.
     * Named plausibly so a naive form-filler takes the bait.
     */
    website: z.string().max(200).optional(),

    recaptchaToken: z.string().max(3000).optional(),
  })
  .superRefine((value, ctx) => {
    // The contact form demands a message; the Plan My Trip modal collects
    // structured preferences instead, so it is exempt.
    const hasPreferences = Boolean(
      value.tripPreferences && Object.values(value.tripPreferences).some(Boolean),
    );
    if (!value.message?.trim() && !hasPreferences && !value.interest?.slug) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['message'],
        message: 'A line or two about your trip helps.',
      });
    }
  });

/* Admin-side query and mutation schemas. */
export const listLeadsQuery = paginationQuery.extend({
  status: z.enum(LEAD_STATUSES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  assignedTo: z.string().optional(),
  search: z.string().trim().max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeDuplicates: z.coerce.boolean().default(false),
  sort: z.string().max(80).optional(),
});

export const updateLeadStatusBody = z.object({
  status: z.enum(LEAD_STATUSES),
  reason: optionalText(500),
});

export const assignLeadBody = z.object({
  assignedTo: z.string().nullable(),
});

export const addNoteBody = z.object({
  body: text(5000).refine((value) => value.trim().length > 0, 'A note cannot be empty.'),
});

export const leadIdParams = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.'),
});
