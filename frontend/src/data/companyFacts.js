import { journeys } from './journeys';
import { destinations } from './destinations';
import { weekendEscapes } from './weekendEscapes';

/*
 * Claims the site makes about itself.
 *
 * The site previously advertised "10K+ Happy Travelers", "4.9★ Average Rating
 * — Across Google, Tripoto & more" and "250+ Journeys" under a heading reading
 * CERTIFIED RECORD 2026. None of those numbers came from anywhere, the 250 was
 * fifty times the real catalogue, and nothing was certified.
 *
 * That is not only a trust problem. India's consumer protection guidelines on
 * dark patterns (2023) treat fabricated or unverifiable reviews and ratings as
 * a prohibited practice, and "Certified" on an invented figure is the hardest
 * version of it to defend.
 *
 * So there are now exactly two kinds of number on this site:
 *
 *   DERIVED  - counted from the catalogue at build time. Always true, because
 *              it is computed from the same data the pages render.
 *   CLAIMED  - supplied by the business. Each one carries `verified`. While
 *              that is false the stat is NOT rendered at all, rather than
 *              rendered with a placeholder. An absent claim costs a little
 *              persuasion; a false one costs the whole page its credibility.
 *
 * TO PUBLISH A CLAIMED STAT: replace the value with the real figure, set
 * `verified: true`, and fill in `basis` so the next person knows where it came
 * from and can re-check it.
 */
export const derivedFacts = [
  {
    id: 'journeys',
    value: `${journeys.length}`,
    label: 'Journeys',
    sub: 'Multi-day routes we run ourselves',
  },
  {
    id: 'escapes',
    value: `${weekendEscapes.length}`,
    label: 'Weekend escapes',
    sub: 'Short trips around two days of leave',
  },
  {
    id: 'destinations',
    value: `${destinations.length}`,
    label: 'Regions',
    sub: 'Places we know well enough to plan properly',
  },
];

export const claimedFacts = [
  {
    id: 'travellers',
    value: null,
    label: 'Travellers hosted',
    sub: null,
    verified: false,
    basis: 'Count of confirmed bookings in the admin dashboard. Fill in once the booking records cover a full season.',
  },
  {
    id: 'rating',
    value: null,
    label: 'Average rating',
    sub: null,
    verified: false,
    basis: 'Only publish with a real source and a link travellers can check — a Google Business profile rating, for example. Do not average invented numbers.',
  },
  {
    id: 'years',
    value: null,
    label: 'Years running trips',
    sub: null,
    verified: false,
    basis: 'Date of company registration. Safe to publish as soon as someone confirms the year.',
  },
];

/* What the UI actually renders: everything derived, plus any claim someone has
 * verified. Nothing else reaches the page. */
export const publishedFacts = [
  ...derivedFacts,
  ...claimedFacts.filter((fact) => fact.verified && fact.value),
];

/*
 * Per-trip star ratings and review counts.
 *
 * Every `rating` and `reviews` value in the trip data is invented. Until those
 * are replaced by real reviews from a real source, the cards and detail pages
 * leave them out. Flip this to true only when the numbers behind it are true.
 */
export const SHOW_TRIP_RATINGS = false;

/*
 * Seat counts and "only N left" badges.
 *
 * The counts in the tour data are fixed strings that never change, so every
 * visitor has always seen the same "4 seats left" — textbook false urgency,
 * and named as such in the same 2023 guidelines. Scarcity is only shown when
 * it is read from a live seat count, which is the departures API.
 */
export const SHOW_SEAT_SCARCITY = false;
