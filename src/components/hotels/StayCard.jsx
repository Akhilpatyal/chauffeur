import React from 'react';
import { ArrowRight, CircleCheckBig, Heart, Star } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { AmenityChip, money } from './hotelUi';

/* Compact hero-style card used in the "Taifer Recommends" rail */
export function RecommendedCard({ stay, favorite, onToggleFavorite, onOpen }) {
  return (
    <article className="group relative h-[218px] overflow-hidden rounded-2xl">
      <img
        src={stay.image}
        alt={stay.name}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] group-hover:scale-[1.06]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#02170F] via-[#02170F]/45 to-[#02170F]/10" />

      <span
        className={`absolute left-3 top-3 rounded-md px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.1em] ${
          stay.highlightTone === 'gold'
            ? 'bg-[#B89A5A] text-[#012C18]'
            : 'bg-[#043A25] text-[#F4F1E8]'
        }`}
      >
        {stay.highlightTone === 'gold' ? '✦ ' : ''}
        {stay.highlight}
      </span>

      <button
        type="button"
        aria-label={`Save ${stay.name}`}
        aria-pressed={favorite}
        onClick={() => onToggleFavorite(stay.id)}
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition hover:bg-white/35"
      >
        <Heart
          className={`h-3.5 w-3.5 ${favorite ? 'fill-[#D65A3A] text-[#D65A3A]' : 'fill-white/70 text-white'}`}
        />
      </button>

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <h4 className="font-display text-[19px] leading-tight text-[#FAF9F5]">{stay.name}</h4>
        <p className="mt-0.5 text-[10.5px] text-white/70">
          {stay.location} · {stay.distance}
        </p>

        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-white/85">
          <Star className="h-3 w-3 fill-[#B89A5A] text-[#B89A5A]" />
          <span className="font-bold text-white">{stay.rating}</span>
          {stay.ratingLabel}
          <span className="text-white/55">({stay.reviews} reviews)</span>
        </p>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {stay.amenities.map((a) => (
            <span
              key={a}
              className="rounded-full border border-white/25 px-2 py-[3px] text-[9.5px] text-white/85"
            >
              {a}
            </span>
          ))}
        </div>

        {stay.freeCancellation && (
          <p className="mt-2 flex items-center gap-1 text-[9.5px] text-[#9BC7A5]">
            <CircleCheckBig className="h-2.5 w-2.5" />
            Free Cancellation
          </p>
        )}

        <div className="mt-2.5 flex items-end justify-between">
          <p className="text-[15px] font-bold text-[#FAF9F5]">
            {money(stay.price)}
            <span className="ml-1 text-[9.5px] font-normal text-white/60">/ night</span>
          </p>
          <button
            type="button"
            onClick={() => onOpen(stay)}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#B89A5A] transition hover:gap-1.5 hover:text-[#D6BA80]"
          >
            View Stay
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  );
}

/* Result card for the "All Stays" list - a horizontal row, or a tile in grid view */
export default function StayCard({
  stay,
  layout = 'row',
  favorite,
  onToggleFavorite,
  onOpen,
}) {
  const row = layout === 'row';

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] transition hover:border-[#B7C4B4] hover:shadow-[0_16px_40px_-28px_rgba(1,44,24,0.55)]',
        row
          ? 'grid sm:grid-cols-[196px_minmax(0,1fr)] lg:grid-cols-[212px_minmax(0,1fr)_178px]'
          : 'flex flex-col'
      )}
    >
      {/* Media */}
      <div className={cn('relative h-44', row && 'sm:h-full sm:min-h-[176px]')}>
        <img
          src={stay.image}
          alt={stay.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/35 to-transparent" />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-[#FAF9F5] px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#012C18]">
          {stay.badge}
        </span>
        <button
          type="button"
          aria-label={`Save ${stay.name}`}
          aria-pressed={favorite}
          onClick={() => onToggleFavorite(stay.id)}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 transition hover:bg-white"
        >
          <Heart
            className={`h-3.5 w-3.5 ${
              favorite ? 'fill-[#D65A3A] text-[#D65A3A]' : 'text-[#4A5B50]'
            }`}
          />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-[21px] leading-tight text-[#012C18]">
              {stay.name}
            </h3>
            <p className="mt-0.5 text-[11.5px] text-[#7C857E]">
              {stay.location} · {stay.distance}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Save ${stay.name}`}
            aria-pressed={favorite}
            onClick={() => onToggleFavorite(stay.id)}
            className="hidden shrink-0 text-[#4A5B50] transition hover:text-[#D65A3A] lg:block"
          >
            <Heart
              className={`h-4 w-4 ${favorite ? 'fill-[#D65A3A] text-[#D65A3A]' : ''}`}
            />
          </button>
        </div>

        <p className="mt-2 max-w-[46ch] text-[12px] leading-relaxed text-[#5E6B63]">
          {stay.description}
        </p>

        <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#3B473F]">
          <Star className="h-3.5 w-3.5 fill-[#B89A5A] text-[#B89A5A]" />
          <span className="font-bold">{stay.rating}</span>
          <span>{stay.ratingLabel}</span>
          <span className="text-[#98A09A]">({stay.reviews} reviews)</span>
        </p>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {stay.amenities.map((a) => (
            <AmenityChip key={a} label={a} />
          ))}
        </div>

        {stay.freeCancellation && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-medium text-[#2F7A4F]">
            <CircleCheckBig className="h-3 w-3" />
            Free Cancellation
          </p>
        )}
      </div>

      {/* Price rail */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 border-t border-[#E7E1D2] p-4',
          row &&
            'sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-end lg:justify-center lg:border-l lg:border-t-0 lg:p-5'
        )}
      >
        <div className="text-right">
          <p className="font-display text-[22px] leading-none text-[#012C18]">
            {money(stay.price)}
          </p>
          {stay.strikePrice && (
            <p className="mt-1 text-[11px] text-[#A8AFA9] line-through">
              {money(stay.strikePrice)}
            </p>
          )}
          {stay.discount && (
            <p className="mt-0.5 text-[10.5px] font-bold text-[#D65A3A]">
              {stay.discount}% OFF
            </p>
          )}
          <p className="mt-1 text-[9.5px] text-[#98A09A]">+ taxes &amp; fees</p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(stay)}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#043A25] px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#FAF9F5] transition hover:bg-[#012C18]',
            row && 'lg:mt-4 lg:w-full'
          )}
        >
          View Rooms
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
