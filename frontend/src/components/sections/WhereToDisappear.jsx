import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { destinations } from '../../data/destinations';
import { navigateTo } from '../../router';

export default function WhereToDisappear({ onSelectDestination }) {
  const topDestinations = [
    { name: 'Spiti Valley', desc: 'High altitude desert', image: destinations[0].image, data: destinations[0] },
    { name: 'Kashmir', desc: 'Paradise on Earth', image: destinations[1].image, data: destinations[1] },
    { name: 'Ladakh', desc: 'Land of High Passes', image: destinations[2].image, data: destinations[2] },
  ];

  const bottomDestinations = [
    { name: 'Himachal Pradesh', desc: 'Mountains & Valleys', image: destinations[7].image, data: destinations[7] },
    { name: 'Meghalaya', desc: 'Land of Clouds', image: destinations[5].image, data: destinations[5] },
    { name: 'Rajasthan', desc: 'Royal Heritage', image: destinations[3].image, data: destinations[3] },
    { name: 'Uttarakhand', desc: 'Land of Devbhoomi', image: destinations[6].image, data: destinations[6] },
  ];

  return (
    <section id="destinations" className="py-16 sm:py-20 bg-[#F4F1E8] text-[#003B24] relative overflow-hidden">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-6">
          
          {/* Left Title Area with Faint Compass Motif */}
          <div className="lg:col-span-3 space-y-4 relative">
            {/* Compass watermark */}
            <div className="absolute -left-12 -top-6 w-48 h-48 opacity-10 pointer-events-none text-[#003B24]">
              <Compass className="w-full h-full stroke-[0.75]" />
            </div>

            <div className="relative z-10">
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-1">
                TOP DESTINATIONS
              </span>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-4xl font-normal text-[#003B24] leading-tight mb-4">
                Where do you want to disappear?
              </h2>

              {/* Was onSelectDestination(destinations[0]), which opened the
                  first destination's detail page instead of the index. */}
              <button
                onClick={() => navigateTo('/destinations')}
                className="inline-flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider text-[#003B24] hover:text-[#075333] transition-colors cursor-pointer pt-2"
              >
                <span>View all destinations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Area: 2-Row Destination Grid */}
          <div className="lg:col-span-9 space-y-4">
            
            {/* Top Row: 3 Wide Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topDestinations.map((dest) => (
                <div
                  key={dest.name}
                  onClick={() => onSelectDestination(dest.data)}
                  className="group relative h-48 sm:h-52 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                    <div>
                      <h3 className="font-display text-lg sm:text-xl text-white font-normal leading-snug">
                        {dest.name}
                      </h3>
                      <p className="text-[11px] text-white/80 font-sans">{dest.desc}</p>
                    </div>

                    <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-[#003B24] transition-colors shrink-0">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row: 4 Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {bottomDestinations.map((dest) => (
                <div
                  key={dest.name}
                  onClick={() => onSelectDestination(dest.data)}
                  className="group relative h-40 sm:h-44 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                    <div>
                      <h3 className="font-display text-sm sm:text-base text-white font-normal leading-snug">
                        {dest.name}
                      </h3>
                      <p className="text-[10px] text-white/80 font-sans truncate">{dest.desc}</p>
                    </div>

                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-[#003B24] transition-colors shrink-0">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
