import React from 'react';
import { Mountain, Footprints, Car, CalendarDays, Users, Heart, Flame } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function CategoryRail({ activeCategory, onSelectCategory }) {
  const categories = [
    { id: 'mountains', label: 'Mountains', icon: Mountain },
    { id: 'treks', label: 'Treks', icon: Footprints },
    { id: 'roadtrips', label: 'Road Trips', icon: Car },
    { id: 'weekend', label: 'Weekend Escapes', icon: CalendarDays },
    { id: 'group', label: 'Group Tours', icon: Users },
    { id: 'family', label: 'Family', icon: Heart },
    { id: 'couples', label: 'Couples', icon: Heart },
    { id: 'adventure', label: 'Adventure', icon: Flame },
  ];

  return (
    <div className="w-full py-3.5 sm:py-4 border-b border-[#DDD4C1] bg-[#F4F1E8]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 shrink-0 pb-1 transition-all cursor-pointer select-none border-b-2',
                  isActive
                    ? 'border-[#003B24] text-[#003B24]'
                    : 'border-transparent text-[#003B24]/60 hover:text-[#003B24] hover:border-[#003B24]/30'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-sans font-semibold whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
