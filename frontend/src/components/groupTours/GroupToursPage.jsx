import React, { useCallback, useRef, useState } from 'react';
import { ArrowRight, Download } from 'lucide-react';
import Footer from '../footer/Footer';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { navigateTo } from '../../router';
import GroupToursHero from './GroupToursHero';
import PopularGroupTours from './PopularGroupTours';
import WhyTravelGroup from './WhyTravelGroup';
import GroupInclusions from './GroupInclusions';
import UpcomingDepartures from './UpcomingDepartures';
import GroupTestimonials from './GroupTestimonials';
import { RidgeMark } from './groupUi';

export default function GroupToursPage({ onPlanTrip }) {
  const [destination, setDestination] = useState('Manali, Himachal Pradesh');
  const ctaScope = useRef(null);
  useScrollReveal(ctaScope, { start: 'top 88%' });

  /* Every tour card and departure opens the journey detail page */
  const openTour = useCallback((tourId) => {
    navigateTo(`/journeys/${tourId}`);
  }, []);

  const scrollToTours = useCallback(() => {
    document
      .getElementById('group-tour-list')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <GroupToursHero
        destination={destination}
        onDestinationChange={setDestination}
        onSearch={scrollToTours}
        onQuote={onPlanTrip}
      />

      <main className="topographic-bg">
        <div id="group-tour-list" className="scroll-mt-24">
          <PopularGroupTours onViewTour={openTour} onViewAll={scrollToTours} />
        </div>

        <WhyTravelGroup />
        <GroupInclusions />

        <UpcomingDepartures
          onBook={(departure) => openTour(departure.tourId)}
          onViewCalendar={onPlanTrip}
          onCustomQuote={onPlanTrip}
        />

        <GroupTestimonials />

        {/* Closing CTA */}
        <section ref={ctaScope} className="bg-[#F4F1E8] pb-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] px-6 py-8 sm:px-9">
              <RidgeMark className="pointer-events-none absolute -bottom-2 left-4 h-16 w-[220px] text-[#B89A5A] opacity-25" />

              <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div className="lg:pl-[190px]">
                  <h2
                    data-reveal
                    className="font-display text-[26px] leading-[1.15] text-[#012C18] sm:text-[30px]"
                  >
                    Ready to explore together?
                  </h2>
                  <p data-reveal className="mt-2 text-[13.5px] text-[#5E6B63]">
                    Book your seat now and create memories for a lifetime.
                  </p>
                </div>

                <div
                  data-reveal
                  className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    onClick={scrollToTours}
                    className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#043A25] px-7 py-3.5 text-[12.5px] font-semibold text-[#FAF9F5] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#012C18] hover:shadow-lg"
                  >
                    Explore Group Tours
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#C9C2B0] px-7 py-3.5 text-[12.5px] font-semibold text-[#012C18] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#043A25] hover:bg-[#043A25]/5"
                  >
                    <Download className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                    Download Brochure
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
