import React, { useState } from 'react';

export default function WhyUsStorytelling() {
  const [activeStage, setActiveStage] = useState(0);

  const pillars = [
    {
      step: "01",
      title: "LOCAL EXPERTS",
      desc: "Native mountaineers and Pahadi storytellers who know every pass and valley.",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    },
    {
      step: "02",
      title: "HANDPICKED EXPERIENCES",
      desc: "Every stay, route, and meal is curated for depth — not volume.",
      image: "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=1200&q=80",
    },
    {
      step: "03",
      title: "SMALL GROUPS",
      desc: "Capped at 12–14 travelers for genuine connection and unhurried exploration.",
      image: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1200&q=80",
    },
    {
      step: "04",
      title: "24/7 SUPPORT",
      desc: "Medical oxygen, satellite tracking, and real humans available around the clock.",
      image: "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=1200&q=80",
    }
  ];

  const current = pillars[activeStage];

  return (
    <section id="why-us" className="py-16 sm:py-20 bg-[#003B24] text-[#F4F1E8]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* Left: Title + Pillars (Span 6) */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#B89A5A] block mb-2">
                WHY TAIFER
              </span>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight">
                We don't sell trips. <br />
                <span className="text-[#DDD4C1]">We create stories.</span>
              </h2>
            </div>

            <div className="space-y-2.5">
              {pillars.map((pillar, idx) => {
                const isActive = activeStage === idx;
                return (
                  <div
                    key={pillar.step}
                    onClick={() => setActiveStage(idx)}
                    className={`p-4 rounded-xl cursor-pointer border transition-all duration-250 ${
                      isActive
                        ? 'bg-[#012C18] border-[#B89A5A] translate-x-1.5 shadow-lg'
                        : 'bg-black/25 border-white/10 hover:bg-white/5 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`font-mono text-base font-bold shrink-0 ${isActive ? 'text-[#B89A5A]' : 'text-white/40'}`}>
                        {pillar.step}
                      </span>
                      <div>
                        <p className="font-display text-base text-[#F4F1E8] font-normal">{pillar.title}</p>
                        {isActive && (
                          <p className="text-xs text-[#DDD4C1]/80 font-sans mt-1 leading-relaxed">
                            {pillar.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Synced Photo (Span 6) */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20 h-80 sm:h-96 lg:h-[440px]">
              <img
                src={current.image}
                alt={current.title}
                key={current.step}
                className="w-full h-full object-cover transition-all duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#012C18] via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89A5A]">PILLAR {current.step}</span>
                <h4 className="font-display text-2xl text-white font-normal mt-1">{current.title}</h4>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
