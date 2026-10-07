import React, { useCallback, useEffect, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Common Components
import Navbar from './components/navigation/Navbar';

// Hero Components
import HeroSection from './components/hero/HeroSection';
import CategoryRail from './components/hero/CategoryRail';

// Sections (Structured strictly with intentional Ivory & Dark alternating rhythm)
import HandpickedJourneys from './components/sections/HandpickedJourneys';
import CampaignBanner from './components/sections/CampaignBanner';
import WhereToDisappear from './components/sections/WhereToDisappear';
import GroupTours from './components/sections/GroupTours';
import WhyUsStorytelling from './components/sections/WhyUsStorytelling';
import TravelJournal from './components/sections/TravelJournal';
import PlanYourEscape from './components/sections/PlanYourEscape';
import Testimonials from './components/sections/Testimonials';
import TrustStats from './components/sections/TrustStats';
import Newsletter from './components/sections/Newsletter';
import Footer from './components/footer/Footer';
import HotelsPage from './components/hotels/HotelsPage';
import AboutPage from './components/about/AboutPage';
import JourneyPage from './components/journey/JourneyPage';
import GroupToursPage from './components/groupTours/GroupToursPage';
import ContactPage from './components/contact/ContactPage';
import LegalPage from './components/legal/LegalPage';
import DestinationPage, {
  DestinationsIndex,
  NotFoundPage,
} from './components/destinations/DestinationPage';
import JourneysPage from './components/journeys/JourneysPage';
import WeekendEscapesPage from './components/weekendEscapes/WeekendEscapesPage';
import WeekendEscapeDetail from './components/weekendEscapes/WeekendEscapeDetail';
import StoriesPage from './components/stories/StoriesPage';
import StoryDetail from './components/stories/StoryDetail';

// Modals
import PlanMyTripModal from './components/modals/PlanMyTripModal';
import TravelerStoryModal from './components/modals/TravelerStoryModal';

import { navigateTo, redirectLegacyHash, resolveRoute, usePathname } from './router';
import { useDocumentMeta } from './lib/seo';

gsap.registerPlugin(ScrollTrigger);

redirectLegacyHash();

export default function App() {
  const pathname = usePathname();
  const { page, param } = resolveRoute(pathname);
  const journeyId = page === 'journey' ? param : null;

  /*
   * Only the homepage sets its own metadata here; every other page owns its
   * title and description through useDocumentMeta in its own component.
   */
  useDocumentMeta({
    skip: page !== 'home',
    title: null,
    description:
      'TAIFER curates small-group Himalayan journeys, weekend escapes, group tours and handpicked stays across Manali, Spiti, Ladakh, Kashmir and Meghalaya.',
    canonicalPath: '/',
  });

  /* Start each page at the top and re-measure pinned scroll triggers */
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    ScrollTrigger.refresh();
  }, [pathname]);
  const [activeCategory, setActiveCategory] = useState('all');
  /*
   * One enquiry modal for the whole site, carrying what the visitor was
   * looking at when they opened it. `null` means a generic "plan a trip".
   */
  const [enquiry, setEnquiry] = useState(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  // Initialize Lenis Smooth Scroll integrated with GSAP ScrollTrigger
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.8,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
    };
  }, []);

  // Modal handlers
  /*
   * `context` is { kind, slug, title, source } describing the trip the button
   * belonged to. Passing it through is what makes the dashboard's "Interested
   * in" column and the most-enquired report useful instead of a wall of
   * identical rows.
   */
  const openEnquiry = useCallback((context = null) => {
    /*
     * Several older CTAs are wired as `onClick={onPlanTrip}`, which hands this
     * a MouseEvent. Rather than depend on every call site being updated
     * forever, anything that is not a plain context object is treated as a
     * generic enquiry — a stray event can never become a malformed lead.
     */
    const isContext =
      context !== null &&
      typeof context === 'object' &&
      !(typeof Event !== 'undefined' && context instanceof Event) &&
      (typeof context.kind === 'string' || typeof context.source === 'string');

    setEnquiry(isContext ? context : { source: 'plan_my_trip' });
  }, []);

  const handleOpenPlanTrip = useCallback(() => openEnquiry(null), [openEnquiry]);
  const handleClosePlanTrip = useCallback(() => setEnquiry(null), []);

  /* Opens the full journey detail page - '#journey/<id>' */
  const handleSelectJourney = (journey) => {
    navigateTo(journey?.id ? `/journeys/${journey.id}` : '/journeys');
  };

  /* Destination cards open their own page - real URLs Google can index */
  const handleSelectDestination = (destination) => {
    navigateTo(`/destinations/${destination.id}`);
  };

  /* "View all journeys" now has a listing page to go to */
  const handleExploreJourneys = () => navigateTo('/journeys');

  const handleWatchStories = () => setStoryModalOpen(true);
  const handleCloseStoryModal = () => setStoryModalOpen(false);

  const handleSearchSubmit = () => navigateTo('/journeys');

  /*
   * The hero category rail routes to the page that actually holds that
   * category instead of setting filter state nothing consumed and scrolling to
   * an unfiltered section.
   */
  const handleCategorySelect = (categoryId) => {
    setActiveCategory(categoryId);

    const destinations = {
      weekend: '/weekend-escapes',
      group: '/group-tours',
      treks: '/journeys',
      mountains: '/journeys',
      roadtrips: '/journeys',
      family: '/journeys',
      couples: '/journeys',
      adventure: '/journeys',
    };

    navigateTo(destinations[categoryId] ?? '/journeys');
  };

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#003B24] relative selection:bg-[#075333] selection:text-[#F4F1E8] overflow-x-hidden font-sans">

      {/* Transparent-to-Glass Navbar with Official Logo */}
      <Navbar
        activePage={page}
        onPlanTripClick={handleOpenPlanTrip}
        onSearchClick={() => {
          const el = document.getElementById('journeys');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Expedition Flow with Intentional Visual Rhythm */}
      {page === 'hotels' && <HotelsPage onEnquire={openEnquiry} />}

      {page === 'group-tours' && <GroupToursPage onPlanTrip={openEnquiry} />}

      {page === 'contact' && <ContactPage onPlanTrip={handleOpenPlanTrip} />}

      {page === 'journeys' && <JourneysPage onPlanTrip={handleOpenPlanTrip} />}

      {page === 'weekendEscapes' && <WeekendEscapesPage onPlanTrip={handleOpenPlanTrip} />}

      {page === 'weekendEscape' && <WeekendEscapeDetail slug={param} onPlanTrip={openEnquiry} />}

      {page === 'stories' && <StoriesPage />}

      {page === 'story' && <StoryDetail slug={param} onPlanTrip={handleOpenPlanTrip} />}

      {page === 'destinations' && <DestinationsIndex />}

      {page === 'destination' && <DestinationPage slug={param} onPlanTrip={openEnquiry} />}

      {page === 'legal' && (
        <LegalPage slug={param} onNavigate={(slug) => navigateTo(`/${slug}`)} />
      )}

      {page === 'notFound' && <NotFoundPage />}

      {page === 'journey' && (
        <JourneyPage journeyId={journeyId} onCheckAvailability={openEnquiry} />
      )}

      {page === 'about' && (
        <AboutPage
          onPlanTrip={handleOpenPlanTrip}
          onExploreJourneys={handleExploreJourneys}
          onWatchStory={handleWatchStories}
        />
      )}

      {page === 'home' && <main>
        {/* 1. CINEMATIC HERO (85-95vh) */}
        <HeroSection
          activePage={page}
        onPlanTripClick={handleOpenPlanTrip}
          onSearchSubmit={handleSearchSubmit}
        />

        {/* 2. IVORY: Horizontal Category Rail */}
        <CategoryRail
          activeCategory={activeCategory}
          onSelectCategory={handleCategorySelect}
        />

        {/* 3. IVORY EDITORIAL: Handpicked Journeys (Interactive Hover Crossfade Index) */}
        <HandpickedJourneys
          onSelectJourney={handleSelectJourney}
          onExploreAll={() => {
            const el = document.getElementById('destinations');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 4. FULL-WIDTH COVER: Journey of the Season (Spiti Valley) */}
        <CampaignBanner
          onExploreDeals={() => {
            const el = document.getElementById('journeys');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* 5. IVORY DESTINATIONS: Terrain Atlas Asymmetric Mosaic */}
        <WhereToDisappear
          onSelectDestination={handleSelectDestination}
        />

        {/* 7. IVORY TRIBES: Group Expeditions Directory */}
        <GroupTours
          onJoinTour={(tour) => {
            handleSelectJourney({
              ...tour,
              location: tour.destination,
              elevation: '14,500 ft'
            });
          }}
          /* Was handleOpenPlanTrip: a "see all tours" button that opened an
             enquiry form instead of the group tours page. */
          onExploreAllGroups={() => navigateTo('/group-tours')}
        />

        {/* 8. DARK WHY TAIFER: Pinned 4-Pillar Ethos (50/50 Split) */}
        <WhyUsStorytelling />

        {/* 10. IVORY JOURNAL: From the Trail Journal */}
        <TravelJournal />

        {/* 11. DARK CTA: Plan Your Journey Concierge */}
        <PlanYourEscape
          onOpenTripBuilder={handleOpenPlanTrip}
        />

        {/* 12. IVORY HUMAN STORY: Voices From The Trail */}
        <Testimonials />

        {/* 13. DARK STATS: Expedition Data Strip */}
        <TrustStats />

        {/* 14. IVORY NEWSLETTER: Monthly Trail Notes */}
        <Newsletter />
      </main>}

      {page === 'home' && <Footer />}

      {/* Interactive Modals */}
      <PlanMyTripModal
        isOpen={enquiry !== null}
        onClose={handleClosePlanTrip}
        interest={enquiry?.kind ? enquiry : null}
        source={enquiry?.source ?? 'plan_my_trip'}
      />

      <TravelerStoryModal
        isOpen={storyModalOpen}
        onClose={handleCloseStoryModal}
      />
    </div>
  );
}
