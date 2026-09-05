import React, { useRef } from 'react';
import { groupInclusions } from '../../data/groupToursPage';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { GroupIcon } from './groupUi';

export default function GroupInclusions() {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 88%', stagger: 0.06, y: 18 });

  return (
    <section ref={scope} aria-labelledby="group-inclusions-heading" className="bg-[#F4F1E8] pb-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-[#043A25] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-8">
            <h2
              id="group-inclusions-heading"
              data-reveal
              className="shrink-0 font-display text-[21px] leading-tight text-[#F4F1E8] sm:text-[24px]"
            >
              Group Tour Inclusions
            </h2>

            <ul className="grid flex-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {groupInclusions.map((item) => (
                <li key={item.label} data-reveal className="flex items-start gap-2.5">
                  <GroupIcon
                    name={item.icon}
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#B89A5A]"
                    strokeWidth={1.4}
                  />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-semibold text-[#F4F1E8]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-[#DDD4C1]/65">
                      {item.note}
                    </span>
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
