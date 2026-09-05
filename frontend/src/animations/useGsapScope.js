import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/*
 * Scopes a GSAP setup function to one section and reverts everything it created
 * (tweens, ScrollTriggers, inline styles) when the section unmounts.
 * Animations are skipped entirely when the visitor prefers reduced motion, so
 * content must be styled visible by default.
 */
export function useGsapScope(setup, deps = []) {
  const scope = useRef(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = gsap.context(setup, scope);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scope;
}

export default useGsapScope;
