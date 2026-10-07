import { slugify } from '../src/utils/slugify.js';

/*
 * Maps the frontend's hardcoded shapes onto the database schemas.
 *
 * Kept as pure functions so the mapping can be unit-tested without a database,
 * and so re-running the seed is a deterministic no-op rather than a fresh set
 * of rows every time.
 */

/* "Rs 14,999" / "₹14,999" / 14999 -> 14999 */
export function parseMoney(value) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return value;
  const digits = String(value).replace(/[^\d.]/g, '');
  const amount = Number.parseFloat(digits);
  return Number.isFinite(amount) ? amount : undefined;
}

export function money(value, currency = 'INR') {
  const amount = parseMoney(value);
  if (amount === undefined) return undefined;
  return {
    amount,
    currency,
    // The original string is kept so the site renders the exact typography it
    // does today rather than a re-formatted number.
    display: typeof value === 'string' ? value : undefined,
  };
}

/* "6 Days · 5 Nights" -> 6 */
export function parseDurationDays(value) {
  const match = /(\d+)\s*Day/i.exec(String(value ?? ''));
  return match ? Number.parseInt(match[1], 10) : undefined;
}

const DIFFICULTIES = new Set([
  'Easy',
  'Easy to Moderate',
  'Moderate',
  'Moderate to Challenging',
  'Challenging',
]);

const difficulty = (value) => (DIFFICULTIES.has(value) ? value : '');

export function journeyFrom(record, index) {
  return {
    legacyId: record.id,
    slug: slugify(record.id || record.title),
    title: record.title,
    location: record.location ?? record.destination,
    duration: record.duration,
    durationDays: parseDurationDays(record.duration),
    difficulty: difficulty(record.difficulty),
    elevation: record.elevation,
    groupSize: record.groupSize,
    price: money(record.price),
    originalPrice: money(record.originalPrice),
    discountLabel: record.discount,
    rating: record.rating ?? 0,
    reviewsCount: record.reviews ?? record.reviewsCount ?? 0,
    description: record.description,
    highlights: record.highlights ?? [],
    inclusions: record.inclusions ?? [],
    upcomingDates: record.upcomingDates ?? [],
    itinerary: (record.itinerary ?? []).map((entry) => ({
      day: entry.day,
      title: entry.title,
      description: entry.desc ?? entry.description ?? '',
    })),
    image: record.image,
    secondaryImage: record.secondaryImage,
    gallery: [record.image, record.secondaryImage].filter(Boolean),
    tags: record.tags ?? [],
    isFeatured: Boolean(record.isFeatured),
    sortOrder: index * 10,
    status: 'published',
    seo: {
      title: record.title,
      description: record.description?.slice(0, 300),
      ogImage: record.image,
    },
  };
}

/*
 * The one journey with a fully authored detail page. Its extra content is
 * stored under `detail` rather than being forced into the shared fields, so the
 * frontend can keep rendering it exactly as it does now.
 */
export function authoredJourneyFrom(snapshot, index) {
  const { journey, itinerary, quickStats, highlights, included, routeStops } = snapshot;
  const title = [journey.title, journey.titleAccent].filter(Boolean).join(' ');

  return {
    legacyId: journey.id,
    slug: slugify(journey.id),
    title,
    location: journey.subtitle,
    duration: journey.eyebrow,
    durationDays: parseDurationDays(journey.eyebrow),
    price: money(journey.price),
    rating: journey.rating ?? 0,
    reviewsCount: journey.reviews ?? 0,
    description: journey.intro,
    highlights: (highlights ?? []).map((item) => item.text).filter(Boolean),
    inclusions: (included ?? []).map((item) => item.title ?? item.text ?? item).filter(Boolean),
    itinerary: (itinerary ?? []).map((day) => ({
      day: `Day ${day.day}`,
      title: day.title,
      description: day.description ?? '',
      meta: Array.isArray(day.meta) ? day.meta.map(String) : [],
      image: day.image,
    })),
    image: journey.heroImage,
    gallery: (itinerary ?? []).map((day) => day.image).filter(Boolean).slice(0, 10),
    tags: [],
    isFeatured: true,
    sortOrder: index * 10,
    status: 'published',
    detail: { ...journey, quickStats, routeStops, included, highlights },
    seo: { title, description: journey.intro?.slice(0, 300), ogImage: journey.heroImage },
  };
}

/*
 * The frontend stores coordinates as a display string ("32.2461° N, 78.0349° E").
 * Parsing it into a real GeoJSON point during the seed means the 2dsphere index
 * is useful from day one instead of indexing nothing.
 *
 * Returns undefined on anything it cannot read with confidence; a wrong point is
 * worse than no point.
 */
export function parseCoordinates(label) {
  if (typeof label !== 'string') return undefined;
  const matches = [...label.matchAll(/(-?\d+(?:\.\d+)?)\s*°?\s*([NSEW])/gi)];
  if (matches.length !== 2) return undefined;

  let lat;
  let lng;
  for (const [, value, hemisphere] of matches) {
    const magnitude = Number.parseFloat(value);
    const letter = hemisphere.toUpperCase();
    const signed = letter === 'S' || letter === 'W' ? -magnitude : magnitude;
    if (letter === 'N' || letter === 'S') lat = signed;
    else lng = signed;
  }

  if (lat === undefined || lng === undefined) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;

  // GeoJSON is [longitude, latitude] — the reverse of how people say it.
  return { type: 'Point', coordinates: [lng, lat] };
}

export function destinationFrom(record, index) {
  return {
    legacyId: record.id,
    slug: slugify(record.id || record.name),
    name: record.name,
    state: record.state,
    tagline: record.tagline,
    description: record.description,
    coordinatesLabel: record.coordinates,
    coordinates: parseCoordinates(record.coordinates),
    elevation: record.elevation,
    bestSeason: record.bestSeason,
    temperature: record.temperature,
    rating: record.rating ?? 0,
    reviewsCount: record.reviewsCount ?? 0,
    image: record.image,
    aspectRatio: ['tall', 'standard', 'wide'].includes(record.aspectRatio)
      ? record.aspectRatio
      : 'standard',
    badge: record.badge,
    tags: record.tags ?? [],
    sortOrder: index * 10,
    status: 'published',
    seo: { title: record.name, description: record.tagline, ogImage: record.image },
  };
}

/* The group tours page has two overlapping sources: `groupTours` (the homepage
 * rail) and `groupTourCards` (the listing page). They are merged by id, with the
 * richer card winning, so the same tour does not appear twice. */
export function mergeGroupTours(groupTours = [], groupTourCards = []) {
  const byId = new Map();
  for (const record of groupTours) byId.set(record.id, record);
  for (const card of groupTourCards) {
    byId.set(card.id, { ...(byId.get(card.id) ?? {}), ...card });
  }
  return [...byId.values()];
}

export function groupTourFrom(record, index, departures = []) {
  const own = departures.filter((departure) => departure.tourId === record.id);

  return {
    legacyId: record.id,
    slug: slugify(record.id || record.title),
    title: record.title,
    destinationLabel: record.destination ?? record.category,
    datesLabel: record.dates,
    duration: record.duration,
    seatsTotal: record.seatsTotal ?? 0,
    seatsRemaining: record.seatsRemaining ?? record.seatsLeft ?? 0,
    price: money(record.price),
    originalPrice: money(record.originalPrice),
    rating: record.rating ?? 0,
    reviewsCount: record.reviews ?? 0,
    badge: record.badge,
    leader: record.leader
      ? { name: record.leader.name, role: record.leader.role, avatar: record.leader.avatar }
      : undefined,
    description: record.description,
    highlights: record.highlights ?? [],
    inclusions: record.includes ?? record.inclusions ?? [],
    image: record.image,
    tags: record.tags ?? [],
    filters: [record.category].filter(Boolean),
    departures: own.map((departure) => ({
      label: [departure.day, departure.month].filter(Boolean).join(' '),
      seatsRemaining: departure.seatsLeft ?? 0,
      price: money(departure.price),
      status: (departure.seatsLeft ?? 0) === 0 ? 'sold_out' : (departure.seatsLeft ?? 0) <= 4 ? 'filling_fast' : 'open',
    })),
    isFeatured: Boolean(record.isFeatured),
    sortOrder: index * 10,
    status: 'published',
    seo: { title: record.title, description: record.description?.slice(0, 300), ogImage: record.image },
  };
}

export function hotelFrom(record, index, { editorsPick = false } = {}) {
  return {
    legacyId: record.id,
    slug: slugify(record.id || record.name),
    name: record.name,
    location: record.location,
    distanceLabel: record.distance,
    price: parseMoney(record.price),
    strikePrice: parseMoney(record.strikePrice),
    discountPercent: typeof record.discount === 'number' ? record.discount : undefined,
    rating: record.rating ?? 0,
    ratingLabel: record.ratingLabel,
    reviewsCount: record.reviews ?? 0,
    star: record.star ?? 0,
    type: record.type,
    amenities: record.amenities ?? [],
    experience: record.experience ?? [],
    bookingPerks: record.booking ?? [],
    freeCancellation: Boolean(record.freeCancellation),
    badge: record.badge ?? record.highlight,
    badgeTone: ['gold', 'forest', 'coral'].includes(record.highlightTone) ? record.highlightTone : '',
    description: record.description,
    image: record.image,
    isEditorsPick: editorsPick,
    sortOrder: index * 10,
    status: 'published',
    seo: { title: record.name, description: record.description?.slice(0, 300), ogImage: record.image },
  };
}

export function testimonialFrom(record, index, { placements = ['home'] } = {}) {
  return {
    legacyId: record.id,
    slug: slugify(`${record.id}-${record.author ?? record.name}`),
    quote: record.quote,
    author: record.author ?? record.name,
    location: record.location,
    tripName: record.tripName,
    rating: record.rating ?? 5,
    avatar: record.avatar ?? record.avatars?.[0],
    coverImage: record.coverImage,
    travelDate: record.travelDate,
    placements,
    sortOrder: index * 10,
    status: 'published',
  };
}

export function teamMemberFrom(record, index) {
  return {
    legacyId: record.id,
    slug: slugify(record.id || record.name),
    name: record.name,
    role: record.role,
    bio: record.bio,
    image: record.image,
    social: record.social ?? {},
    sortOrder: index * 10,
    status: 'published',
  };
}

export function articleFrom(record, index) {
  return {
    legacyId: record.id,
    slug: slugify(record.id || record.title),
    title: record.title,
    category: record.category,
    excerpt: record.excerpt,
    /* The frontend stores plain prose; wrapping it in a paragraph keeps the
     * reader rendering consistent once editors start using rich text. */
    content: record.content ? `<p>${record.content}</p>` : undefined,
    readingTime: record.readingTime,
    author: record.author,
    dateLabel: record.date,
    image: record.image,
    tags: [record.category].filter(Boolean),
    isFeatured: Boolean(record.featured),
    sortOrder: index * 10,
    status: 'published',
    seo: { title: record.title, description: record.excerpt?.slice(0, 300), ogImage: record.image },
  };
}
