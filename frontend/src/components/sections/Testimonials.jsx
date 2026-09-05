import React, { useState } from 'react';
import { Star, Quote, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import SectionHeading from '../common/SectionHeading';
import BackgroundAtmosphere from '../common/BackgroundAtmosphere';
import { testimonials } from '../../data/testimonials';

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = testimonials[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="relative py-20 sm:py-32 bg-[#FAF9F5] text-[#012C18] overflow-hidden">
      <BackgroundAtmosphere variant="light" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="mb-12 sm:mb-16 text-center">
          <SectionHeading
            align="center"
            eyebrow="VOICES FROM THE TRAIL"
            title="Stories etched in mountain dust."
            subtitle="Real reflections from wanderers who crossed high passes with TAIFER."
          />
        </div>

        {/* Large Human Story Spread */}
        <div className="max-w-5xl mx-auto bg-white rounded-3xl sm:rounded-[36px] border border-[#DDD4C1] shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            
            {/* Left: Traveler Portrait + Trip Image (Span 5 cols) */}
            <div className="lg:col-span-5 relative h-72 sm:h-96 lg:h-auto min-h-[360px] overflow-hidden">
              <img
                src={current.coverImage}
                alt={current.tripName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#012C18] via-[#012C18]/30 to-transparent" />

              {/* Floating Traveler Avatar Badge */}
              <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3.5 bg-black/60 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-white">
                <img
                  src={current.avatar}
                  alt={current.author}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#B89A5A]"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-[#F4F1E8]">{current.author}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#B89A5A]" />
                  </div>
                  <span className="text-[10px] text-[#DDD4C1] font-mono block">{current.location}</span>
                </div>
              </div>
            </div>

            {/* Right: Editorial Quote (Span 7 cols) */}
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-[#F4F1E8]">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1">
                    {[...Array(current.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-[#B89A5A] fill-[#B89A5A]" />
                    ))}
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold text-[#012C18] bg-[#012C18]/10 px-3 py-1 rounded-md">
                    {current.tripName}
                  </span>
                </div>

                <Quote className="w-10 h-10 text-[#075333]/30 mb-4" />

                <blockquote className="font-display text-xl sm:text-2xl lg:text-3xl text-[#012C18] font-normal leading-relaxed mb-6">
                  "{current.quote}"
                </blockquote>
              </div>

              {/* Navigation & Thumbnail Stack */}
              <div className="flex items-center justify-between pt-6 border-t border-[#DDD4C1]">
                <div className="flex items-center gap-2">
                  {testimonials.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        currentIndex === idx ? 'border-[#012C18] scale-110 shadow-sm' : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                      aria-label={`View story from ${t.author}`}
                    >
                      <img src={t.avatar} alt={t.author} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous story"
                    className="w-10 h-10 rounded-lg border border-[#012C18]/25 hover:border-[#012C18] flex items-center justify-center text-[#012C18] hover:bg-[#012C18] hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next story"
                    className="w-10 h-10 rounded-lg border border-[#012C18]/25 hover:border-[#012C18] flex items-center justify-center text-[#012C18] hover:bg-[#012C18] hover:text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
