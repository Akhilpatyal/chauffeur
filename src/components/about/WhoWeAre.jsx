import React from 'react';
import gsap from 'gsap';
import { ArrowRight, MountainSnow } from 'lucide-react';
import { aboutImages } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';
import { CompassMark, Eyebrow, MountainRule } from './aboutUi';

export default function WhoWeAre({ onExploreJourneys }) {
  const scope = useGsapScope(() => {
    gsap.set('.who-text > *', { opacity: 0, y: 22 });
    gsap.set('.who-media', { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set('.who-badge', { opacity: 0, y: 18 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.who-root', start: 'top 78%', once: true },
      defaults: { ease: 'power3.out' },
    });

    tl.to('.who-text > *', { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }, 0)
      .to('.who-media', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 }, 0.1)
      .to('.who-badge', { opacity: 1, y: 0, duration: 0.6 }, 0.75);
  });

  return (
    <section ref={scope} className="who-root relative overflow-hidden py-16 sm:py-20 lg:py-24">
      <CompassMark className="pointer-events-none absolute right-6 top-8 hidden h-32 w-32 text-[#075333] opacity-[0.12] lg:block" />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-16">
          {/* Copy */}
          <div className="who-text">
            <Eyebrow>Who We Are</Eyebrow>

            <h2 className="mt-4 flex flex-wrap items-end gap-3 font-display text-[34px] leading-[1.1] text-[#012C18] sm:text-[42px] lg:text-[46px]">
              <span>
                Crafting journeys
                <br />
                that stay with you
              </span>
              <MountainRule className="mb-2 hidden h-8 w-24 text-[#B7C0B4] sm:block" />
            </h2>

            <span className="mt-6 block h-px w-16 bg-[#012C18]/60" />

            <p className="mt-6 max-w-[420px] text-[14px] leading-[1.75] text-[#141E18]/75 sm:text-[15px]">
              We are mountain lovers, adventurers and locals who believe the best journeys
              are not just planned, they&rsquo;re felt.
            </p>

            <p className="mt-4 max-w-[420px] text-[14px] leading-[1.75] text-[#141E18]/75 sm:text-[15px]">
              From hidden trails to offbeat villages, we curate experiences that connect
              you with nature, culture and yourself.
            </p>

            <button
              type="button"
              onClick={onExploreJourneys}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#012C18] px-6 py-3.5 text-[12px] font-semibold text-[#F4F1E8] transition-colors hover:bg-[#075333]"
            >
              Explore Our Journeys
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Media */}
          <div className="relative">
            <div className="who-media overflow-hidden rounded-2xl">
              <img
                src={aboutImages.whoWeAre}
                alt="A lantern-lit mountain lodge at dusk"
                loading="lazy"
                className="h-[300px] w-full object-cover sm:h-[380px] lg:h-[430px]"
              />
            </div>

            <div className="who-badge relative -mt-14 ml-4 w-[200px] rounded-xl bg-[#043A25] p-5 shadow-[0_18px_40px_-24px_rgba(1,44,24,0.9)] sm:absolute sm:-left-10 sm:bottom-12 sm:mt-0 sm:ml-0 sm:w-[220px]">
              <MountainSnow className="h-5 w-5 text-[#B89A5A]" strokeWidth={1.4} />
              <h3 className="mt-3 font-display text-[16px] leading-snug text-[#F4F1E8]">
                Handpicked
                <br />
                with love
              </h3>
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#DDD4C1]/75">
                Every place we list is visited, verified and handpicked by our team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
