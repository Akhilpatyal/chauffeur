/*
 * WHAT WE ARE ACTUALLY RUNNING RIGHT NOW.
 *
 * One list, read by every card, every detail page and every booking control,
 * so the answer to "can somebody book this?" is given in one place rather
 * than inferred separately by each surface. Four pages disagreeing about
 * whether Ladakh is open is not a styling bug; it is the site telling a
 * customer something untrue.
 *
 * TWO KINDS OF "NOT YET", AND THEY ARE NOT THE SAME
 *
 *   `seasonal`   — we run this, but not now. The pass is shut, the season
 *                  has ended. There is a date, and we say it.
 *   `coming_soon` — we do not run this yet. There is no date, so we do not
 *                  invent one.
 *
 * Collapsing both into "Coming soon" would be easier and worse: somebody
 * reading "coming soon" about Spiti in November concludes we are a new
 * company that has not got there yet, when the truth is that the Kunzum La
 * is under fifteen feet of snow and reopens in May. The second answer is
 * better news and it has the advantage of being true.
 *
 * ANYTHING NOT LISTED IS CLOSED
 *
 * `fallback` below is deliberately not `open`. A trip added to the catalogue
 * without being added here shows as not-yet-running rather than quietly
 * advertising itself as bookable. Being invisible is a bug somebody notices;
 * taking money for a trip nobody meant to sell is a refund and an apology.
 *
 * THE SERVER DOES NOT TRUST THIS FILE
 *
 * Everything here is presentation. The API keeps its own copy of the open
 * list in backend/src/config/catalogue.js and refuses a booking for anything
 * closed, because hiding a button has never stopped anybody from posting to
 * an endpoint. The two lists must be changed together — there is a test on
 * each side that fails if they drift.
 */

export const OPEN = 'open';
export const SEASONAL = 'seasonal';
export const COMING_SOON = 'coming_soon';

/* The one date in this file. Kept as a constant because it appears in copy
 * in several places and a season that reopens in May on one card and June on
 * another is the kind of detail people screenshot. */
const SPITI_REOPENS = 'May 2027';

const SPITI_SEASON = {
  state: SEASONAL,
  label: `Opens ${SPITI_REOPENS}`,
  short: 'Seasonal',
  headline: 'Spiti is shut for the winter',
  note: `The Kunzum La and the Rohtang approach are under snow from late October. The road reopens in May and we publish dates as soon as it does — usually a fortnight ahead of the first departure.`,
  cta: 'Tell me when Spiti opens',
};

const NOT_RUNNING_YET = (headline, note) => ({
  state: COMING_SOON,
  label: 'Coming soon',
  short: 'Coming soon',
  headline,
  /* No dates, because we do not have any. "Early next year" is a promise
   * made by whoever wrote the copy rather than by anyone who could keep it. */
  note,
  cta: 'Tell me when this opens',
});

const ENTRIES = {
  /* ---- Running now ---- */
  'bir-billing': { state: OPEN },

  /* ---- Himachal, but not yet selling ----
   * These were open while "Himachal places are open" was the rule. The
   * landing-page brief narrowed that to Bir Billing alone, so they are
   * announcements again until the desk says otherwise. */
  himachal: NOT_RUNNING_YET(
    'We are not running the wider Himachal yet',
    'Bir Billing is the one we run today. The Kullu and Parvati valleys follow once we can do them as well.',
  ),
  dharamshala: NOT_RUNNING_YET(
    'Dharamshala is not open yet',
    'A morning from Bir, and next on our list. We will open it when the stays and the walk are ones we would send you on.',
  ),
  'himachal-manali-parvati': NOT_RUNNING_YET(
    'This journey is not running yet',
    'We are walking the Parvati valley before we sell it.',
  ),
  'triund-sunrise-trek': NOT_RUNNING_YET(
    'This escape is not running yet',
    'The ridge camp needs permits and a trek leader we have worked a season with.',
  ),
  'kasol-tosh-riverside': NOT_RUNNING_YET(
    'This escape is not running yet',
    'Opening after Bir Billing.',
  ),
  'manali-solang-weekend': NOT_RUNNING_YET(
    'This escape is not running yet',
    'Opening after Bir Billing.',
  ),
  /* Dharamshala and Bir Billing are open as regions, taking custom trips.
   * There is no fixed weekend product for either yet: a priced itinerary
   * needs stays, a paragliding operator and cancellation terms that only
   * the desk can supply, and inventing them is how a website starts lying. */

  /* Group tours (data/groupToursPage.js). The landing page announces the
   * whole collection as on its way, so none of them are selling. */
  'manali-explorer': NOT_RUNNING_YET(
    'This group tour is not running yet',
    'A new collection of group journeys is on its way.',
  ),
  'kasol-tosh-escape': NOT_RUNNING_YET(
    'This group tour is not running yet',
    'A new collection of group journeys is on its way.',
  ),
  'himachal-heritage-trail': NOT_RUNNING_YET(
    'This group tour is not running yet',
    'A new collection of group journeys is on its way.',
  ),

  /* ---- Ours, but out of season ---- */
  spiti: SPITI_SEASON,
  'spiti-circuit': SPITI_SEASON,
  'group-spiti-expedition': SPITI_SEASON,

  /* Hampta crosses a 14,000 ft pass; it is a summer trek, not an all-year
   * one, and the snow line decides that rather than we do. */
  'hampta-pass-trek': {
    state: SEASONAL,
    label: 'Opens in June',
    short: 'Seasonal',
    headline: 'Hampta is a summer crossing',
    note: 'The pass sits above 14,000 ft and holds snow into early June. We walk it between June and September, and publish dates once the line has moved up.',
    cta: 'Tell me when Hampta opens',
  },

  /* ---- Not running yet ---- */
  kashmir: NOT_RUNNING_YET(
    'We are not running Kashmir yet',
    'We only sell a region once we have driven it ourselves and know which houseboat and which driver we would put our own family with. Kashmir is next on that list.',
  ),
  'kashmir-meadows': NOT_RUNNING_YET(
    'This journey is not running yet',
    'We are walking the Pir Panjal meadows and meeting operators before we sell a single seat.',
  ),
  ladakh: NOT_RUNNING_YET(
    'We are not running Ladakh yet',
    'Ladakh needs permits, acclimatisation plans and drivers we trust at 17,000 ft. We would rather open it late than open it badly.',
  ),
  'ladakh-traverse': NOT_RUNNING_YET(
    'This journey is not running yet',
    'The traverse crosses three passes above 16,000 ft. We are not selling it until our altitude plan is one we would follow ourselves.',
  ),
  meghalaya: NOT_RUNNING_YET(
    'We are not running Meghalaya yet',
    'The living root bridges are a long way from our home valleys. We are building the ground team before we take bookings.',
  ),
  'meghalaya-living-roots': NOT_RUNNING_YET(
    'This journey is not running yet',
    'We are still finding homestays in the Khasi hills that we would send you to.',
  ),
  uttarakhand: NOT_RUNNING_YET(
    'We are not running Uttarakhand yet',
    'Close to home and high on our list — but not yet something we can do better than the people already doing it well.',
  ),
  rajasthan: NOT_RUNNING_YET(
    'We are not running Rajasthan yet',
    'We are a mountain company. Rajasthan is on the map because people ask, not because we are ready.',
  ),
  kerala: NOT_RUNNING_YET(
    'We are not running Kerala yet',
    'The backwaters are a long way from the Dhauladhar. We will open them when we can do it properly.',
  ),
  'rishikesh-river-weekend': NOT_RUNNING_YET(
    'This escape is not running yet',
    'Rafting is a safety-critical thing to sell. We are not selling it until we have picked our operator and watched them work.',
  ),
  'jaipur-heritage-weekend': NOT_RUNNING_YET(
    'This escape is not running yet',
    'Outside our mountains for now.',
  ),
  'kodaikanal-misty-weekend': NOT_RUNNING_YET(
    'This escape is not running yet',
    'Outside our mountains for now.',
  ),
  'group-rajasthan-caravan': NOT_RUNNING_YET(
    'This group tour is not running yet',
    'Outside our mountains for now.',
  ),
  'group-kerala-kayak': NOT_RUNNING_YET(
    'This group tour is not running yet',
    'Outside our mountains for now.',
  ),
  'group-kedarkantha-summit': NOT_RUNNING_YET(
    'This group tour is not running yet',
    'A winter summit trek needs guides we have worked a season with. We are getting there.',
  ),
  'group-goa-gokarna': NOT_RUNNING_YET(
    'This group tour is not running yet',
    'Outside our mountains for now.',
  ),
};

const FALLBACK = NOT_RUNNING_YET(
  'This is not running yet',
  'We have not opened this one for booking.',
);

/*
 * What the API said, once it has answered.
 *
 * The map below is the starting position, not the truth: availability now
 * lives in the CMS so the desk can open a trip or schedule a season without a
 * deploy. This file is what renders on the first paint and whenever the API
 * cannot be reached — a site that shows last week's availability is better
 * than one that shows an empty page, and failing to a closed state is the
 * safe direction.
 *
 * Anything the API returns wins. Anything it does not mention — the weekend
 * escapes, which have no CMS collection yet — keeps the entry below.
 */
let overrides = {};

export function applyAvailability(fromApi) {
  if (!fromApi || typeof fromApi !== 'object') return;
  overrides = fromApi;
}

/* Normalises an API record into the shape the components already read, so no
 * component has to know where the answer came from. */
function fromApiRecord(id, record) {
  const base = ENTRIES[id] ?? FALLBACK;
  if (record.state === OPEN) return { state: OPEN };

  const seasonal = record.state === SEASONAL;
  const openDate = record.opensOn
    ? new Date(record.opensOn).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return {
    state: seasonal ? SEASONAL : COMING_SOON,
    /* A real date beats any wording: "Opens March 2027" is worth reading and
     * "Coming soon" is not. */
    label: record.opensLater && openDate ? `Opens ${openDate}` : base.label ?? 'Coming soon',
    short: seasonal ? 'Seasonal' : 'Coming soon',
    headline: record.headline || base.headline,
    note: record.note || base.note,
    cta: base.cta ?? 'Tell me when this opens',
  };
}

/* Everything the UI needs about one product, never null — so no caller has
 * to guard, and a missing entry fails closed rather than crashing. */
export function availabilityFor(id) {
  if (!id) return FALLBACK;
  const live = overrides[id];
  if (live) return fromApiRecord(id, live);
  return ENTRIES[id] ?? FALLBACK;
}

export const isOpen = (id) => availabilityFor(id).state === OPEN;
export const isSeasonal = (id) => availabilityFor(id).state === SEASONAL;

/* Used by the listing pages to sort what somebody can actually book to the
 * top, rather than making them scroll past six things they cannot have. */
export const openFirst = (a, b) => Number(isOpen(b)) - Number(isOpen(a));

/* The ids the API also treats as open. Exported so a test can compare the
 * two lists and fail when they drift apart. */
export const OPEN_IDS = Object.entries(ENTRIES)
  .filter(([, value]) => value.state === OPEN)
  .map(([id]) => id)
  .sort();
