import React from 'react';
import { Star, Quote } from 'lucide-react';
import { testimonials } from '../../data/testimonials';

export default function CommunityStories({ onWatchStories }) {
  const featured = testimonials[0];

  return (
    <section className="py-16 sm:py-20 bg-[#F4F1E8] text-[#003B24]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left: Traveler image + quote */}
          <div className="lg:col-span-5 space-y-4">
            {/* Traveler Profile */}
            <div className="flex items-center gap-4">
              <img
                src={featured.avatar}
                alt={featured.author}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#DDD4C1] shadow-sm"
              />
              <div>
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-[#B89A5A] fill-[#B89A5A]" />
                  ))}
                </div>
                <p className="text-xs font-mono font-bold text-[#B89A5A] uppercase tracking-wider">
                  {featured.author}
                </p>
                <p className="text-[11px] text-[#003B24]/60 font-sans">{featured.tripName} · {featured.location}</p>
              </div>
            </div>

            {/* Quote */}
            <div className="relative">
              <Quote className="w-8 h-8 text-[#003B24]/10 absolute -top-1 -left-1" />
              <blockquote className="pl-4 text-base sm:text-lg font-display font-normal text-[#003B24] leading-relaxed">
                "{featured.quote}"
              </blockquote>
            </div>

            {/* Extra avatars + CTA */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-2.5">
                {testimonials.slice(0, 4).map((t, i) => (
                  <img
                    key={i}
                    src={t.avatar}
                    alt={t.author}
                    className="w-8 h-8 rounded-full border-2 border-[#F4F1E8] object-cover"
                  />
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-[#003B24] font-sans">+120 more</p>
                <p className="text-[11px] text-[#003B24]/60 font-sans">THE GREAT OUTDOORS COMMUNITY</p>
              </div>
            </div>
          </div>

          {/* Right: Large Community Image */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 lg:h-[380px] shadow-xl group cursor-pointer" onClick={onWatchStories}>
              <img
                src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?auto=format&fit=crop&w=1600&q=85"
                alt="Travelers together in Himalayas"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
                <div>
                  <p className="text-xs font-mono text-[#B89A5A]">500+ TRAIL STORIES SHARED</p>
                  <p className="font-display text-lg text-white">People of the Journey</p>
                </div>
                <button className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wide border border-white/30 hover:bg-white/30 transition-colors cursor-pointer">
                  Watch Reel →
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
