import React from 'react';
import { Mountain, Footprints, Car, Users, Leaf, CalendarDays } from 'lucide-react';

/*
 * The kinds of travel we do, as a plain strip.
 *
 * NOT BUTTONS ANY MORE
 *
 * These used to filter the page. They are now labels: a <ul>, not a row of
 * <button>s, because a control that looks clickable and does nothing is worse
 * than no control — and with one region open there is nothing yet to filter
 * between. When filtering comes back, these become buttons again and the
 * component gets its handler back with it.
 */
const CATEGORIES = [
  { id: 'mountain', label: 'Mountain', icon: Mountain },
  { id: 'guided-treks', label: 'Guided Treks', icon: Footprints },
  { id: 'road-journeys', label: 'Road Journeys', icon: Car },
  { id: 'group-tours', label: 'Group Tours', icon: Users },
  { id: 'nature-trails', label: 'Nature Trails', icon: Leaf },
  { id: 'weekend-getaways', label: 'Weekend Getaways', icon: CalendarDays },
];

export default function CategoryRail() {

  return (
    <div className="w-full py-3.5 sm:py-4 border-b border-[#DDD4C1] bg-[#F4F1E8]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <ul className="flex items-center justify-start sm:justify-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <li
                key={cat.id}
                className="flex shrink-0 flex-col items-center gap-1.5 pb-1 text-[#003B24]/70"
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-[11px] font-sans font-semibold whitespace-nowrap">{cat.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
