import React from 'react';
import gsap from 'gsap';
import { ArrowRight, Play } from 'lucide-react';
import { aboutImages } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';
import { CompassMark } from './aboutUi';

export default function AboutHero({ onExploreJourneys, onWatchStory }) {
  const scope = useGsapScope(() => {
    gsap.set('.hero-rise', { opacity: 0, y: 26 });
    gsap.set('.hero-media', { scale: 1.08 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.hero-media', { scale: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .to('.hero-rise', { opacity: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.15);
  });

  return (
    <section
      ref={scope}
      className="relative flex min-h-[440px] items-center overflow-hidden bg-[#012C18] sm:min-h-[480px] lg:min-h-[500px]"
    >
      {/* Same hero treatment as the Hotels page, with the About banner */}
      <img
        src={aboutImages.hero}
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="hero-media absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#02170F]/90 via-[#02170F]/55 to-[#02170F]/15" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02170F]/55 via-transparent to-[#02170F]/75" />
      <div className="topographic-bg-dark absolute inset-0 opacity-60" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F4F1E8]" />

      <CompassMark className="pointer-events-none absolute -right-10 top-10 hidden h-56 w-56 text-[#F4F1E8] opacity-[0.06] lg:block" />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-28 pb-16 sm:px-6 sm:pt-32 lg:px-8">
        <div className="max-w-[640px]">
          <p className="hero-rise font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#B89A5A]">
            Our Story
          </p>

          <h1 className="mt-4 font-display text-[32px] leading-[1.06] text-[#FAF9F5] sm:text-[48px] lg:text-[64px] xl:text-[72px]">
            <span className="hero-rise block">Born in the mountains.</span>
            <span className="hero-rise block">
              Built for <span className="text-[#B89A5A]">explorers.</span>
            </span>
          </h1>

          <p className="hero-rise mt-5 max-w-[440px] text-[14px] leading-relaxed text-white/75 sm:text-[15px]">
            Taifer is more than a travel company —<br className="hidden sm:block" /> we are a
            community of explorers, storytellers
            <br className="hidden sm:block" /> and dreamers.
          </p>

          <div className="hero-rise mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={onExploreJourneys}
              className="inline-flex items-center gap-2 rounded-lg bg-[#B89A5A] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#012C18] transition-colors hover:bg-[#A88849]"
            >
              Explore Our Journeys
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onWatchStory}
              className="group inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F4F1E8]/85 transition-colors hover:text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 transition-colors group-hover:border-[#B89A5A] group-hover:bg-white/10">
                <Play className="h-3 w-3 fill-current" />
              </span>
              Watch Our Story
            </button>
          </div>
        </div>

        <p className="pointer-events-none absolute bottom-8 right-8 hidden font-mono text-[10px] tracking-[0.2em] text-[#F4F1E8]/25 lg:block">
          32.2432° N · 77.1892° E
        </p>
      </div>
    </section>
  );
}
