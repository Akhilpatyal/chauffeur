import { z } from 'zod';
import { stripTags, sanitizeRichText } from '../../utils/sanitize.js';
import { paginationQuery } from '../../utils/pagination.js';
import { CONTENT_STATUSES } from '../../models/contentBase.js';

const text = (max) =>
  z.string().max(max).transform((value) => stripTags(value));
const optText = (max) => text(max).optional();
const list = (max = 60) => z.array(text(max)).max(60).optional();

/* Money arrives either pre-formatted ("Rs 14,999") or numeric. Both are kept:
 * the number drives filtering and sorting, the string preserves the exact
 * typography the designs use. */
const money = z
  .object({
    amount: z.coerce.number().min(0).optional(),
    currency: z.string().max(8).default('INR'),
    display: optText(40),
  })
  .partial()
  .optional();

const seo = z
  .object({
    title: optText(200),
    description: optText(400),
    ogImage: z.string().url().max(600).optional(),
  })
  .partial()
  .optional();

/* Fields every content type accepts on write. */
const baseWrite = {
  slug: z.string().max(120).regex(/^[a-z0-9-]+$/i, 'Slugs may contain letters, numbers and hyphens.').optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
  publishedAt: z.coerce.date().optional(),
  seo,
};

const url = z.string().url().max(800);
const optUrl = url.optional();

export const journeyWrite = z.object({
  ...baseWrite,
  title: text(200),
  location: optText(200),
  duration: optText(80),
  durationDays: z.coerce.number().int().min(0).max(90).optional(),
  difficulty: z
    .enum(['Easy', 'Easy to Moderate', 'Moderate', 'Moderate to Challenging', 'Challenging', ''])
    .optional(),
  elevation: optText(60),
  groupSize: optText(60),
  price: money,
  originalPrice: money,
  discountLabel: optText(40),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewsCount: z.coerce.number().int().min(0).optional(),
  description: optText(3000),
  highlights: list(300),
  inclusions: list(300),
  exclusions: list(300),
  upcomingDates: list(40),
  itinerary: z
    .array(
      z.object({
        day: optText(40),
        title: text(200),
        description: optText(2000),
        meta: list(60),
        image: optUrl,
      }),
    )
    .max(40)
    .optional(),
  image: optUrl,
  secondaryImage: optUrl,
  gallery: z.array(url).max(30).optional(),
  videoUrl: optUrl,
  tags: list(60),
});

export const destinationWrite = z.object({
  ...baseWrite,
  name: text(160),
  state: optText(120),
  tagline: optText(300),
  description: optText(3000),
  coordinatesLabel: optText(80),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  elevation: optText(60),
  bestSeason: optText(80),
  temperature: optText(80),
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewsCount: z.coerce.number().int().min(0).optional(),
  image: optUrl,
  gallery: z.array(url).max(30).optional(),
  aspectRatio: z.enum(['tall', 'standard', 'wide']).optional(),
  badge: optText(60),
  tags: list(60),
});

export const groupTourWrite = z.object({
  ...baseWrite,
  title: text(200),
  destinationLabel: optText(200),
  datesLabel: optText(120),
  duration: optText(80),
  seatsTotal: z.coerce.number().int().min(0).optional(),
  seatsRemaining: z.coerce.number().int().min(0).optional(),
  price: money,
  originalPrice: money,
  rating: z.coerce.number().min(0).max(5).optional(),
  reviewsCount: z.coerce.number().int().min(0).optional(),
  badge: optText(80),
  leader: z
    .object({ name: optText(160), role: optText(160), avatar: optUrl })
    .partial()
    .optional(),
  description: optText(3000),
  highlights: list(300),
  inclusions: list(300),
  image: optUrl,
  gallery: z.array(url).max(30).optional(),
  tags: list(60),
  filters: list(60),
  departures: z
    .array(
      z.object({
        label: optText(120),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        seatsTotal: z.coerce.number().int().min(0).optional(),
        seatsRemaining: z.coerce.number().int().min(0).optional(),
        price: money,
        status: z.enum(['open', 'filling_fast', 'sold_out', 'cancelled']).optional(),
      }),
    )
    .max(60)
    .optional(),
});

export const hotelWrite = z.object({
  ...baseWrite,
  name: text(200),
  location: optText(200),
  distanceLabel: optText(80),
  price: z.coerce.number().min(0).optional(),
  strikePrice: z.coerce.number().min(0).optional(),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  currency: z.string().max(8).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  ratingLabel: optText(40),
  reviewsCount: z.coerce.number().int().min(0).optional(),
  star: z.coerce.number().min(0).max(5).optional(),
  type: optText(80),
  amenities: list(60),
  experience: list(60),
  bookingPerks: list(60),
  freeCancellation: z.boolean().optional(),
  badge: optText(60),
  badgeTone: z.enum(['gold', 'forest', 'coral', '']).optional(),
  description: optText(3000),
  image: optUrl,
  gallery: z.array(url).max(30).optional(),
  isEditorsPick: z.boolean().optional(),
});

export const testimonialWrite = z.object({
  ...baseWrite,
  quote: text(2000),
  author: text(120),
  location: optText(160),
  tripName: optText(200),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  avatar: optUrl,
  coverImage: optUrl,
  travelDate: optText(60),
  placements: z.array(z.enum(['home', 'journey', 'group_tours', 'about', 'hotels'])).optional(),
});

export const teamMemberWrite = z.object({
  ...baseWrite,
  name: text(120),
  role: text(120),
  bio: optText(2000),
  image: optUrl,
  imageKey: z.string().max(300).optional(),
  email: z.string().email().max(254).optional(),
  social: z
    .object({
      facebook: z.string().max(300).optional(),
      instagram: z.string().max(300).optional(),
      linkedin: z.string().max(300).optional(),
      x: z.string().max(300).optional(),
    })
    .partial()
    .optional(),
});

export const articleWrite = z.object({
  ...baseWrite,
  title: text(250),
  category: optText(120),
  excerpt: optText(1000),
  /* The only field that keeps markup, and it goes through an allow-list
   * sanitiser rather than being trusted. */
  content: z.string().max(200000).optional().transform((value) => (value ? sanitizeRichText(value) : value)),
  readingTime: optText(40),
  author: optText(120),
  dateLabel: optText(60),
  image: optUrl,
  tags: list(60),
});

/* Query schema shared by every public listing. */
export const listQuery = paginationQuery.extend({
  search: z.string().trim().max(120).optional(),
  tags: z
    .string()
    .max(300)
    .optional()
    .transform((value) => (value ? value.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined)),
  featured: z.coerce.boolean().optional(),
  sort: z.string().max(80).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  destination: z.string().max(120).optional(),
  difficulty: z.string().max(60).optional(),
  type: z.string().max(80).optional(),
  amenities: z
    .string()
    .max(300)
    .optional()
    .transform((value) => (value ? value.split(',').map((item) => item.trim()).filter(Boolean) : undefined)),
  star: z.coerce.number().min(0).max(5).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  category: z.string().max(120).optional(),
  placement: z.string().max(40).optional(),
  freeCancellation: z.coerce.boolean().optional(),
});

/* Admin listings additionally see drafts. */
export const adminListQuery = listQuery.extend({
  status: z.enum([...CONTENT_STATUSES, 'all']).optional(),
});

export const slugParams = z.object({
  slug: z.string().max(120).regex(/^[a-z0-9-]+$/i),
});

export const idParams = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id.'),
});
