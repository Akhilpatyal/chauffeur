import React, { useCallback, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  LayoutGrid,
  List,
  MapPin,
  MountainSnow,
  Play,
  SlidersHorizontal,
  Star,
  X,
} from 'lucide-react';
import { guestRatings, featuredStays, hotels, TOTAL_STAYS } from '../../data/hotels';
import Newsletter from '../sections/Newsletter';
import Footer from '../footer/Footer';
import HotelsHero from './HotelsHero';
import HotelFilters from './HotelFilters';
import HotelsRightRail from './HotelsRightRail';
import HotelDetailDrawer from './HotelDetailDrawer';
import StayCard, { RecommendedCard } from './StayCard';
import { money } from './hotelUi';
import { useDocumentMeta } from '../../lib/seo';

const PAGE_SIZE = 4;

const initialFilters = () => ({
  query: '',
  minPrice: 5000,
  maxPrice: 12000,
  types: [],
  stars: [],
  guestRating: null,
  amenities: ['Breakfast', 'Mountain View'],
  locations: [],
  experiences: [],
  booking: [],
});

const sortOptions = [
  'Recommended',
  'Price: Low to High',
  'Price: High to Low',
  'Guest Rating',
  'Most Reviewed',
];

const breadcrumbs = ['Home', 'Hotels', 'Himachal Pradesh', 'Manali'];

/* Removable chip summarising one active filter */
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD4C1] bg-[#FAF9F5] py-1 pl-3 pr-2 text-[11px] font-medium text-[#3B473F]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="text-[#98A09A] transition hover:text-[#D65A3A]"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

export default function HotelsPage({ onEnquire }) {
  useDocumentMeta({
    title: 'Handpicked Stays & Mountain Hotels',
    description:
      'Boutique stays, riverside camps and heritage cottages we have stayed in ourselves. Filter by location, price, rating and amenities.',
  });

  const [destination, setDestination] = useState('Manali, Himachal Pradesh');
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState('Recommended');
  const [view, setView] = useState('list');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mobileFilters, setMobileFilters] = useState(false);

  const setValue = useCallback((key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setVisible(PAGE_SIZE);
  }, []);

  const toggleValue = useCallback((group, value) => {
    setFilters((f) => ({
      ...f,
      [group]: f[group].includes(value)
        ? f[group].filter((v) => v !== value)
        : [...f[group], value],
    }));
    setVisible(PAGE_SIZE);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ ...initialFilters(), amenities: [], minPrice: 1500, maxPrice: 25000 });
    setVisible(PAGE_SIZE);
  }, []);

  const toggleFavorite = useCallback((id) => {
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }, []);

  const results = useMemo(() => {
    const any = (group, values) => !group.length || values.some((v) => group.includes(v));
    const minRating = guestRatings.find((g) => g.label === filters.guestRating)?.min ?? 0;

    const list = hotels.filter(
      (h) =>
        h.price >= filters.minPrice &&
        h.price <= filters.maxPrice &&
        h.rating >= minRating &&
        h.name.toLowerCase().includes(filters.query.trim().toLowerCase()) &&
        (!filters.types.length || filters.types.includes(h.type)) &&
        (!filters.stars.length || filters.stars.includes(h.star)) &&
        (!filters.locations.length || filters.locations.includes(h.location)) &&
        any(filters.amenities, h.amenities) &&
        any(filters.experiences, h.experience || []) &&
        any(filters.booking, h.booking || [])
    );

    const sorted = [...list];
    if (sort === 'Price: Low to High') sorted.sort((a, b) => a.price - b.price);
    if (sort === 'Price: High to Low') sorted.sort((a, b) => b.price - a.price);
    if (sort === 'Guest Rating') sorted.sort((a, b) => b.rating - a.rating);
    if (sort === 'Most Reviewed') sorted.sort((a, b) => b.reviews - a.reviews);
    return sorted;
  }, [filters, sort]);

  const shown = results.slice(0, visible);

  const activeChips = [
    destination && {
      label: destination.split(',')[0],
      onRemove: () => setDestination(''),
    },
    {
      label: `${money(filters.minPrice)} – ${money(filters.maxPrice)}`,
      onRemove: () => setFilters((f) => ({ ...f, minPrice: 1500, maxPrice: 25000 })),
    },
    ...['types', 'locations', 'amenities', 'experiences', 'booking'].flatMap((group) =>
      filters[group].map((value) => ({
        label: value,
        onRemove: () => toggleValue(group, value),
      }))
    ),
    ...filters.stars.map((s) => ({
      label: `${s} Star`,
      onRemove: () => toggleValue('stars', s),
    })),
    filters.guestRating && {
      label: `Rating ${filters.guestRating}`,
      onRemove: () => setValue('guestRating', null),
    },
  ].filter(Boolean);

  const filterPanel = (
    <HotelFilters
      filters={filters}
      onSet={setValue}
      onToggle={toggleValue}
      onClear={clearFilters}
      resultCount={TOTAL_STAYS}
    />
  );

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <HotelsHero
        destination={destination}
        onDestinationChange={setDestination}
        onSearch={() =>
          document.getElementById('all-stays')?.scrollIntoView({ behavior: 'smooth' })
        }
      />

      <main className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A9189]">
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[#C3C8C1]">›</span>}
                  <span
                    className={
                      i === breadcrumbs.length - 1
                        ? 'font-medium text-[#012C18]'
                        : 'transition hover:text-[#075333]'
                    }
                  >
                    {crumb}
                  </span>
                </li>
              ))}
            </ol>
          </nav>

          <div className="mt-5 grid items-start gap-6 pb-4 lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_296px]">
            {/* Filters */}
            <aside className="hidden lg:block">
              <div className="no-scrollbar sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-2">
                {filterPanel}
              </div>
            </aside>

            {/* Results */}
            <section>
              {/* Heading + controls */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-[32px] leading-none text-[#012C18] sm:text-[36px]">
                    Stays in Manali
                    <MountainSnow
                      className="h-6 w-6 text-[#B7C0B4]"
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                  </h2>
                  <p className="mt-2 text-[12.5px] text-[#7C857E]">
                    {TOTAL_STAYS} properties
                  </p>
                  <p className="text-[12.5px] text-[#7C857E]">
                    Handpicked places for your mountain escape.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMobileFilters(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD4C1] bg-[#FAF9F5] px-3 py-2 text-[11.5px] font-medium text-[#012C18] lg:hidden"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                  </button>

                  <label className="flex items-center gap-2 text-[11.5px] text-[#7C857E]">
                    Sort by
                    <span className="relative">
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="appearance-none rounded-lg border border-[#DDD4C1] bg-[#FAF9F5] py-2 pl-3 pr-8 text-[11.5px] font-medium text-[#012C18] outline-none transition hover:border-[#B7C4B4]"
                      >
                        {sortOptions.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A9189]" />
                    </span>
                  </label>

                  <div className="hidden overflow-hidden rounded-lg border border-[#DDD4C1] sm:flex">
                    {[
                      { id: 'list', icon: List, label: 'List view' },
                      { id: 'grid', icon: LayoutGrid, label: 'Grid view' },
                    ].map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        type="button"
                        aria-label={label}
                        aria-pressed={view === id}
                        onClick={() => setView(id)}
                        className={`flex h-[34px] w-9 items-center justify-center transition ${
                          view === id
                            ? 'bg-[#043A25] text-[#FAF9F5]'
                            : 'bg-[#FAF9F5] text-[#5E6B63] hover:bg-[#EFEBDF]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Taifer recommends */}
              <div className="mt-7 rounded-2xl border border-[#E3DDCB] bg-[#EFEBDD]/70 p-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.12em] text-[#012C18]">
                      Taifer Recommends
                      <Star className="h-3.5 w-3.5 fill-[#B89A5A] text-[#B89A5A]" />
                    </h3>
                    <p className="mt-1 text-[11.5px] text-[#7C857E]">
                      Places we&rsquo;d choose for the journey.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById('all-stays')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#075333] transition hover:gap-1.5"
                  >
                    See all picks
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {featuredStays.map((stay) => (
                    <RecommendedCard
                      key={stay.id}
                      stay={stay}
                      favorite={favorites.includes(stay.id)}
                      onToggleFavorite={toggleFavorite}
                      onOpen={setSelected}
                    />
                  ))}
                </div>
              </div>

              {/* All stays */}
              <div
                id="all-stays"
                className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 scroll-mt-28"
              >
                <h3 className="font-display text-[26px] leading-none text-[#012C18]">
                  All Stays ({results.length})
                </h3>
                {activeChips.map((chip, i) => (
                  <FilterChip key={`${chip.label}-${i}`} {...chip} />
                ))}
                {activeChips.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[11px] font-medium text-[#075333] underline underline-offset-2 transition hover:text-[#012C18]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div
                className={
                  view === 'grid'
                    ? 'mt-4 grid gap-4 sm:grid-cols-2'
                    : 'mt-4 flex flex-col gap-4'
                }
              >
                {shown.map((stay) => (
                  <StayCard
                    key={stay.id}
                    stay={stay}
                    layout={view === 'grid' ? 'tile' : 'row'}
                    favorite={favorites.includes(stay.id)}
                    onToggleFavorite={toggleFavorite}
                    onOpen={setSelected}
                  />
                ))}

                {!results.length && (
                  <div className="rounded-2xl border border-dashed border-[#DDD4C1] bg-[#FAF9F5] p-12 text-center">
                    <MapPin className="mx-auto h-6 w-6 text-[#B89A5A]" />
                    <h4 className="mt-3 font-display text-[22px] text-[#012C18]">
                      No stays match these filters
                    </h4>
                    <p className="mt-1 text-[12px] text-[#7C857E]">
                      Try widening your price range or clearing a few filters.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 rounded-lg bg-[#043A25] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#FAF9F5]"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {results.length > 0 && (
                <div className="mt-6 flex flex-col items-center">
                  {visible < results.length && (
                    <button
                      type="button"
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="inline-flex items-center gap-2 rounded-full border border-[#DDD4C1] bg-[#FAF9F5] px-6 py-2.5 text-[11.5px] font-medium text-[#012C18] transition hover:border-[#075333] hover:text-[#075333]"
                    >
                      Load More Stays
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <p className="mt-3 text-[11px] text-[#98A09A]">
                    Showing {shown.length} of {TOTAL_STAYS} stays
                  </p>
                </div>
              )}
            </section>

            {/* Map + widgets */}
            <aside className="hidden xl:block">
              <HotelsRightRail
                onOpen={setSelected}
                onTalkToExpert={() => setSelected(featuredStays[0])}
              />
            </aside>

            {/* Closing banner */}
            <section className="relative mt-4 overflow-hidden rounded-2xl bg-[#02170F] lg:col-start-2 xl:col-span-2">
              <img
                src="/banner3.jpg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#02170F]/92 via-[#02170F]/70 to-[#02170F]/25" />
              <div className="relative max-w-[420px] p-8 sm:p-10">
                <h2 className="font-display text-[30px] uppercase leading-[1.1] text-[#FAF9F5] sm:text-[34px]">
                  Stay somewhere
                  <br />
                  worth remembering.
                </h2>
                <p className="mt-4 text-[13px] text-white/80">
                  Not every stay is just a room.
                </p>
                <p className="mt-3 text-[12.5px] leading-relaxed text-white/70">
                  From mountain cabins to riverside retreats &mdash; handpicked places
                  that become part of your story.
                </p>
                <button
                  type="button"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#B89A5A] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#012C18] transition hover:bg-[#A88849]"
                >
                  Explore Curated Stays
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                aria-label="Play stay film"
                className="absolute bottom-6 right-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/30"
              >
                <Play className="h-4 w-4 fill-current" />
              </button>
            </section>
          </div>
        </div>
      </main>

      <Newsletter />
      <Footer />

      <HotelDetailDrawer
        stay={selected}
        onClose={() => setSelected(null)}
        onEnquire={onEnquire}
      />

      {/* Mobile filter sheet */}
      {mobileFilters && (
        <div
          className="fixed inset-0 z-[60] bg-[#02170F]/55 lg:hidden"
          onClick={() => setMobileFilters(false)}
          role="presentation"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-[340px] overflow-y-auto bg-[#F4F1E8] p-4"
          >
            <button
              type="button"
              onClick={() => setMobileFilters(false)}
              className="mb-3 ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF9F5] text-[#012C18]"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </button>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
