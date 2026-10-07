import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { publishedFacts } from '../../data/companyFacts';

/*
 * Every figure here is counted from the live catalogue. The five hardcoded
 * numbers that used to sit in this file — including a 4.9 rating attributed to
 * Google and Tripoto, and "250+ Journeys" against a catalogue of five — are
 * gone. See data/companyFacts.js for how to publish a real one.
 */
export default function TrustStats() {
  const stats = publishedFacts;

  /* With nothing verified yet this section could be a row of three. Rather
   * than show a thin strip pretending to be a milestone wall, it reframes
   * honestly as what we run. */
  if (stats.length === 0) return null;

  return (
    <section className="py-14 sm:py-16 bg-[#012C18] text-[#F4F1E8]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Label */}
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-4 h-4 text-[#B89A5A]" />
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A]">
            WHAT WE RUN
          </span>
        </div>

        {/* Stats Grid: 5 columns */}
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-6">
          {stats.map((stat) => (
            <div key={stat.id} className="text-left">
              <div className="font-display text-4xl sm:text-5xl text-[#F4F1E8] font-normal mb-1">
                {stat.value}
              </div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#B89A5A] mb-0.5">
                {stat.label}
              </div>
              <p className="text-[11px] text-[#DDD4C1]/60 font-sans leading-snug">
                {stat.sub}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
