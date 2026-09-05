import { gsap, useGSAP, prefersReducedMotion } from './motion';

/*
 * Generic section reveal. Any element inside the scope marked with
 * `data-reveal` fades and lifts into place once, in DOM order.
 * One ScrollTrigger per group rather than one per element.
 */
export function useScrollReveal(scope, { selector = '[data-reveal]', start = 'top 84%', stagger = 0.09, y = 26 } = {}) {
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const targets = gsap.utils.toArray(selector);
      if (!targets.length) return;

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger,
          ease: 'power3.out',
          scrollTrigger: { trigger: scope.current, start, once: true },
        }
      );
    },
    { scope }
  );
}

export default useScrollReveal;
