import React from 'react';
import { ShieldCheck } from 'lucide-react';

/*
 * What travelling with us is like, in three parts.
 *
 * WHY THERE ARE NO NUMBERS HERE ANY MORE
 *
 * This section used to publish counts — "5 Journeys", "8 Regions" — read from
 * the live catalogue so they could never be invented. That was the right fix
 * for the five hardcoded figures it replaced, including a 4.9 rating credited
 * to Google and "250+ Journeys" against a catalogue of five.
 *
 * It is now three described ideas rather than three tallies, and the 01/02/03
 * are an index, not a quantity. That sidesteps the problem the counting was
 * solving: with one region open, a truthful count is a small number, and a
 * small number presented as a milestone reads worse than no number at all.
 *
 * If a figure comes back here it must come from data/companyFacts.js, which
 * only publishes what is either derived from the catalogue or marked verified.
 */
const PILLARS = [
  {
    id: 'journeys',
    index: '01',
    label: 'Curated Journeys',
    body: 'Multi-day experiences shaped around remarkable places, local perspectives and meaningful moments.',
  },
  {
    id: 'escapes',
    index: '02',
    label: 'Short Escapes',
    body: 'Thoughtfully planned getaways that make every opportunity to explore count.',
  },
  {
    id: 'destinations',
    index: '03',
    label: 'Destinations',
    body: 'Places to discover, explored through local knowledge and experiences worth travelling for.',
  },
];

export default function TrustStats() {
  return (
    <section
      aria-labelledby="chaufer-experience-heading"
      className="py-14 sm:py-16 bg-[#012C18] text-[#F4F1E8]"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-4 h-4 text-[#B89A5A]" aria-hidden="true" />
          <h2
            id="chaufer-experience-heading"
            className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A]"
          >
            The Chaufer Experience
          </h2>
        </div>

        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          {PILLARS.map((pillar) => (
            <li key={pillar.id} className="text-left">
              <p className="font-display text-4xl sm:text-5xl text-[#F4F1E8]/35 font-normal mb-2 tabular-nums">
                {pillar.index}
              </p>
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#B89A5A] mb-1.5">
                {pillar.label}
              </p>
              {/* A readable measure rather than the full column width: these
                  are sentences now, not three-word captions. */}
              <p className="max-w-[42ch] text-[12.5px] leading-[1.7] text-[#DDD4C1]/70 font-sans">
                {pillar.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
