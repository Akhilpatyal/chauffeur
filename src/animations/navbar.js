import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const initNavbarScroll = (navbarEl) => {
  if (!navbarEl || typeof window === 'undefined') return;

  ScrollTrigger.create({
    start: 'top -50',
    onUpdate: (self) => {
      if (self.direction === 1 && self.progress > 0.05) {
        navbarEl.classList.add('is-scrolled');
      } else if (self.progress <= 0.05) {
        navbarEl.classList.remove('is-scrolled');
      }
    }
  });
};
