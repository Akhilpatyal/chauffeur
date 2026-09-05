import React, { useMemo, useRef } from 'react';
import { MotionPathPlugin } from '../../animations/journey/motion';
import { useRouteAnimation } from '../../animations/journey/routeAnimations';
import { RidgeMark } from './journeyUi';

const VIEW_W = 300;
const VIEW_H = 480;

/* The single source of truth for the travel path - pins are placed from it */
const ROUTE_PATH =
  'M70,52 C104,68 140,74 176,104 C214,136 132,158 96,196 C60,236 168,242 196,278 C222,312 104,326 84,360 C62,398 150,406 190,438';

/* Teardrop marker, drawn from the pin tip so it sits exactly on the route */
function Pin({ x, y, state }) {
  const fill =
    state === 'active' ? '#D65A3A' : state === 'done' ? '#B89A5A' : '#FAF9F5';
  const stroke = state === 'upcoming' ? '#A8A08C' : '#8A4F38';

  return (
    <g
      transform={`translate(${x} ${y})`}
      className="transition-opacity duration-500"
    >
      {state === 'active' && <circle r="11" fill="#D65A3A" opacity="0.18" />}
      <path
        d="M0 0 C-6.4 -8 -9 -11.4 -9 -15.4 A9 9 0 0 1 9 -15.4 C9 -11.4 6.4 -8 0 0 Z"
        fill={fill}
        stroke={state === 'upcoming' ? stroke : 'none'}
        strokeWidth="1.4"
      />
      <circle cy="-15.2" r="3.1" fill={state === 'upcoming' ? '#A8A08C' : '#FAF9F5'} />
    </g>
  );
}

/* Small 4x4 travelling the route */
function Jeep() {
  return (
    <g data-route-vehicle>
      <g transform="translate(-13 -9)">
        <rect
          x="0"
          y="5"
          width="26"
          height="9"
          rx="2.4"
          fill="#043A25"
          stroke="#FAF9F5"
          strokeWidth="1.2"
        />
        <path
          d="M4.5 5 L7.5 0.6 H18 L21.5 5 Z"
          fill="#0B5A3A"
          stroke="#FAF9F5"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <rect x="8" y="1.9" width="4" height="3" rx="0.6" fill="#CFE3D6" />
        <rect x="13.5" y="1.9" width="4" height="3" rx="0.6" fill="#CFE3D6" />
        <circle cx="6.5" cy="14" r="3.1" fill="#141E18" stroke="#FAF9F5" strokeWidth="1.1" />
        <circle cx="19.5" cy="14" r="3.1" fill="#141E18" stroke="#FAF9F5" strokeWidth="1.1" />
        <rect x="1.5" y="7.5" width="23" height="1.6" rx="0.8" fill="#B89A5A" />
      </g>
    </g>
  );
}

export default function JourneyRouteMap({
  labels,
  activeDay,
  onSelectDay,
  totalDistance,
  scheduled = true,
}) {
  const scope = useRef(null);

  /*
   * Pin coordinates are read off the path itself at even intervals, so any
   * number of stops stays perfectly on the route - no hand-tuned coordinates
   * to drift out of sync when a journey has five stages instead of six.
   */
  const stops = useMemo(() => {
    const rawPath = MotionPathPlugin.getRawPath(ROUTE_PATH);
    MotionPathPlugin.cacheRawPathMeasurements(rawPath);

    return labels.map((label, i) => {
      const progress = labels.length > 1 ? i / (labels.length - 1) : 0;
      const point = MotionPathPlugin.getPositionOnPath(
        rawPath,
        Math.min(Math.max(progress, 0.0001), 0.9999)
      );
      return { day: i + 1, label, progress, x: point.x, y: point.y };
    });
  }, [labels]);

  const stopProgress = useMemo(() => stops.map((s) => s.progress), [stops]);
  const activeIndex = Math.max(0, Math.min(activeDay - 1, stops.length - 1));

  useRouteAnimation(scope, { stopProgress, activeIndex });

  return (
    <section
      aria-labelledby="journey-route-heading"
      className="overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-4"
    >
      <header className="flex items-center justify-between">
        <h3 id="journey-route-heading" className="font-display text-[19px] text-[#012C18]">
          Journey Route
        </h3>
        <RidgeMark className="h-6 w-16 text-[#C3BCA6]" />
      </header>

      {/* Map plate - eases in slightly as the journey advances */}
      <div className="relative mt-3 overflow-hidden rounded-xl border border-[#E0E6DC] bg-[#E8EFE4]">
        <div
          className="relative transition-transform duration-1000 ease-out motion-reduce:transform-none"
          style={{ transform: `scale(${1 + activeIndex * 0.006})` }}
        >
          <svg
            ref={scope}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full"
            role="img"
            aria-label={`Illustrated route: ${labels.join(', ')}`}
          >
            <defs>
              <radialGradient id="routeGlow" cx="45%" cy="35%" r="75%">
                <stop offset="0%" stopColor="#F2F6EE" />
                <stop offset="100%" stopColor="#E1EADC" />
              </radialGradient>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#routeGlow)" />

            {/* Terrain */}
            <g stroke="#CBD8C4" fill="none" strokeWidth="1" strokeLinejoin="round">
              <path d="M-10 128 L36 90 L68 114 L112 66 L154 112 L196 82 L246 120 L310 92" />
              <path d="M-10 262 L42 224 L84 254 L128 208 L172 250 L216 216 L310 258" />
              <path d="M-10 392 L48 352 L96 386 L138 344 L190 384 L232 354 L310 390" />
            </g>

            {/* River */}
            <path
              d="M244 0 C228 78 262 130 236 206 C212 278 256 328 232 404 C218 448 244 464 236 480"
              fill="none"
              stroke="#B6D6E8"
              strokeWidth="4.5"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Base travel path */}
            <path
              data-route-path
              d={ROUTE_PATH}
              fill="none"
              stroke="#7E9A94"
              strokeWidth="2"
              strokeDasharray="5 6"
              strokeLinecap="round"
              opacity="0.75"
            />

            {/* Travelled portion, revealed by the route hook */}
            <path
              data-route-progress
              d={ROUTE_PATH}
              fill="none"
              stroke="#0E6B58"
              strokeWidth="2.4"
              strokeDasharray="5 6"
              strokeLinecap="round"
            />

            {/* Pins and their two-line labels */}
            {stops.map((stop, i) => {
              const state =
                i === activeIndex ? 'active' : i < activeIndex ? 'done' : 'upcoming';
              const flip = stop.x > VIEW_W * 0.62;
              const tx = stop.x + (flip ? -14 : 14);

              return (
                <g key={`${stop.label}-${stop.day}`}>
                  <Pin x={stop.x} y={stop.y} state={state} />
                  <text
                    x={tx}
                    y={stop.y - 14}
                    textAnchor={flip ? 'end' : 'start'}
                    className="pointer-events-none select-none"
                    fontSize="8.5"
                    fill="#8A9189"
                  >
                    {scheduled ? `Day ${stop.day}` : `Stage ${stop.day}`}
                  </text>
                  <text
                    x={tx}
                    y={stop.y - 3}
                    textAnchor={flip ? 'end' : 'start'}
                    className="pointer-events-none select-none"
                    fontSize="10"
                    fontWeight={state === 'active' ? 700 : 600}
                    fill={state === 'upcoming' ? '#5E6B63' : '#012C18'}
                  >
                    {stop.label}
                  </text>
                </g>
              );
            })}

            <Jeep />
          </svg>

          {/* Accessible hit targets layered over the illustration */}
          <div className="absolute inset-0">
            {stops.map((stop, i) => (
              <button
                key={`${stop.label}-hit-${stop.day}`}
                type="button"
                onClick={() => onSelectDay(stop.day)}
                style={{
                  left: `${(stop.x / VIEW_W) * 100}%`,
                  top: `${(stop.y / VIEW_H) * 100}%`,
                }}
                className="group absolute h-8 w-8 -translate-x-1/2 -translate-y-2/3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]"
                aria-label={`${scheduled ? 'Day' : 'Stage'} ${stop.day}: ${stop.label} — jump to this stage`}
                aria-current={i === activeIndex ? 'step' : undefined}
              >
                <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#012C18] px-2 py-1 text-[10px] font-medium text-[#F4F1E8] shadow-lg group-hover:block group-focus-visible:block">
                  {stop.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-[#5E6B63]">
          Total Distance: <span className="font-semibold text-[#012C18]">{totalDistance}</span>
        </p>
        <button
          type="button"
          onClick={() => onSelectDay(1)}
          className="rounded-lg bg-[#043A25] px-4 py-2 text-[11px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
        >
          View Full Map
        </button>
      </div>
    </section>
  );
}
