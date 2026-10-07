import React, { useMemo, useRef } from 'react';
import { Clock, PenLine } from 'lucide-react';
import Footer from '../footer/Footer';
import Newsletter from '../sections/Newsletter';
import PageHero from '../common/PageHero';
import Breadcrumb from '../common/Breadcrumb';
import CTABand from '../common/CTABand';
import StoryCard from '../cards/StoryCard';
import TripCard from '../cards/TripCard';
import { NotFoundPage } from '../destinations/DestinationPage';
import { getStory, relatedStories } from '../../data/journal';
import { journeys } from '../../data/journeys';
import { weekendEscapes } from '../../data/weekendEscapes';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { useDocumentMeta } from '../../lib/seo';
import { linkProps } from '../../router';

/*
 * /stories/:slug
 *
 * Renders the ordered `body` blocks from data/journal.js. Keeping the content as
 * typed blocks rather than an HTML string means the prose measure, heading
 * scale and pull-quote treatment are decided here, once, and a future CMS can
 * feed the same shapes in.
 */
function Block({ block }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="mt-9 font-display text-[23px] leading-snug text-[#012C18] sm:text-[27px]">
          {block.text}
        </h2>
      );

    case 'quote':
      return (
        <figure className="my-8 border-l-2 border-[#B89A5A] pl-5">
          <blockquote className="font-display text-[19px] leading-[1.6] text-[#012C18] sm:text-[21px]">
            {block.text}
          </blockquote>
          {block.attribution && (
            <figcaption className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8A9189]">
              {block.attribution}
            </figcaption>
          )}
        </figure>
      );

    case 'list':
      return (
        <ul className="mt-4 space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[14.5px] leading-[1.8] text-[#43514A]">
              <span
                aria-hidden="true"
                className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#B89A5A]"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'image':
      return (
        <figure className="my-8">
          <img
            src={block.src}
            alt={block.alt ?? ''}
            loading="lazy"
            className="w-full rounded-2xl border border-[#E3DDCB] object-cover"
          />
          {block.caption && (
            <figcaption className="mt-2 text-center text-[11.5px] text-[#8A9189]">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    default:
      return (
        <p className="mt-4 text-[14.5px] leading-[1.85] text-[#43514A] sm:text-[15px]">
          {block.text}
        </p>
      );
  }
}

export default function StoryDetail({ slug, onPlanTrip }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 92%', stagger: 0.05 });

  const story = useMemo(() => getStory(slug), [slug]);
  const related = useMemo(() => (story ? relatedStories(slug) : []), [story, slug]);

  /*
   * Stories can point at either journeys or weekend escapes; the rail shows
   * whichever the author linked, so it is never generic filler.
   */
  const linkedTrips = useMemo(() => {
    if (!story) return [];

    const fromJourneys = (story.relatedJourneys ?? [])
      .map((id) => journeys.find((journey) => journey.id === id))
      .filter(Boolean)
      .map((journey) => ({
        key: journey.id,
        href: `/journeys/${journey.id}`,
        ctaLabel: 'View journey',
        trip: {
          title: journey.title,
          location: journey.location,
          duration: journey.duration,
          price: journey.price,
          rating: journey.rating,
          reviews: journey.reviews,
          image: journey.image,
          description: journey.description,
          tags: journey.tags,
        },
      }));

    const fromEscapes = (story.relatedEscapes ?? [])
      .map((escapeSlug) => weekendEscapes.find((escape) => escape.slug === escapeSlug))
      .filter(Boolean)
      .map((escape) => ({
        key: escape.slug,
        href: `/weekend-escapes/${escape.slug}`,
        ctaLabel: 'View escape',
        trip: {
          title: escape.title,
          location: escape.location,
          duration: escape.duration,
          price: escape.price,
          rating: escape.rating,
          reviews: escape.reviews,
          image: escape.image,
          description: escape.description,
          tags: escape.tags,
        },
      }));

    return [...fromJourneys, ...fromEscapes].slice(0, 3);
  }, [story]);

  /*
   * `noindex` when the slug is unknown: this hook runs after the child 404's,
   * so otherwise it would relabel a missing story as an indexable page.
   */
  useDocumentMeta({
    title: story?.title ?? 'Story not found',
    description: story?.excerpt,
    image: story?.image,
    type: 'article',
    noindex: !story,
  });

  if (!story) return <NotFoundPage />;

  /* Article structured data, so a story can appear as a rich result rather
   * than a bare link. */
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: story.excerpt,
    image: story.image,
    articleSection: story.category,
    author: { '@type': 'Person', name: story.author },
    publisher: { '@type': 'Organization', name: 'TAIFER — The Great Outdoors' },
    keywords: (story.tags ?? []).join(', '),
  };

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <PageHero
        eyebrow={story.category}
        image={story.image}
        imageAlt={story.title}
        title={story.title}
        facts={[
          { icon: PenLine, label: 'By', value: story.author },
          { icon: Clock, label: 'Read', value: story.readingTime },
        ]}
      />

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Home', path: '/' },
              { label: 'Stories', path: '/stories' },
              { label: story.title },
            ]}
            className="mb-8"
          />

          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Prose column, capped at a readable measure */}
            <article
              data-reveal
              className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-9"
            >
              <p className="font-display text-[17px] leading-[1.7] text-[#012C18] sm:text-[19px]">
                {story.excerpt}
              </p>

              <hr className="my-7 border-[#E3DDCB]" />

              <div className="max-w-[68ch]">
                {story.body.map((block, index) => (
                  <Block key={`${block.type}-${index}`} block={block} />
                ))}
              </div>

              {story.tags?.length > 0 && (
                <ul className="mt-9 flex flex-wrap gap-1.5 border-t border-[#E3DDCB] pt-6">
                  {story.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-[#DDD4C1] px-2.5 py-1 text-[11px] text-[#4A5B50]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
                <h2 className="font-display text-[17px] text-[#012C18]">About the author</h2>
                <p className="mt-2 text-[13px] font-semibold text-[#012C18]">{story.author}</p>
                {story.authorRole && (
                  <p className="text-[11.5px] text-[#8A9189]">{story.authorRole}</p>
                )}
                <p className="mt-3 text-[12.5px] leading-relaxed text-[#5E6B63]">
                  Part of the team that plans and leads our routes. Published {story.date}.
                </p>
                <a
                  {...linkProps('/about')}
                  className="mt-3 inline-block text-[12px] font-semibold text-[#075333] underline decoration-[#075333]/30 underline-offset-2 hover:decoration-[#075333]"
                >
                  Meet the team
                </a>
              </div>

              {related.length > 0 && (
                <div className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
                  <h2 className="font-display text-[17px] text-[#012C18]">Keep reading</h2>
                  <ul className="mt-3 space-y-2.5">
                    {related.map((item) => (
                      <li key={item.id}>
                        <a
                          {...linkProps(`/stories/${item.id}`)}
                          className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-[#043A25]/5"
                        >
                          <img
                            src={item.image}
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                          <span className="min-w-0">
                            <span className="line-clamp-2 block text-[12.5px] font-semibold leading-snug text-[#012C18] group-hover:text-[#075333]">
                              {item.title}
                            </span>
                            <span className="block text-[11px] text-[#8A9189]">
                              {item.readingTime}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>

          {linkedTrips.length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-[24px] leading-tight text-[#012C18] sm:text-[28px]">
                Trips mentioned in this story
              </h2>
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {linkedTrips.map((item) => (
                  <li key={item.key} className="h-full">
                    <TripCard href={item.href} ctaLabel={item.ctaLabel} trip={item.trip} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-[24px] leading-tight text-[#012C18] sm:text-[28px]">
                Related stories
              </h2>
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <li key={item.id} className="h-full">
                    <StoryCard story={item} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      <CTABand
        title="Want to see it for yourself?"
        subtitle="Tell us roughly when you are free. We will come back with a route that fits, not a brochure."
        primaryLabel="Plan my trip"
        onPrimary={onPlanTrip}
      />

      <Newsletter />
      <Footer />

      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </div>
  );
}
