import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export const animateExpeditionCounters = (containerEl) => {
  if (!containerEl || typeof window === 'undefined') return;

  const counterEls = containerEl.querySelectorAll('[data-counter-target]');
  if (!counterEls.length) return;

  counterEls.forEach((el) => {
    const target = parseFloat(el.getAttribute('data-counter-target') || '0');
    const isDecimal = !Number.isInteger(target);
    const obj = { val: 0 };

    gsap.to(obj, {
      val: target,
      duration: 2.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true
      },
      onUpdate: () => {
        if (isDecimal) {
          el.innerText = obj.val.toFixed(1);
        } else {
          el.innerText = Math.floor(obj.val).toLocaleString('en-IN');
        }
      }
    });
  });
};
