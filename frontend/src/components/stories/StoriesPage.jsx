import React, { useMemo, useRef, useState } from 'react';
import { BookOpen, PenLine, Users } from 'lucide-react';
import Footer from '../footer/Footer';
import Newsletter from '../sections/Newsletter';
import PageHero from '../common/PageHero';
import Breadcrumb from '../common/Breadcrumb';
import FilterTabs from '../common/FilterTabs';
import StoryCard from '../cards/StoryCard';
import { journalArticles, storyCategories } from '../../data/journal';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { useDocumentMeta } from '../../lib/seo';

/*
 * /stories — the journal index.
 *
 * "Stories" was in the navbar and the footer, and the homepage had an "Explore
 * all stories" button; all three either scrolled to a homepage section or
 * opened a modal. A modal has no URL, so nothing here could be shared or
 * indexed. These are real pages now.
 */
export default function StoriesPage() {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 90%', stagger: 0.06 });

  const [category, setCategory] = useState('All stories');

  const featured = useMemo(
    () => journalArticles.find((article) => article.featured) ?? journalArticles[0],
    []
  );

  useDocumentMeta({
    title: 'Trail Journal — Himalayan Stories & Travel Guides',
    description:
      'Seasonal guides, route notes and mountain wisdom from our expedition leaders: when to visit Kashmir, your first high-altitude trek, and stargazing in Spiti.',
    image: featured?.image,
  });

  /* Only categories that have at least one story, with counts. */
  const options = useMemo(
    () =>
      storyCategories
        .map((name) => ({
          id: name,
          label: name,
          count:
            name === 'All stories'
              ? journalArticles.length
              : journalArticles.filter((article) => article.category === name).length,
        }))
        .filter((option) => option.count > 0),
    []
  );

  const visible = useMemo(
    () =>
      category === 'All stories'
        ? journalArticles
        : journalArticles.filter((article) => article.category === category),
    [category]
  );

  /* The featured card only leads the grid when no filter is narrowing it;
   * otherwise it would appear twice or sit outside the filter the reader chose. */
  const showFeatured = category === 'All stories';
  const gridStories = showFeatured
    ? visible.filter((article) => article.id !== featured.id)
    : visible;

  const authors = useMemo(
    () => new Set(journalArticles.map((article) => article.author)).size,
    []
  );

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <PageHero
        eyebrow="Trail journal"
        image={featured?.image}
        title="Stories"
        subtitle="Route notes, seasonal guides and the things our expedition leaders would tell you over chai, written down."
        facts={[
          { icon: BookOpen, label: 'Stories', value: `${journalArticles.length} published` },
          { icon: PenLine, label: 'Written by', value: `${authors} guides` },
          { icon: Users, label: 'Readers', value: '10,000+ subscribers' },
        ]}
      />

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: 'Home', path: '/' }, { label: 'Stories' }]}
            className="mb-8"
          />

          <div className="border-b border-[#DDD4C1] pb-5">
            <h2 className="font-display text-[24px] leading-tight text-[#012C18] sm:text-[28px]">
              From the trail
            </h2>
            <p className="mt-1 max-w-[70ch] text-[12.5px] text-[#5E6B63]">
              No listicles written from a desk. Everything here comes from someone who has run the
              route, usually more than once.
            </p>
          </div>

          <div className="mt-5">
            <FilterTabs
              options={options}
              value={category}
              onChange={setCategory}
              label="Filter stories by category"
            />
          </div>

          <p aria-live="polite" className="mt-4 text-[12px] text-[#8A9189]">
            Showing {visible.length} of {journalArticles.length} stories
          </p>

          {showFeatured && featured && (
            <section className="mt-6" aria-labelledby="featured-story-heading">
              <h2 id="featured-story-heading" className="sr-only">
                Featured story
              </h2>
              <div data-reveal>
                <StoryCard story={featured} variant="featured" />
              </div>
            </section>
          )}

          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gridStories.map((story) => (
              <li key={story.id} data-reveal className="h-full">
                <StoryCard story={story} />
              </li>
            ))}
          </ul>

          {gridStories.length === 0 && !showFeatured && (
            <p className="mt-8 rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-8 text-center text-[13px] text-[#5E6B63]">
              Nothing in this category yet. Try another one.
            </p>
          )}
        </div>
      </main>

      <Newsletter
        variant="forest"
        eyebrow="Monthly trail log"
        title="Get new stories by email"
        subtitle="One letter a month: where we have been, what the weather is doing up there, and which departures still have seats."
        note="10,000+ explorers subscribe to our newsletter"
        showAvatars
      />
      <Footer />
    </div>
  );
}
