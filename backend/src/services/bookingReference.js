import crypto from 'node:crypto';
import { Booking } from '../models/Booking.js';

/*
 * The handle a customer reads down the phone.
 *
 * Shape: TF-6K4M-2Q8R — a prefix and two four-character groups.
 *
 * DESIGN CHOICES THAT ARE NOT COSMETIC
 *
 * Not sequential. TF-0001 tells a competitor how many trips we have sold and
 * tells anyone that TF-0002 probably exists, which turns a reference into a
 * way to enumerate other people's bookings. Random removes both.
 *
 * No ambiguous characters. The alphabet below omits I, O, 0, 1 and S/5. A
 * reference is read aloud over a bad line from Kaza and written down by
 * somebody in a hurry, and "is that a one or an I" is a support call every
 * single time. Twenty-nine usable characters across eight random positions is
 * about 5×10^11 combinations, which is ample.
 *
 * Grouped with hyphens because people read and transcribe four characters at
 * a time far more reliably than eight.
 *
 * Uppercase, and matched case-insensitively on lookup, because nobody types
 * a reference the way it was printed.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const PREFIX = 'TF';
const GROUP = 4;
const GROUPS = 2;

function randomGroup() {
  /* crypto rather than Math.random: a predictable reference is a guessable
   * one, and these appear in URLs on quotation emails. */
  const bytes = crypto.randomBytes(GROUP);
  let out = '';
  for (let i = 0; i < GROUP; i += 1) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function buildReference() {
  return [PREFIX, ...Array.from({ length: GROUPS }, randomGroup)].join('-');
}

/*
 * A reference not already taken.
 *
 * Collisions are vanishingly unlikely but not impossible, and the unique
 * index on Booking.reference would turn one into a 500 at the worst possible
 * moment — the instant somebody submits a booking. So it retries, and the
 * attempt ceiling means a pathological case fails loudly rather than looping
 * inside a request.
 *
 * The check is still a race: two inserts could pass it simultaneously. The
 * unique index is the real guarantee, and createBooking retries on a
 * duplicate-key error. This just makes that path almost never taken.
 */
export async function uniqueReference({ attempts = 8 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const reference = buildReference();
    const taken = await Booking.exists({ reference });
    if (!taken) return reference;
  }
  throw new Error('Could not allocate a unique booking reference after several attempts.');
}

/*
 * Normalises whatever the customer typed into the stored form.
 *
 * Accepts "tf6k4m2q8r", "TF 6K4M 2Q8R" and "tf-6k4m-2q8r" — people drop the
 * hyphens, add spaces, and use lower case. Returns null for anything that
 * cannot be a reference, so a lookup route can reject it before querying.
 */
export function normaliseReference(input) {
  if (typeof input !== 'string') return null;

  const stripped = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!stripped.startsWith(PREFIX)) return null;

  const body = stripped.slice(PREFIX.length);
  if (body.length !== GROUP * GROUPS) return null;
  if ([...body].some((character) => !ALPHABET.includes(character))) return null;

  const groups = [];
  for (let i = 0; i < GROUPS; i += 1) {
    groups.push(body.slice(i * GROUP, (i + 1) * GROUP));
  }
  return [PREFIX, ...groups].join('-');
}
