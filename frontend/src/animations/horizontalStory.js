import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const initHorizontalStory = (containerRef, trackRef, onIndexChange) => {
  if (!containerRef || !trackRef || typeof window === 'undefined') return;

  // On mobile, keep standard smooth touch flow
  if (window.innerWidth < 1024) return;

  const totalScroll = trackRef.scrollWidth - window.innerWidth;
  if (totalScroll <= 0) return;

  const ctx = gsap.context(() => {
    gsap.to(trackRef, {
      x: () => -totalScroll,
      ease: 'none',
      scrollTrigger: {
        trigger: containerRef,
        start: 'top top',
        end: () => `+=${totalScroll * 1.2}`,
        scrub: 0.8,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (onIndexChange) {
            const index = Math.min(4, Math.floor(self.progress * 5));
            onIndexChange(index);
          }
        }
      }
    });
  }, containerRef);

  return () => ctx.revert();
};
