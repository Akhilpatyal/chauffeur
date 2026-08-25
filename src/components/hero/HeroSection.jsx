import React from 'react';
import { ArrowRight, ChevronRight, Camera, Tv2, Compass } from 'lucide-react';
import SearchBar from '../navigation/SearchBar';

export default function HeroSection({ onPlanTripClick, onSearchSubmit }) {
  const scrollToJourneys = () => {
    const el = document.getElementById('journeys');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[92vh] sm:min-h-[96vh] flex flex-col justify-between pt-24 sm:pt-28 pb-6 sm:pb-8 overflow-hidden bg-[#003B24] text-[#F4F1E8]">
      
      {/* Background Image: Trekker on Ridge Overlooking Alpine Lake */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=2400&q=90"
          alt="Trekker standing over Himalayan mountain valley"
          fetchPriority="high"
          className="w-full h-full object-cover object-center"
        />
        
        {/* Layered Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#003B24] via-[#003B24]/40 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
      </div>

      {/* Floating Vertical Social Bar on Left (Mockup match) */}
      <div className="hidden lg:flex flex-col items-center gap-4 absolute left-6 top-1/3 z-20 text-white/70">
        <a href="#" className="hover:text-[#B89A5A] transition-colors p-1" aria-label="Instagram">
          <Camera className="w-4 h-4" />
        </a>
        <a href="#" className="hover:text-[#B89A5A] transition-colors p-1" aria-label="YouTube">
          <Tv2 className="w-4 h-4" />
        </a>
        <a href="#" className="hover:text-[#B89A5A] transition-colors p-1" aria-label="Compass">
          <Compass className="w-4 h-4" />
        </a>
        <div className="w-px h-12 bg-white/20 mt-1"></div>
      </div>

      {/* Floating Coordinates in Top Right (Mockup match) */}
      <div className="hidden md:block absolute right-8 sm:right-12 top-28 z-20 text-right font-mono text-xs text-[#DDD4C1]/90 space-y-1">
        <div className="font-bold tracking-wider">32°14'12"N</div>
        <div className="font-bold tracking-wider">77°10'18"E</div>
        <div className="text-[10px] tracking-[0.25em] text-[#B89A5A] pt-1 uppercase">HIMALAYAS</div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto py-8">
        <div className="max-w-2xl text-left">
          
          {/* Eyebrow */}
          <div className="text-xs sm:text-sm font-mono font-bold tracking-[0.25em] uppercase text-[#DDD4C1] mb-3">
            THE GREAT OUTDOORS
          </div>

          {/* Main Hero Headline */}
          <h1 className="font-display text-5xl sm:text-7xl lg:text-[84px] text-[#F4F1E8] font-normal leading-[1.04] tracking-tight mb-4">
            GO WHERE <br />
            THE ROAD <br />
            <span className="text-[#B89A5A] font-serif italic">ENDS.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#DDD4C1]/90 font-light leading-relaxed mb-7">
            Journeys beyond the ordinary.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <button
              onClick={scrollToJourneys}
              className="px-6 py-3 rounded-lg bg-[#003B24] hover:bg-[#075333] text-[#F4F1E8] text-xs font-sans font-bold tracking-wider uppercase inline-flex items-center gap-2 border border-white/20 transition-colors shadow-lg cursor-pointer"
            >
              <span>Explore Journeys</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onPlanTripClick}
              className="px-5 py-3 rounded-lg bg-black/30 hover:bg-black/50 text-[#F4F1E8] text-xs font-sans font-semibold tracking-wider uppercase inline-flex items-center gap-1.5 border border-white/25 backdrop-blur-sm transition-colors cursor-pointer"
            >
              <span>Plan My Journey</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Floating Expedition Search Bar */}
      <div className="relative z-20 max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <SearchBar onSearchSubmit={onSearchSubmit} />
      </div>

    </section>
  );
}
