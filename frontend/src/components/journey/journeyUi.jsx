import React from 'react';
import {
  BedDouble,
  CalendarDays,
  Car,
  Compass,
  Footprints,
  Headset,
  Landmark,
  MapPin,
  Moon,
  Mountain,
  Route,
  Snowflake,
  Sun,
  UtensilsCrossed,
  Wind,
} from 'lucide-react';

/* Keeps JSX out of the data layer - data files reference icons by name */
const icons = {
  calendar: CalendarDays,
  moon: Moon,
  pin: MapPin,
  meals: UtensilsCrossed,
  support: Headset,
  bed: BedDouble,
  adventure: Wind,
  snow: Snowflake,
  culture: Landmark,
  trail: Footprints,
  departure: Car,
  road: Route,
  sun: Sun,
  mountain: Mountain,
  compass: Compass,
};

export function JourneyIcon({ name, className = 'h-4 w-4', strokeWidth = 1.6 }) {
  const Icon = icons[name] || Compass;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

export const formatPrice = (value) => `₹${value.toLocaleString('en-IN')}`;

/* Hand-drawn ridge line used beside editorial headings */
export function RidgeMark({ className = '' }) {
  return (
    <svg viewBox="0 0 132 40" fill="none" aria-hidden="true" className={className}>
      <path
        d="M3 35 L30 12 L43 23 L62 5 L82 25 L96 15 L129 35"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M0 38.5 H132" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
    </svg>
  );
}

/* Small uppercase label used across the page */
export function Eyebrow({ children, tone = 'forest', className = '' }) {
  return (
    <span
      className={`block font-mono text-[11px] font-bold uppercase tracking-[0.25em] ${
        tone === 'gold' ? 'text-[#B89A5A]' : 'text-[#075333]'
      } ${className}`}
    >
      {children}
    </span>
  );
}
