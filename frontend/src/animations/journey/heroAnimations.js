import { gsap, useGSAP, prefersReducedMotion } from './motion';

/*
 * Hero entrance: slow media zoom, staggered copy, booking card sliding in from
 * the right and then breathing. Everything is authored inside a scoped GSAP
 * context, so useGSAP reverts it (tweens, ScrollTriggers, inline styles) on unmount.
 */
export function useHeroAnimation(scope) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        /* Static layout is already the correct final state - nothing to do */
        return;
      }

      gsap.set('[data-hero-line]', { opacity: 0, y: 26 });
      gsap.set('[data-hero-word]', { opacity: 0, yPercent: 110 });
      gsap.set('[data-hero-meta]', { opacity: 0, y: 14 });
      gsap.set('[data-hero-card]', { opacity: 0, xPercent: 8 });
      gsap.set('[data-hero-media]', { scale: 1.14 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.to('[data-hero-media]', { scale: 1, duration: 2.6, ease: 'power2.out' }, 0)
        .to('[data-hero-line]', { opacity: 1, y: 0, duration: 0.9, stagger: 0.14 }, 0.25)
        .to(
          '[data-hero-word]',
          { opacity: 1, yPercent: 0, duration: 1, stagger: 0.09, ease: 'power4.out' },
          0.45
        )
        .to('[data-hero-meta]', { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }, 1.05)
        .to('[data-hero-card]', { opacity: 1, xPercent: 0, duration: 1 }, 0.75)
        .to(
          '[data-hero-card]',
          { y: -10, duration: 3.2, ease: 'sine.inOut', repeat: -1, yoyo: true },
          2
        );

      /* Backdrop drifts as the hero scrolls away */
      gsap.to('[data-hero-media]', {
        yPercent: 14,
        ease: 'none',
        scrollTrigger: {
          trigger: scope.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    },
    { scope }
  );
}

export default useHeroAnimation;
