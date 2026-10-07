import React, { useEffect, useRef, useState } from 'react';
import { Layers, MapPin, Mountain } from 'lucide-react';
import { straightLineKm } from '../../data/places';

/*
 * A real map.
 *
 * What this replaces: a decorative SVG with one fixed squiggle, pins spaced
 * evenly along it, invented contour lines, a painted river and a jeep. The
 * same picture appeared whether the trip was in Spiti or Meghalaya, so it
 * answered none of the questions a traveller actually has — where is this, how
 * far apart are the nights, how high does it go.
 *
 * Choices worth knowing:
 *
 *  - Leaflet, loaded dynamically. Roughly 42 KB gzipped that only the detail
 *    pages pay for; it never reaches the homepage bundle.
 *  - Terrain tiles by default. For Himalayan travel a topographic map showing
 *    contours and passes is far more useful than a street map.
 *  - The line between stops is a STRAIGHT LINE, not the road, and the caption
 *    says so. Letting a straight line across a Himalayan valley imply a road
 *    would be worse than the illustration it replaces. Real road geometry
 *    needs a routing service.
 */

/*
 * Tile sources, all usable without an API key.
 *
 * FOR PRODUCTION: the OpenStreetMap and OpenTopoMap community tile servers run
 * on donated capacity and their usage policies do not cover the traffic of a
 * busy commercial site. Point VITE_MAP_TILES at a hosted provider (MapTiler,
 * Stadia, Thunderforest) or your own cache before launch.
 */
const DEFAULT_TERRAIN =
  import.meta.env.VITE_MAP_TILES || 'https://tile.opentopomap.org/{z}/{x}/{y}.png';

const LAYERS = {
  terrain: {
    label: 'Terrain',
    url: DEFAULT_TERRAIN,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  street: {
    label: 'Street',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

/* Numbered teardrop pin as HTML, so it takes the site palette instead of
 * shipping marker images. */
function pinHtml(number, state) {
  const active = state === 'active';
  const fill = active ? '#D65A3A' : state === 'done' ? '#B89A5A' : '#FAF9F5';
  const text = state === 'upcoming' ? '#43514A' : '#FFFFFF';
  const size = active ? 32 : 26;

  /* The active pin is larger and ringed in white so it reads instantly
   * against both terrain and satellite imagery. */
  return `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${fill};border:2px solid #FFFFFF;box-shadow:0 0 0 1.5px ${active ? '#8A3B22' : '#043A25'},0 3px 8px rgba(1,44,24,.4);font:700 ${active ? 13 : 11}px/1 ui-monospace,monospace;color:${text}"><span style="transform:rotate(45deg)">${number}</span></span>`;
}

const iconFor = (L, number, state) => {
  const size = state === 'active' ? 32 : 26;
  return L.divIcon({
    html: pinHtml(number, state),
    className: 'taifer-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
};

export default function RouteMap({
  stops = [],
  activeDay,
  onSelectDay,
  scheduled = true,
  /*
   * Pan the map to the active stop as it changes. On the journey page the
   * itinerary scroll drives this, so following is the point. On a page where
   * nothing changes the active stop, following would just re-centre on stop
   * one and push the rest of the route off the edge.
   */
  followActive = true,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const tileRef = useRef(null);
  const leafletRef = useRef(null);
  const observerRef = useRef(null);
  /* Panning on the very first run would undo the fitBounds that just framed
   * the whole route. Only a genuine change should move the view. */
  const lastActiveRef = useRef(null);

  const [layer, setLayer] = useState('terrain');
  const [status, setStatus] = useState('loading');

  /* Create the map once per route. */
  useEffect(() => {
    if (stops.length === 0) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');
        if (cancelled || !containerRef.current) return;

        leafletRef.current = L;

        const map = L.map(containerRef.current, {
          /* Hijacking the page scroll to zoom a map is one of the most hated
           * patterns on the web. Ctrl and wheel still zooms. */
          scrollWheelZoom: false,
        });
        mapRef.current = map;

        tileRef.current = L.tileLayer(LAYERS[layer].url, {
          attribution: LAYERS[layer].attribution,
          maxZoom: LAYERS[layer].maxZoom,
        }).addTo(map);

        const points = stops.map((stop) => [stop.place.lat, stop.place.lng]);
        const single = points.length === 1;

        /*
         * Dashed: this is the order of the stops, not the road.
         *
         * Drawn twice — a white casing underneath, then the dark line on top.
         * A single dark dashed line vanishes against terrain tiles, which are
         * busy and mid-toned almost everywhere.
         */
        if (!single) {
          L.polyline(points, {
            color: '#FFFFFF',
            weight: 6,
            opacity: 0.75,
            lineCap: 'round',
          }).addTo(map);

          L.polyline(points, {
            color: '#043A25',
            weight: 2.5,
            opacity: 0.95,
            dashArray: '6 7',
            lineCap: 'round',
          }).addTo(map);
        }

        stops.forEach((stop, index) => {
          const marker = L.marker([stop.place.lat, stop.place.lng], {
            /* Numbered by position: two pins from the same day would
             * otherwise both read "1". The day is in the popup. */
            icon: iconFor(L, index + 1, 'upcoming'),
            keyboard: true,
            title: stop.place.name,
            alt: `${scheduled ? 'Day' : 'Stage'} ${stop.day}: ${stop.place.name}`,
          }).addTo(map);

          const elevation = stop.place.ft
            ? ` &middot; ${stop.place.ft.toLocaleString('en-IN')} ft`
            : '';
          marker.bindPopup(
            `<strong>${stop.place.name}</strong><br><span style="color:#5E6B63">${
              scheduled ? 'Day' : 'Stage'
            } ${stop.day}${elevation}</span>`
          );

          marker.on('click', () => onSelectDay?.(stop.day));
          markersRef.current[index] = marker;
        });

        /* fitBounds on a single point zooms to maximum; pick a zoom that
         * shows the surrounding valley instead. */
        const fit = () => {
          if (single) map.setView(points[0], 11);
          else map.fitBounds(L.latLngBounds(points), { padding: [44, 44] });
        };

        fit();
        setStatus('ready');

        /*
         * Leaflet measures the container when the map is created. In a sticky
         * sidebar that is still settling — or once a web font changes the
         * height of the text above it — those measurements are stale and the
         * edge pins end up clipped. Re-measuring and re-fitting on any size
         * change is the standard fix.
         */
        const observer = new ResizeObserver(() => {
          map.invalidateSize({ animate: false });
          fit();
        });
        observer.observe(containerRef.current);
        observerRef.current = observer;
      } catch {
        /* Offline, blocked tiles or a CDN failure. The page keeps working. */
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      observerRef.current?.disconnect();
      observerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]);

  /* Swap the tile layer when the style changes. */
  useEffect(() => {
    const L = leafletRef.current;
    if (!L || !mapRef.current || !tileRef.current) return;

    mapRef.current.removeLayer(tileRef.current);
    tileRef.current = L.tileLayer(LAYERS[layer].url, {
      attribution: LAYERS[layer].attribution,
      maxZoom: LAYERS[layer].maxZoom,
    }).addTo(mapRef.current);
  }, [layer]);

  /* Reflect the itinerary's active day on the map. */
  useEffect(() => {
    const L = leafletRef.current;
    if (status !== 'ready' || !L) return;

    const activeIndex = stops.findIndex((stop) => stop.day === activeDay);

    markersRef.current.forEach((marker, index) => {
      const state = index === activeIndex ? 'active' : index < activeIndex ? 'done' : 'upcoming';
      marker.setIcon(iconFor(L, index + 1, state));
      marker.setZIndexOffset(state === 'active' ? 1000 : 0);
    });

    const active = stops[activeIndex];
    const changed = lastActiveRef.current !== null && lastActiveRef.current !== activeDay;
    lastActiveRef.current = activeDay;

    if (followActive && changed && active && mapRef.current) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      mapRef.current.panTo([active.place.lat, active.place.lng], { animate: !reduced });
    }
  }, [activeDay, status, stops, followActive]);

  if (stops.length === 0) return null;

  const distance = stops.reduce(
    (total, stop, index) =>
      index === 0 ? 0 : total + straightLineKm(stops[index - 1].place, stop.place),
    0
  );
  const highest = stops.reduce((max, stop) => Math.max(max, stop.place.ft ?? 0), 0);

  return (
    <section
      aria-labelledby="route-map-heading"
      className="overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-4"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="route-map-heading" className="font-display text-[19px] text-[#012C18]">
          Route map
        </h3>

        <div className="flex items-center gap-1" role="group" aria-label="Map style">
          <Layers aria-hidden="true" className="mr-0.5 h-3.5 w-3.5 text-[#8A9189]" />
          {Object.entries(LAYERS).map(([key, config]) => (
            <button
              key={key}
              type="button"
              onClick={() => setLayer(key)}
              aria-pressed={layer === key}
              className={`rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                layer === key
                  ? 'bg-[#043A25] text-[#FAF9F5]'
                  : 'text-[#5E6B63] hover:bg-[#043A25]/10'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>
      </header>

      <div
        ref={containerRef}
        className="relative mt-3 h-[300px] w-full overflow-hidden rounded-xl border border-[#E0E6DC] bg-[#E8EFE4] sm:h-[340px]"
        role="application"
        aria-label={`Map of the route: ${stops.map((s) => s.place.name).join(', ')}`}
      >
        {status !== 'ready' && (
          <p className="absolute inset-0 z-[500] grid place-items-center text-[12px] text-[#5E6B63]">
            {status === 'error' ? 'Map unavailable — the stops are listed below.' : 'Loading map…'}
          </p>
        )}
      </div>

      {/* A map is not usable by everyone, and tiles can fail. The same
          sequence is always available as a list of real buttons. */}
      <ol className="mt-3 flex flex-wrap gap-x-1 gap-y-1 text-[11.5px]">
        {stops.map((stop) => (
          <li key={`${stop.day}-${stop.place.key}`}>
            <button
              type="button"
              onClick={() => onSelectDay?.(stop.day)}
              aria-current={stop.day === activeDay ? 'step' : undefined}
              className={`rounded px-1.5 py-0.5 transition-colors ${
                stop.day === activeDay
                  ? 'bg-[#043A25] text-[#FAF9F5]'
                  : 'text-[#5E6B63] hover:text-[#012C18] hover:underline'
              }`}
            >
              {stop.place.name}
            </button>
          </li>
        ))}
      </ol>

      <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[#EFE9DA] pt-3 text-[11.5px] text-[#5E6B63]">
        {distance > 0 && (
          <div className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
            <dt className="sr-only">Straight-line distance</dt>
            <dd>~{distance} km point to point</dd>
          </div>
        )}
        {highest > 0 && (
          <div className="flex items-center gap-1.5">
            <Mountain aria-hidden="true" className="h-3.5 w-3.5 text-[#B89A5A]" />
            <dt className="sr-only">Highest point on the route</dt>
            <dd>{highest.toLocaleString('en-IN')} ft highest</dd>
          </div>
        )}
      </dl>

      <p className="mt-2 text-[10.5px] leading-relaxed text-[#98A09A]">
        {stops.length > 1
          ? 'Pins mark where each stage ends. The dashed line joins them in order and is not the road — real driving distance through these valleys is considerably longer.'
          : 'Pin marks the base for this trip. Distances by road are longer than they look on a map in this terrain.'}
      </p>
    </section>
  );
}
