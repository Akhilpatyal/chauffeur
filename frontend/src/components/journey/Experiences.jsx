import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { experiences } from '../../data/journeyDetail';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { RidgeMark } from './journeyUi';

export default function Experiences() {
  const scope = useRef(null);
  const rail = useRef(null);
  useScrollReveal(scope, { start: 'top 84%' });

  const scrollRail = (direction) => {
    const node = rail.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.6, behavior: 'smooth' });
  };

  return (
    <section
      ref={scope}
      aria-labelledby="journey-experiences-heading"
      className="bg-[#F4F1E8] pb-14 sm:pb-16"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl bg-[#043A25] px-5 py-6 sm:px-7 sm:py-7">
          <div data-reveal className="flex items-center gap-3">
            <h2
              id="journey-experiences-heading"
              className="font-display text-[22px] leading-tight text-[#F4F1E8] sm:text-[26px]"
            >
              Experiences You&rsquo;ll Love
            </h2>
            <RidgeMark className="h-6 w-16 text-[#7E9A85]" />
          </div>

          {/* Rail - swipe on touch, arrows on pointer devices */}
          <ul
            ref={rail}
            className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto"
          >
            {experiences.map((experience) => (
              <li
                key={experience.id}
                data-reveal
                className="w-[74%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%-0.75rem)]"
              >
                <article className="group relative h-[168px] overflow-hidden rounded-xl transition-transform duration-500 hover:-translate-y-1 sm:h-[186px]">
                  <img
                    src={experience.image}
                    alt={experience.alt}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#02170F] via-[#02170F]/70 to-transparent transition-opacity duration-500 group-hover:from-[#02170F]" />
                  <h3 className="absolute inset-x-0 bottom-0 p-3 text-[12.5px] font-semibold text-[#FAF9F5]">
                    {experience.title}
                  </h3>
                </article>
              </li>
            ))}
          </ul>

          {/* Carousel controls */}
          {[
            { dir: -1, Icon: ChevronLeft, side: 'left-0 -translate-x-1/2', label: 'Previous experiences' },
            { dir: 1, Icon: ChevronRight, side: 'right-0 translate-x-1/2', label: 'More experiences' },
          ].map(({ dir, Icon, side, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => scrollRail(dir)}
              aria-label={label}
              className={`absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#DDD4C1] bg-[#FAF9F5] text-[#012C18] shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89A5A] sm:flex ${side}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
