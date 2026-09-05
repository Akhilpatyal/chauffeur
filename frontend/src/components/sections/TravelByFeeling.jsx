import React, { useState } from 'react';
import { ArrowRight, Compass, Heart, Snowflake, Wind, Users, Leaf } from 'lucide-react';
import { feelings } from '../../data/feelings';

export default function TravelByFeeling({ onSelectFeeling }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentFeeling = feelings[activeIdx] || feelings[0];

  const icons = [Snowflake, Leaf, Compass, Users, Heart];

  return (
    <section className="py-16 sm:py-20 bg-[#012C18] text-[#F4F1E8]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="mb-8 sm:mb-10">
          <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-2">
            TRAVEL BY FEELING
          </span>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight">
              Don't choose a destination. <br />
              <span className="text-[#DDD4C1]">Choose a feeling.</span>
            </h2>

            {/* 02 / 05 counter */}
            <div className="flex items-center gap-3 text-xs font-mono text-[#DDD4C1]/60 shrink-0">
              <button
                onClick={() => setActiveIdx((prev) => (prev === 0 ? feelings.length - 1 : prev - 1))}
                className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center hover:border-white/60 hover:text-white transition-colors cursor-pointer"
              >
                ←
              </button>
              <span className="text-[#F4F1E8] font-bold text-base">0{activeIdx + 1}</span>
              <span>/</span>
              <span>0{feelings.length}</span>
              <button
                onClick={() => setActiveIdx((prev) => (prev === feelings.length - 1 ? 0 : prev + 1))}
                className="w-8 h-8 rounded-full border border-white/25 flex items-center justify-center hover:border-white/60 hover:text-white transition-colors cursor-pointer"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Main Balanced 40/60 Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-[#043A25] rounded-2xl overflow-hidden shadow-xl border border-white/10">

          {/* Left 40%: Text Content */}
          <div className="lg:col-span-5 p-8 sm:p-10 space-y-5">
            {/* Feeling Icon */}
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#B89A5A]">
              {React.createElement(icons[activeIdx] || Compass, { className: 'w-5 h-5' })}
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-2">
                0{activeIdx + 1} / 05
              </span>
              <h3 className="font-display text-2xl sm:text-3xl text-[#F4F1E8] font-normal leading-tight mb-2">
                {currentFeeling.tagline}
              </h3>
              <p className="text-sm sm:text-base text-[#DDD4C1]/85 font-light leading-relaxed">
                {currentFeeling.subtitle}
              </p>
            </div>

            {/* Destinations for this feeling */}
            <div className="pt-2 space-y-1">
              {currentFeeling.destinations.map((dest, i) => (
                <div key={i} className="text-xs text-[#DDD4C1]/70 font-sans flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#B89A5A] shrink-0"></span>
                  <span>{dest}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onSelectFeeling && onSelectFeeling(currentFeeling)}
              className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#B89A5A] hover:text-[#F4F1E8] transition-colors border-b border-[#B89A5A]/40 pb-0.5 cursor-pointer"
            >
              <span>Explore this feeling</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Feeling Switcher Dots */}
            <div className="flex items-center gap-2 pt-2">
              {feelings.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    activeIdx === i ? 'bg-[#B89A5A] w-5' : 'bg-white/25 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right 60%: Large Fully Visible Landscape Image */}
          <div className="lg:col-span-7 h-64 sm:h-80 lg:h-[420px]">
            <img
              src={currentFeeling.image}
              alt={currentFeeling.tagline}
              key={currentFeeling.id}
              className="w-full h-full object-cover"
            />
          </div>

        </div>

      </div>
    </section>
  );
}
