import { z } from 'zod';

/*
 * Validation for customer accounts.
 *
 * Deliberately gentler than the admin's in one respect and identical in
 * another. Identical: the password floor. A traveller's account holds their
 * itinerary, their phone number and their payment history — it is not worth
 * less protection than a staff login.
 *
 * Gentler: almost everything is optional. A traveller signing up at 11pm to
 * ask about Spiti should not be made to supply an emergency contact and a
 * date of birth first. Those are collected when a booking is confirmed and
 * they are actually needed.
 */

/*
 * Length, not character classes.
 *
 * "Password1!" satisfies most complexity rules and is in every cracking
 * dictionary; a twelve-character passphrase is not. Length is the property
 * that correlates with resistance to guessing, and it is the one people can
 * satisfy without writing the result on a sticky note.
 */
export const passwordField = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(200)
  .refine((value) => value.trim().length >= 12, 'Use at least 12 characters.');

const emailField = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);

/*
 * Indian mobile numbers, loosely.
 *
 * Accepts +91, 0 prefixes and spacing, because people type their own number
 * the way they say it. Rejecting a valid number over formatting is a worse
 * failure than storing one with a space in it — the normalising happens in
 * utils/identity.js where it is needed for matching.
 */
const phoneField = z
  .string()
  .trim()
  .min(8, 'That number looks too short.')
  .max(32)
  .regex(/^[\d\s+()-]+$/, 'Use digits, spaces, + and - only.');

export const registerBody = z.object({
  name: z.string().trim().min(1, 'Tell us your name.').max(120),
  email: emailField,
  password: passwordField,
  phone: phoneField.optional(),
  /* Opting in is an explicit act. Defaulting this to true is the pattern
   * India's 2023 dark-pattern guidance calls out by name. */
  marketingOptIn: z.boolean().default(false),
});

export const loginBody = z.object({
  email: emailField,
  /* No length floor on sign-in: the rule applies to what may be set, not to
   * what may be attempted. Rejecting a short password here would tell an
   * attacker their guess was too short to be this account's. */
  password: z.string().min(1).max(200),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordField,
});

const travellerBody = z.object({
  fullName: z.string().trim().min(1).max(120),
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z.string().trim().max(40).optional().nullable(),
  relationship: z.string().trim().max(60).optional().nullable(),
});

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneField.optional().nullable(),
    marketingOptIn: z.boolean().optional(),
    emergencyContact: z
      .object({
        name: z.string().trim().max(120).optional().nullable(),
        phone: phoneField.optional().nullable(),
        relationship: z.string().trim().max(60).optional().nullable(),
      })
      .optional(),
    savedTravellers: z.array(travellerBody).max(20).optional(),
  })
  /* The email is not here. Changing the address an account signs in with is
   * a different operation with its own verification, not a profile edit —
   * otherwise taking over a session means taking over the account. */
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.');
