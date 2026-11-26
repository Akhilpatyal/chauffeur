import React from 'react';
import { ArrowRight, Compass } from 'lucide-react';
import { destinations } from '../../data/destinations';
import { navigateTo } from '../../router';
import { responsiveImage } from '../../lib/images';
import { AvailabilityTag } from '../common/Availability';
import { availabilityFor, OPEN } from '../../data/availability';

export default function WhereToDisappear({ onSelectDestination }) {
  /*
   * Looked up by id rather than by array position. The previous version
   * indexed destinations[0], [7], [5] and so on, so adding Bir Billing to the
   * catalogue silently reshuffled which card was which.
   */
  const pick = (id) => destinations.find((d) => d.id === id);

  /* Bir Billing leads, because it is the one we are actually running. */
  const topDestinations = [
    { name: 'Bir Billing', desc: 'Currently available', data: pick('bir-billing') },
    { name: 'Spiti Valley', desc: 'High altitude desert', data: pick('spiti') },
    { name: 'Dharamshala', desc: 'Under the Dhauladhar', data: pick('dharamshala') },
  ].filter((entry) => entry.data);

  const bottomDestinations = [
    { name: 'Himachal Pradesh', desc: 'Mountains & Valleys', data: pick('himachal') },
    { name: 'Kashmir', desc: 'Paradise on Earth', data: pick('kashmir') },
    { name: 'Ladakh', desc: 'Land of High Passes', data: pick('ladakh') },
    { name: 'Meghalaya', desc: 'Land of Clouds', data: pick('meghalaya') },
  ].filter((entry) => entry.data);

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
                DESTINATIONS
              </span>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-4xl font-normal text-[#003B24] leading-tight mb-4">
                Every direction holds a story.
              </h2>

              {/* Was onSelectDestination(destinations[0]), which opened the
                  first destination's detail page instead of the index. */}
              <button
                onClick={() => navigateTo('/destinations')}
                className="-ml-1 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 px-1 text-[12.5px] font-sans font-bold uppercase tracking-wider text-[#003B24] transition-colors hover:text-[#075333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
              >
                <span>Explore destinations</span>
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
                    {...responsiveImage(dest.data.image, '(min-width: 640px) 25vw, 50vw')}
                    alt={dest.name}
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 ${
                      availabilityFor(dest.data?.id).state === OPEN ? '' : 'saturate-[0.45]'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Top-left, clear of the arrow in the bottom-right. */}
                  <AvailabilityTag id={dest.data?.id} showOpen className="absolute left-3 top-3" />

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
                    {...responsiveImage(dest.data.image, '(min-width: 640px) 25vw, 50vw')}
                    alt={dest.name}
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-108 ${
                      availabilityFor(dest.data?.id).state === OPEN ? '' : 'saturate-[0.45]'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Top-left, clear of the arrow in the bottom-right. */}
                  <AvailabilityTag id={dest.data?.id} showOpen className="absolute left-3 top-3" />

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
