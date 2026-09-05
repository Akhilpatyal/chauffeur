import React from 'react';
import { Star } from 'lucide-react';
import { testimonial } from '../../data/journeyDetail';

/*
 * Renders the quote card only - JourneyPage pairs it with the video preview in
 * one row, the way the reference lays them out.
 */
export default function Testimonial() {
  return (
    <div
      data-reveal
      className="flex h-full flex-col rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6"
    >
      <h2 className="font-display text-[21px] leading-tight text-[#012C18] sm:text-[23px]">
        What Travelers Say
      </h2>

      <span
        aria-hidden="true"
        className="mt-5 block font-display text-[40px] leading-[0.5] text-[#B89A5A]"
      >
        &ldquo;
      </span>

      <blockquote className="mt-4 font-display text-[17px] leading-[1.45] text-[#012C18] sm:text-[19px]">
        {testimonial.quote}
      </blockquote>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex -space-x-2">
          {testimonial.avatars.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-8 w-8 rounded-full object-cover ring-2 ring-[#FAF9F5]"
            />
          ))}
        </div>

        <div>
          <p className="text-[12.5px] font-semibold text-[#012C18]">
            &mdash; {testimonial.name}
          </p>
          <div
            className="mt-1 flex items-center gap-0.5"
            aria-label={`Rated ${testimonial.rating} out of 5`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                aria-hidden="true"
                className={`h-3 w-3 ${
                  i < testimonial.rating
                    ? 'fill-[#D08A3C] text-[#D08A3C]'
                    : 'fill-[#DDD4C1] text-[#DDD4C1]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
