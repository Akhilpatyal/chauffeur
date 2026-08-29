import React, { useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { aboutImages, storyChapters } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';
import { Eyebrow } from './aboutUi';

export default function OurStoryTimeline() {
  const [active, setActive] = useState(0);

  const scope = useGsapScope(() => {
    /* Slow drift on the backdrop keeps the section cinematic without pinning */
    gsap.to('.story-backdrop', {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: '.story-root',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    /* Timeline rail fills as the chapters scroll past */
    gsap.fromTo(
      '.story-progress',
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: 'none',
        transformOrigin: 'top center',
        scrollTrigger: {
          trigger: '.story-list',
          start: 'top 70%',
          end: 'bottom 75%',
          scrub: true,
        },
      }
    );

    gsap.utils.toArray('.story-chapter').forEach((chapter, index) => {
      gsap.fromTo(
        chapter,
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power3.out',
          scrollTrigger: { trigger: chapter, start: 'top 88%', once: true },
        }
      );

      ScrollTrigger.create({
        trigger: chapter,
        start: 'top 65%',
        end: 'bottom 55%',
        onEnter: () => setActive(index),
        onEnterBack: () => setActive(index),
      });
    });
  });

  return (
    <section ref={scope} className="story-root relative overflow-hidden bg-[#012C18]">
      <img
        src={aboutImages.story}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="story-backdrop absolute inset-0 h-[120%] w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02170F] via-[#02170F]/85 to-[#02170F]" />
      <div className="topographic-bg-dark absolute inset-0 opacity-70" />

      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:gap-16">
          {/* Sticky heading + chapter image */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Eyebrow tone="gold">Our Story</Eyebrow>
            <h2 className="mt-4 font-display text-[30px] leading-[1.14] text-[#F4F1E8] sm:text-[38px] lg:text-[44px]">
              From a love for the mountains
              <br />
              to a community of explorers.
            </h2>

            <div className="relative mt-8 h-[220px] overflow-hidden rounded-2xl sm:h-[280px] lg:h-[320px]">
              {storyChapters.map((chapter, i) => (
                <img
                  key={chapter.step}
                  src={chapter.image}
                  alt={chapter.title}
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                    i === active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/70 to-transparent" />
              <p className="absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#B89A5A]">
                {storyChapters[active].step} — {storyChapters[active].year}
              </p>
            </div>
          </div>

          {/* Chapters */}
          <ol className="story-list relative pl-8 sm:pl-10">
            <span className="absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-[#F4F1E8]/15" />
            <span className="story-progress absolute left-[7px] top-2 h-[calc(100%-1rem)] w-px bg-[#B89A5A]" />

            {storyChapters.map((chapter, i) => (
              <li
                key={chapter.step}
                className="story-chapter relative pb-10 last:pb-0 sm:pb-12"
              >
                <span
                  className={`absolute -left-8 top-1.5 h-[15px] w-[15px] rounded-full border-2 transition-colors duration-500 sm:-left-10 ${
                    i <= active
                      ? 'border-[#B89A5A] bg-[#B89A5A]'
                      : 'border-[#F4F1E8]/30 bg-[#012C18]'
                  }`}
                />
                <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#B89A5A]">
                  {chapter.step}
                </p>
                <h3 className="mt-2 font-display text-[24px] leading-tight text-[#F4F1E8] sm:text-[28px]">
                  {chapter.title}
                </h3>
                <p className="mt-2 max-w-[440px] text-[13.5px] leading-[1.8] text-[#DDD4C1]/70 sm:text-[14.5px]">
                  {chapter.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
