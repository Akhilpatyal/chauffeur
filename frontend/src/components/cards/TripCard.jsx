import React from 'react';
import { ArrowRight, Clock, MapPin, Star } from 'lucide-react';
import { linkProps } from '../../router';

/*
 * One card for journeys and weekend escapes.
 *
 * Both are "a trip with a place, a duration and a price", and the homepage
 * already renders them in the same visual idiom, so one component serves both
 * listing pages. The caller passes a normalised `trip` plus the `href`.
 *
 * It renders an `<a>`, not a clickable div: the existing journal and group-tour
 * cards used divs with onClick, which cannot be focused, opened in a new tab,
 * or read as a link by a screen reader.
 */
export default function TripCard({ trip, href, ctaLabel = 'View details' }) {
  const {
    title,
    location,
    duration,
    price,
    originalPrice,
    discount,
    rating,
    reviews,
    badge,
    image,
    description,
    tags = [],
    meta,
  } = trip;

  return (
    <a
      {...linkProps(href)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] transition-all duration-300 hover:-translate-y-1 hover:border-[#043A25]/40 hover:shadow-[0_12px_28px_rgba(1,44,24,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#02170F]/55 via-transparent to-transparent" />

        {badge && (
          <span className="absolute left-3 top-3 rounded-md bg-[#012C18]/92 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#F4F1E8]">
            {badge}
          </span>
        )}
        {discount && (
          <span className="absolute right-3 top-3 rounded-md bg-[#B89A5A] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#012C18]">
            {discount}
          </span>
        )}

        {duration && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#F4F1E8]">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {duration}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {location && (
          <p className="flex items-center gap-1.5 text-[11px] text-[#8A9189]">
            <MapPin className="h-3 w-3 shrink-0 text-[#B89A5A]" strokeWidth={2} />
            <span className="truncate">{location}</span>
          </p>
        )}

        <h3 className="mt-1.5 font-display text-[19px] leading-snug text-[#012C18] transition-colors group-hover:text-[#075333] sm:text-[21px]">
          {title}
        </h3>

        {description && (
          <p className="mt-2 line-clamp-2 text-[12.5px] leading-[1.65] text-[#5E6B63]">
            {description}
          </p>
        )}

        {meta && <p className="mt-2 text-[11.5px] text-[#8A9189]">{meta}</p>}

        {tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-[#DDD4C1] px-2 py-0.5 text-[10.5px] text-[#4A5B50]"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        {/* Price and rating sit on the bottom edge so cards of different copy
            lengths still line up in a grid. */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            {price && (
              <p className="flex items-baseline gap-1.5">
                <span className="font-display text-[20px] text-[#012C18]">{price}</span>
                {originalPrice && (
                  <span className="text-[12px] text-[#98A09A] line-through">{originalPrice}</span>
                )}
              </p>
            )}
            {rating ? (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#5E6B63]">
                <Star className="h-3 w-3 fill-[#B89A5A] text-[#B89A5A]" />
                {rating}
                {reviews ? <span className="text-[#98A09A]">({reviews})</span> : null}
              </p>
            ) : null}
          </div>

          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11.5px] font-bold uppercase tracking-wider text-[#012C18] transition-colors group-hover:text-[#075333]">
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </a>
  );
}
