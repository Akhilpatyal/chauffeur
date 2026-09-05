import React, { useRef } from 'react';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { JourneyIcon } from './journeyUi';

export default function JourneyStats({ stats }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 92%', y: 18 });

  return (
    <section ref={scope} className="bg-[#012C18]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Horizontal scroll on small screens, five even columns from sm up */}
        <ul className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto py-7 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible lg:grid-cols-5 lg:py-8">
          {stats.map((stat) => (
            <li
              key={stat.label}
              data-reveal
              className="flex min-w-[140px] shrink-0 snap-start items-center gap-3 sm:min-w-0"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#B89A5A]/35 bg-[#B89A5A]/10 text-[#B89A5A]">
                <JourneyIcon name={stat.icon} className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-display text-[20px] leading-none text-[#F4F1E8]">
                  {stat.value}
                </span>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#DDD4C1]/60">
                  {stat.label}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
