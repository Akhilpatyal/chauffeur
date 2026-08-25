import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function CampaignBanner({ onExploreDeals }) {
  return (
    <section className="relative py-20 sm:py-28 bg-[#012C18] text-[#F4F1E8] overflow-hidden">
      {/* Full-bleed Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=2400&q=85"
          alt="Spiti Valley mountain road"
          loading="lazy"
          className="w-full h-full object-cover object-center brightness-[0.4] contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#012C18]/95 via-[#012C18]/70 to-[#012C18]/30" />
      </div>

      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          
          <span className="text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-[#B89A5A] block mb-4">
            FEATURED EXPEDITION
          </span>

          <h2 className="font-display text-4xl sm:text-5xl lg:text-7xl text-[#F4F1E8] font-normal leading-[1.05] tracking-tight mb-4">
            SPITI VALLEY
          </h2>

          <h3 className="font-display text-2xl sm:text-3xl text-[#DDD4C1] font-normal leading-tight mb-6">
            BEYOND THE ORDINARY
          </h3>

          {/* Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#DDD4C1]/90 mb-8">
            <span className="px-3 py-1.5 rounded-md bg-white/10 border border-white/15">6 DAYS</span>
            <span className="px-3 py-1.5 rounded-md bg-white/10 border border-white/15">SMALL GROUP</span>
            <span className="px-3 py-1.5 rounded-md bg-white/10 border border-white/15">HIGH ALTITUDE</span>
            <span className="px-3 py-1.5 rounded-md bg-white/10 border border-white/15 text-[#B89A5A]">From ₹14,999</span>
          </div>

          {/* Coordinates */}
          <div className="text-[11px] font-mono text-[#DDD4C1]/50 mb-6 tracking-wider">
            32°14'32"N 77°10'18"E · KUNZUM PASS 14,931 FT
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={onExploreDeals}
              className="px-6 py-3 rounded-lg bg-[#F4F1E8] hover:bg-white text-[#003B24] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
            >
              <span>Discover the Journey</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-mono text-[#DDD4C1]/60">
              May & Sep 2026 Departures
            </span>
          </div>

        </div>
      </div>
    </section>
  );
}
