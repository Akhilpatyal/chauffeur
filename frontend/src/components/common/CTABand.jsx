import React, { useRef } from 'react';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { RidgeMark } from '../journey/journeyUi';

/*
 * The closing call to action.
 *
 * Same card as BookingCTA on the journey detail page — ridge mark, topographic
 * wash, forest primary button and an outlined secondary — generalised so the
 * stories, escapes and journeys pages all end on the same note instead of each
 * inventing one.
 */
export default function CTABand({
  title = 'Ready for an unforgettable journey?',
  subtitle = 'Tell us roughly what you want and we will come back with a route, not a brochure.',
  primaryLabel = 'Plan my trip',
  onPrimary,
  secondaryLabel,
  onSecondary,
  secondaryIcon: SecondaryIcon,
}) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 86%' });

  return (
    <section ref={scope} className="bg-[#F4F1E8] pb-16 sm:pb-20">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] px-6 py-8 sm:px-9 sm:py-9">
          <RidgeMark className="pointer-events-none absolute -bottom-3 right-6 h-20 w-[320px] text-[#012C18] opacity-[0.07]" />
          <div className="topographic-bg absolute inset-0 opacity-60" />

          <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <h2
                data-reveal
                className="font-display text-[26px] leading-[1.15] text-[#012C18] sm:text-[32px]"
              >
                {title}
              </h2>
              <p data-reveal className="mt-2 max-w-[52ch] text-[13.5px] text-[#5E6B63] sm:text-[14.5px]">
                {subtitle}
              </p>
            </div>

            <div
              data-reveal
              className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
            >
              <button
                type="button"
                /* Called with no arguments: these handlers take enquiry
                   context, and passing a MouseEvent into that slot would
                   silently produce a contextless lead. */
                onClick={() => onPrimary?.()}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#043A25] px-7 py-3.5 text-[12.5px] font-semibold text-[#FAF9F5] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#012C18] hover:shadow-lg"
              >
                {primaryLabel}
              </button>

              {secondaryLabel && (
                <button
                  type="button"
                  onClick={() => onSecondary?.()}
                  className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#C9C2B0] px-7 py-3.5 text-[12.5px] font-semibold text-[#012C18] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#043A25] hover:bg-[#043A25]/5"
                >
                  {SecondaryIcon && (
                    <SecondaryIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                  )}
                  {secondaryLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
