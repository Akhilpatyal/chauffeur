import React, { useState } from 'react';
import { ArrowRight, Minus, Plus, Star } from 'lucide-react';
import { featuredStays, hotels, popularDestinations } from '../../data/hotels';
import { money } from './hotelUi';

const pins = [
  { stay: featuredStays[0], top: '20%', left: '10%' },
  { stay: featuredStays[1], top: '33%', left: '62%' },
  { stay: hotels[0], top: '48%', left: '6%' },
  { stay: featuredStays[2], top: '58%', left: '56%' },
  { stay: hotels[3], top: '72%', left: '30%' },
];

const avatars = [
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80',
];

/* Stylised static map with price pins */
function MapPanel({ onOpen }) {
  const [mapView, setMapView] = useState(true);
  const anchor = featuredStays[0];

  return (
    <div className="relative h-[560px] overflow-hidden rounded-2xl border border-[#DCE3D8] bg-[#E4EDE1]">
      {/* Terrain */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,#EEF4EA,transparent_55%),radial-gradient(circle_at_75%_70%,#DCE8D8,transparent_60%)]" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 300 560"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* River */}
        <path
          d="M168 0 C150 90 196 140 158 220 C120 300 190 360 148 440 C122 492 160 520 142 560"
          fill="none"
          stroke="#9EC9E4"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Roads */}
        <path
          d="M0 96 C70 130 180 108 300 152 M0 268 C86 240 168 300 300 262 M8 430 C92 388 196 442 300 380"
          fill="none"
          stroke="#C6D2C0"
          strokeWidth="2"
          strokeDasharray="4 6"
        />
        <path
          d="M40 0 C60 140 26 260 62 560 M240 0 C224 160 262 300 232 560"
          fill="none"
          stroke="#CFDAC9"
          strokeWidth="1.5"
        />
      </svg>

      <span className="absolute left-6 top-[30%] font-display text-[19px] tracking-[0.22em] text-[#4A6154]/60">
        MANALI
      </span>
      <span className="absolute right-8 top-[16%] text-[9px] tracking-[0.1em] text-[#6E7F72]/70">
        Vashisht
      </span>
      <span className="absolute left-10 top-[70%] text-[9px] tracking-[0.1em] text-[#6E7F72]/70">
        Naggar
      </span>

      {/* Map view toggle */}
      <button
        type="button"
        onClick={() => setMapView((v) => !v)}
        aria-pressed={mapView}
        className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-[#FAF9F5] py-1 pl-3 pr-1 text-[9.5px] font-semibold text-[#012C18] shadow-sm"
      >
        Map View
        <span
          className={`flex h-4 w-7 items-center rounded-full p-0.5 transition ${
            mapView ? 'bg-[#043A25]' : 'bg-[#C9C2B0]'
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full bg-white transition ${
              mapView ? 'translate-x-3' : ''
            }`}
          />
        </span>
      </button>

      {/* Price pins */}
      {pins.map(({ stay, top, left }) => (
        <button
          key={stay.id}
          type="button"
          onClick={() => onOpen(stay)}
          style={{ top, left }}
          className="group absolute flex flex-col items-center transition hover:z-10 hover:scale-105"
        >
          <img
            src={stay.image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-9 w-12 rounded-md object-cover shadow-md ring-2 ring-white"
          />
          <span className="-mt-1 rounded-full bg-[#FAF9F5] px-2 py-[3px] text-[9px] font-bold text-[#012C18] shadow ring-1 ring-[#DDD4C1] group-hover:bg-[#043A25] group-hover:text-[#FAF9F5]">
            {money(stay.price)}
          </span>
        </button>
      ))}

      {/* Zoom */}
      <div className="absolute bottom-[112px] right-3 flex flex-col overflow-hidden rounded-lg bg-[#FAF9F5] shadow ring-1 ring-[#DDD4C1]">
        <span className="flex h-7 w-7 items-center justify-center border-b border-[#E7E1D2] text-[#012C18]">
          <Plus className="h-3.5 w-3.5" />
        </span>
        <span className="flex h-7 w-7 items-center justify-center text-[#012C18]">
          <Minus className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Anchored stay card */}
      <button
        type="button"
        onClick={() => onOpen(anchor)}
        className="absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-xl bg-[#FAF9F5] p-2 text-left shadow-lg ring-1 ring-[#E3DDCB] transition hover:ring-[#B7C4B4]"
      >
        <img
          src={anchor.image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="h-11 w-14 shrink-0 rounded-lg object-cover"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11.5px] font-semibold text-[#012C18]">
            {anchor.name}
          </span>
          <span className="block text-[9.5px] text-[#7C857E]">
            {anchor.location} · {anchor.distance}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[9.5px] text-[#3B473F]">
            <Star className="h-2.5 w-2.5 fill-[#B89A5A] text-[#B89A5A]" />
            <b>{anchor.rating}</b>
            <span className="text-[#98A09A]">({anchor.reviews})</span>
          </span>
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F4F1E8] text-[#012C18]">
          <ArrowRight className="h-3 w-3" />
        </span>
      </button>
    </div>
  );
}

function ExpertCard({ onTalkToExpert }) {
  return (
    <div className="rounded-2xl border border-[#E0D6BE] bg-[#E9E1CD] p-5">
      <h3 className="font-display text-[19px] leading-snug text-[#012C18]">
        Plan a trip?
        <br />
        Need help choosing stays?
      </h3>
      <p className="mt-2 text-[11.5px] leading-relaxed text-[#5E6B63]">
        Our travel experts will curate the best stays for your journey.
      </p>
      <button
        type="button"
        onClick={onTalkToExpert}
        className="mt-4 w-full rounded-lg bg-[#B89A5A] py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#012C18] transition hover:bg-[#A88849]"
      >
        Talk to an Expert
      </button>
      <div className="mt-4 flex items-center gap-2.5">
        <div className="flex -space-x-2">
          {avatars.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="h-6 w-6 rounded-full object-cover ring-2 ring-[#E9E1CD]"
            />
          ))}
        </div>
        <p className="text-[10px] leading-tight text-[#5E6B63]">
          +50K travelers
          <br />
          planned with us
        </p>
      </div>
    </div>
  );
}

function PopularList() {
  return (
    <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
      <h3 className="font-display text-[17px] text-[#012C18]">Popular in Himachal</h3>
      <ul className="mt-3 space-y-2.5">
        {popularDestinations.map((d, i) => (
          <li key={d.name}>
            <a
              href="/hotels"
              className="group flex items-center gap-2.5 text-left"
            >
              <span className="w-3 shrink-0 text-[11px] font-medium text-[#98A09A]">
                {i + 1}
              </span>
              <img
                src={d.image}
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="h-8 w-11 shrink-0 rounded-md object-cover"
              />
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-[#012C18] transition group-hover:text-[#075333]">
                  {d.name}
                </span>
                <span className="block text-[10px] text-[#98A09A]">{d.stays} stays</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HotelsRightRail({ onOpen, onTalkToExpert }) {
  return (
    <div className="sticky top-24 space-y-4">
      <MapPanel onOpen={onOpen} />
      <ExpertCard onTalkToExpert={onTalkToExpert} />
      <PopularList />
    </div>
  );
}
