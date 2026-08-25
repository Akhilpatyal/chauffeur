import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const revealSectionHeader = (headerEl) => {
  if (!headerEl || typeof window === 'undefined') return;

  const eyebrow = headerEl.querySelector('.section-eyebrow');
  const title = headerEl.querySelector('.section-title');
  const subtitle = headerEl.querySelector('.section-subtitle');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: headerEl,
      start: 'top 85%',
      once: true
    }
  });

  if (eyebrow) {
    tl.fromTo(
      eyebrow,
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
    );
  }

  if (title) {
    tl.fromTo(
      title,
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
      '-=0.4'
    );
  }

  if (subtitle) {
    tl.fromTo(
      subtitle,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      '-=0.5'
    );
  }
};

export const revealImageClip = (imageEl, direction = 'bottom') => {
  if (!imageEl || typeof window === 'undefined') return;

  const clipStarts = {
    bottom: 'inset(100% 0% 0% 0%)',
    left: 'inset(0% 100% 0% 0%)',
    center: 'inset(20% 20% 20% 20%)'
  };

  gsap.fromTo(
    imageEl,
    { clipPath: clipStarts[direction] || clipStarts.bottom, scale: 1.08 },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      scale: 1,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: imageEl,
        start: 'top 80%',
        once: true
      }
    }
  );
};
