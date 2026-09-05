import gsap from 'gsap';

export const runPageIntro = (onComplete) => {
  if (typeof window === 'undefined') {
    if (onComplete) onComplete();
    return;
  }

  // Check if intro was already seen in session
  const introSeen = sessionStorage.getItem('taifer_intro_seen');
  if (introSeen) {
    if (onComplete) onComplete();
    return;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      sessionStorage.setItem('taifer_intro_seen', 'true');
      if (onComplete) onComplete();
    }
  });

  const introEl = document.querySelector('#taifer-preloader');
  const logoEl = document.querySelector('#taifer-intro-logo');
  const tagEl = document.querySelector('#taifer-intro-tag');

  if (!introEl || !logoEl) {
    if (onComplete) onComplete();
    return;
  }

  tl.set(introEl, { display: 'flex', opacity: 1 })
    .fromTo(
      logoEl,
      { opacity: 0, scale: 0.9, y: 15 },
      { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'power3.out' },
      0.1
    )
    .fromTo(
      tagEl,
      { opacity: 0, letterSpacing: '0.1em' },
      { opacity: 1, letterSpacing: '0.3em', duration: 0.6, ease: 'power2.out' },
      0.4
    )
    .to(
      [logoEl, tagEl],
      { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' },
      1.1
    )
    .to(
      introEl,
      {
        yPercent: -100,
        duration: 0.7,
        ease: 'power4.inOut'
      },
      1.3
    );

  return tl;
};
