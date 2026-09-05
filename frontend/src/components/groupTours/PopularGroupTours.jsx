import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, Heart, SlidersHorizontal, Users } from 'lucide-react';
import { groupTourCards, tourFilters } from '../../data/groupToursPage';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { GroupIcon, RidgeMark } from './groupUi';

function TourCard({ tour, favorite, onToggleFavorite, onView }) {
  return (
    <article
      data-reveal
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] transition-all duration-500 hover:-translate-y-1 hover:border-[#B7C4B4] hover:shadow-[0_22px_46px_-30px_rgba(1,44,24,0.6)]"
    >
      {/* Media */}
      <div className="relative h-[118px] overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/65 via-transparent to-[#02170F]/25" />

        <span className="absolute left-2.5 top-2.5 rounded-md bg-[#B89A5A] px-2 py-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-[#012C18]">
          {tour.badge}
        </span>

        <button
          type="button"
          onClick={() => onToggleFavorite(tour.id)}
          aria-label={`Save ${tour.title}`}
          aria-pressed={favorite}
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 transition hover:bg-white"
        >
          <Heart
            className={`h-3.5 w-3.5 ${favorite ? 'fill-[#D65A3A] text-[#D65A3A]' : 'text-[#4A5B50]'}`}
          />
        </button>

        <span className="absolute bottom-2.5 left-2.5 rounded-md bg-[#FAF9F5] px-2 py-1 text-[10px] font-bold text-[#012C18]">
          {tour.duration}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[18px] leading-tight text-[#012C18]">
          {tour.title}
        </h3>
        <p className="mt-1 text-[11.5px] leading-snug text-[#7C857E]">{tour.description}</p>

        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {tour.includes.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1 text-[10.5px] text-[#4A5B50]"
            >
              <GroupIcon
                name={item === 'Meals' ? 'meals' : item === 'Stay' ? 'stay' : 'activities'}
                className="h-3 w-3 text-[#8A9189]"
              />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-[#F4F1E8] px-2 py-1.5 text-[10.5px] text-[#4A5B50]">
          <Users className="h-3 w-3 text-[#B89A5A]" strokeWidth={1.8} />
          Group Size: {tour.groupSize}
        </p>

        <p className="mt-3 text-[12px] text-[#7C857E]">
          From{' '}
          <span className="font-display text-[19px] text-[#012C18]">{tour.price}</span>{' '}
          <span className="text-[10.5px]">/person</span>
        </p>

        <button
          type="button"
          onClick={() => onView(tour.id)}
          className="mt-3 w-full rounded-lg bg-[#043A25] py-2.5 text-[12px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
        >
          View Details
        </button>
      </div>
    </article>
  );
}

export default function PopularGroupTours({ onViewTour, onViewAll }) {
  const scope = useRef(null);
  const [filter, setFilter] = useState('All Tours');
  const [favorites, setFavorites] = useState([]);
  useScrollReveal(scope, { start: 'top 86%', stagger: 0.07 });

  const visible = useMemo(
    () =>
      filter === 'All Tours'
        ? groupTourCards
        : groupTourCards.filter((tour) => tour.category === filter),
    [filter]
  );

  const toggleFavorite = (id) =>
    setFavorites((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  return (
    <section
      ref={scope}
      aria-labelledby="popular-group-tours-heading"
      className="bg-[#F4F1E8] pt-10 pb-14 sm:pt-12"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2
              id="popular-group-tours-heading"
              className="font-display text-[28px] leading-none text-[#012C18] sm:text-[32px]"
            >
              Popular Group Tours
            </h2>
            <RidgeMark className="h-7 w-20 text-[#C3BCA6]" />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap items-center gap-2">
            {tourFilters.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setFilter(name)}
                aria-pressed={filter === name}
                className={`rounded-lg border px-3.5 py-2 text-[11.5px] font-medium transition ${
                  filter === name
                    ? 'border-[#043A25] bg-[#043A25] text-[#FAF9F5]'
                    : 'border-[#DDD4C1] bg-[#FAF9F5] text-[#3B473F] hover:border-[#075333]'
                }`}
              >
                {name}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#B89A5A]/60 bg-[#FAF9F5] px-3.5 py-2 text-[11.5px] font-medium text-[#8A713C] transition hover:border-[#B89A5A]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {visible.map((tour) => (
            <TourCard
              key={tour.id}
              tour={tour}
              favorite={favorites.includes(tour.id)}
              onToggleFavorite={toggleFavorite}
              onView={onViewTour}
            />
          ))}
        </div>

        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={onViewAll}
            className="group inline-flex items-center gap-2 rounded-lg border border-[#DDD4C1] bg-[#FAF9F5] px-6 py-3 text-[12.5px] font-semibold text-[#012C18] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#043A25]"
          >
            View All Group Tours
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </section>
  );
}
