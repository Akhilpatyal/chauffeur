import React from 'react';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import { aboutImages } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';

export default function FinalCta({ onExploreJourneys, onPlanTrip }) {
  const scope = useGsapScope(() => {
    gsap.to('.cta-backdrop', {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: '.cta-root',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    gsap.fromTo(
      '.cta-content > *',
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.cta-root', start: 'top 80%', once: true },
      }
    );
  });

  return (
    <section
      ref={scope}
      className="cta-root relative flex min-h-[380px] items-center overflow-hidden bg-[#012C18] sm:min-h-[420px]"
    >
      <img
        src={aboutImages.finalCta}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="cta-backdrop absolute inset-0 h-[118%] w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#02170F]/92 via-[#02170F]/70 to-[#02170F]/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/80 to-transparent" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="cta-content max-w-[560px]">
          <h2 className="font-display text-[32px] uppercase leading-[1.1] text-[#FAF9F5] sm:text-[42px] lg:text-[48px]">
            Your next story
            <br />
            starts out there.
          </h2>

          <p className="mt-5 text-[14px] leading-relaxed text-white/75 sm:text-[15px]">
            The mountains are waiting. Where will you go?
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onExploreJourneys}
              className="inline-flex items-center gap-2 rounded-lg bg-[#B89A5A] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#012C18] transition-colors hover:bg-[#A88849]"
            >
              Explore Journeys
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onPlanTrip}
              className="inline-flex items-center gap-2 rounded-lg border border-[#F4F1E8]/45 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#F4F1E8] transition-colors hover:border-[#B89A5A] hover:bg-white/10"
            >
              Plan My Trip
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
