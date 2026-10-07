import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function TrustStats() {
  const stats = [
    { value: '10K+', label: 'Happy Travelers', sub: 'Minds at peace, bags unpacked' },
    { value: '250+', label: 'Journeys', sub: 'Routes explored and chronicled' },
    { value: '50+', label: 'Destinations', sub: 'Frontiers discovered & mapped' },
    { value: '4.9★', label: 'Average Rating', sub: 'Across Google, Tripoto & more' },
    { value: '10+', label: 'Years Exploring', sub: 'A decade of mountain stories' },
  ];

  return (
    <section className="py-14 sm:py-16 bg-[#012C18] text-[#F4F1E8]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Label */}
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="w-4 h-4 text-[#B89A5A]" />
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A]">
            EXPEDITION MILESTONES — CERTIFIED RECORD 2026
          </span>
        </div>

        {/* Stats Grid: 5 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 sm:gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-left">
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
