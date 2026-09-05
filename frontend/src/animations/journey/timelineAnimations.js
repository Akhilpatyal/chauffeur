import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from './motion';

/*
 * Day-by-day itinerary.
 *
 * - the vertical rail draws downward, scrubbed to scroll position
 * - each card fades/lifts in once, its text staggering behind it
 * - each card's photograph drifts for depth
 * - crossing a card reports the active day upward, which is what drives both
 *   the marker state and the route map (see routeAnimations.js)
 *
 * `onActiveDay` must be referentially stable (useCallback) - it is read once
 * when the ScrollTriggers are created.
 */
export function useTimelineAnimation(scope, { onActiveDay }) {
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const cards = gsap.utils.toArray('[data-day-card]');
      if (!cards.length) return;

      if (!reduced) {
        gsap.fromTo(
          '[data-timeline-progress]',
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            transformOrigin: 'top center',
            scrollTrigger: {
              trigger: '[data-timeline-track]',
              start: 'top 65%',
              end: 'bottom 70%',
              scrub: 0.6,
            },
          }
        );
      }

      cards.forEach((card) => {
        const day = Number(card.dataset.dayCard);

        if (!reduced) {
          gsap.fromTo(
            card,
            { opacity: 0, y: 50 },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              ease: 'power3.out',
              scrollTrigger: { trigger: card, start: 'top 86%', once: true },
            }
          );

          const text = card.querySelectorAll('[data-day-text]');
          if (text.length) {
            gsap.fromTo(
              text,
              { opacity: 0, y: 18 },
              {
                opacity: 1,
                y: 0,
                duration: 0.6,
                stagger: 0.08,
                ease: 'power2.out',
                scrollTrigger: { trigger: card, start: 'top 82%', once: true },
              }
            );
          }

          const image = card.querySelector('[data-day-image]');
          if (image) {
            gsap.fromTo(
              image,
              { yPercent: -5 },
              {
                yPercent: 5,
                ease: 'none',
                scrollTrigger: {
                  trigger: card,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: true,
                },
              }
            );
          }
        }

        /* Active-day reporting runs with or without motion preferences */
        ScrollTrigger.create({
          trigger: card,
          start: 'top 62%',
          end: 'bottom 58%',
          onEnter: () => onActiveDay(day),
          onEnterBack: () => onActiveDay(day),
        });
      });
    },
    { scope }
  );
}

export default useTimelineAnimation;
