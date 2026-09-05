import React from 'react';
import { Check } from 'lucide-react';
import { included } from '../../data/journeyDetail';

export default function IncludedCard() {
  return (
    <section
      aria-labelledby="journey-included-heading"
      className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5"
    >
      <h3
        id="journey-included-heading"
        className="font-display text-[19px] text-[#012C18]"
      >
        What&rsquo;s Included
      </h3>

      <ul className="mt-4 space-y-2.5">
        {included.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Check
              aria-hidden="true"
              className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#075333]"
              strokeWidth={3}
            />
            <span className="text-[12.5px] leading-[1.6] text-[#4A5B50]">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
