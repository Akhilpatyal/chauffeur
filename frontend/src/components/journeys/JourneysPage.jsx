import React, { useMemo, useRef, useState } from 'react';
import { CalendarRange, Compass, Mountain } from 'lucide-react';
import Footer from '../footer/Footer';
import Newsletter from '../sections/Newsletter';
import PageHero from '../common/PageHero';
import Breadcrumb from '../common/Breadcrumb';
import FilterTabs from '../common/FilterTabs';
import CTABand from '../common/CTABand';
import TripCard from '../cards/TripCard';
import { journeys } from '../../data/journeys';
import { weekendEscapes } from '../../data/weekendEscapes';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { useDocumentMeta } from '../../lib/seo';
import { linkProps } from '../../router';

/*
 * /journeys — the listing page.
 *
 * The navbar, the footer and the homepage all offered "Journeys" and "View all
 * journeys", but /journeys resolved to the *detail* template, so it rendered
 * one authored journey as though it were the index. This is the page all three
 * were pointing at.
 *
 * Filters are derived from the data rather than hardcoded, so adding a journey
 * with a new difficulty extends the filter row on its own.
 */
const DIFFICULTY_ORDER = [
  'Easy',
  'Easy to Moderate',
  'Moderate',
  'Moderate to Challenging',
  'Challenging',
];

/* "Rs 14,999" -> 14999, for sorting. */
const priceValue = (value) => Number(String(value ?? '').replace(/[^\d]/g, '')) || 0;
const durationDays = (value) => Number(/(\d+)\s*Day/i.exec(String(value ?? ''))?.[1]) || 0;

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'duration', label: 'Shortest first' },
  { id: 'rating', label: 'Highest rated' },
];

export default function JourneysPage({ onPlanTrip }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 90%', stagger: 0.06 });

  const [difficulty, setDifficulty] = useState('all');
  const [sort, setSort] = useState('recommended');

  useDocumentMeta({
    title: 'Himalayan Journeys & Expeditions',
    description:
      'Small-group journeys across Spiti, Ladakh, Kashmir, Himachal and Meghalaya. Real routes, local guides, fixed departures and no booking fees.',
    image: journeys[0]?.image,
  });

  /* One tab per difficulty actually present in the data, in sensible order. */
  const difficultyOptions = useMemo(() => {
    const present = DIFFICULTY_ORDER.filter((level) =>
      journeys.some((journey) => journey.difficulty === level)
    );
    return [
      { id: 'all', label: 'All journeys', count: journeys.length },
      ...present.map((level) => ({
        id: level,
        label: level,
        count: journeys.filter((journey) => journey.difficulty === level).length,
      })),
    ];
  }, []);

  const visible = useMemo(() => {
    const filtered =
      difficulty === 'all'
        ? [...journeys]
        : journeys.filter((journey) => journey.difficulty === difficulty);

    switch (sort) {
      case 'price-asc':
        return filtered.sort((a, b) => priceValue(a.price) - priceValue(b.price));
      case 'price-desc':
        return filtered.sort((a, b) => priceValue(b.price) - priceValue(a.price));
      case 'duration':
        return filtered.sort((a, b) => durationDays(a.duration) - durationDays(b.duration));
      case 'rating':
        return filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      default:
        /* Featured first, then by rating - the editorial default. */
        return filtered.sort(
          (a, b) =>
            Number(b.isFeatured) - Number(a.isFeatured) || (b.rating ?? 0) - (a.rating ?? 0)
        );
    }
  }, [difficulty, sort]);

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <PageHero
        eyebrow="Curated expeditions"
        image={journeys[0]?.image}
        title="Journeys"
        subtitle="Multi-day routes through the high Himalaya, planned by people who have driven and walked every kilometre of them."
        facts={[
          { icon: Compass, label: 'Routes', value: `${journeys.length} journeys` },
          { icon: Mountain, label: 'Regions', value: '5 Himalayan states' },
          { icon: CalendarRange, label: 'Departures', value: 'Fixed & private' },
        ]}
      />

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: 'Home', path: '/' }, { label: 'Journeys' }]}
            className="mb-8"
          />

          {/* Filter and sort row */}
          <div className="flex flex-col gap-4 border-b border-[#DDD4C1] pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="font-display text-[24px] leading-tight text-[#012C18] sm:text-[28px]">
                Every route we run
              </h2>
              <p className="mt-1 max-w-[70ch] text-[12.5px] text-[#5E6B63]">
                Filter by how hard you want it to be. Every journey includes stays, meals on the
                road, permits and a local expedition leader.
              </p>
            </div>

            <div className="shrink-0">
              <label htmlFor="journey-sort" className="sr-only">
                Sort journeys
              </label>
              <select
                id="journey-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="w-full rounded-lg border border-[#DDD4C1] bg-[#FAF9F5] px-3.5 py-2.5 text-[12.5px] text-[#012C18] outline-none transition-colors focus:border-[#075333] lg:w-[220px]"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <FilterTabs
              options={difficultyOptions}
              value={difficulty}
              onChange={setDifficulty}
              label="Filter journeys by difficulty"
            />
          </div>

          <p aria-live="polite" className="mt-4 text-[12px] text-[#8A9189]">
            Showing {visible.length} of {journeys.length} journeys
          </p>

          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((journey) => (
              <li key={journey.id} data-reveal className="h-full">
                <TripCard
                  href={`/journeys/${journey.id}`}
                  ctaLabel="View journey"
                  trip={{
                    title: journey.title,
                    location: journey.location,
                    duration: journey.duration,
                    price: journey.price,
                    originalPrice: journey.originalPrice,
                    discount: journey.discount,
                    rating: journey.rating,
                    reviews: journey.reviews,
                    badge: journey.isFeatured ? 'Featured' : journey.difficulty,
                    image: journey.image,
                    description: journey.description,
                    tags: journey.tags,
                    meta: journey.groupSize,
                  }}
                />
              </li>
            ))}
          </ul>

          {/*
            Cross-link: short trips live on their own page, and someone browsing
            eight-day expeditions with two days of leave is in the wrong place.
          */}
          <section className="mt-14 rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-[22px] leading-tight text-[#012C18] sm:text-[26px]">
                  Only have a long weekend?
                </h2>
                <p className="mt-1.5 max-w-[56ch] text-[13px] text-[#5E6B63]">
                  {weekendEscapes.length} short escapes that work around two days of leave, from
                  riverside camps to a ridge-top sunrise.
                </p>
              </div>
              <a
                {...linkProps('/weekend-escapes')}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#C9C2B0] px-6 py-3 text-[12.5px] font-semibold text-[#012C18] transition-colors hover:border-[#043A25] hover:bg-[#043A25]/5"
              >
                Browse weekend escapes
              </a>
            </div>
          </section>
        </div>
      </main>

      <CTABand
        title="Not sure which route suits you?"
        subtitle="Tell us when you are free and how you like to travel. We will come back with a route, not a brochure."
        primaryLabel="Plan my trip"
        onPrimary={onPlanTrip}
      />

      <Newsletter />
      <Footer />
    </div>
  );
}
