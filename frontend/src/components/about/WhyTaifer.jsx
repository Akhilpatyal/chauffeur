import React from 'react';
import gsap from 'gsap';
import { aboutImages, whyPoints } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';
import { AboutIcon, Eyebrow } from './aboutUi';

export default function WhyTaifer() {
  const scope = useGsapScope(() => {
    gsap.to('.why-image', {
      yPercent: -10,
      ease: 'none',
      scrollTrigger: {
        trigger: '.why-root',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    gsap.fromTo(
      '.why-point',
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.why-list', start: 'top 82%', once: true },
      }
    );
  });

  return (
    <section ref={scope} className="why-root bg-[#FAF9F5] py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Image */}
          <div className="relative h-[320px] overflow-hidden rounded-2xl sm:h-[420px] lg:h-[520px]">
            <img
              src={aboutImages.whyTaifer}
              alt="Travelers hiking a mountain trail"
              loading="lazy"
              className="why-image absolute inset-0 h-[118%] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/45 to-transparent" />
          </div>

          {/* Points */}
          <div>
            <Eyebrow>Why Taifer</Eyebrow>
            <h2 className="mt-4 font-display text-[32px] leading-[1.12] text-[#012C18] sm:text-[40px] lg:text-[44px]">
              We don&rsquo;t just sell trips.
              <br />
              We create stories.
            </h2>

            <ul className="why-list mt-8 divide-y divide-[#E6DFD0]">
              {whyPoints.map((point) => (
                <li key={point.number} className="why-point flex gap-4 py-5 first:pt-0">
                  <span className="mt-0.5 font-mono text-[12px] font-bold tracking-[0.15em] text-[#B89A5A]">
                    {point.number}
                  </span>

                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#DDD4C1] bg-[#F4F1E8] text-[#075333]">
                    <AboutIcon name={point.icon} className="h-4 w-4" />
                  </span>

                  <span className="min-w-0">
                    <h3 className="font-display text-[20px] leading-tight text-[#012C18]">
                      {point.title}
                    </h3>
                    <p className="mt-1.5 max-w-[420px] text-[13px] leading-[1.7] text-[#141E18]/70 sm:text-[13.5px]">
                      {point.body}
                    </p>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
