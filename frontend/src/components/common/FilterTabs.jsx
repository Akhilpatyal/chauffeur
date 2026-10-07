import React from 'react';
import { cn } from '../../utils/helpers';

/*
 * Pill filter row for the listing pages.
 *
 * Real buttons in a tablist, not styled divs: the existing category rail on the
 * homepage was keyboard-reachable only by accident, and a filter row that
 * cannot be tabbed through is unusable for anyone not using a mouse.
 */
export default function FilterTabs({ options, value, onChange, label = 'Filter' }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {options.map((option) => {
        const isActive = option.id === value;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-[12px] font-semibold transition-colors',
              isActive
                ? 'border-[#043A25] bg-[#043A25] text-[#FAF9F5]'
                : 'border-[#DDD4C1] bg-[#FAF9F5] text-[#4A5B50] hover:border-[#043A25] hover:text-[#012C18]'
            )}
          >
            {option.label}
            {typeof option.count === 'number' && (
              <span className={cn('ml-1.5', isActive ? 'text-white/60' : 'text-[#98A09A]')}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
