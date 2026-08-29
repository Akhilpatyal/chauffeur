import React from 'react';
import gsap from 'gsap';
import { philosophyPillars } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';
import { AboutIcon, Eyebrow, RouteLine } from './aboutUi';

export default function Philosophy() {
  const scope = useGsapScope(() => {
    gsap.fromTo(
      '.philosophy-head > *',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.philosophy-root', start: 'top 80%', once: true },
      }
    );

    gsap.fromTo(
      '.philosophy-card',
      { opacity: 0, y: 26 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.philosophy-grid', start: 'top 85%', once: true },
      }
    );
  });

  return (
    <section
      ref={scope}
      className="philosophy-root relative overflow-hidden bg-[#F4F1E8] py-16 sm:py-20 lg:py-24"
    >
      <RouteLine className="pointer-events-none absolute right-4 top-24 hidden h-20 w-52 text-[#B89A5A] opacity-40 lg:block" />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="philosophy-head grid gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>What We Believe</Eyebrow>
            <h2 className="mt-4 font-display text-[32px] leading-[1.12] text-[#012C18] sm:text-[42px] lg:text-[46px]">
              Travel with purpose.
              <br />
              Explore with respect.
            </h2>
          </div>

          <div className="lg:pt-10">
            <p className="max-w-[460px] text-[14px] leading-[1.8] text-[#141E18]/75 sm:text-[15px]">
              We believe travel should leave places better, communities stronger and
              travelers changed. We follow responsible practices that protect the places we
              love and support the people who call them home.
            </p>
          </div>
        </div>

        <div className="philosophy-grid mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {philosophyPillars.map((pillar) => (
            <article
              key={pillar.title}
              className="philosophy-card group rounded-xl border border-[#E6DFD0] bg-[#FAF9F5] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#B89A5A]/60 hover:shadow-[0_20px_44px_-30px_rgba(1,44,24,0.6)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#043A25] text-[#F4F1E8] transition-transform duration-300 group-hover:scale-105">
                <AboutIcon name={pillar.icon} className="h-4 w-4" />
              </span>

              <h3 className="mt-5 whitespace-pre-line font-display text-[20px] leading-[1.2] text-[#012C18]">
                {pillar.title}
              </h3>

              <p className="mt-3 text-[12.5px] leading-[1.7] text-[#141E18]/70">
                {pillar.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
