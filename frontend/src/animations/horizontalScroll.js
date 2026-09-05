import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const initHorizontalScroll = (containerRef, panelsRef) => {
  if (!containerRef || !panelsRef || typeof window === 'undefined') return;

  const totalWidth = panelsRef.scrollWidth - window.innerWidth;
  if (totalWidth <= 0) return;

  gsap.to(panelsRef, {
    x: () => -totalWidth,
    ease: 'none',
    scrollTrigger: {
      trigger: containerRef,
      start: 'top top',
      end: () => `+=${totalWidth}`,
      scrub: 1,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true
    }
  });
};
