import React, { useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import Footer from '../footer/Footer';
import Newsletter from '../sections/Newsletter';
import PageHero from '../common/PageHero';
import Breadcrumb from '../common/Breadcrumb';
import FilterTabs from '../common/FilterTabs';
import CTABand from '../common/CTABand';
import TripCard from '../cards/TripCard';
import { escapeFilters, weekendEscapes } from '../../data/weekendEscapes';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { useDocumentMeta } from '../../lib/seo';
import { linkProps } from '../../router';

/*
 * /weekend-escapes — the listing page.
 *
 * "Weekend Escapes" was in the navbar and in the homepage category rail, but
 * both pointed at the destinations section on the home page. This is the page
 * they should have gone to.
 *
 * Grouped by departure city as well as filtered by type, because the first
 * question about a weekend trip is always "can I get there from here".
 */
export default function WeekendEscapesPage({ onPlanTrip }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 90%', stagger: 0.06 });

  const [category, setCategory] = useState('all');

  useDocumentMeta({
    title: 'Weekend Escapes — Short Trips from Delhi, Mumbai & Bengaluru',
    description:
      'Two and three-night escapes that work around a long weekend: riverside camps in Parvati, a ridge sunrise at Triund, rafting at Rishikesh and heritage Jaipur.',
    image: weekendEscapes[0]?.image,
  });

  /* Counts come from the data so a filter never shows an empty result. */
  const options = useMemo(
    () =>
      escapeFilters
        .map((filter) => ({
          ...filter,
          count:
            filter.id === 'all'
              ? weekendEscapes.length
              : weekendEscapes.filter((escape) => escape.category === filter.id).length,
        }))
        .filter((filter) => filter.count > 0),
    []
  );

  const visible = useMemo(
    () =>
      category === 'all'
        ? weekendEscapes
        : weekendEscapes.filter((escape) => escape.category === category),
    [category]
  );

  /* Unique departure cities, for the "where can I leave from" strip. */
  const departureCities = useMemo(() => {
    const cities = new Set();
    for (const escape of weekendEscapes) {
      for (const city of escape.departFrom.split('·')) cities.add(city.trim());
    }
    return [...cities];
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <PageHero
        eyebrow="Two days of leave, maximum"
        image={weekendEscapes[0]?.image}
        title="Weekend"
        titleAccent="Escapes"
        subtitle="Short trips that start on a Friday night and have you back at your desk on Monday, without the drive eating the whole weekend."
        facts={[
          { icon: CalendarDays, label: 'Length', value: '2–3 nights' },
          { icon: Clock, label: 'Leave needed', value: '1–2 days' },
          { icon: MapPin, label: 'Depart from', value: departureCities.join(', ') },
        ]}
      />

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: 'Home', path: '/' }, { label: 'Weekend Escapes' }]}
            className="mb-8"
          />

          <div className="border-b border-[#DDD4C1] pb-5">
            <h2 className="font-display text-[24px] leading-tight text-[#012C18] sm:text-[28px]">
              Pick a weekend
            </h2>
            <p className="mt-1 max-w-[70ch] text-[12.5px] text-[#5E6B63]">
              Every escape includes stays, most meals, local transfers and a trip captain. Long-haul
              transport is booked separately at cost, so you are never paying a markup on a bus seat.
            </p>
          </div>

          <div className="mt-5">
            <FilterTabs
              options={options}
              value={category}
              onChange={setCategory}
              label="Filter weekend escapes by type"
            />
          </div>

          <p aria-live="polite" className="mt-4 text-[12px] text-[#8A9189]">
            Showing {visible.length} of {weekendEscapes.length} escapes
          </p>

          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((escape) => (
              <li key={escape.slug} data-reveal className="h-full">
                <TripCard
                  href={`/weekend-escapes/${escape.slug}`}
                  ctaLabel="View escape"
                  trip={{
                    title: escape.title,
                    location: escape.location,
                    duration: escape.duration,
                    price: escape.price,
                    originalPrice: escape.originalPrice,
                    discount: escape.discount,
                    rating: escape.rating,
                    reviews: escape.reviews,
                    badge: escape.badge,
                    image: escape.image,
                    description: escape.description,
                    tags: escape.tags,
                    meta: `From ${escape.departFrom} · ${escape.travelTime}`,
                  }}
                />
              </li>
            ))}
          </ul>

          <section className="mt-14 rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-[22px] leading-tight text-[#012C18] sm:text-[26px]">
                  Got a full week?
                </h2>
                <p className="mt-1.5 max-w-[56ch] text-[13px] text-[#5E6B63]">
                  The multi-day journeys go deeper — Spiti, Ladakh, Kashmir and the Meghalaya root
                  bridges, with fixed departures through the year.
                </p>
              </div>
              <a
                {...linkProps('/journeys')}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#C9C2B0] px-6 py-3 text-[12.5px] font-semibold text-[#012C18] transition-colors hover:border-[#043A25] hover:bg-[#043A25]/5"
              >
                Browse all journeys
              </a>
            </div>
          </section>
        </div>
      </main>

      <CTABand
        title="Want a weekend built around your dates?"
        subtitle="Send us the weekend you have free and where you are starting from. We will put two or three options together."
        primaryLabel="Plan my weekend"
        onPrimary={onPlanTrip}
      />

      <Newsletter />
      <Footer />
    </div>
  );
}
