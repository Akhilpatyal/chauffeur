import React from 'react';
import {
  BadgeIndianRupee,
  Clock,
  Compass,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';

/* Icon registry so the data file stays JSX-free */
const icons = {
  phone: Phone,
  chat: MessageCircle,
  mail: Mail,
  pin: MapPin,
  clock: Clock,
  compass: Compass,
  price: BadgeIndianRupee,
  send: Send,
};

export function ContactIcon({ name, className = 'h-4 w-4', strokeWidth = 1.6 }) {
  const Icon = icons[name] || Compass;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

/* Hand-drawn ridge used beside editorial headings */
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

/* lucide-react no longer ships brand marks, so social glyphs live here */
const socialPaths = {
  facebook:
    'M13.5 21v-7.5h2.6l.4-2.9h-3V8.7c0-.85.24-1.43 1.45-1.43H16.6V4.68A19 19 0 0 0 14.36 4.6c-2.2 0-3.71 1.35-3.71 3.83v2.17H8v2.9h2.65V21z',
  instagram:
    'M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2m0 1.62a2.98 2.98 0 1 1 0 5.96 2.98 2.98 0 0 1 0-5.96M17.3 5.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2M8.4 3.5h7.2A4.9 4.9 0 0 1 20.5 8.4v7.2a4.9 4.9 0 0 1-4.9 4.9H8.4a4.9 4.9 0 0 1-4.9-4.9V8.4a4.9 4.9 0 0 1 4.9-4.9m0 1.7A3.2 3.2 0 0 0 5.2 8.4v7.2a3.2 3.2 0 0 0 3.2 3.2h7.2a3.2 3.2 0 0 0 3.2-3.2V8.4a3.2 3.2 0 0 0-3.2-3.2z',
  linkedin:
    'M6.94 8.5H4.2V20h2.74zM5.57 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2M20 13.9c0-3-1.6-4.4-3.74-4.4a3.23 3.23 0 0 0-2.93 1.6V9.75H10.6V20h2.74v-5.42c0-1.43.27-2.81 2.04-2.81s1.88 1.63 1.88 2.9V20H20z',
};

export function SocialIcon({ network, className = 'h-3.5 w-3.5' }) {
  const d = socialPaths[network];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}
