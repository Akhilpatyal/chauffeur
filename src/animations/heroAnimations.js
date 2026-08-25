import gsap from 'gsap';

export const initHeroTimeline = ({
  eyebrowRef,
  titleRef,
  descRef,
  ctaRef,
  searchRef,
  bgRef
}) => {
  if (typeof window === 'undefined') return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Ken Burns subtle zoom on hero background
  if (bgRef) {
    gsap.fromTo(
      bgRef,
      { scale: 1.12, opacity: 0.6 },
      { scale: 1.0, opacity: 1, duration: 2.2, ease: 'power2.out' }
    );
  }

  if (eyebrowRef) {
    tl.fromTo(
      eyebrowRef,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      0.2
    );
  }

  if (titleRef) {
    tl.fromTo(
      titleRef,
      { opacity: 0, y: 35 },
      { opacity: 1, y: 0, duration: 1.0 },
      0.4
    );
  }

  if (descRef) {
    tl.fromTo(
      descRef,
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.8 },
      0.6
    );
  }

  if (ctaRef) {
    tl.fromTo(
      ctaRef,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      0.8
    );
  }

  if (searchRef) {
    tl.fromTo(
      searchRef,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9 },
      1.0
    );
  }

  return tl;
};
