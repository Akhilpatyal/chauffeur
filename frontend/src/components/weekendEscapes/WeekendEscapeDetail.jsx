import React, { useMemo, useRef } from 'react';
import { Check, Clock, Info, MapPin, Star, X as XIcon } from 'lucide-react';
import Footer from '../footer/Footer';
import Newsletter from '../sections/Newsletter';
import PageHero from '../common/PageHero';
import Breadcrumb from '../common/Breadcrumb';
import CTABand from '../common/CTABand';
import ImageGallery from '../common/ImageGallery';
import TripReadiness from '../common/TripReadiness';
import NextDepartures from '../common/NextDepartures';
import RouteMap from '../common/RouteMap';
import { routeFromStages } from '../../data/places';
import TripCard from '../cards/TripCard';
import { NotFoundPage } from '../destinations/DestinationPage';
import { getEscape, relatedEscapes } from '../../data/weekendEscapes';
import { readinessFor } from '../../data/tripReadiness';
import { SHOW_TRIP_RATINGS } from '../../data/companyFacts';
import { journeys } from '../../data/journeys';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { useDocumentMeta } from '../../lib/seo';
import { linkProps } from '../../router';

/*
 * /weekend-escapes/:slug
 *
 * Follows the destination detail layout — hero, breadcrumb, then a 1fr + 320px
 * grid with a sticky sidebar — rather than the journey template, whose pinned
 * timeline and route map are built for eight-day expeditions and read as
 * overkill for a two-night trip.
 *
 * An unknown slug renders the shared 404 instead of falling back to the first
 * escape, which would quietly serve the wrong page on a typo.
 */
function ListCard({ title, items, icon: Icon, tone = 'positive' }) {
  if (!items?.length) return null;

  return (
    <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5 sm:p-6">
      <h2 className="font-display text-[19px] text-[#012C18]">{title}</h2>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Icon
              aria-hidden="true"
              className={`mt-[3px] h-3.5 w-3.5 shrink-0 ${
                tone === 'positive' ? 'text-[#075333]' : 'text-[#B4472A]'
              }`}
              strokeWidth={tone === 'positive' ? 3 : 2.5}
            />
            <span className="text-[12.5px] leading-[1.65] text-[#4A5B50]">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function WeekendEscapeDetail({ slug, onPlanTrip }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 90%', stagger: 0.07 });

  const escape = useMemo(() => getEscape(slug), [slug]);
  /* Resolved from the trip's own location text, so a new escape in a region we
   * already cover gets the readiness panel without any extra wiring. */
  const readiness = useMemo(
    () => (escape ? readinessFor(escape.title, escape.location, escape.state) : null),
    [escape]
  );
  const related = useMemo(() => (escape ? relatedEscapes(slug) : []), [escape, slug]);

  /*
   * Where this escape actually goes.
   *
   * The departure city is dropped: it is a gateway, already stated in the
   * hero ("From Delhi · 12 hr overnight drive"), and keeping it would zoom the
   * map out to cover a thousand kilometres of plains and shrink the place the
   * traveller came to look at into a dot.
   */
  const mappedRoute = useMemo(() => {
    if (!escape) return [];
    const stages = escape.itinerary.map((day, index) => ({ day: index + 1, title: day.title }));
    const all = routeFromStages(stages);
    const withoutGateways = all.filter((stop) => stop.place.kind !== 'city');
    return withoutGateways.length > 0 ? withoutGateways : all;
  }, [escape]);

  const linkedJourneys = useMemo(
    () =>
      (escape?.relatedJourneys ?? [])
        .map((id) => journeys.find((journey) => journey.id === id))
        .filter(Boolean),
    [escape]
  );

  /*
   * An unknown slug renders the 404 below, but this hook still runs — and a
   * parent effect runs *after* its child's, so without `noindex` here the
   * child 404's robots tag would be overwritten and every mistyped URL would
   * advertise itself as an indexable page.
   */
  useDocumentMeta({
    title: escape ? `${escape.title} — ${escape.duration}` : 'Weekend escape not found',
    description: escape?.description,
    image: escape?.image,
    type: 'article',
    noindex: !escape,
  });

  if (!escape) return <NotFoundPage />;

  /* What the sales desk needs to see on the lead: which escape, from which
   * form. Shared by the sidebar button and the closing CTA. */
  const enquiryContext = {
    kind: 'weekend_escape',
    slug: escape.slug,
    title: escape.title,
    destination: escape.location,
    source: 'weekend_escape_enquiry',
  };

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <PageHero
        eyebrow={escape.state}
        image={escape.image}
        title={escape.title}
        subtitle={escape.tagline}
        facts={[
          { icon: Clock, label: 'Duration', value: escape.duration },
          { icon: MapPin, label: 'From', value: escape.departFrom },
          /* Only shown once ratings are real. */
          ...(SHOW_TRIP_RATINGS
            ? [{ icon: Star, label: 'Rated', value: `${escape.rating} (${escape.reviews})` }]
            : [{ icon: Star, label: 'Difficulty', value: escape.difficulty }]),
        ]}
      />

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Home', path: '/' },
              { label: 'Weekend Escapes', path: '/weekend-escapes' },
              { label: escape.title },
            ]}
            className="mb-8"
          />

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <article
                data-reveal
                className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8"
              >
                <h2 className="font-display text-[26px] leading-tight text-[#012C18] sm:text-[30px]">
                  The weekend, in short
                </h2>
                <p className="mt-3 text-[14px] leading-[1.85] text-[#5E6B63]">
                  {escape.description}
                </p>

                <dl className="mt-6 grid gap-4 border-t border-[#E3DDCB] pt-5 sm:grid-cols-3">
                  {[
                    ['Travel time', escape.travelTime],
                    ['Difficulty', escape.difficulty],
                    ['Best time', escape.bestTime],
                    ['Group size', escape.groupSize],
                    ['Nights', `${escape.nights} nights`],
                    ['Starts from', escape.departFrom],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9189]">
                        {label}
                      </dt>
                      <dd className="mt-1 text-[13px] text-[#012C18]">{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>

              <section
                data-reveal
                className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8"
              >
                <h2 className="font-display text-[22px] leading-tight text-[#012C18] sm:text-[26px]">
                  Highlights
                </h2>
                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {escape.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check
                        aria-hidden="true"
                        className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#B89A5A]"
                        strokeWidth={3}
                      />
                      <span className="text-[13px] leading-[1.65] text-[#4A5B50]">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/*
                Itinerary as an ordered list, so the sequence is carried by the
                markup rather than only by the numbers drawn on screen.
              */}
              <section
                data-reveal
                className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8"
              >
                <h2 className="font-display text-[22px] leading-tight text-[#012C18] sm:text-[26px]">
                  Day by day
                </h2>

                <ol className="mt-5">
                  {escape.itinerary.map((day, index) => (
                    <li key={day.title} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < escape.itinerary.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-0 left-[15px] top-9 w-px bg-[#DDD4C1]"
                        />
                      )}
                      <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#DDD4C1] bg-white font-mono text-[11px] font-bold text-[#075333]">
                        {index + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#B89A5A]">
                          {day.day}
                        </p>
                        <h3 className="mt-1 font-display text-[17px] leading-snug text-[#012C18]">
                          {day.title}
                        </h3>
                        <p className="mt-1.5 text-[13px] leading-[1.75] text-[#5E6B63]">
                          {day.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              {/* A one-image "gallery" is just a stray banner, so the section
                  appears only once there is something to browse. */}
              {escape.gallery?.length > 1 && (
                <section data-reveal>
                  <h2 className="mb-4 font-display text-[22px] leading-tight text-[#012C18] sm:text-[26px]">
                    Gallery
                  </h2>
                  <ImageGallery images={escape.gallery} alt={escape.title} />
                </section>
              )}

              <div data-reveal className="grid gap-5 sm:grid-cols-2">
                <ListCard title="What is included" items={escape.inclusions} icon={Check} />
                <ListCard
                  title="What is not included"
                  items={escape.exclusions}
                  icon={XIcon}
                  tone="negative"
                />
              </div>

              {/* Trip-specific notes stay separate from the regional
                  readiness panel below: one is about this escape, the other
                  about travelling in this region at all. */}
              <section
                data-reveal
                className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8"
              >
                <h2 className="flex items-center gap-2 font-display text-[22px] leading-tight text-[#012C18] sm:text-[26px]">
                  <Info className="h-4 w-4 text-[#B89A5A]" strokeWidth={2} />
                  Notes on this escape
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {escape.importantInfo.map((item) => (
                    <li
                      key={item}
                      className="border-l-2 border-[#DDD4C1] pl-3 text-[13px] leading-[1.7] text-[#5E6B63]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>

              <TripReadiness readiness={readiness} />
            </div>

            {/* Sticky booking rail */}
            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9189]">
                  Per person
                </p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="font-display text-[30px] leading-none text-[#012C18]">
                    {escape.price}
                  </span>
                  {escape.originalPrice && (
                    <span className="text-[13px] text-[#98A09A] line-through">
                      {escape.originalPrice}
                    </span>
                  )}
                </p>
                {escape.discount && (
                  <p className="mt-1.5 inline-block rounded-md bg-[#B89A5A]/15 px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#8A6B23]">
                    {escape.discount}
                  </p>
                )}
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#8A9189]">
                  Twin sharing, inclusive of stays, listed meals and local transfers.
                </p>

                <button
                  type="button"
                  onClick={() => onPlanTrip?.(enquiryContext)}
                  className="mt-4 w-full rounded-lg bg-[#043A25] px-6 py-3.5 text-[12.5px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
                >
                  Check availability
                </button>
                <a
                  {...linkProps('/contact')}
                  className="mt-2.5 block w-full rounded-lg border border-[#C9C2B0] px-6 py-3.5 text-center text-[12.5px] font-semibold text-[#012C18] transition-colors hover:border-[#043A25] hover:bg-[#043A25]/5"
                >
                  Ask a question
                </a>

                <p className="mt-3 text-center text-[11px] text-[#98A09A]">
                  We reply within 2 hours. No booking fees.
                </p>
              </div>

              {mappedRoute.length > 0 && (
                <RouteMap stops={mappedRoute} activeDay={mappedRoute[0].day} followActive={false} scheduled />
              )}

              <NextDepartures
                slug={escape.slug}
                nights={escape.nights}
                onEnquire={(date) =>
                  onPlanTrip?.({ ...enquiryContext, title: `${escape.title} — ${date.label}` })
                }
              />

              {escape.tags?.length > 0 && (
                <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
                  <h2 className="font-display text-[17px] text-[#012C18]">Good for</h2>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {escape.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full border border-[#DDD4C1] px-2.5 py-1 text-[11px] text-[#4A5B50]"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {linkedJourneys.length > 0 && (
                <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
                  <h2 className="font-display text-[17px] text-[#012C18]">Longer routes nearby</h2>
                  <ul className="mt-3 space-y-2.5">
                    {linkedJourneys.map((journey) => (
                      <li key={journey.id}>
                        <a
                          {...linkProps(`/journeys/${journey.id}`)}
                          className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-[#043A25]/5"
                        >
                          <img
                            src={journey.image}
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-semibold text-[#012C18] group-hover:text-[#075333]">
                              {journey.title}
                            </span>
                            <span className="block text-[11px] text-[#8A9189]">
                              {journey.duration}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-[24px] leading-tight text-[#012C18] sm:text-[28px]">
                Other weekends worth taking
              </h2>
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <li key={item.slug} className="h-full">
                    <TripCard
                      href={`/weekend-escapes/${item.slug}`}
                      ctaLabel="View escape"
                      trip={{
                        title: item.title,
                        location: item.location,
                        duration: item.duration,
                        price: item.price,
                        rating: item.rating,
                        reviews: item.reviews,
                        badge: item.badge,
                        image: item.image,
                        description: item.description,
                        tags: item.tags,
                      }}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <CTABand
        title={`Ready for ${escape.title}?`}
        subtitle="Tell us your dates and how many of you there are. We will confirm seats and send the full kit list."
        primaryLabel="Check availability"
        onPrimary={() => onPlanTrip?.(enquiryContext)}
      />

      <Newsletter />
      <Footer />
    </div>
  );
}
