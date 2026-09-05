import React from 'react';
import {
  BadgeIndianRupee,
  BedDouble,
  Bus,
  CalendarCheck,
  Compass,
  Handshake,
  Headset,
  HeartHandshake,
  Map,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  UserRound,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

/* Icon registry so the data files stay JSX-free */
const icons = {
  users: Users,
  friends: Users,
  shield: ShieldCheck,
  price: BadgeIndianRupee,
  route: Map,
  leader: UserRound,
  stay: BedDouble,
  support: Headset,
  sparkles: Sparkles,
  star: Star,
  calendar: CalendarCheck,
  meals: UtensilsCrossed,
  transport: Bus,
  activities: Ticket,
  shared: HeartHandshake,
  hassle: Handshake,
  compass: Compass,
};

export function GroupIcon({ name, className = 'h-4 w-4', strokeWidth = 1.6 }) {
  const Icon = icons[name] || Compass;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

/* Hand-drawn ridge used beside section headings */
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
