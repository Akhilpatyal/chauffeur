/*
 * THE OPERATIONAL FACTS FOR EACH TRIP — fill these in.
 *
 * Everything else on a trip page is either editorial (written once, true for
 * the region) or derived from the catalogue. This file is different: it is the
 * things only the operator knows, and the things a traveller most needs before
 * handing over money. Where you pick people up. Which hotel. What happens if
 * they cancel. Who to ring at 2am in Kaza.
 *
 * HOW IT BEHAVES WHEN EMPTY
 *
 * Every section on the page reads from here and renders nothing at all when
 * the data is absent. There are no placeholders, no "TBC", no sample hotel
 * names. That is deliberate and it is the same rule as data/companyFacts.js:
 * an absent fact costs a little persuasion, an invented one costs the page its
 * credibility — and for a cancellation term, invented text is a consumer
 * protection problem rather than a trust problem.
 *
 * So you can fill this in a field at a time. Add a pickup point and the pickup
 * card appears. Leave `stays` empty and the accommodation section stays gone.
 * Nothing breaks, and nothing false is ever published.
 *
 * HOW TO ADD A TRIP
 *
 * Key it by the journey slug — the same id used in data/journeys.js and in the
 * URL. Copy the shape below, delete what you do not have yet, and fill in the
 * rest as it is confirmed.
 */

/*
 * Pickup and drop-off.
 *
 * `lat`/`lng` are what make the "get directions" button work, and they are
 * worth the two minutes it takes to find them: right-click the spot in Google
 * Maps and the first line of the menu is the coordinate pair. A `query` alone
 * also works, but a name like "Tosh" or "Bhuntar bus stand" can resolve to
 * more than one place, and the one time it resolves wrongly somebody misses
 * the bus.
 *
 *   pickup: {
 *     point: 'Manali Volvo Bus Stand, near Mall Road',
 *     lat: 32.2432, lng: 77.1892,
 *     reportBy: '05:30',     // when to be there
 *     departsAt: '06:00',    // when the vehicle leaves
 *     note: 'Look for the vehicle with a Taifer board at the north gate.',
 *     alternatives: [
 *       { point: 'Bhuntar Airport', lat: 31.8766, lng: 77.1544, surcharge: '₹500 per vehicle' },
 *     ],
 *   },
 *   dropoff: {
 *     point: 'Manali Volvo Bus Stand',
 *     lat: 32.2432, lng: 77.1892,
 *     expectedBy: '18:00 on day 6',
 *     note: 'Mountain roads. Do not book onward travel before 22:00 the same day.',
 *   },
 */

/*
 * Where people sleep.
 *
 * One entry per night. `property` is the actual name where it is confirmed;
 * leave it out and give `category` only where you rotate between places, and
 * say so in `confirmed` so nobody arrives expecting a specific hotel.
 *
 *   stays: [
 *     {
 *       nights: 'Nights 1–2',
 *       place: 'Kaza',
 *       property: 'Hotel Deyzor',        // omit if not fixed
 *       category: 'Guesthouse, 3-star equivalent',
 *       confirmed: true,                 // false => shown as "or similar"
 *       sharing: 'Twin sharing; triple on request',
 *       washroom: 'Attached, running hot water morning and evening',
 *       heating: 'Bukhari (wood stove) in the common room; extra quilts in rooms',
 *       meals: 'Breakfast and dinner included',
 *     },
 *   ],
 */

/*
 * Group size and vehicle.
 *
 *   group: {
 *     min: 6,                            // below this the departure may not run
 *     max: 14,
 *     vehicle: 'Tempo Traveller, 16-seater (max 14 travellers)',
 *     seating: 'Pushback seats, one seat per person, luggage on the carrier',
 *     shared: true,                      // false for a private departure
 *     coordinator: 'A Taifer road leader travels with the group throughout',
 *     soloPolicy: 'Solo travellers are paired with a same-gender roommate at no extra cost. A private room is ₹X per night.',
 *   },
 */

/*
 * Safety.
 *
 * `coordinator` is the number somebody actually answers. If there is no
 * 24-hour number, do not invent one — leave it out and the line does not
 * appear, which is more honest than a number that rings out.
 *
 *   safety: {
 *     coordinator: '+91 00000 00000',
 *     coordinatorHours: 'Reachable 24 hours during a running trip',
 *     medical: [
 *       { place: 'Kaza', facility: 'Community Health Centre, Kaza', note: 'Basic care and oxygen. Serious cases go to Shimla or Manali.' },
 *     ],
 *     evacuation: 'There is no helicopter evacuation in Spiti outside state emergency operations. The realistic plan from Kaza is a 9–12 hour road transfer.',
 *     insurance: 'Travel insurance covering high altitude is strongly recommended and is not included.',
 *     weatherPolicy: 'If a pass closes we reroute or substitute a night. We do not attempt closed passes.',
 *   },
 */

/*
 * Money and the booking.
 *
 * REFUND TIERS ARE A LEGAL COMMITMENT. Copy them from your actual terms —
 * whatever is written here is what a customer will hold you to, and India's
 * consumer protection rules treat a misleading refund term as an unfair
 * practice. If the terms are still being decided, leave `policy` out entirely
 * and the section does not render; the page then simply says nothing rather
 * than something wrong.
 *
 *   policy: {
 *     deposit: '₹5,000 per person to confirm a seat',
 *     balanceDue: '15 days before departure',
 *     methods: ['UPI', 'Bank transfer', 'Card'],
 *     refundTiers: [
 *       { window: 'More than 30 days before departure', refund: '90% of amount paid' },
 *       { window: '15–30 days', refund: '50%' },
 *       { window: 'Less than 15 days', refund: 'No refund' },
 *     ],
 *     reschedule: 'One date change at no charge if requested more than 21 days ahead. Inside that, a new booking.',
 *     confirmsAt: 'A departure is confirmed once the minimum group size is reached, usually 20 days before.',
 *   },
 *
 *   costs: {
 *     base: '₹14,999 per person on twin sharing',
 *     extras: [
 *       { item: 'Private room (single occupancy)', amount: '₹X per night' },
 *       { item: 'Camping at Chandratal', amount: 'Included' },
 *     ],
 *     taxes: '5% GST, charged on the total',
 *     notIncluded: 'Lunches on the road, entry fees, anything personal',
 *   },
 *
 *   documents: [
 *     'Government photo ID for every traveller — original, not a copy',
 *     'Inner Line Permit for Kinnaur, arranged by us from your ID',
 *   ],
 */

export const tripOperations = {
  /*
   * No trips are filled in yet, so none of these sections currently render.
   * Add the first one here, keyed by its slug, following the shapes above.
   *
   * Example of the minimum that makes something appear — just a pickup point
   * with coordinates is enough for the pickup card and its directions link:
   *
   *   'spiti-valley-circuit': {
   *     pickup: {
   *       point: 'Manali Volvo Bus Stand',
   *       lat: 32.2432,
   *       lng: 77.1892,
   *       reportBy: '05:30',
   *     },
   *   },
   */
};

/* True when there is anything at all worth rendering for this trip. */
const hasContent = (value) =>
  value !== undefined &&
  value !== null &&
  value !== '' &&
  !(Array.isArray(value) && value.length === 0) &&
  !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);

/*
 * Everything known about one trip's logistics, with the empty parts removed.
 *
 * Returns an object whose keys are only the sections that have real content,
 * so a component can ask `if (!ops.pickup) return null` and be sure it is not
 * rendering an empty card with a heading and nothing underneath.
 */
export function operationsFor(slug) {
  const record = tripOperations[slug];
  if (!record) return {};

  return Object.fromEntries(Object.entries(record).filter(([, value]) => hasContent(value)));
}

/* Whether this trip has any operational detail at all — for deciding whether
 * a whole "practical information" block is worth a heading. */
export const hasOperations = (slug) => Object.keys(operationsFor(slug)).length > 0;
