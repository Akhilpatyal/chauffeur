import React from 'react';
import { JourneyIcon } from './journeyUi';

export default function JourneyHighlights({ highlights }) {
  return (
    <section
      aria-labelledby="journey-highlights-heading"
      className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5"
    >
      <h3
        id="journey-highlights-heading"
        className="font-display text-[19px] text-[#012C18]"
      >
        Journey Highlights
      </h3>

      <ul className="mt-4 space-y-3">
        {highlights.map((item) => (
          <li key={item.text} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F1E8] text-[#075333]">
              <JourneyIcon name={item.icon} className="h-3.5 w-3.5" />
            </span>
            <span className="text-[12.5px] leading-[1.6] text-[#4A5B50]">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
