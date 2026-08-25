import gsap from 'gsap';

export const animateHeroEntrance = ({
  bgRef,
  eyebrowRef,
  titleRef,
  descRef,
  ctaRef,
  searchRef,
  coordsRef
}) => {
  if (typeof window === 'undefined') return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (bgRef) {
    gsap.fromTo(
      bgRef,
      { scale: 1.15, opacity: 0.7 },
      { scale: 1.0, opacity: 1, duration: 2.2, ease: 'power2.out' }
    );
  }

  if (eyebrowRef) {
    tl.fromTo(
      eyebrowRef,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7 },
      0.3
    );
  }

  if (titleRef) {
    tl.fromTo(
      titleRef,
      { opacity: 0, y: 35 },
      { opacity: 1, y: 0, duration: 1.0 },
      0.5
    );
  }

  if (descRef) {
    tl.fromTo(
      descRef,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      0.7
    );
  }

  if (ctaRef) {
    tl.fromTo(
      ctaRef,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8 },
      0.9
    );
  }

  if (searchRef) {
    tl.fromTo(
      searchRef,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9 },
      1.1
    );
  }

  if (coordsRef) {
    tl.fromTo(
      coordsRef,
      { opacity: 0 },
      { opacity: 1, duration: 0.8 },
      1.3
    );
  }

  return tl;
};
