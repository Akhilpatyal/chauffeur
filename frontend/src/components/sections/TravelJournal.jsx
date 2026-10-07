import React from 'react';
import { ArrowRight } from 'lucide-react';
import StoryCard from '../cards/StoryCard';
import { journalArticles } from '../../data/journal';
import { linkProps } from '../../router';

/*
 * Homepage journal rail.
 *
 * Previously every card was a `div` with an onClick that opened a reader modal,
 * so a story could not be opened in a new tab, focused with the keyboard, read
 * as a link by a screen reader, shared, or indexed — and "Explore all stories"
 * opened the featured article rather than a listing.
 *
 * The cards are now the shared StoryCard, which renders real anchors to
 * /stories/:slug, and the header link goes to /stories.
 */
export default function TravelJournal() {
  const featuredArticle = journalArticles.find((article) => article.featured) ?? journalArticles[0];
  const sideArticles = journalArticles.filter((article) => !article.featured).slice(0, 4);

  return (
    <section
      id="journal"
      className="border-t border-[#DDD4C1] bg-[#F4F1E8] py-16 text-[#003B24] sm:py-20"
    >
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#B89A5A]">
              TRAIL JOURNAL
            </span>
            <h2 className="font-display text-3xl font-normal text-[#003B24] sm:text-4xl">
              From the Trail Journal.
            </h2>
          </div>

          <a
            {...linkProps('/stories')}
            className="group inline-flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-[#003B24] transition-colors hover:text-[#075333]"
          >
            <span>Explore all stories</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <StoryCard story={featuredArticle} variant="featured" />
          </div>

          <ul className="space-y-3 lg:col-span-6">
            {sideArticles.map((article) => (
              <li key={article.id}>
                <StoryCard story={article} variant="compact" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
