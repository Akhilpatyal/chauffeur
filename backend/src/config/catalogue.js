/*
 * WHICH TRIPS THE API WILL ACTUALLY TAKE A BOOKING FOR.
 *
 * The site hides the booking controls on anything we are not running. That
 * is presentation, and presentation is not a control: a closed trip's
 * endpoint is still a POST away for anybody with the browser console open,
 * and "we did not render a button" is not an answer to a customer holding a
 * reference number for a trip nobody meant to sell.
 *
 * So the rule is enforced here as well, on the server, where it is the one
 * that counts.
 *
 * THIS LIST AND THE SITE'S MUST AGREE
 *
 * The companion is frontend/src/data/availability.js. They are separate
 * because the two apps build separately and neither imports the other — but
 * a trip open in one and closed in the other is a bug that shows up as
 * either an unbookable button or a silent 409, so `tests/catalogue.test.js`
 * reads both files and fails when they drift.
 *
 * Changing what we sell means changing both, in the same commit.
 *
 * OVERRIDE FOR OPERATIONS, NOT FOR CODE
 *
 * OPEN_TRIP_SLUGS in the environment replaces this list, so the desk can
 * close a trip mid-season — a landslide, a withdrawn permit — without a
 * deploy. An empty value is ignored rather than treated as "nothing is
 * open", because the failure mode of a mistyped variable should not be a
 * site that refuses every booking.
 */
import { env } from './env.js';

/* Kept sorted, and kept identical to the OPEN entries in the site's
 * availability.js. */
const DEFAULT_OPEN = ['bir-billing'];

function configured() {
  /* Already split and trimmed by the csv parser in config/env.js. */
  const slugs = (env.OPEN_TRIP_SLUGS ?? [])
    .map((slug) => slug.toLowerCase())
    .filter(Boolean);

  return slugs.length > 0 ? slugs : null;
}

export const OPEN_TRIP_SLUGS = new Set(configured() ?? DEFAULT_OPEN);

export const DEFAULT_OPEN_TRIP_SLUGS = DEFAULT_OPEN;

/*
 * A custom trip has no slug: somebody describing a trip they would like is
 * not booking a product off the catalogue, and the desk reads it and
 * decides. Refusing those would close the one route by which a customer can
 * ask about a region we have not opened yet — which is exactly the demand
 * we want to hear about.
 *
 * This is the static answer. `isTripOpenNow` below is the one to call.
 */
export function isTripOpen(slug) {
  if (!slug) return true;
  return OPEN_TRIP_SLUGS.has(String(slug).trim().toLowerCase());
}

/*
 * THE ANSWER THAT COUNTS, read from the CMS.
 *
 * Availability moved into the content collections so the desk can open and
 * close a trip, or schedule a season, without a deploy. This reads the record
 * the editor actually edits, applies any scheduled opening date, and only
 * falls back to the list above when a slug has no record at all — which is
 * true of the weekend escapes, since those live in the frontend's own data
 * files and have no CMS collection yet.
 *
 * It is deliberately a query per booking attempt rather than a cached map. A
 * booking is rare, a stale "open" is a trip we cannot run, and the index on
 * slug makes this the cheapest lookup in the request.
 */
export async function isTripOpenNow(slug, now = new Date()) {
  if (!slug) return true;

  const key = String(slug).trim().toLowerCase();

  /* Imported here rather than at the top: config is loaded before the models
   * register, and a top-level import would make this file part of that
   * cycle. */
  const [{ Journey }, { Destination }, { GroupTour }] = await Promise.all([
    import('../models/Journey.js'),
    import('../models/Destination.js'),
    import('../models/GroupTour.js'),
  ]);

  for (const Model of [Journey, Destination, GroupTour]) {
    const record = await Model.findOne({ slug: key }).select('status availability').lean();
    if (!record) continue;

    /* Unpublished means it is not on the site; it cannot be booked either.
     * This is how "disable it from the CMS" actually stops a booking. */
    if (record.status !== 'published') return false;

    const stored = record.availability ?? {};
    const opensOn = stored.opensOn ? new Date(stored.opensOn) : null;
    return stored.state === 'open' || Boolean(opensOn && opensOn <= now);
  }

  return isTripOpen(key);
}
