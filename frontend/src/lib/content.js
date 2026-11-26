import { useEffect, useState } from 'react';

/*
 * Content, from the API when it answers and from the bundled files when it
 * does not.
 *
 * The site reads its catalogue from static files, which means a price or a
 * description can only be changed by a developer and a redeploy — the admin
 * dashboard can edit content that never reaches a visitor. This hook closes
 * that gap without making the site depend on the API being up.
 *
 * The order matters:
 *
 *   1. Render the bundled data immediately. There is no spinner, because the
 *      data is already in the chunk the page just loaded.
 *   2. Fetch the API in the background and cache it.
 *   3. Use it from the cache — on this render if it is already there, on the
 *      next mount if it is not.
 *
 * So an API outage degrades to "yesterday's content" rather than an empty
 * page, and the first paint never waits on a network round trip.
 *
 * WHY THE LIVE DATA IS NOT SWAPPED IN MID-VIEW
 *
 * It used to be, and the original version of this comment claimed that caused
 * no layout shift. It did. The bundled copy and the API's are not the same
 * length — five journeys against six here — so the swap landed about a second
 * after paint and reflowed the grid underneath whoever was reading it. The
 * measured shift on /journeys was 0.272, where 0.25 is the threshold for
 * "poor", and it arrived at exactly the moment someone is reaching for a card.
 *
 * Replacing content under a reader's cursor is the thing to avoid, not the
 * staleness. So the fetch still happens on mount, but its result is only
 * *displayed* from the next mount onwards, and `warmContentCache()` runs at
 * app start so the cache is almost always filled before the visitor reaches a
 * listing page at all. The remaining case is someone landing directly on a
 * listing URL: they see the deployed copy for that one view, and live content
 * from their next navigation.
 */
const BASE = import.meta.env.VITE_API_URL || '/api/v1';

import { applyAvailability } from '../data/availability';

/* Module-level cache: navigating back to a listing should not refetch. */
const cache = new Map();
const inflight = new Map();

async function fetchCollection(collection, limit) {
  const key = `${collection}:${limit}`;
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const request = (async () => {
    try {
      const response = await fetch(`${BASE}/${collection}?limit=${limit}`, {
        headers: { accept: 'application/json' },
        /* A slow API must not hold the page hostage — the bundled copy is
         * already on screen, so give up quickly and keep it. */
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) return null;

      const body = await response.json();
      const items = Array.isArray(body?.data) ? body.data : null;
      /* An empty collection is almost always an unseeded environment rather
       * than a deliberate "we run no trips", so keep the bundled copy. */
      if (!items || items.length === 0) return null;

      cache.set(key, items);
      return items;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, request);
  return request;
}

/*
 * `fallback` is the bundled array. `normalise` maps an API record onto the
 * same shape the components already expect, so pages do not need to know
 * which source they are rendering.
 */
export function useContent(collection, fallback, normalise, { limit = 50 } = {}) {
  /*
   * Read the cache during the first render, not in an effect. If the warm-up
   * has already answered — which it usually has — the live content is in the
   * very first paint and there is nothing to shift.
   */
  const cached = cache.get(`${collection}:${limit}`);
  const [items] = useState(() =>
    cached ? (normalise ? cached.map(normalise) : cached) : fallback,
  );

  useEffect(() => {
    /* Still fetched on mount, so a visitor who lands straight on this page
     * fills the cache for their next navigation. The result is deliberately
     * not applied to this render — see the note at the top of the file. */
    fetchCollection(collection, limit);
    /* `normalise` is defined inline by callers; depending on it would refetch
     * every render. The collection and limit are what actually identify the
     * request. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, limit]);

  return { items, source: cached ? 'api' : 'bundled' };
}

/*
 * Called once at app start.
 *
 * The listing collections are small and cached for the session, so fetching
 * them up front costs one round trip each on an idle connection and means a
 * visitor who arrives on the homepage and then opens Journeys sees live
 * content in the first paint rather than the deployed snapshot.
 *
 * Deliberately not awaited and never throws: this is an optimisation, and a
 * failed warm-up simply leaves the bundled copy in place.
 */
export function warmContentCache(collections = ['journeys', 'weekend-escapes', 'group-tours', 'hotels', 'articles']) {
  if (typeof window === 'undefined') return;

  /*
   * Availability is fetched immediately rather than on idle like the rest.
   *
   * It decides whether a card says "Coming soon" and whether a page shows
   * booking controls at all, so arriving late means the first thing somebody
   * sees is last week's answer. It is one small object and it is cached for a
   * minute at the edge.
   */
  fetch(`${BASE}/availability`, { headers: { accept: 'application/json' } })
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => {
      if (body?.data) applyAvailability(body.data);
    })
    .catch(() => {
      /* The bundled map stands. Failing to the last known state is better
       * than failing to a blank page, and it fails closed. */
    });

  const start = () => {
    for (const collection of collections) {
      fetchCollection(collection, 50).catch(() => {});
    }
  };

  /* After the page has settled, so the warm-up never competes with the images
   * and fonts the first screen actually needs. */
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 3000 });
  } else {
    setTimeout(start, 1200);
  }
}

/*
 * The API stores money as { amount, currency, display } so it can be filtered
 * and sorted; the bundled files store the formatted string the designs use.
 * Components only ever want the string.
 */
export const money = (value) => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value.display) return value.display;
  if (typeof value.amount === 'number') {
    return `₹${value.amount.toLocaleString('en-IN')}`;
  }
  return undefined;
};

/* API journey -> the shape the journey pages already render. */
export const normaliseJourney = (record) => ({
  id: record.slug,
  title: record.title,
  location: record.location,
  duration: record.duration,
  difficulty: record.difficulty,
  elevation: record.elevation,
  groupSize: record.groupSize,
  price: money(record.price),
  originalPrice: money(record.originalPrice),
  discount: record.discountLabel,
  rating: record.rating,
  reviews: record.reviewsCount,
  description: record.description,
  highlights: record.highlights ?? [],
  inclusions: record.inclusions ?? [],
  image: record.image,
  secondaryImage: record.secondaryImage,
  tags: record.tags ?? [],
  isFeatured: record.isFeatured,
});

/* API stay -> the shape the hotels page already renders. */
export const normaliseHotel = (record) => ({
  id: record.slug,
  name: record.name,
  location: record.location,
  distance: record.distanceLabel,
  price: record.price,
  strikePrice: record.strikePrice,
  discount: record.discountPercent,
  rating: record.rating,
  ratingLabel: record.ratingLabel,
  reviews: record.reviewsCount,
  type: record.type,
  star: record.star,
  amenities: record.amenities ?? [],
  experience: record.experience ?? [],
  booking: record.bookingPerks ?? [],
  badge: record.badge,
  freeCancellation: record.freeCancellation,
  image: record.image,
  description: record.description,
});
