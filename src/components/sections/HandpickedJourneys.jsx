import React, { useState } from 'react';
import { Star, Clock, MapPin, ArrowRight, Compass, Sparkles } from 'lucide-react';
import { journeys } from '../../data/journeys';

export default function HandpickedJourneys({ onSelectJourney, onExploreAll }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const compactJourneys = [
    {
      id: 'kashmir-lakes',
      title: 'Kashmir Great Lakes',
      duration: '6 Days · Moderate',
      price: 'From ₹18,499',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=400&q=80',
      fullJourney: journeys[1]
    },
    {
      id: 'ladakh-expedition',
      title: 'Ladakh Road Expedition',
      duration: '8 Days · Road Trip',
      price: 'From ₹24,999',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=400&q=80',
      fullJourney: journeys[2]
    },
    {
      id: 'himachal-escape',
      title: 'Himachal Escape',
      duration: '5 Days · Easy',
      price: 'From ₹9,999',
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=400&q=80',
      fullJourney: journeys[4]
    },
    {
      id: 'meghalaya-explorer',
      title: 'Meghalaya Explorer',
      duration: '4 Days · Easy',
      price: 'From ₹8,499',
      rating: 4.6,
      image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80',
      fullJourney: journeys[3]
    },
    {
      id: 'uttarakhand-trails',
      title: 'Uttarakhand Trails',
      duration: '6 Days · Moderate',
      price: 'From ₹12,499',
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=80',
      fullJourney: journeys[0]
    }
  ];

  return (
    <section id="journeys" className="py-16 sm:py-20 bg-[#F4F1E8] text-[#003B24]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-1">
              HANDPICKED JOURNEYS
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#003B24]">
              Your next adventure starts here.
            </h2>
          </div>

          <button
            onClick={onExploreAll}
            className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#003B24] hover:text-[#075333] transition-colors cursor-pointer"
          >
            <span>View all journeys</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3-Column Layout Matching Exact Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Column 1: Featured Spiti Valley Card (Span 5 cols, ~42%) */}
          <div
            onClick={() => onSelectJourney(journeys[0])}
            className="lg:col-span-5 rounded-2xl overflow-hidden relative shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer h-[420px] sm:h-[480px] lg:h-auto"
          >
            <img
              src={journeys[0].image}
              alt="Spiti Valley"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

            {/* Badge */}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-md text-[10px] font-mono font-bold bg-[#003B24] text-[#B89A5A] tracking-wider uppercase">
                FEATURED JOURNEY
              </span>
            </div>

            {/* Bottom Overlay Content */}
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <h3 className="font-display text-3xl sm:text-4xl text-white font-normal mb-1">
                Spiti Valley
              </h3>
              <p className="text-xs text-white/80 font-sans mb-3">
                6 Days · High Altitude · Small Group
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#B89A5A]">★ 4.9 (120 Reviews)</span>
                  <span className="text-xs text-white/60">·</span>
                  <span className="text-sm font-bold text-white">From ₹14,999</span>
                </div>

                <div className="w-8 h-8 rounded-full bg-white text-[#003B24] flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: 5 Stacked Compact Rows (Span 3.5 cols, ~28%) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
            {compactJourneys.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => onSelectJourney(item.fullJourney)}
                className="p-2.5 sm:p-3 rounded-xl bg-white border border-[#DDD4C1] hover:border-[#003B24] hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-12 rounded-lg overflow-hidden shrink-0">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm text-[#003B24] font-normal leading-snug group-hover:text-[#075333]">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#003B24]/60 font-sans">{item.duration}</p>
                    <p className="text-[11px] font-bold text-[#003B24] font-sans">{item.price}</p>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-1 text-xs font-mono text-[#003B24]">
                  <Star className="w-3 h-3 text-[#B89A5A] fill-[#B89A5A]" />
                  <span>{item.rating}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Column 3: Featured Spiti Beyond The Ordinary Card (Span 3.5 cols, ~30%) */}
          <div className="lg:col-span-3 rounded-2xl overflow-hidden bg-[#003B24] text-[#F4F1E8] p-6 flex flex-col justify-between relative shadow-md">
            {/* Background image & overlay */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <img
                src="https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=800&q=80"
                alt="Mountain road"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="relative z-10 space-y-4">
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block">
                FEATURED EXPEDITION
              </span>

              <h3 className="font-display text-2xl sm:text-3xl text-white font-normal leading-tight">
                SPITI <br />
                BEYOND THE <br />
                ORDINARY
              </h3>

              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#DDD4C1] pt-1">
                <span className="px-2 py-1 rounded bg-white/10">⏱ 6 DAYS</span>
                <span className="px-2 py-1 rounded bg-white/10">👥 SMALL GROUP</span>
                <span className="px-2 py-1 rounded bg-white/10">🏔 HIGH ALTITUDE</span>
              </div>
            </div>

            <div className="relative z-10 pt-6 space-y-4">
              <button
                onClick={() => onSelectJourney(journeys[0])}
                className="w-full py-3 px-4 rounded-lg bg-[#B89A5A] hover:bg-[#A88849] text-[#003B24] text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Discover the Journey</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#DDD4C1]/60 pt-1">
                <span>32°14'32"N 77°10'18"E</span>
                <Compass className="w-4 h-4 text-[#B89A5A]/50" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
