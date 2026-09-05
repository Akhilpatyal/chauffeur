import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { groupTestimonials } from '../../data/groupToursPage';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { RidgeMark } from './groupUi';

export default function GroupTestimonials() {
  const scope = useRef(null);
  const rail = useRef(null);
  useScrollReveal(scope, { start: 'top 86%' });

  const scrollRail = (direction) => {
    const node = rail.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.6, behavior: 'smooth' });
  };

  return (
    <section
      ref={scope}
      aria-labelledby="group-testimonials-heading"
      className="bg-[#F4F1E8] pb-14"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-2xl bg-[#043A25] px-5 py-6 sm:px-7 sm:py-7">
          <div data-reveal className="flex items-center gap-3">
            <h2
              id="group-testimonials-heading"
              className="font-display text-[22px] leading-tight text-[#F4F1E8] sm:text-[26px]"
            >
              What Travelers Say
            </h2>
            <RidgeMark className="h-6 w-16 text-[#7E9A85]" />
          </div>

          <ul
            ref={rail}
            className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto"
          >
            {groupTestimonials.map((item) => (
              <li
                key={item.id}
                data-reveal
                className="w-[82%] shrink-0 snap-start sm:w-[48%] lg:w-[calc(33.333%-0.7rem)]"
              >
                <figure className="flex h-full flex-col rounded-xl border border-white/10 bg-[#02271A] p-5">
                  <span
                    aria-hidden="true"
                    className="font-display text-[30px] leading-[0.5] text-[#B89A5A]"
                  >
                    &ldquo;
                  </span>

                  <blockquote className="mt-4 flex-1 text-[12.5px] leading-[1.65] text-[#F4F1E8]/85">
                    {item.quote}
                  </blockquote>

                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="flex -space-x-2">
                      {item.avatars.map((src) => (
                        <img
                          key={src}
                          src={src}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-8 w-8 rounded-full object-cover ring-2 ring-[#02271A]"
                        />
                      ))}
                    </span>

                    <span>
                      <span className="block text-[12px] font-semibold text-[#F4F1E8]">
                        {item.name}
                      </span>
                      <span
                        className="mt-1 flex items-center gap-0.5"
                        aria-label={`Rated ${item.rating} out of 5`}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            aria-hidden="true"
                            className={`h-3 w-3 ${
                              i < item.rating
                                ? 'fill-[#D08A3C] text-[#D08A3C]'
                                : 'fill-white/20 text-white/20'
                            }`}
                          />
                        ))}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>

          {[
            { dir: -1, Icon: ChevronLeft, side: 'left-0 -translate-x-1/2', label: 'Previous reviews' },
            { dir: 1, Icon: ChevronRight, side: 'right-0 translate-x-1/2', label: 'More reviews' },
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
