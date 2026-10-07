import React, { useMemo, useRef } from 'react';
import { ArrowRight, Mountain, Star, Thermometer } from 'lucide-react';
import Footer from '../footer/Footer';
import { destinations } from '../../data/destinations';
import { journeys } from '../../data/journeys';
import { groupTourCards } from '../../data/groupToursPage';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { linkProps, navigateTo } from '../../router';
import { useDocumentMeta } from '../../lib/seo';

/* Matches a destination to the journeys and tours that actually visit it */
function tripsFor(destination) {
  const needle = destination.name.toLowerCase().split(' ')[0];
  const matches = (text) => String(text || '').toLowerCase().includes(needle);

  return [
    ...journeys
      .filter((j) => matches(j.location) || matches(j.title))
      .map((j) => ({ id: j.id, title: j.title, meta: j.duration, price: j.price, image: j.image })),
    ...groupTourCards
      .filter((t) => matches(t.title) || matches(t.description))
      .map((t) => ({ id: t.id, title: t.title, meta: t.duration, price: t.price, image: t.image })),
  ].filter((trip, i, all) => all.findIndex((x) => x.id === trip.id) === i);
}

export default function DestinationPage({ slug, onPlanTrip }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 88%', stagger: 0.07 });

  /*
   * Falling back to destinations[0] meant /destinations/<typo> quietly served
   * the Spiti page under the wrong URL — a wrong answer presented as a right
   * one, and duplicate content for search engines. A miss is now a 404.
   */
  const destination = useMemo(() => destinations.find((d) => d.id === slug) ?? null, [slug]);
  const trips = useMemo(() => (destination ? tripsFor(destination) : []), [destination]);

  useDocumentMeta({
    title: destination
      ? `${destination.name}, ${destination.state} — Travel Guide`
      : 'Destination not found',
    description: destination?.description,
    image: destination?.image,
    noindex: !destination,
  });

  if (!destination) return <NotFoundPage />;

  /* Both CTAs on this page previously passed the click event straight into
   * the enquiry handler; they now name the region being viewed. */
  const enquire = () =>
    onPlanTrip?.({
      kind: 'destination',
      slug: destination.id,
      title: destination.name,
      destination: destination.name,
      source: 'plan_my_trip',
    });

  const facts = [
    { icon: Mountain, label: 'Elevation', value: destination.elevation },
    { icon: Star, label: 'Best season', value: destination.bestSeason },
    { icon: Thermometer, label: 'Temperature', value: destination.temperature },
  ].filter((fact) => fact.value);

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      {/* Hero - same treatment as the other pages */}
      <section className="relative overflow-hidden bg-[#012C18]">
        <img
          src={destination.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#02170F]/85 via-[#022014]/65 to-[#02170F]/90" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F4F1E8]" />

        <div className="relative mx-auto max-w-[1400px] px-4 pt-28 pb-10 text-center sm:px-6 sm:pt-32 lg:px-8">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#F4F1E8]/75">
            {destination.state}
          </p>
          <h1 className="mt-3 font-display text-[38px] leading-[1.05] text-[#FAF9F5] sm:text-5xl lg:text-[56px]">
            {destination.name}
          </h1>
          {destination.tagline && (
            <p className="mt-3 text-[13.5px] text-white/75 sm:text-[15px]">
              {destination.tagline}
            </p>
          )}

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-[11.5px] font-medium text-white/80"
              >
                <Icon className="h-3.5 w-3.5 text-[#B89A5A]" strokeWidth={1.75} />
                {label}: <span className="text-white">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A9189]">
              <li>
                <a {...linkProps('/')} className="transition-colors hover:text-[#075333]">
                  Home
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[#C3C8C1]">›</span>
                <a
                  {...linkProps('/destinations')}
                  className="transition-colors hover:text-[#075333]"
                >
                  Destinations
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-[#C3C8C1]">›</span>
                <span className="font-medium text-[#012C18]">{destination.name}</span>
              </li>
            </ol>
          </nav>

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <article data-reveal className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8">
              <h2 className="font-display text-[26px] leading-tight text-[#012C18] sm:text-[30px]">
                About {destination.name}
              </h2>
              <p className="mt-3 text-[14px] leading-[1.85] text-[#5E6B63]">
                {destination.description}
              </p>

              {destination.coordinates && (
                <p className="mt-5 font-mono text-[11px] tracking-[0.14em] text-[#98A09A]">
                  {destination.coordinates}
                </p>
              )}
            </article>

            <aside data-reveal className="rounded-2xl border border-[#E0D6BE] bg-[#E9E1CD] p-5">
              <h2 className="font-display text-[19px] text-[#012C18]">Plan this trip</h2>
              <p className="mt-2 text-[12px] leading-[1.6] text-[#5E6B63]">
                Tell us your dates and we&rsquo;ll send a route for {destination.name} within
                48 hours.
              </p>
              {destination.rating && (
                <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#4A5B50]">
                  <Star className="h-3.5 w-3.5 fill-[#B89A5A] text-[#B89A5A]" />
                  <span className="font-bold">{destination.rating}</span>
                  <span className="text-[#7C857E]">
                    ({destination.reviewsCount} traveller reviews)
                  </span>
                </p>
              )}
              <button
                type="button"
                onClick={enquire}
                className="mt-4 w-full rounded-lg bg-[#043A25] py-3 text-[12px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
              >
                Plan My Trip
              </button>
            </aside>
          </div>

          {/* Trips that visit here */}
          <section className="mt-12" aria-labelledby="destination-trips-heading">
            <h2
              id="destination-trips-heading"
              data-reveal
              className="font-display text-[28px] leading-none text-[#012C18] sm:text-[32px]"
            >
              Journeys to {destination.name}
            </h2>

            {trips.length > 0 ? (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {trips.map((trip) => (
                  <li key={trip.id} data-reveal>
                    <a
                      {...linkProps(`/journeys/${trip.id}`)}
                      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] transition-all duration-300 hover:-translate-y-1 hover:border-[#B7C4B4]"
                    >
                      <span className="relative block h-[132px] overflow-hidden">
                        <img
                          src={trip.image}
                          alt={trip.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                        />
                      </span>
                      <span className="flex flex-1 flex-col p-4">
                        <span className="font-display text-[17px] leading-tight text-[#012C18]">
                          {trip.title}
                        </span>
                        <span className="mt-1 text-[11.5px] text-[#7C857E]">{trip.meta}</span>
                        <span className="mt-3 text-[13px] font-bold text-[#012C18]">
                          {trip.price}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                data-reveal
                className="mt-6 rounded-2xl border border-dashed border-[#DDD4C1] bg-[#FAF9F5] p-10 text-center"
              >
                <p className="text-[13px] text-[#5E6B63]">
                  We run {destination.name} as a custom journey rather than a fixed
                  departure.
                </p>
                <button
                  type="button"
                  onClick={enquire}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#043A25] px-6 py-3 text-[12px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
                >
                  Ask for a route
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </section>

          {/* Other destinations */}
          <section className="mt-12" aria-labelledby="other-destinations-heading">
            <h2
              id="other-destinations-heading"
              data-reveal
              className="font-display text-[22px] text-[#012C18]"
            >
              Other destinations
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {destinations
                .filter((d) => d.id !== destination.id)
                .map((d) => (
                  <li key={d.id}>
                    <a
                      {...linkProps(`/destinations/${d.id}`)}
                      className="inline-flex rounded-full border border-[#DDD4C1] bg-[#FAF9F5] px-4 py-2 text-[12px] font-medium text-[#3B473F] transition-colors hover:border-[#075333] hover:text-[#075333]"
                    >
                      {d.name}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* Index page listing every destination */
export function DestinationsIndex() {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 88%', stagger: 0.06 });

  useDocumentMeta({
    title: 'Destinations We Know Well',
    description:
      'Eight Himalayan and Indian regions we run routes in: Spiti, Kashmir, Ladakh, Meghalaya, Rajasthan, Kerala, Uttarakhand and Himachal.',
    image: '/banner1.jpg',
  });

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <section className="relative overflow-hidden bg-[#012C18]">
        <img
          src="/banner1.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#02170F]/85 via-[#022014]/65 to-[#02170F]/90" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F4F1E8]" />

        <div className="relative mx-auto max-w-[1400px] px-4 pt-28 pb-10 text-center sm:px-6 sm:pt-32 lg:px-8">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#F4F1E8]/75">
            Where we travel
          </p>
          <h1 className="mt-3 font-display text-[38px] leading-[1.05] text-[#FAF9F5] sm:text-5xl lg:text-[56px]">
            Destinations
          </h1>
          <p className="mt-3 text-[13.5px] text-white/75 sm:text-[15px]">
            Eight regions we know well enough to plan properly.
          </p>
        </div>
      </section>

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destinations.map((d) => (
              <li key={d.id} data-reveal>
                <a
                  {...linkProps(`/destinations/${d.id}`)}
                  className="group relative block h-[260px] overflow-hidden rounded-2xl"
                >
                  <img
                    src={d.image}
                    alt={d.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#02170F] via-[#02170F]/35 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-4">
                    <span className="block font-display text-[20px] leading-tight text-[#FAF9F5]">
                      {d.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[#DDD4C1]/75">
                      {d.state}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/* 404 */
export function NotFoundPage() {
  /* `noindex` matters here: without it, every mistyped URL becomes a thin
   * duplicate page competing with the real ones in search results. */
  useDocumentMeta({
    title: 'Page not found',
    description: 'The page you were looking for has moved or never existed.',
    noindex: true,
  });

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F1E8] text-[#012C18]">
      <div className="topographic-bg flex flex-1 items-center justify-center px-4 pt-28 pb-16">
        <div className="text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#B89A5A]">
            404
          </p>
          <h1 className="mt-4 font-display text-[34px] leading-tight text-[#012C18] sm:text-[44px]">
            This trail doesn&rsquo;t exist.
          </h1>
          <p className="mx-auto mt-3 max-w-[44ch] text-[13.5px] leading-relaxed text-[#5E6B63]">
            The page you were looking for has moved or never existed. Head back and start
            from the map.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="rounded-lg bg-[#043A25] px-6 py-3 text-[12.5px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
            >
              Back to home
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/contact')}
              className="rounded-lg border border-[#C9C2B0] px-6 py-3 text-[12.5px] font-semibold text-[#012C18] transition-colors hover:border-[#043A25]"
            >
              Contact us
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
