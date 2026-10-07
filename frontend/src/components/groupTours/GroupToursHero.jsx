import React from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
  User,
  Users,
} from 'lucide-react';
import { groupBenefits, groupHero, searchTrust } from '../../data/groupToursPage';
import { GroupIcon } from './groupUi';
import { nextWeekend } from '../../utils/defaultDates';

/* One segment of the search bar: tiny uppercase label over a value */
function Field({ icon: Icon, label, children, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 sm:px-5 ${className}`}>
      <Icon className="h-4 w-4 shrink-0 text-[#075333]" strokeWidth={1.75} />
      <div className="min-w-0 flex-1 text-left">
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A9189]">
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}

export default function GroupToursHero({
  destination,
  onDestinationChange,
  onSearch,
  onQuote,
}) {
  /* Defaults to the coming weekend rather than a date in 2025. */
  const { checkInLabel, checkOutLabel } = nextWeekend();

  return (
    <section className="relative overflow-hidden bg-[#012C18]">
      {/* Backdrop */}
      <img
        src={groupHero.image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02170F]/85 via-[#022014]/65 to-[#02170F]/90" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F4F1E8]" />

      <div className="relative mx-auto max-w-[1400px] px-4 pt-28 pb-10 sm:px-6 sm:pt-32 lg:px-8">
        {/* Floating group benefits card */}
        <div className="absolute right-8 top-24 hidden w-[188px] rounded-2xl border border-white/15 bg-[#02170F]/55 p-3 backdrop-blur-md xl:block">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/12">
              <Users className="h-3.5 w-3.5 text-[#B89A5A]" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[12px] font-semibold leading-tight text-white">
                Group Travel
              </span>
              <span className="block text-[9.5px] text-white/65">Benefits included</span>
            </span>
          </div>

          <ul className="mt-2.5 space-y-1.5">
            {groupBenefits.items.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-1.5 text-[9.5px] text-white/80"
              >
                <GroupIcon name={item.icon} className="h-3 w-3 shrink-0 text-[#B89A5A]" />
                {item.label}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onQuote}
            className="mt-2.5 w-full rounded-lg bg-[#B89A5A] py-2 text-[10px] font-bold text-[#012C18] transition-colors hover:bg-[#C9AB6B]"
          >
            {groupBenefits.cta}
          </button>

          <p className="mt-1.5 text-center text-[8.5px] text-white/55">
            {groupBenefits.footnote}
          </p>
        </div>

        {/* Headline */}
        <div className="text-center">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#F4F1E8]/75">
            {groupHero.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[38px] leading-[1.05] text-[#FAF9F5] sm:text-5xl lg:text-[56px]">
            {groupHero.title} <span className="text-[#B89A5A]">{groupHero.titleAccent}</span>
          </h1>
          <p className="mt-3 text-[13.5px] text-white/75 sm:text-[15px]">
            {groupHero.subtitle}
          </p>
        </div>

        {/* Search bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch?.();
          }}
          className="mx-auto mt-8 flex w-full max-w-[1000px] flex-col rounded-3xl border border-white/25 bg-[#FAF9F5] p-1.5 shadow-[0_24px_60px_-24px_rgba(1,44,24,0.75)] lg:flex-row lg:items-stretch lg:rounded-full"
        >
          <Field
            icon={MapPin}
            label="Destination"
            className="flex-[1.5] border-b border-[#E7E1D2] lg:border-b-0 lg:border-r"
          >
            <input
              value={destination}
              onChange={(e) => onDestinationChange?.(e.target.value)}
              placeholder="Where to?"
              aria-label="Destination"
              className="w-full bg-transparent text-[13px] font-semibold text-[#012C18] outline-none placeholder:font-normal placeholder:text-[#9AA29B]"
            />
          </Field>

          <Field
            icon={CalendarDays}
            label="Check-in"
            className="flex-1 border-b border-[#E7E1D2] lg:border-b-0 lg:border-r"
          >
            <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-[#012C18]">
              {checkInLabel}
              <ChevronDown className="h-3.5 w-3.5 text-[#8A9189]" />
            </span>
          </Field>

          <Field
            icon={CalendarDays}
            label="Check-out"
            className="flex-1 border-b border-[#E7E1D2] lg:border-b-0 lg:border-r"
          >
            <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-[#012C18]">
              {checkOutLabel}
              <ChevronDown className="h-3.5 w-3.5 text-[#8A9189]" />
            </span>
          </Field>

          <Field icon={User} label="Guests" className="flex-1">
            <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-[#012C18]">
              2 Adults · 1 Room
              <ChevronDown className="h-3.5 w-3.5 text-[#8A9189]" />
            </span>
          </Field>

          <button
            type="submit"
            className="mt-1.5 inline-flex items-center justify-center gap-2 rounded-full bg-[#043A25] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#FAF9F5] transition hover:bg-[#012C18] lg:mt-0 lg:ml-1"
          >
            Search Stays
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>

        {/* Trust strip */}
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {searchTrust.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-[11.5px] font-medium text-white/80"
            >
              <GroupIcon name={item.icon} className="h-3.5 w-3.5 text-[#B89A5A]" strokeWidth={1.75} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
