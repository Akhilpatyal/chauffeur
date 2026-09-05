import React, { useRef } from 'react';
import { whyTravelGroup } from '../../data/groupToursPage';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { GroupIcon } from './groupUi';

export default function WhyTravelGroup() {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 86%', stagger: 0.07 });

  return (
    <section
      ref={scope}
      aria-labelledby="why-group-heading"
      className="bg-[#F4F1E8] pb-14"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2
          id="why-group-heading"
          className="font-display text-[28px] leading-none text-[#012C18] sm:text-[32px]"
        >
          Why Travel in a Group?
        </h2>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {whyTravelGroup.map((item) => (
            <li
              key={item.title}
              data-reveal
              className="group rounded-xl border border-[#E3DDCB] bg-[#FAF9F5] p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#B89A5A]/60 hover:shadow-[0_18px_40px_-30px_rgba(1,44,24,0.6)]"
            >
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#043A25] text-[#B89A5A] transition-transform duration-300 group-hover:scale-105">
                <GroupIcon name={item.icon} className="h-4 w-4" />
              </span>

              <h3 className="mt-4 text-[13px] font-bold text-[#012C18]">{item.title}</h3>

              <p className="mt-2 text-[11.5px] leading-[1.65] text-[#7C857E]">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
