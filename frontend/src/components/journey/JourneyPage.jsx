import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { buildJourneyContent } from '../../data/journeyDetail';
import Newsletter from '../sections/Newsletter';
import Footer from '../footer/Footer';
import JourneyHero from './JourneyHero';
import JourneyStats from './JourneyStats';
import JourneyTimeline from './JourneyTimeline';
import JourneyOverview from './JourneyOverview';
import JourneyRouteMap from './JourneyRouteMap';
import JourneyHighlights from './JourneyHighlights';
import IncludedCard from './IncludedCard';
import BestTimeCard from './BestTimeCard';
import JourneyGallery from './JourneyGallery';
import Testimonial from './Testimonial';
import JourneyVideo from './JourneyVideo';
import BookingCTA from './BookingCTA';
import Breadcrumb from '../common/Breadcrumb';
import TripReadiness from '../common/TripReadiness';
import { listDepartures } from '../../lib/account';
import { AvailabilityNotice } from '../common/Availability';
import { availabilityFor, OPEN } from '../../data/availability';

/* Opened by a click, never on load. */
const BookingPanel = React.lazy(() => import('../booking/BookingPanel'));
import TripLogistics from './TripLogistics';
import BookingTerms from './BookingTerms';
import AvailabilityCalendar from './AvailabilityCalendar';
import { readinessFor } from '../../data/tripReadiness';
import { routeFromStages } from '../../data/places';
import RouteMap from '../common/RouteMap';
import { useDocumentMeta } from '../../lib/seo';



export default function JourneyPage({ journeyId, onCheckAvailability }) {
  /* Everything on the page is derived from the journey that was clicked */
  const content = useMemo(() => buildJourneyContent(journeyId), [journeyId]);
  const fullTitle = `${content.title} ${content.titleAccent ?? ''}`.trim();

  /* Season, permits, altitude and ground realities for wherever this route
   * goes. Resolved from the trip's own text so new journeys inherit it. */
  const readiness = useMemo(
    () => readinessFor(fullTitle, content.subtitle, content.intro),
    [fullTitle, content.subtitle, content.intro]
  );

  /*
   * Real coordinates for the stages, where we recognise the place names. A
   * route we cannot locate falls back to the illustrated map rather than
   * showing an empty frame or pins in the wrong country.
   */
  const mappedRoute = useMemo(
    () => routeFromStages(content.days ?? []),
    [content.days]
  );

  useDocumentMeta({
    title: content.eyebrow ? `${fullTitle} — ${content.eyebrow}` : fullTitle,
    description: content.intro,
    image: content.heroImage,
    type: 'article',
  });
  /*
   * `activeDay` is the single piece of shared state between the itinerary and
   * the route map. The timeline's ScrollTriggers push into it; the map reads it
   * to advance the route, and clicking a map pin scrolls the itinerary back.
   */
  const [activeDay, setActiveDay] = useState(1);

  /* Reset to the first stage when the visitor opens a different journey */
  const [lastId, setLastId] = useState(journeyId);
  if (lastId !== journeyId) {
    setLastId(journeyId);
    setActiveDay(1);
  }

  /* Group departures carry no stage data - those pages show an overview instead */
  const hasStages = content.days.length > 0;

  /* Reveals the quote + film row together */
  const storiesScope = useRef(null);
  useScrollReveal(storiesScope, { start: 'top 86%' });

  const handleActiveDay = useCallback((day) => setActiveDay(day), []);

  const handleSelectDay = useCallback((day) => {
    document.getElementById(`day-${day}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  const handleDownloadItinerary = useCallback(() => {
    window.print();
  }, []);

  /* Enquiries from this page carry the journey, so the dashboard shows which
   * route was being read rather than another "Custom expedition". */
  /* Read off the duration string ("6 Days · 5 Nights") so the calendar's
   * ranges end on the right day. Two is the sensible floor for a weekend
   * trip when the string does not say. */
  const nights = useMemo(() => {
    const match = /(\d+)\s*night/i.exec(content.duration ?? '');
    return match ? Number(match[1]) : 2;
  }, [content.duration]);

  /*
   * Published departures, fetched once per trip.
   *
   * Loaded here rather than inside the panel so the Check Availability button
   * can say whether there are dates at all before somebody opens it — and so
   * opening the panel is instant rather than showing a spinner over a modal.
   */
  const [departures, setDepartures] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const tripSlug = journeyId ?? content.id;
  /*
   * A trip we are not running does not get booking controls at all.
   *
   * Not a disabled button beside an explanation — somebody clicks a disabled
   * button, nothing happens, and they learn nothing. The controls are
   * replaced by the notice, which says when it comes back and offers the one
   * useful action: ask us to tell you.
   */
  const open = availabilityFor(tripSlug).state === OPEN;

  useEffect(() => {
    let cancelled = false;
    const slug = journeyId ?? content.id;
    /* No point asking the API for dates on a trip nobody can book. */
    if (!slug || !open) return undefined;

    listDepartures(slug)
      .then((rows) => !cancelled && setDepartures(rows))
      .catch(() => {
        /* A failure leaves the list empty and the panel falls back to a
         * custom request, which is a worse experience than published dates
         * and a better one than a broken button. */
      });
    return () => {
      cancelled = true;
    };
  }, [journeyId, content.id, open]);

  const handleEnquire = useCallback(
    /* A departure object when the enquiry came from clicking a date, nothing
     * when it came from a general "check availability" button. Passing it
     * through means the desk sees which dates somebody actually wants rather
     * than having to ask. */
    (departure) =>
      onCheckAvailability?.({
        kind: 'journey',
        slug: journeyId ?? content.id,
        title: fullTitle,
        destination: content.subtitle,
        source: 'journey_enquiry',
        ...(departure?.label ? { preferredDates: departure.label } : {}),
      }),
    [onCheckAvailability, journeyId, content.id, content.subtitle, fullTitle]
  );

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <JourneyHero
        journey={content}
        open={open}
        onCheckAvailability={open ? () => setPanelOpen(true) : handleEnquire}
      />
      <JourneyStats stats={content.stats} />

      <main className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
          {/* Was three plain spans that looked like navigation and went
              nowhere; Journeys now has a listing page to link to. */}
          <Breadcrumb
            items={[
              { label: 'Home', path: '/' },
              { label: 'Journeys', path: '/journeys' },
              { label: fullTitle },
            ]}
          />

          {/* 65 / 35 editorial split */}
          <div className="mt-8 grid items-start gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-12">
            {hasStages ? (
              <JourneyTimeline
                days={content.days}
                scheduled={content.daysAreScheduled}
                activeDay={activeDay}
                onActiveDay={handleActiveDay}
              />
            ) : (
              <JourneyOverview content={content} onPlanTrip={handleEnquire} />
            )}

            {/*
              The sidebar is taller than a viewport, so the whole column sticks and
              scrolls within itself rather than sticking one card and letting the
              others slide behind it.
            */}
            <aside className="no-scrollbar space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-2">
              {hasStages &&
                (mappedRoute.length >= 2 ? (
                  <RouteMap
                    stops={mappedRoute}
                    activeDay={activeDay}
                    onSelectDay={handleSelectDay}
                    scheduled={content.daysAreScheduled}
                  />
                ) : (
                  <JourneyRouteMap
                    labels={content.routeLabels}
                    activeDay={activeDay}
                    onSelectDay={handleSelectDay}
                    totalDistance={content.totalDistance}
                    scheduled={content.daysAreScheduled}
                  />
                ))}
              <JourneyHighlights highlights={content.highlights} />
              <IncludedCard />
              <BestTimeCard />
            </aside>
          </div>
        </div>
      </main>

      {/*
        Sits directly after the itinerary, where someone has just decided they
        want the trip and is about to ask whether they can actually do it.
      */}
      {open && panelOpen && (
        <Suspense fallback={null}>
          <BookingPanel
            trip={{
              slug: journeyId ?? content.id,
              title: fullTitle,
              destination: content.subtitle,
              durationLabel: content.duration,
              imageUrl: content.hero ?? content.image,
            }}
            departures={departures}
            /* No published dates means this trip is only bookable as a
               custom request — which is the honest offer rather than an
               empty date picker. */
            kind={departures.length > 0 ? 'fixed_departure' : 'custom'}
            onClose={() => setPanelOpen(false)}
          />
        </Suspense>
      )}

      {readiness && (
        <section className="bg-[#F4F1E8] pb-14 sm:pb-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <TripReadiness readiness={readiness} />
          </div>
        </section>
      )}

      {/*
        The practical half: where it starts, where you sleep, who is driving,
        what it costs and what happens if you cancel. Each block renders only
        once the operator has entered the real facts in data/tripOperations.js
        — a trip with nothing filled in adds nothing to the page, rather than
        a row of headings over empty cards.
      */}
      <section className="bg-[#F4F1E8] pb-14 sm:pb-16">
        <div className="mx-auto max-w-[1400px] space-y-4 px-4 sm:px-6 lg:px-8">
          {open ? (
            <AvailabilityCalendar
              slug={tripSlug}
              nights={nights}
              onSelectDate={() => setPanelOpen(true)}
            />
          ) : (
            <AvailabilityNotice id={tripSlug} onNotify={handleEnquire} />
          )}
          {/* The logistics and the terms stay either way: somebody deciding
              whether to come back in May still wants to know what the trip
              involves and what happens if they cancel. */}
          <TripLogistics slug={tripSlug} />
          <BookingTerms slug={tripSlug} />
        </div>
      </section>

      <JourneyGallery />

      {/* Quote and film preview share one row */}
      <section ref={storiesScope} className="bg-[#F4F1E8] pb-14 sm:pb-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
            <Testimonial />
            <JourneyVideo />
          </div>
        </div>
      </section>
      {open && (
        <BookingCTA
          onCheckAvailability={() => setPanelOpen(true)}
          onDownloadItinerary={handleDownloadItinerary}
        />
      )}

      <Newsletter
        variant="forest"
        eyebrow="Travel Notes"
        title="Get travel inspiration & offers"
        subtitle="Stories, trails and journeys worth knowing about — straight to your inbox."
        note="One email a month. Unsubscribe in a click."
        showAvatars
      />
      <Footer />
    </div>
  );
}
