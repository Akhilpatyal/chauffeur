import React, { useRef } from 'react';
import { useTimelineAnimation } from '../../animations/journey/timelineAnimations';
import JourneyDayCard from './JourneyDayCard';
import { JourneyIcon, RidgeMark } from './journeyUi';

export default function JourneyTimeline({ days, scheduled, activeDay, onActiveDay }) {
  const scope = useRef(null);

  useTimelineAnimation(scope, { onActiveDay });

  return (
    <div ref={scope}>
      <header className="flex flex-wrap items-end gap-4">
        <h2 className="font-display text-[30px] leading-tight text-[#012C18] sm:text-[38px]">
          {scheduled ? 'Your Journey Day by Day' : 'What This Journey Covers'}
        </h2>
        <RidgeMark className="mb-1.5 hidden h-8 w-28 text-[#B7C0B4] sm:block" />
      </header>
      <p className="mt-2 text-[13px] text-[#7C857E]">
        {scheduled
          ? `${days.length} days, paced for slow travel.`
          : 'The stages of this journey. Exact day-by-day timings are confirmed with your trip planner.'}
      </p>

      {/* Rail + cards */}
      <div data-timeline-track className="relative mt-8 pl-9 sm:pl-12">
        <span
          aria-hidden="true"
          className="absolute left-[13px] top-3 h-[calc(100%-2rem)] border-l border-dashed border-[#C9BFA6] sm:left-[15px]"
        />
        <span
          aria-hidden="true"
          data-timeline-progress
          className="absolute left-[13px] top-3 h-[calc(100%-2rem)] border-l border-dashed border-[#B89A5A] sm:left-[15px]"
        />

        <ol className="space-y-6">
          {days.map((day) => {
            const isActive = activeDay === day.day;
            const isDone = activeDay > day.day;

            return (
              <li key={day.day} className="relative">
                {/* Day marker */}
                <span
                  aria-hidden="true"
                  className={`absolute -left-9 top-6 flex h-[27px] w-[27px] items-center justify-center rounded-full border-2 transition-all duration-500 sm:-left-12 sm:h-[31px] sm:w-[31px] ${
                    isActive
                      ? 'scale-110 border-[#B89A5A] bg-[#B89A5A] text-[#012C18]'
                      : isDone
                        ? 'border-[#B89A5A] bg-[#043A25] text-[#B89A5A]'
                        : 'border-[#DDD4C1] bg-[#FAF9F5] text-[#98A09A]'
                  }`}
                >
                  <JourneyIcon name={day.icon} className="h-3.5 w-3.5" />
                </span>

                <JourneyDayCard
                  day={day}
                  scheduled={scheduled}
                  isActive={isActive}
                />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
