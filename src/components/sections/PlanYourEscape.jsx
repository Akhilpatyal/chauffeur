import React from 'react';
import { Compass, MessageCircle, ArrowRight } from 'lucide-react';
import MagneticButton from '../common/MagneticButton';

export default function PlanYourEscape({ onOpenTripBuilder }) {
  return (
    <section className="relative py-24 sm:py-36 bg-[#012C18] text-[#F4F1E8] overflow-hidden">
      {/* Full-Bleed High Mountain Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=2400&q=90"
          alt="Trans-Himalayan mountain pass ridge"
          loading="lazy"
          className="w-full h-full object-cover object-center filter brightness-40 contrast-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#012C18] via-[#012C18]/80 to-[#012C18]/60" />
        <div className="absolute inset-0 topographic-bg-dark opacity-35" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-[#B89A5A] text-xs font-mono font-bold uppercase tracking-[0.25em] mb-6">
          <Compass className="w-3.5 h-3.5" />
          <span>TAILORED EXPEDITION CONCIERGE</span>
        </div>

        {/* Big Headline */}
        <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl text-[#F4F1E8] font-normal leading-[1.08] tracking-tight mb-6">
          DON'T KNOW WHERE TO GO? <br />
          <span className="font-editorial italic font-light text-[#B89A5A]">
            Let's find your next adventure.
          </span>
        </h2>

        {/* Narrative Copy */}
        <p className="text-base sm:text-xl text-[#DDD4C1]/90 font-light leading-relaxed max-w-2xl mx-auto mb-10">
          Whether you seek a high-altitude solo retreat, an overland 4x4 caravan with friends, or an off-grid cedar homestay—we craft custom routes down to the trail coordinates.
        </p>

        {/* Dual Actions */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          <MagneticButton
            variant="ivory"
            size="lg"
            onClick={onOpenTripBuilder}
            icon={ArrowRight}
            className="shadow-2xl"
          >
            Plan My Journey
          </MagneticButton>

          <a
            href="https://wa.me/919876543210?text=Hi%20TAIFER,%20I%20would%20like%20to%20plan%20a%20mountain%20journey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-md text-xs sm:text-sm font-mono font-bold tracking-wider uppercase transition-all duration-300 shadow-sm"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span>Talk to an Expert</span>
          </a>
        </div>

        {/* Coordinate Strip */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-[#DDD4C1]/70 font-mono">
          <span>⚡ Curated within 24 Hours</span>
          <span>·</span>
          <span>📍 32°N HIMALAYAN EXP-08</span>
          <span>·</span>
          <span>🛡️ Certified High-Altitude Protocol</span>
        </div>

      </div>
    </section>
  );
}
