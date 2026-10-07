import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import Experiences from './Experiences';
import Testimonial from './Testimonial';
import JourneyVideo from './JourneyVideo';
import BookingCTA from './BookingCTA';
import Breadcrumb from '../common/Breadcrumb';
import { useDocumentMeta } from '../../lib/seo';



export default function JourneyPage({ journeyId, onCheckAvailability }) {
  /* Everything on the page is derived from the journey that was clicked */
  const content = useMemo(() => buildJourneyContent(journeyId), [journeyId]);
  const fullTitle = `${content.title} ${content.titleAccent ?? ''}`.trim();

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
  const handleEnquire = useCallback(
    () =>
      onCheckAvailability?.({
        kind: 'journey',
        slug: journeyId ?? content.id,
        title: fullTitle,
        destination: content.subtitle,
        source: 'journey_enquiry',
      }),
    [onCheckAvailability, journeyId, content.id, content.subtitle, fullTitle]
  );

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <JourneyHero journey={content} onCheckAvailability={handleEnquire} />
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
              {hasStages && (
                <JourneyRouteMap
                  labels={content.routeLabels}
                  activeDay={activeDay}
                  onSelectDay={handleSelectDay}
                  totalDistance={content.totalDistance}
                  scheduled={content.daysAreScheduled}
                />
              )}
              <JourneyHighlights highlights={content.highlights} />
              <IncludedCard />
              <BestTimeCard />
            </aside>
          </div>
        </div>
      </main>

      <Experiences />

      {/* Quote and film preview share one row */}
      <section ref={storiesScope} className="bg-[#F4F1E8] pb-14 sm:pb-16">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
            <Testimonial />
            <JourneyVideo />
          </div>
        </div>
      </section>
      <BookingCTA
        onCheckAvailability={handleEnquire}
        onDownloadItinerary={handleDownloadItinerary}
      />

      <Newsletter
        variant="forest"
        eyebrow="Travel Notes"
        title="Get travel inspiration & offers"
        subtitle="Stories, trails and journeys worth knowing about — straight to your inbox."
        note="10,000+ explorers subscribe to our newsletter"
        showAvatars
      />
      <Footer />
    </div>
  );
}
