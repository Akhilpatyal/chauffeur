import React, { useRef } from 'react';
import { BadgeCheck, Star } from 'lucide-react';
import { useHeroAnimation } from '../../animations/journey/heroAnimations';


export default function JourneyHero({ journey, onCheckAvailability }) {
  const scope = useRef(null);

  useHeroAnimation(scope);

  return (
    <section
      ref={scope}
      className="relative flex min-h-[460px] items-center bg-[#012C18] lg:min-h-[520px]"
    >
      {/* Backdrop clips its own zoom so the booking card can overhang the section */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={journey.heroImage}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          data-hero-media
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#02170F]/92 via-[#02170F]/65 to-[#02170F]/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/90 via-transparent to-[#02170F]/60" />
        <div className="topographic-bg-dark absolute inset-0 opacity-50" />
      </div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-28 pb-12 sm:px-6 lg:px-8 lg:pb-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_312px] lg:gap-12">
          {/* Copy */}
          <div className="max-w-[620px]">
            <p
              data-hero-line
              className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#B89A5A]"
            >
              {journey.eyebrow}
            </p>

            <h1 className="mt-3 font-display text-[38px] leading-[1.04] text-[#FAF9F5] sm:text-[52px] lg:text-[62px]">
              <span className="inline-block overflow-hidden align-bottom">
                <span data-hero-word className="inline-block">
                  {journey.title}
                </span>
              </span>{' '}
              <span className="inline-block overflow-hidden align-bottom">
                <span data-hero-word className="inline-block text-[#B89A5A]">
                  {journey.titleAccent}
                </span>
              </span>
            </h1>

            <p
              data-hero-line
              className="mt-3 font-display text-[18px] text-[#F4F1E8]/90 sm:text-[21px]"
            >
              {journey.subtitle}
            </p>

            <p
              data-hero-line
              className="mt-3 max-w-[470px] text-[14px] leading-relaxed text-white/70 sm:text-[15px]"
            >
              {journey.intro}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <span
                data-hero-meta
                className="inline-flex items-center gap-2 text-[13px] text-[#F4F1E8]"
              >
                <Star className="h-4 w-4 fill-[#B89A5A] text-[#B89A5A]" />
                <span className="font-bold">{journey.rating}</span>
                <span className="text-white/60">({journey.reviews} Reviews)</span>
              </span>

              <span
                data-hero-meta
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#F4F1E8]"
              >
                <BadgeCheck className="h-4 w-4 text-[#B89A5A]" strokeWidth={1.75} />
                {journey.badge}
              </span>
            </div>
          </div>

          {/* Booking card - overlaps the stats bar below */}
          <aside
            data-hero-card
            className="relative z-20 rounded-2xl border border-[#B89A5A]/30 bg-[#02170F]/80 p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md lg:mt-10 lg:-mb-10"
          >
            <p className="text-[11.5px] text-[#DDD4C1]/70">
              Starting from
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-[34px] leading-none text-[#FAF9F5]">
                {journey.price}
              </span>
              <span className="text-[12px] text-[#DDD4C1]/60">/ person</span>
            </p>

            <p className="mt-3 text-[12px] leading-relaxed text-[#DDD4C1]/70">
              {journey.priceNote}
            </p>

            <button
              type="button"
              onClick={onCheckAvailability}
              className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#B89A5A] py-3.5 text-[12.5px] font-semibold text-[#012C18] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#C9AB6B] hover:shadow-lg"
            >
              Check Availability
            </button>

            <p className="mt-3 text-center text-[10.5px] text-[#B89A5A]">
              {journey.bookingFootnote}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
