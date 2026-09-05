import React, { useState } from 'react';
import { Check, Search, Star } from 'lucide-react';
import {
  amenityFacets,
  bookingFacets,
  experienceFacets,
  guestRatings,
  locationFacets,
  propertyTypes,
  starRatings,
} from '../../data/hotels';
import { AmenityIcon, money } from './hotelUi';

const PRICE_MIN = 1500;
const PRICE_MAX = 25000;

const pct = (value) => ((value - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

/* Two range inputs stacked over one track - only the thumbs stay interactive */
const rangeClasses =
  'pointer-events-none absolute inset-0 h-4 w-full appearance-none bg-transparent ' +
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 ' +
  '[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full ' +
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#043A25] ' +
  '[&::-webkit-slider-thumb]:shadow-[0_1px_4px_rgba(1,44,24,0.4)] ' +
  '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 ' +
  '[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 ' +
  '[&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#043A25] [&::-moz-range-track]:bg-transparent';

function Section({ title, children, className = '' }) {
  return (
    <div className={`border-t border-[#E7E1D2] pt-4 ${className}`}>
      <h4 className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#012C18]">
        {title}
      </h4>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function CheckRow({ label, count, checked, onChange, children }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-[5px] text-[12px] text-[#33403A]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[4px] border transition ${
          checked
            ? 'border-[#043A25] bg-[#043A25]'
            : 'border-[#C9C2B0] bg-white group-hover:border-[#075333]'
        }`}
      >
        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />}
      </span>
      <span className="flex flex-1 items-center gap-1.5 truncate">
        {children || label}
      </span>
      {count != null && (
        <span className="text-[11px] tabular-nums text-[#98A09A]">{count}</span>
      )}
    </label>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
        active
          ? 'border-[#043A25] bg-[#043A25] text-[#FAF9F5]'
          : 'border-[#DDD4C1] bg-white text-[#3B473F] hover:border-[#075333] hover:text-[#075333]'
      }`}
    >
      {children}
    </button>
  );
}

export default function HotelFilters({ filters, onToggle, onSet, onClear, resultCount }) {
  const [allAmenities, setAllAmenities] = useState(false);
  const [allExperiences, setAllExperiences] = useState(false);

  const has = (group, value) => filters[group].includes(value);
  const amenityList = allAmenities ? amenityFacets : amenityFacets.slice(0, 6);
  const experienceList = allExperiences ? experienceFacets : experienceFacets.slice(0, 4);

  return (
    <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5 shadow-[0_1px_2px_rgba(1,44,24,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[21px] leading-none text-[#012C18]">Filters</h3>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-[#075333] underline underline-offset-2 transition hover:text-[#012C18]"
        >
          Clear all
        </button>
      </div>

      {/* Name search */}
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9AA29B]" />
        <input
          value={filters.query}
          onChange={(e) => onSet('query', e.target.value)}
          placeholder="Search hotel name..."
          aria-label="Search hotel name"
          className="w-full rounded-lg border border-[#DDD4C1] bg-white py-2.5 pl-9 pr-3 text-[12px] text-[#012C18] outline-none transition placeholder:text-[#9AA29B] focus:border-[#075333]"
        />
      </div>

      {/* Price */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <h4 className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#012C18]">
            Price per night
          </h4>
          <span className="text-[11px] font-medium text-[#5E6B63]">
            {money(filters.minPrice)} – {money(filters.maxPrice)}
            {filters.maxPrice >= PRICE_MAX ? '+' : ''}
          </span>
        </div>
        <div className="relative mt-4 h-4">
          <span className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-[#DDD4C1]" />
          <span
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#043A25]"
            style={{
              left: `${pct(filters.minPrice)}%`,
              right: `${100 - pct(filters.maxPrice)}%`,
            }}
          />
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step="500"
            value={filters.minPrice}
            onChange={(e) =>
              onSet('minPrice', Math.min(Number(e.target.value), filters.maxPrice - 500))
            }
            aria-label="Minimum price per night"
            className={rangeClasses}
          />
          <input
            type="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step="500"
            value={filters.maxPrice}
            onChange={(e) =>
              onSet('maxPrice', Math.max(Number(e.target.value), filters.minPrice + 500))
            }
            aria-label="Maximum price per night"
            className={rangeClasses}
          />
        </div>
      </div>

      {/* Property type */}
      <Section title="Property Type" className="mt-5">
        {propertyTypes.map((t) => (
          <CheckRow
            key={t.label}
            label={t.label}
            count={t.count}
            checked={has('types', t.label)}
            onChange={() => onToggle('types', t.label)}
          />
        ))}
      </Section>

      {/* Star rating */}
      <Section title="Star Rating" className="mt-5">
        {starRatings.map((s) => (
          <CheckRow
            key={s.star}
            count={s.count}
            checked={has('stars', s.star)}
            onChange={() => onToggle('stars', s.star)}
          >
            <span className="flex items-center gap-[1px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-[11px] w-[11px] ${
                    i < s.star ? 'fill-[#B89A5A] text-[#B89A5A]' : 'fill-[#E3DDCB] text-[#E3DDCB]'
                  }`}
                />
              ))}
            </span>
            <span className="ml-1">{s.star} Star</span>
          </CheckRow>
        ))}
      </Section>

      {/* Guest rating */}
      <Section title="Guest Rating" className="mt-5">
        <div className="flex flex-wrap gap-2">
          {guestRatings.map((g) => (
            <Pill
              key={g.label}
              active={filters.guestRating === g.label}
              onClick={() =>
                onSet('guestRating', filters.guestRating === g.label ? null : g.label)
              }
            >
              {g.label} ({g.count})
            </Pill>
          ))}
        </div>
      </Section>

      {/* Amenities */}
      <Section title="Amenities" className="mt-5">
        {amenityList.map((a) => (
          <CheckRow
            key={a.label}
            count={a.count}
            checked={has('amenities', a.label)}
            onChange={() => onToggle('amenities', a.label)}
          >
            <AmenityIcon label={a.label} className="h-3.5 w-3.5 text-[#6C7A70]" />
            <span>{a.label}</span>
          </CheckRow>
        ))}
        <button
          type="button"
          onClick={() => setAllAmenities((v) => !v)}
          className="mt-3 w-full rounded-lg border border-[#DDD4C1] bg-white py-2 text-[11px] font-medium text-[#075333] transition hover:border-[#075333]"
        >
          {allAmenities ? '− Show fewer amenities' : '+ Show all amenities'}
        </button>
      </Section>

      {/* Location */}
      <Section title="Location" className="mt-5">
        {locationFacets.map((l) => (
          <CheckRow
            key={l.label}
            label={l.label}
            count={l.count}
            checked={has('locations', l.label)}
            onChange={() => onToggle('locations', l.label)}
          />
        ))}
      </Section>

      {/* Experience */}
      <Section title="Experience" className="mt-5">
        <div className="grid grid-cols-2 gap-2">
          {experienceList.map((x) => (
            <Pill
              key={x}
              active={has('experiences', x)}
              onClick={() => onToggle('experiences', x)}
            >
              <AmenityIcon label={x} className="h-3 w-3" />
              <span className="truncate">{x}</span>
            </Pill>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAllExperiences((v) => !v)}
          className="mt-3 w-full text-center text-[11px] font-medium text-[#075333] transition hover:text-[#012C18]"
        >
          {allExperiences ? '− Show less' : '+ Show more'}
        </button>
      </Section>

      {/* Booking options */}
      <Section title="Booking Options" className="mt-5">
        {bookingFacets.map((b) => (
          <CheckRow
            key={b.label}
            label={b.label}
            count={b.count}
            checked={has('booking', b.label)}
            onChange={() => onToggle('booking', b.label)}
          />
        ))}
      </Section>

      <button
        type="button"
        className="mt-6 w-full rounded-xl bg-[#043A25] py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#FAF9F5] transition hover:bg-[#012C18]"
      >
        Show {resultCount} Stays
      </button>
    </div>
  );
}
