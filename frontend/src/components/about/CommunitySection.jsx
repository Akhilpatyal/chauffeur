import React from 'react';
import gsap from 'gsap';
import { ArrowRight } from 'lucide-react';
import { communityImages, communityStats } from '../../data/about';
import { useGsapScope } from '../../animations/useGsapScope';
import { Eyebrow } from './aboutUi';

/* Asymmetric collage: each tile keeps its own span and parallax speed */
const tiles = [
  { className: 'col-span-2 row-span-2 h-[220px] sm:h-[300px]', speed: -8 },
  { className: 'col-span-2 h-[104px] sm:h-[142px]', speed: 6 },
  { className: 'col-span-2 h-[104px] sm:h-[142px]', speed: -5 },
  { className: 'col-span-2 h-[150px] sm:h-[200px]', speed: 7 },
  { className: 'col-span-2 h-[150px] sm:h-[200px]', speed: -6 },
];

export default function CommunitySection({ onJoinCommunity }) {
  const scope = useGsapScope(() => {
    gsap.utils.toArray('.community-tile img').forEach((img) => {
      gsap.to(img, {
        yPercent: Number(img.dataset.speed || 0),
        ease: 'none',
        scrollTrigger: {
          trigger: '.community-root',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    gsap.fromTo(
      '.community-copy > *',
      { opacity: 0, y: 22 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.community-root', start: 'top 78%', once: true },
      }
    );
  });

  return (
    <section
      ref={scope}
      className="community-root relative overflow-hidden bg-[#02170F] py-16 sm:py-20 lg:py-24"
    >
      <div className="topographic-bg-dark absolute inset-0 opacity-70" />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
          {/* Copy */}
          <div className="community-copy">
            <Eyebrow tone="gold">The Taifer Community</Eyebrow>
            <h2 className="mt-4 font-display text-[30px] uppercase leading-[1.14] text-[#F4F1E8] sm:text-[38px] lg:text-[44px]">
              More than a travel company.
              <br />
              <span className="text-[#B89A5A]">We are a community.</span>
            </h2>

            <p className="mt-5 max-w-[420px] text-[13.5px] leading-[1.8] text-[#DDD4C1]/70 sm:text-[14.5px]">
              Travelers who met on a ridge and still travel together. Hosts who keep a room
              free for people they have never met. That is what we are building.
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-10 gap-y-5">
              {communityStats.map((stat) => (
                <li key={stat.label}>
                  <p className="font-display text-[26px] leading-none text-[#F4F1E8] sm:text-[30px]">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[#B89A5A]">
                    {stat.label}
                  </p>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={onJoinCommunity}
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#B89A5A] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#012C18] transition-colors hover:bg-[#A88849]"
            >
              Join The Taifer Community
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Collage */}
          <div className="grid grid-cols-4 gap-3">
            {communityImages.map((src, i) => (
              <div
                key={src}
                className={`community-tile relative overflow-hidden rounded-xl ${tiles[i].className}`}
              >
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  data-speed={tiles[i].speed}
                  className="absolute inset-0 h-[115%] w-full object-cover"
                />
                <div className="absolute inset-0 bg-[#02170F]/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
