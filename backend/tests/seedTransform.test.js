import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseMoney,
  money,
  parseDurationDays,
  journeyFrom,
  destinationFrom,
  hotelFrom,
  mergeGroupTours,
  groupTourFrom,
  testimonialFrom,
  articleFrom,
  parseCoordinates,
} from '../seed/transform.js';

/*
 * Pure-function tests over the real snapshot, so a change to the frontend data
 * that the mapping cannot handle fails here rather than halfway through a
 * production seed.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const snapshot = JSON.parse(
  readFileSync(path.resolve(here, '../seed/data/frontend-snapshot.json'), 'utf8'),
);

describe('money parsing', () => {
  it('reads a rupee-formatted string', () => {
    expect(parseMoney('₹14,999')).toBe(14999);
    expect(parseMoney('Rs 1,20,000')).toBe(120000);
    expect(parseMoney(8499)).toBe(8499);
  });

  it('returns undefined rather than NaN for unusable input', () => {
    expect(parseMoney('')).toBeUndefined();
    expect(parseMoney(null)).toBeUndefined();
    expect(parseMoney('on request')).toBeUndefined();
  });

  it('keeps the original display string alongside the amount', () => {
    expect(money('₹14,999')).toEqual({ amount: 14999, currency: 'INR', display: '₹14,999' });
  });
});

describe('duration parsing', () => {
  it('extracts the day count from the label the designs use', () => {
    expect(parseDurationDays('6 Days · 5 Nights')).toBe(6);
    expect(parseDurationDays('7 Days / 6 Nights')).toBe(7);
    expect(parseDurationDays('flexible')).toBeUndefined();
  });
});

describe('journey mapping', () => {
  const [first] = snapshot.journeys;

  it('maps every field the listing page renders', () => {
    const mapped = journeyFrom(first, 0);

    expect(mapped).toMatchObject({
      legacyId: first.id,
      slug: first.id,
      title: first.title,
      location: first.location,
      difficulty: first.difficulty,
      rating: first.rating,
      reviewsCount: first.reviews,
      status: 'published',
    });
    expect(mapped.price.amount).toBe(parseMoney(first.price));
    expect(mapped.highlights).toEqual(first.highlights);
  });

  it('normalises itinerary entries onto one field name', () => {
    const mapped = journeyFrom(first, 0);
    expect(mapped.itinerary).toHaveLength(first.itinerary.length);
    expect(mapped.itinerary[0].description).toBe(first.itinerary[0].desc);
  });

  it('blanks a difficulty the schema does not allow', () => {
    const mapped = journeyFrom({ ...first, difficulty: 'Brutal' }, 0);
    expect(mapped.difficulty).toBe('');
  });

  it('maps every journey in the snapshot without throwing', () => {
    expect(() => snapshot.journeys.map(journeyFrom)).not.toThrow();
    const slugs = snapshot.journeys.map((record, i) => journeyFrom(record, i).slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('coordinate parsing', () => {
  it('reads the display string into a GeoJSON point', () => {
    // GeoJSON is [longitude, latitude], the reverse of how the label reads.
    expect(parseCoordinates('32.2461° N, 78.0349° E')).toEqual({
      type: 'Point',
      coordinates: [78.0349, 32.2461],
    });
  });

  it('signs southern and western hemispheres', () => {
    expect(parseCoordinates('10.5° S, 20.25° W').coordinates).toEqual([-20.25, -10.5]);
  });

  it('returns undefined rather than a wrong point', () => {
    expect(parseCoordinates('somewhere up north')).toBeUndefined();
    expect(parseCoordinates('200° N, 400° E')).toBeUndefined();
    expect(parseCoordinates(undefined)).toBeUndefined();
  });

  it('parses every destination in the snapshot', () => {
    for (const record of snapshot.destinations) {
      expect(destinationFrom(record, 0).coordinates).toBeDefined();
    }
  });
});

describe('other collections', () => {
  it('maps destinations and keeps the coordinates label', () => {
    const mapped = destinationFrom(snapshot.destinations[0], 0);
    expect(mapped.name).toBe(snapshot.destinations[0].name);
    expect(mapped.coordinatesLabel).toBe(snapshot.destinations[0].coordinates);
    expect(['tall', 'standard', 'wide']).toContain(mapped.aspectRatio);
  });

  it('maps hotels with a numeric price so the page can filter on it', () => {
    const mapped = hotelFrom(snapshot.hotels[0], 0);
    expect(typeof mapped.price).toBe('number');
    expect(mapped.bookingPerks).toEqual(snapshot.hotels[0].booking);
  });

  it('flags editor picks separately', () => {
    expect(hotelFrom(snapshot.featuredStays[0], 0, { editorsPick: true }).isEditorsPick).toBe(true);
    expect(hotelFrom(snapshot.hotels[0], 0).isEditorsPick).toBe(false);
  });

  it('merges the two overlapping group-tour sources by id', () => {
    const merged = mergeGroupTours(snapshot.groupTours, snapshot.groupTourCards);
    const ids = merged.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(merged.length).toBeLessThanOrEqual(
      snapshot.groupTours.length + snapshot.groupTourCards.length,
    );
  });

  it('attaches dated departures to the right tour', () => {
    const merged = mergeGroupTours(snapshot.groupTours, snapshot.groupTourCards);
    const withDepartures = merged
      .map((record, index) => groupTourFrom(record, index, snapshot.departures))
      .filter((tour) => tour.departures.length > 0);

    for (const tour of withDepartures) {
      for (const departure of tour.departures) {
        expect(['open', 'filling_fast', 'sold_out', 'cancelled']).toContain(departure.status);
      }
    }
  });

  it('scopes group testimonials to the group tours page', () => {
    const mapped = testimonialFrom(snapshot.groupTestimonials[0], 0, { placements: ['group_tours'] });
    expect(mapped.placements).toEqual(['group_tours']);
    // The group shape stores the person under `name`, not `author`.
    expect(mapped.author).toBe(snapshot.groupTestimonials[0].name);
  });

  it('wraps article prose so the reader has markup to render', () => {
    const withBody = snapshot.journalArticles.find((article) => article.content);
    const mapped = articleFrom(withBody, 0);
    expect(mapped.content.startsWith('<p>')).toBe(true);
  });
});
