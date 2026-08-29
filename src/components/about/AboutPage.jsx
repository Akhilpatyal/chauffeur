import React from 'react';
import Newsletter from '../sections/Newsletter';
import Footer from '../footer/Footer';
import AboutHero from './AboutHero';
import WhoWeAre from './WhoWeAre';
import StatsStrip from './StatsStrip';
import Philosophy from './Philosophy';
import OurStoryTimeline from './OurStoryTimeline';
import WhyTaifer from './WhyTaifer';
import OurTeam from './OurTeam';
import TravelerStory from './TravelerStory';
import CommunitySection from './CommunitySection';
import FinalCta from './FinalCta';

const breadcrumbs = ['Home', 'About Us'];

export default function AboutPage({ onPlanTrip, onExploreJourneys, onWatchStory }) {
  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      {/* 1. Hero - same banner and treatment as the Hotels page */}
      <AboutHero onExploreJourneys={onExploreJourneys} onWatchStory={onWatchStory} />

      {/* 2. Breadcrumb */}
      <div className="topographic-bg">
        <nav
          aria-label="Breadcrumb"
          className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8"
        >
          <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A9189]">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[#C3C8C1]">›</span>}
                <span
                  className={
                    i === breadcrumbs.length - 1
                      ? 'font-medium text-[#012C18]'
                      : 'transition-colors hover:text-[#075333]'
                  }
                >
                  {crumb}
                </span>
              </li>
            ))}
          </ol>
        </nav>

        {/* 3. Who we are */}
        <WhoWeAre onExploreJourneys={onExploreJourneys} />
      </div>

      {/* 4. Milestones */}
      <StatsStrip />

      {/* 5. What we believe */}
      <Philosophy />

      {/* 6. Our story timeline */}
      <OurStoryTimeline />

      {/* 7. Why Taifer */}
      <WhyTaifer />

      {/* 8. The team */}
      <OurTeam onMeetTeam={onPlanTrip} />

      {/* 9. Traveler story */}
      <TravelerStory />

      {/* 10. Community */}
      <CommunitySection onJoinCommunity={onPlanTrip} />

      {/* 11. Closing CTA */}
      <FinalCta onExploreJourneys={onExploreJourneys} onPlanTrip={onPlanTrip} />

      {/* 12. Newsletter + footer - shared with Home and Hotels */}
      <Newsletter
        variant="forest"
        eyebrow="Stay Inspired"
        title="Keep Exploring."
        subtitle="Stories, trails and journeys worth knowing about."
        note="10,000+ explorers subscribe to our newsletter"
        showAvatars
      />
      <Footer />
    </div>
  );
}
