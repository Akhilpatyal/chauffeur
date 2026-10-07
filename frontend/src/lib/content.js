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
 *   1. Render the bundled data immediately. There is no spinner and no layout
 *      shift, because the data is already in the chunk the page just loaded.
 *   2. Fetch the API in the background.
 *   3. Swap only on success.
 *
 * So an API outage degrades to "yesterday's content" rather than an empty
 * page, and the first paint never waits on a network round trip. For a travel
 * site where most content changes a few times a month, that is the right
 * trade.
 */
const BASE = import.meta.env.VITE_API_URL || '/api/v1';

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
  const [items, setItems] = useState(fallback);
  const [source, setSource] = useState('bundled');

  useEffect(() => {
    let cancelled = false;

    fetchCollection(collection, limit).then((live) => {
      if (cancelled || !live) return;
      setItems(normalise ? live.map(normalise) : live);
      setSource('api');
    });

    return () => {
      cancelled = true;
    };
    /* `normalise` is defined inline by callers; depending on it would refetch
     * every render. The collection and limit are what actually identify the
     * request. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, limit]);

  return { items, source };
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
