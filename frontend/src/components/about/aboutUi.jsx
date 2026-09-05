import React from 'react';
import {
  Compass,
  HeartHandshake,
  Headset,
  Leaf,
  Map,
  MapPin,
  MountainSnow,
  ShieldCheck,
  Sparkles,
  Star,
  TentTree,
  Users,
} from 'lucide-react';

/* Icon lookup so the data files stay free of JSX */
const icons = {
  mountain: MountainSnow,
  'map-pin': MapPin,
  compass: Compass,
  star: Star,
  users: Users,
  leaf: Leaf,
  shield: ShieldCheck,
  heart: HeartHandshake,
  map: Map,
  sparkles: Sparkles,
  tent: TentTree,
  headset: Headset,
};

export function AboutIcon({ name, className = 'h-4 w-4', strokeWidth = 1.6 }) {
  const Icon = icons[name] || Sparkles;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}

/* Section eyebrow - the same mono/gold label used across TAIFER */
export function Eyebrow({ children, tone = 'forest', className = '' }) {
  return (
    <span
      className={`section-eyebrow block text-[11px] font-mono font-bold uppercase tracking-[0.25em] ${
        tone === 'gold' ? 'text-[#B89A5A]' : 'text-[#075333]'
      } ${className}`}
    >
      {children}
    </span>
  );
}

/* Hand-drawn mountain rule used beside editorial headings */
export function MountainRule({ className = '' }) {
  return (
    <svg
      viewBox="0 0 120 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M2 36 L28 12 L40 24 L58 4 L78 26 L92 16 L118 36"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M0 39 H120" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

/* Faint compass rose used as page atmosphere */
export function CompassMark({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" className={className}>
      <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="60" r="40" stroke="currentColor" strokeWidth="0.6" strokeDasharray="2 6" />
      <path d="M60 14 L67 60 L60 106 L53 60 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M14 60 L60 53 L106 60 L60 67 Z" stroke="currentColor" strokeWidth="0.8" />
      <path d="M60 4 v8 M60 108 v8 M4 60 h8 M108 60 h8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/* Dashed route line decoration */
export function RouteLine({ className = '' }) {
  return (
    <svg viewBox="0 0 220 80" fill="none" aria-hidden="true" className={className}>
      <path
        d="M2 62 C48 62 52 14 100 14 C148 14 152 52 200 40"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeDasharray="3 7"
        strokeLinecap="round"
      />
      <circle cx="200" cy="40" r="4" fill="currentColor" />
    </svg>
  );
}

/* lucide-react no longer ships brand marks, so the social glyphs live here */
const socialPaths = {
  facebook:
    'M13.5 21v-7.5h2.6l.4-2.9h-3V8.7c0-.85.24-1.43 1.45-1.43H16.6V4.68A19 19 0 0 0 14.36 4.6c-2.2 0-3.71 1.35-3.71 3.83v2.17H8v2.9h2.65V21z',
  instagram:
    'M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2m0 1.62a2.98 2.98 0 1 1 0 5.96 2.98 2.98 0 0 1 0-5.96M17.3 5.6a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2M8.4 3.5h7.2A4.9 4.9 0 0 1 20.5 8.4v7.2a4.9 4.9 0 0 1-4.9 4.9H8.4a4.9 4.9 0 0 1-4.9-4.9V8.4a4.9 4.9 0 0 1 4.9-4.9m0 1.7A3.2 3.2 0 0 0 5.2 8.4v7.2a3.2 3.2 0 0 0 3.2 3.2h7.2a3.2 3.2 0 0 0 3.2-3.2V8.4a3.2 3.2 0 0 0-3.2-3.2z',
  linkedin:
    'M6.94 8.5H4.2V20h2.74zM5.57 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2M20 13.9c0-3-1.6-4.4-3.74-4.4a3.23 3.23 0 0 0-2.93 1.6V9.75H10.6V20h2.74v-5.42c0-1.43.27-2.81 2.04-2.81s1.88 1.63 1.88 2.9V20H20z',
};

export function SocialIcon({ network, className = 'h-3 w-3' }) {
  const d = socialPaths[network];
  if (!d) return null;
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}
