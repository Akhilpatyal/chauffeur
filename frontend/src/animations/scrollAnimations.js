import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const initScrollReveal = (selector, options = {}) => {
  if (typeof window === 'undefined') return;
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;

  elements.forEach((el) => {
    gsap.fromTo(
      el,
      {
        opacity: 0,
        y: options.y || 40,
        scale: options.scale || 1
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: options.duration || 0.9,
        delay: options.delay || 0,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: options.start || 'top 85%',
          toggleActions: 'play none none none',
          once: true,
          ...options.scrollTrigger
        }
      }
    );
  });
};

export const animateCounter = (element, targetValue, duration = 2) => {
  if (!element) return;
  const obj = { value: 0 };
  gsap.to(obj, {
    value: targetValue,
    duration: duration,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      once: true
    },
    onUpdate: () => {
      if (Number.isInteger(targetValue)) {
        element.innerText = Math.floor(obj.value).toLocaleString('en-IN');
      } else {
        element.innerText = obj.value.toFixed(1);
      }
    }
  });
};
