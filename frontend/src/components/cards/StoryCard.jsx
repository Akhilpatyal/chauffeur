import React from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import { linkProps } from '../../router';

/*
 * Journal card, in three shapes.
 *
 * `featured` is the large image-over-copy card the homepage uses for the lead
 * story, `compact` is the horizontal row beside it, and the default is the grid
 * card on /stories. All three link to /stories/:slug, replacing the modal the
 * homepage used to open — a modal has no URL, so a story could never be
 * shared, linked or indexed.
 */
export default function StoryCard({ story, variant = 'default' }) {
  const href = `/stories/${story.id}`;

  if (variant === 'compact') {
    return (
      <a
        {...linkProps(href)}
        className="group flex gap-4 rounded-xl border border-[#DDD4C1] bg-white p-3.5 transition-all duration-200 hover:border-[#003B24]/35 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]"
      >
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl">
          <img
            src={story.image}
            alt={story.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>

        <div className="flex flex-1 flex-col justify-between py-0.5">
          <div>
            <span className="mb-0.5 block font-mono text-[10px] font-bold tracking-wider text-[#B89A5A]">
              {story.category}
            </span>
            <h3 className="line-clamp-2 font-display text-sm font-normal leading-snug text-[#003B24] transition-colors group-hover:text-[#075333]">
              {story.title}
            </h3>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[11px] text-[#003B24]/55">{story.readingTime}</span>
            <span className="text-[11px] font-bold text-[#003B24] transition-colors group-hover:text-[#075333]">
              Read
              <ArrowRight className="ml-1 inline h-3 w-3 align-[-1px]" />
            </span>
          </div>
        </div>
      </a>
    );
  }

  const isFeatured = variant === 'featured';

  return (
    <a
      {...linkProps(href)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#DDD4C1] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]"
    >
      <div className={`relative overflow-hidden ${isFeatured ? 'h-64 sm:h-72' : 'aspect-[16/10]'}`}>
        <img
          src={story.image}
          alt={story.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-md bg-[#003B24] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#F4F1E8]">
          {story.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-3 font-mono text-xs text-[#003B24]/60">
          <span className="font-bold">{story.author}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {story.readingTime}
          </span>
          {story.date && (
            <>
              <span aria-hidden="true">·</span>
              <span>{story.date}</span>
            </>
          )}
        </div>

        <h3
          className={`font-display font-normal leading-snug text-[#003B24] transition-colors group-hover:text-[#075333] ${
            isFeatured ? 'text-xl sm:text-2xl' : 'text-lg'
          }`}
        >
          {story.title}
        </h3>

        <p className="mt-2 line-clamp-2 font-sans text-xs leading-relaxed text-[#003B24]/65 sm:text-sm">
          {story.excerpt}
        </p>

        <span className="mt-auto flex items-center gap-1.5 pt-4 text-xs font-bold uppercase tracking-wider text-[#003B24] transition-colors group-hover:text-[#075333]">
          Read story
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
    </a>
  );
}
