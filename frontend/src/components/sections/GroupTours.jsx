import React, { useState } from 'react';
import { Calendar, Users, ArrowRight } from 'lucide-react';
import { groupTourCards } from '../../data/groupToursPage';

export default function GroupTours({ onJoinTour, onExploreAllGroups }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const featuredTour = groupTourCards[activeIdx] || groupTourCards[0];

  const upcomingTours = [
    /* One catalogue, shared with the Group Tours page - no contradictory pricing */
    ...groupTourCards.slice(0, 4).map((tour, i) => ({
      id: i + 1,
      title: tour.title,
      sub: `${tour.duration} · ${tour.seatsRemaining} seats left`,
      price: tour.price,
      hot: tour.badge === 'Best Seller',
      data: tour,
    })),
  ];

  return (
    <section id="group-tours" className="py-16 sm:py-20 bg-[#F4F1E8] text-[#003B24]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 3-Column Grid Matching Mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Column 1: Featured Group Tour (Span 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-1">
                GROUP TOURS
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-normal text-[#003B24] leading-tight">
                Travel together. <br /> Remember forever.
              </h2>

              <button
                onClick={onExploreAllGroups}
                className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#003B24] hover:text-[#075333] transition-colors cursor-pointer mt-3"
              >
                <span>View all group tours</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Featured Tour Card */}
            <div
              onClick={() => onJoinTour(featuredTour)}
              className="rounded-2xl overflow-hidden bg-white border border-[#DDD4C1] shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group"
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={featuredTour.image}
                  alt={featuredTour.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#D65A3A] text-white">
                    {featuredTour.seatsRemaining} SEATS LEFT
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-display text-xl text-white font-normal">{featuredTour.title}</h3>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-4 text-xs font-sans text-[#003B24]/70">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#B89A5A]" />
                    {featuredTour.dates}
                  </span>
                  <span>{featuredTour.duration}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#B89A5A]" />
                    {featuredTour.seatsRemaining} Available
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#DDD4C1]">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#003B24]/60">Per Person</span>
                    <p className="text-xl font-bold text-[#003B24] font-mono">{featuredTour.price}</p>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-[#003B24] hover:bg-[#075333] text-white text-xs font-bold uppercase tracking-wide transition-colors">
                    Join Journey
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Stacked Upcoming Departures (Span 4) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#003B24]/60 mb-3">
              Upcoming Departures
            </div>

            <div className="space-y-2.5 flex-1">
              {upcomingTours.map((tour, idx) => (
                <div
                  key={tour.id}
                  onClick={() => onJoinTour(tour.data)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    activeIdx === idx
                      ? 'bg-[#003B24] text-[#F4F1E8] border-[#003B24] shadow-md'
                      : 'bg-white text-[#003B24] border-[#DDD4C1] hover:border-[#003B24]/40'
                  }`}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <div>
                    <h4 className="font-display text-sm font-normal leading-snug">{tour.title}</h4>
                    <p className={`text-[11px] font-sans ${activeIdx === idx ? 'text-[#DDD4C1]/80' : 'text-[#003B24]/60'}`}>
                      {tour.sub}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold font-mono ${activeIdx === idx ? 'text-[#F4F1E8]' : 'text-[#003B24]'}`}>
                      {tour.price}
                    </p>
                    {tour.hot && (
                      <span className="text-[9px] font-mono font-bold text-[#D65A3A] uppercase">Hot</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Why TAIFER Compact Card (Span 3) */}
          <div className="lg:col-span-3 rounded-2xl bg-[#003B24] text-[#F4F1E8] p-6 sm:p-7 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block">
                WHY TAIFER
              </span>
              <h3 className="font-display text-2xl text-white font-normal leading-tight">
                We don't sell trips. We create stories.
              </h3>
            </div>

            <div className="space-y-3 my-5">
              {[
                { n: '01', label: 'Local Experts', sub: 'Native mountain leaders' },
                { n: '02', label: 'Handpicked Experiences', sub: 'Curated for depth, not volume' },
                { n: '03', label: 'Small Groups', sub: '12–14 travelers max' },
                { n: '04', label: '24/7 Support', sub: 'Always with you on trail' },
              ].map((p) => (
                <div key={p.n} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <span className="text-xs font-mono font-bold text-[#B89A5A] shrink-0 mt-0.5">{p.n}</span>
                  <div>
                    <p className="text-xs font-bold text-[#F4F1E8] font-sans">{p.label}</p>
                    <p className="text-[11px] text-[#DDD4C1]/70 font-sans">{p.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={onExploreAllGroups}
              className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#B89A5A] hover:text-white transition-colors cursor-pointer"
            >
              <span>Know Our Story</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>
    </section>
  );
}
