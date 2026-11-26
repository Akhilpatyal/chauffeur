import React from 'react';
import { ArrowRight, Clock, MapPin, Star } from 'lucide-react';
import { linkProps } from '../../router';
import { SHOW_TRIP_RATINGS } from '../../data/companyFacts';
import { responsiveImage } from '../../lib/images';
import { AvailabilityTag } from '../common/Availability';
import { availabilityFor, OPEN } from '../../data/availability';

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
 *
 * EVERY CARD IS THE SAME HEIGHT, DELIBERATELY
 *
 * The title, description, meta line and tags are all optional and all of
 * variable length, so cards ranged from 215px to 226px depending on which
 * fields a record happened to have. In a grid that is merely untidy — until
 * the content swaps. These pages render bundled content first and replace it
 * with the API's a few hundred milliseconds later (see lib/content.js), and a
 * card whose height depends on its copy makes that swap reflow the row: the
 * measured layout shift on /journeys was 0.272, where anything above 0.25 is
 * classed as poor. It is also the worst kind of shift, arriving about a second
 * in, exactly when someone is reaching for a card to click.
 *
 * So each block below reserves its space whether or not it has content: the
 * title is clamped to two lines and floored at two, the description likewise,
 * and tags are capped to a single row. The height is then a function of the
 * layout and not of the copy, and the swap cannot move anything.
 */
export default function TripCard({ trip, href, ctaLabel = 'View details' }) {
  const {
    id,
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

  /*
   * A card for something we are not selling says so, and stops selling it.
   *
   * The discount flash and the struck-through price are the two bits of
   * persuasion on this card, and both are actively misleading on a trip
   * nobody can book — "32% OFF" above "Coming soon" reads as a deal being
   * withheld. So the availability tag takes the flash's place and the
   * price shows as indicative rather than as an offer.
   */
  const availability = availabilityFor(id);
  const open = availability.state === OPEN;

  return (
    <a
      {...linkProps(href)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] transition-all duration-300 hover:-translate-y-1 hover:border-[#043A25]/40 hover:shadow-[0_12px_28px_rgba(1,44,24,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* The card is one of three columns on a desktop grid, two on a
            tablet and full width on a phone — so the browser is told that
            rather than being handed one file for all three. */}
        <img
          {...responsiveImage(image, '(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw')}
          alt={title}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06] ${
            /* Desaturated rather than dimmed: a darker photo just looks like
               a worse photo, where a greyer one reads as inactive. */
            open ? '' : 'saturate-[0.45]'
          }`}
        />
        <span className="absolute inset-0 bg-gradient-to-t from-[#02170F]/55 via-transparent to-transparent" />

        {badge && (
          <span className="absolute left-3 top-3 rounded-md bg-[#012C18]/92 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#F4F1E8]">
            {badge}
          </span>
        )}
        {open && discount && (
          <span className="absolute right-3 top-3 rounded-md bg-[#B89A5A] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#012C18]">
            {discount}
          </span>
        )}
        {!open && <AvailabilityTag id={id} className="absolute right-3 top-3" />}

        {duration && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#F4F1E8]">
            <Clock className="h-3 w-3" strokeWidth={2} />
            {duration}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Rendered even when empty so a record without a location does not
            sit 17px shorter than its neighbour. */}
        <p className="flex min-h-[17px] items-center gap-1.5 text-[11.5px] text-[#8A9189]">
          {location && (
            <>
              <MapPin className="h-3 w-3 shrink-0 text-[#B89A5A]" strokeWidth={2} />
              <span className="truncate">{location}</span>
            </>
          )}
        </p>

        {/* Two lines, always: clamped so a long title cannot push the card
            taller, floored so a short one cannot leave it shorter. */}
        <h3 className="mt-1.5 line-clamp-2 min-h-[2lh] font-display text-[19px] leading-snug text-[#012C18] transition-colors group-hover:text-[#075333] sm:text-[21px]">
          {title}
        </h3>

        <p className="mt-2 line-clamp-2 min-h-[2lh] text-[13px] leading-[1.65] text-[#5E6B63]">
          {description}
        </p>

        <p className="mt-2 min-h-[16px] text-[12px] text-[#8A9189]">{meta}</p>

        {/* One row only. Three short tags fit; three long ones used to wrap to
            a second line and make that card the tallest in its row. */}
        <ul className="mt-3 flex min-h-[22px] flex-nowrap gap-1.5 overflow-hidden">
          {tags.slice(0, 3).map((tag) => (
            <li
              key={tag}
              className="shrink-0 truncate rounded-full border border-[#DDD4C1] px-2 py-0.5 text-[11px] text-[#4A5B50]"
            >
              {tag}
            </li>
          ))}
        </ul>

        {/* Price and rating sit on the bottom edge so cards of different copy
            lengths still line up in a grid. */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            {price && (
              <p className="flex items-baseline gap-1.5">
                <span
                  className={`font-display text-[20px] ${open ? 'text-[#012C18]' : 'text-[#5E6B63]'}`}
                >
                  {price}
                </span>
                {open && originalPrice && (
                  <span className="text-[12px] text-[#98A09A] line-through">{originalPrice}</span>
                )}
              </p>
            )}
            {/* Ratings stay hidden until they come from real reviews —
                see data/companyFacts.js. */}
            {SHOW_TRIP_RATINGS && rating ? (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[#5E6B63]">
                <Star className="h-3 w-3 fill-[#B89A5A] text-[#B89A5A]" />
                {rating}
                {reviews ? <span className="text-[#98A09A]">({reviews})</span> : null}
              </p>
            ) : null}
          </div>

          {/* The card still opens — there is a page worth reading behind it,
              and it explains when the trip comes back. Only the wording
              changes, so nobody expects a booking form. */}
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-bold uppercase tracking-wider transition-colors ${
              open
                ? 'text-[#012C18] group-hover:text-[#075333]'
                : 'text-[#5E6B63] group-hover:text-[#012C18]'
            }`}
          >
            {open ? ctaLabel : 'Read more'}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </a>
  );
}
