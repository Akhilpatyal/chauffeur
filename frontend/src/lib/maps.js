/*
 * Google Maps links.
 *
 * WHY LINKS AND NOT THE API
 *
 * The route map on a trip page is Leaflet over OpenTopoMap: free, unlimited,
 * no key, and it draws elevation contours and named passes, which is most of
 * what a Spiti or Ladakh route needs a reader to understand.
 *
 * Google's Maps JavaScript API would cost money at any real traffic — the
 * $200 monthly credit ended in March 2025 and Dynamic Maps now gets 10,000
 * free loads a month, then $7 per 1,000 — and it needs a billing account and
 * an API key sitting in the page source.
 *
 * But there is one thing Google does that a tile map cannot: open in the app
 * already on the traveller's phone, with their location, live traffic and
 * turn-by-turn directions to the pickup point. That is a URL. It needs no key,
 * has no quota, and costs nothing however many people use it.
 *
 * So: Leaflet draws the route, Google gets you to the bus.
 *
 * These build the documented Maps URLs scheme, which Google supports as a
 * stable public interface across Android, iOS and the web.
 * https://developers.google.com/maps/documentation/urls/get-started
 */

/* Coordinates win over a name when both are given: a place name is ambiguous
 * ("Tosh" matches more than one hamlet), a lat/lng is not. */
function destinationParam({ lat, lng, query }) {
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat},${lng}`;
  }
  return query ? String(query) : null;
}

/*
 * Turn-by-turn directions from wherever the traveller is to the point.
 *
 * No origin is set on purpose — leaving it out makes Google use the device's
 * current location, which is what somebody tapping "get directions" at 5am on
 * the morning of departure actually wants.
 */
export function directionsUrl({ lat, lng, query, placeId, mode = 'driving' } = {}) {
  const destination = destinationParam({ lat, lng, query });
  if (!destination) return null;

  const params = new URLSearchParams({ api: '1', destination, travelmode: mode });
  /* A place id pins the result to one specific listing rather than whatever
   * the text search returns today. Optional, because it has to be looked up. */
  if (placeId) params.set('destination_place_id', placeId);

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/*
 * The point on a map, without starting navigation — for "where is this?"
 * rather than "take me there".
 */
export function placeUrl({ lat, lng, query, placeId, zoom = 15 } = {}) {
  const destination = destinationParam({ lat, lng, query });
  if (!destination) return null;

  const params = new URLSearchParams({ api: '1', query: destination });
  if (placeId) params.set('query_place_id', placeId);
  if (typeof lat === 'number' && typeof lng === 'number' && !placeId) {
    /* Only meaningful for a coordinate: a text query resolves to a place and
     * Google picks its own framing. */
    params.set('zoom', String(zoom));
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/*
 * A route through several stops, which is how an itinerary reads.
 *
 * Google caps waypoints on the free URL scheme, and a long Himalayan route
 * has more stops than that, so this takes the first and last as origin and
 * destination and distributes the rest as waypoints up to the cap. A reader
 * wanting every leg has the day-by-day itinerary on the page; this is for
 * "roughly where does this go, in an app I already trust".
 */
const MAX_WAYPOINTS = 8;

export function routeUrl(stops = []) {
  const points = stops
    .map((s) => destinationParam(s))
    .filter(Boolean);
  if (points.length < 2) return null;

  const origin = points[0];
  const destination = points[points.length - 1];
  const middle = points.slice(1, -1);

  /* Evenly spaced rather than the first eight, so the shape of the route
   * survives rather than only its beginning. */
  const step = Math.max(1, Math.ceil(middle.length / MAX_WAYPOINTS));
  const waypoints = middle.filter((_, i) => i % step === 0).slice(0, MAX_WAYPOINTS);

  const params = new URLSearchParams({ api: '1', origin, destination, travelmode: 'driving' });
  if (waypoints.length) params.set('waypoints', waypoints.join('|'));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
