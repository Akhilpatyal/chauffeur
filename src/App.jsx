import React, { useState, useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Common Components
import Preloader from './components/common/Preloader';
import CustomCursor from './components/common/CustomCursor';
import Navbar from './components/navigation/Navbar';

// Hero Components
import HeroSection from './components/hero/HeroSection';
import CategoryRail from './components/hero/CategoryRail';

// Sections (Structured strictly with intentional Ivory & Dark alternating rhythm)
import HandpickedJourneys from './components/sections/HandpickedJourneys';
import CampaignBanner from './components/sections/CampaignBanner';
import WhereToDisappear from './components/sections/WhereToDisappear';
import TravelByFeeling from './components/sections/TravelByFeeling';
import GroupTours from './components/sections/GroupTours';
import WhyUsStorytelling from './components/sections/WhyUsStorytelling';
import CommunityStories from './components/sections/CommunityStories';
import TravelJournal from './components/sections/TravelJournal';
import PlanYourEscape from './components/sections/PlanYourEscape';
import Testimonials from './components/sections/Testimonials';
import TrustStats from './components/sections/TrustStats';
import Newsletter from './components/sections/Newsletter';
import Footer from './components/footer/Footer';

// Modals
import PlanMyTripModal from './components/modals/PlanMyTripModal';
import JourneyDetailModal from './components/modals/JourneyDetailModal';
import TravelerStoryModal from './components/modals/TravelerStoryModal';
import JournalReaderModal from './components/modals/JournalReaderModal';

// Data
import { journeys } from './data/journeys';
import { destinations } from './data/destinations';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [planTripModalOpen, setPlanTripModalOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [journeyModalOpen, setJourneyModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleModalOpen, setArticleModalOpen] = useState(false);

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
  const handleOpenPlanTrip = () => setPlanTripModalOpen(true);
  const handleClosePlanTrip = () => setPlanTripModalOpen(false);

  const handleSelectJourney = (journey) => {
    setSelectedJourney(journey);
    setJourneyModalOpen(true);
  };
  const handleCloseJourneyModal = () => {
    setJourneyModalOpen(false);
    setSelectedJourney(null);
  };

  const handleSelectDestination = (destination) => {
    const matched = journeys.find((j) =>
      j.location.toLowerCase().includes(destination.name.toLowerCase()) ||
      destination.name.toLowerCase().includes(j.location.toLowerCase())
    );
    if (matched) {
      handleSelectJourney(matched);
    } else {
      handleOpenPlanTrip();
    }
  };

  const handleWatchStories = () => setStoryModalOpen(true);
  const handleCloseStoryModal = () => setStoryModalOpen(false);

  const handleReadArticle = (article) => {
    setSelectedArticle(article);
    setArticleModalOpen(true);
  };
  const handleCloseArticleModal = () => {
    setArticleModalOpen(false);
    setSelectedArticle(null);
  };

  const handleSearchSubmit = (searchParams) => {
    const el = document.getElementById('journeys');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (categoryId) => {
    setActiveCategory(categoryId);
    const el = document.getElementById('journeys');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#003B24] relative selection:bg-[#075333] selection:text-[#F4F1E8] overflow-x-hidden font-sans">
      
      {/* 0. TAIFER Opening Sequence Preloader (1.2-1.4s) */}
      <Preloader />

      {/* Desktop Contextual Custom Cursor */}
      <CustomCursor />

      {/* Transparent-to-Glass Navbar with Official Logo */}
      <Navbar
        onPlanTripClick={handleOpenPlanTrip}
        onSearchClick={() => {
          const el = document.getElementById('journeys');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Main Expedition Flow with Intentional Visual Rhythm */}
      <main>
        {/* 1. CINEMATIC HERO (85-95vh) */}
        <HeroSection
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

        {/* 6. DARK STORY: Travel By Feeling (Balanced 40/60 Split) */}
        <TravelByFeeling
          onSelectFeeling={(feeling) => {
            handleOpenPlanTrip();
          }}
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
          onExploreAllGroups={handleOpenPlanTrip}
        />

        {/* 8. DARK WHY TAIFER: Pinned 4-Pillar Ethos (50/50 Split) */}
        <WhyUsStorytelling />

        {/* 9. IVORY STORIES: People of the Journey */}
        <CommunityStories
          onWatchStories={handleWatchStories}
        />

        {/* 10. IVORY JOURNAL: From the Trail Journal */}
        <TravelJournal
          onReadArticle={handleReadArticle}
        />

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
      </main>

      {/* 15. DARK FOOTER: The Mountains Are Waiting */}
      <Footer />

      {/* Interactive Modals */}
      <PlanMyTripModal
        isOpen={planTripModalOpen}
        onClose={handleClosePlanTrip}
      />

      <JourneyDetailModal
        journey={selectedJourney}
        isOpen={journeyModalOpen}
        onClose={handleCloseJourneyModal}
        onBookNow={(j) => {
          setJourneyModalOpen(false);
          handleOpenPlanTrip();
        }}
      />

      <TravelerStoryModal
        isOpen={storyModalOpen}
        onClose={handleCloseStoryModal}
      />

      <JournalReaderModal
        article={selectedArticle}
        isOpen={articleModalOpen}
        onClose={handleCloseArticleModal}
        onExploreTrips={() => {
          const el = document.getElementById('journeys');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />
    </div>
  );
}
