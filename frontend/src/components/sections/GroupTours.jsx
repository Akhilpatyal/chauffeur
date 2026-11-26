import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { groupTourCards } from '../../data/groupToursPage';
import { whyUsStages } from '../../data/whyUsData';
import { availabilityFor, isOpen } from '../../data/availability';
import { SHOW_SEAT_SCARCITY } from '../../data/companyFacts';

export default function GroupTours({ onJoinTour, onExploreAllGroups }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const featuredTour = groupTourCards[activeIdx] || groupTourCards[0];

  /*
   * The departures list, read off the same catalogue as the Group Tours page.
   *
   * Each row now carries whether we are running that tour. Without it this
   * column advertised "Spiti Valley Expedition · ₹28,999 · HOT" two hundred
   * pixels below a Spiti card reading "Opens May 2027" — the site arguing
   * with itself on one screen.
   */
  const upcomingTours = groupTourCards.slice(0, 4).map((tour, i) => ({
    id: i + 1,
    title: tour.title,
    sub: SHOW_SEAT_SCARCITY ? `${tour.duration} · ${tour.seatsRemaining} seats left` : tour.duration,
    price: tour.price,
    hot: tour.badge === 'Best Seller',
    open: isOpen(tour.id),
    availability: availabilityFor(tour.id),
    data: tour,
  }));

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

              <p className="mt-3 max-w-[46ch] text-[13.5px] leading-[1.7] text-[#003B24]/75">
                Not just places to go, but stories to share. A new collection of journeys is on
                its way.
              </p>

              <button
                onClick={onExploreAllGroups}
                className="mt-3 -ml-1 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 px-1 text-[12.5px] font-sans font-bold uppercase tracking-wider text-[#003B24] transition-colors hover:text-[#075333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
              >
                <span>Explore what&rsquo;s next</span>
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
                  {/* "SEATS AVAILABLE" in urgency orange on a tour that is
                      not running was the strongest false signal on the page. */}
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-[0.14em] bg-[#012C18]/88 text-[#E6E2D4] backdrop-blur-sm">
                    COMING SOON
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-display text-xl text-white font-normal">{featuredTour.title}</h3>
                </div>
              </div>

              {/* The duration, the seat count, the per-person price and the
                  "Join Journey" button are all gone while this is not running.
                  Each of them is a commitment, and the card is an
                  announcement now rather than an offer. */}
              <div className="p-4">
                <p className="text-[12.5px] leading-[1.7] text-[#003B24]/70">
                  Dates and pricing announced soon.
                </p>
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
                    {/* A price and a "Hot" flash on a tour nobody can book are
                        the two most misleading things this row could carry, so
                        a closed one states its status instead. */}
                    {tour.open ? (
                      <>
                        <p className={`text-sm font-bold font-mono ${activeIdx === idx ? 'text-[#F4F1E8]' : 'text-[#003B24]'}`}>
                          {tour.price}
                        </p>
                        {tour.hot && (
                          <span className="text-[10.5px] font-mono font-bold text-[#D65A3A] uppercase">Hot</span>
                        )}
                      </>
                    ) : (
                      <span
                        className={`font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] ${
                          activeIdx === idx ? 'text-[#DDD4C1]/80' : 'text-[#003B24]/50'
                        }`}
                      >
                        {tour.availability.short ?? 'Coming soon'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: the Chaufer difference, compact (Span 3) */}
          <div className="lg:col-span-3 rounded-2xl bg-[#003B24] text-[#F4F1E8] p-6 sm:p-7 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block">
                THE CHAUFER DIFFERENCE
              </span>
              <h3 className="font-display text-2xl text-white font-normal leading-tight">
                Travel is more than getting there. It&rsquo;s everything along the way.
              </h3>
            </div>

            <div className="space-y-3 my-5">
              {/* Read from data/whyUsData.js rather than written out again.
                  This card used to carry its own hardcoded four — "12–14
                  travelers max", "Native mountain leaders" — which already
                  disagreed with the pillars section further down the page the
                  moment either was edited. */}
              {whyUsStages.map((p) => (
                <div key={p.n} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors">
                  <span className="text-xs font-mono font-bold text-[#B89A5A] shrink-0 mt-0.5">{p.step}</span>
                  <div>
                    <p className="text-xs font-bold text-[#F4F1E8] font-sans">{p.title}</p>
                    {/* Two lines at most: these are full sentences now, and
                        this card is a 3-of-12 column. */}
                    <p className="line-clamp-2 text-[11px] leading-snug text-[#DDD4C1]/70 font-sans">{p.desc}</p>
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
