import gsap from 'gsap';

export const crossfadeFeaturedImage = (imageEl, newSrc, onSwap) => {
  if (!imageEl) return;

  gsap.to(imageEl, {
    opacity: 0.2,
    scale: 0.98,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      if (onSwap) onSwap();
      imageEl.src = newSrc;
      gsap.to(imageEl, {
        opacity: 1,
        scale: 1,
        duration: 0.45,
        ease: 'power3.out'
      });
    }
  });
};
