import React from 'react';
import gsap from 'gsap';
import { Star } from 'lucide-react';
import { aboutImages, travelerStory } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';

export default function TravelerStory() {
  const scope = useGsapScope(() => {
    gsap.fromTo(
      '.story-media',
      { opacity: 0, x: -24 },
      {
        opacity: 1,
        x: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.traveler-root', start: 'top 80%', once: true },
      }
    );

    gsap.fromTo(
      '.story-quote > *',
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.traveler-root', start: 'top 78%', once: true },
      }
    );
  });

  return (
    <section
      ref={scope}
      className="traveler-root relative overflow-hidden bg-[#F4F1E8] py-16 sm:py-20 lg:py-24"
    >
      {/* Summit sketch sits behind the quote - multiply drops the white ground */}
      <img
        src={aboutImages.mountainSketch}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute -right-4 top-1/2 hidden w-[380px] -translate-y-1/2 opacity-70 mix-blend-multiply md:block lg:w-[460px] xl:-right-2"
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* Photograph */}
          <div className="story-media relative h-[280px] overflow-hidden rounded-2xl sm:h-[340px] lg:h-[380px]">
            <img
              src={travelerStory.image}
              alt="Travelers around a campfire beside a mountain lake"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/60 to-transparent" />

            <div className="absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full bg-[#02170F]/70 py-1.5 pl-2 pr-4 backdrop-blur-sm">
              <div className="flex -space-x-2">
                {travelerStory.avatars.map((src) => (
                  <img
                    key={src}
                    src={src}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-6 w-6 rounded-full object-cover ring-2 ring-[#02170F]/70"
                  />
                ))}
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-[#F4F1E8]">
                <Star className="h-3 w-3 fill-[#B89A5A] text-[#B89A5A]" />
                <span className="font-semibold">{travelerStory.rating}</span>
                <span className="text-[#DDD4C1]/75">
                  from {travelerStory.reviewCount} reviews
                </span>
              </p>
            </div>
          </div>

          {/* Quote */}
          <div className="story-quote">
            <span className="block font-display text-[54px] leading-none text-[#B89A5A]">
              &ldquo;
            </span>

            <blockquote className="mt-2 max-w-[540px] font-display text-[26px] leading-[1.3] text-[#012C18] sm:text-[32px] lg:text-[36px]">
              {travelerStory.quote}
            </blockquote>

            <div className="mt-7">
              <p className="text-[13px] font-semibold text-[#012C18]">
                &mdash; {travelerStory.name}
              </p>
              <p className="mt-0.5 text-[12px] text-[#141E18]/60">{travelerStory.trip}</p>
              <div className="mt-2 flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-[#B89A5A] text-[#B89A5A]" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
