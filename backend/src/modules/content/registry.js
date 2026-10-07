import { Journey } from '../../models/Journey.js';
import { Destination } from '../../models/Destination.js';
import { GroupTour } from '../../models/GroupTour.js';
import { Hotel } from '../../models/Hotel.js';
import { Testimonial } from '../../models/Testimonial.js';
import { TeamMember } from '../../models/TeamMember.js';
import { Article } from '../../models/Article.js';
import {
  journeyWrite,
  destinationWrite,
  groupTourWrite,
  hotelWrite,
  testimonialWrite,
  teamMemberWrite,
  articleWrite,
} from './schemas.js';

/*
 * One table describing every content collection.
 *
 * The alternative is seven near-identical route files that drift apart: one
 * forgets to invalidate its cache, another forgets the draft filter. Keeping
 * the differences (filters, sort keys, list projection) as data means the
 * shared behaviour is written once and cannot diverge.
 */

/* User input reaching a RegExp is a ReDoS and a wildcard-match bug waiting to
 * happen; escape it. */
export function escapeRegex(value) {
  // Escapes every RegExp metacharacter, including the backslash itself.
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Fields returned by list endpoints. Detail endpoints return everything.
 * Trimming the list payload is what keeps the homepage response small. */
const LIST_FIELDS = {
  journeys:
    'slug title location duration durationDays difficulty elevation groupSize price originalPrice discountLabel rating reviewsCount description highlights image secondaryImage tags upcomingDates isFeatured sortOrder',
  destinations:
    'slug name state tagline description coordinatesLabel elevation bestSeason temperature rating reviewsCount image aspectRatio badge tags isFeatured sortOrder',
  groupTours:
    'slug title destinationLabel datesLabel duration seatsTotal seatsRemaining price originalPrice rating reviewsCount badge leader description image tags filters isFeatured sortOrder',
  hotels:
    'slug name location distanceLabel price strikePrice discountPercent currency rating ratingLabel reviewsCount star type amenities experience bookingPerks freeCancellation badge badgeTone description image isEditorsPick isFeatured sortOrder',
  testimonials:
    'slug quote author location tripName rating avatar coverImage travelDate placements isFeatured sortOrder',
  team: 'slug name role bio image social sortOrder',
  articles:
    'slug title category excerpt readingTime author dateLabel image tags isFeatured publishedAt sortOrder',
};

function tagFilter(filter, tags) {
  if (tags?.length) filter.tags = { $all: tags };
}

function priceFilter(filter, { minPrice, maxPrice }, path = 'price.amount') {
  if (minPrice === undefined && maxPrice === undefined) return;
  filter[path] = {};
  if (minPrice !== undefined) filter[path].$gte = minPrice;
  if (maxPrice !== undefined) filter[path].$lte = maxPrice;
}

export const CONTENT_TYPES = {
  journeys: {
    model: Journey,
    label: 'Journey',
    cacheTag: 'journeys',
    listFields: LIST_FIELDS.journeys,
    labelField: 'title',
    slugSource: 'title',
    writeSchema: journeyWrite,
    sortable: ['sortOrder', 'createdAt', 'rating', 'price.amount', 'durationDays', 'title'],
    defaultSort: { isFeatured: -1, sortOrder: 1, createdAt: -1 },
    buildFilter(query) {
      const filter = {};
      tagFilter(filter, query.tags);
      priceFilter(filter, query);
      if (query.difficulty) filter.difficulty = query.difficulty;
      if (query.destination) filter.location = new RegExp(escapeRegex(query.destination), 'i');
      if (query.minRating !== undefined) filter.rating = { $gte: query.minRating };
      return filter;
    },
  },

  destinations: {
    model: Destination,
    label: 'Destination',
    cacheTag: 'destinations',
    listFields: LIST_FIELDS.destinations,
    labelField: 'name',
    slugSource: 'name',
    writeSchema: destinationWrite,
    sortable: ['sortOrder', 'createdAt', 'rating', 'name'],
    defaultSort: { sortOrder: 1, createdAt: -1 },
    buildFilter(query) {
      const filter = {};
      tagFilter(filter, query.tags);
      if (query.destination) filter.state = new RegExp(escapeRegex(query.destination), 'i');
      if (query.minRating !== undefined) filter.rating = { $gte: query.minRating };
      return filter;
    },
    transformWrite(data) {
      // Accept lat/lng as flat fields and store a GeoJSON point.
      const { lat, lng, ...rest } = data;
      if (lat !== undefined && lng !== undefined) {
        rest.coordinates = { type: 'Point', coordinates: [lng, lat] };
      }
      return rest;
    },
  },
  'group-tours': {
    model: GroupTour,
    label: 'Group tour',
    cacheTag: 'group-tours',
    listFields: LIST_FIELDS.groupTours,
    labelField: 'title',
    slugSource: 'title',
    writeSchema: groupTourWrite,
    sortable: ['sortOrder', 'createdAt', 'rating', 'price.amount', 'seatsRemaining'],
    defaultSort: { isFeatured: -1, sortOrder: 1, createdAt: -1 },
    buildFilter(query) {
      const filter = {};
      tagFilter(filter, query.tags);
      priceFilter(filter, query);
      if (query.type) filter.filters = query.type;
      return filter;
    },
  },

  hotels: {
    model: Hotel,
    label: 'Stay',
    cacheTag: 'hotels',
    listFields: LIST_FIELDS.hotels,
    labelField: 'name',
    slugSource: 'name',
    writeSchema: hotelWrite,
    sortable: ['sortOrder', 'createdAt', 'price', 'rating', 'star', 'name'],
    defaultSort: { isFeatured: -1, sortOrder: 1, createdAt: -1 },
    buildFilter(query) {
      const filter = {};
      priceFilter(filter, query, 'price');
      if (query.type) filter.type = query.type;
      if (query.star !== undefined) filter.star = { $gte: query.star };
      if (query.minRating !== undefined) filter.rating = { $gte: query.minRating };
      if (query.amenities?.length) filter.amenities = { $all: query.amenities };
      if (query.freeCancellation) filter.freeCancellation = true;
      if (query.destination) filter.location = new RegExp(escapeRegex(query.destination), 'i');
      return filter;
    },
  },

  testimonials: {
    model: Testimonial,
    label: 'Testimonial',
    cacheTag: 'testimonials',
    listFields: LIST_FIELDS.testimonials,
    labelField: 'author',
    slugSource: 'author',
    writeSchema: testimonialWrite,
    sortable: ['sortOrder', 'createdAt', 'rating'],
    defaultSort: { sortOrder: 1, createdAt: -1 },
    buildFilter(query) {
      return query.placement ? { placements: query.placement } : {};
    },
  },

  team: {
    model: TeamMember,
    label: 'Team member',
    cacheTag: 'team',
    listFields: LIST_FIELDS.team,
    labelField: 'name',
    slugSource: 'name',
    writeSchema: teamMemberWrite,
    sortable: ['sortOrder', 'createdAt', 'name'],
    defaultSort: { sortOrder: 1, createdAt: 1 },
    buildFilter: () => ({}),
  },

  articles: {
    model: Article,
    label: 'Article',
    cacheTag: 'articles',
    listFields: LIST_FIELDS.articles,
    labelField: 'title',
    slugSource: 'title',
    writeSchema: articleWrite,
    sortable: ['publishedAt', 'createdAt', 'sortOrder', 'title'],
    defaultSort: { isFeatured: -1, publishedAt: -1 },
    buildFilter(query) {
      const filter = {};
      tagFilter(filter, query.tags);
      if (query.category) filter.category = query.category;
      return filter;
    },
  },
};

export const CONTENT_KEYS = Object.keys(CONTENT_TYPES);

export function getContentType(key) {
  return CONTENT_TYPES[key] ?? null;
}
