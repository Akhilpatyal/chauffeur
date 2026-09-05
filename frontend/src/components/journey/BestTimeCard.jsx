import React from 'react';
import { bestTime } from '../../data/journeyDetail';
import { JourneyIcon } from './journeyUi';

export default function BestTimeCard() {
  return (
    <section
      aria-labelledby="journey-season-heading"
      className="rounded-2xl border border-[#E0D6BE] bg-[#E9E1CD] p-5"
    >
      <h3 id="journey-season-heading" className="font-display text-[19px] text-[#012C18]">
        Best Time to Visit
      </h3>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {bestTime.map((season) => (
          <li
            key={season.months}
            className="rounded-xl border border-[#DFD4B8] bg-[#FAF9F5] p-3 text-center"
          >
            <span className="mx-auto flex h-7 w-7 items-center justify-center text-[#8A713C]">
              <JourneyIcon name={season.icon} className="h-4 w-4" />
            </span>
            <span className="mt-1.5 block text-[12px] font-semibold leading-tight text-[#012C18]">
              {season.months}
            </span>
            <span className="mt-1 block text-[10.5px] text-[#5E6B63]">
              ( {season.note} )
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
