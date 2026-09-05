import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import { videoPreview } from '../../data/journeyDetail';
import { gsap, prefersReducedMotion } from '../../animations/journey/motion';

export default function JourneyVideo() {
  const [open, setOpen] = useState(false);
  const modalRef = useRef(null);
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    if (prefersReducedMotion() || !panelRef.current) {
      setOpen(false);
      return;
    }
    gsap.to(panelRef.current, {
      opacity: 0,
      scale: 0.96,
      y: 12,
      duration: 0.28,
      ease: 'power2.in',
    });
    gsap.to(backdropRef.current, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => setOpen(false),
    });
  }, []);

  /* Open: lock scroll, animate in, wire Escape, and restore focus on close */
  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35 });
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, scale: 0.94, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'power3.out' }
      );
    }, modalRef);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      ctx.revert();
    };
  }, [open, close]);

  return (
    <div data-reveal className="h-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${videoPreview.title} — opens a video dialog`}
          className="group relative block h-[240px] w-full overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#043A25] sm:h-[300px] lg:h-full lg:min-h-[300px]"
        >
          <img
            src={videoPreview.poster}
            alt="Himalayan peaks at sunset from the Manali Explorer route"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/85 via-[#02170F]/25 to-[#02170F]/35 transition-colors duration-500 group-hover:from-[#02170F]/90" />

          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/45 bg-white/15 backdrop-blur-sm transition-all duration-500 group-hover:scale-110 group-hover:border-[#B89A5A] group-hover:bg-[#B89A5A]">
              <span className="absolute inset-0 rounded-full border border-white/30 transition-transform duration-[1200ms] group-hover:scale-125 group-hover:opacity-0" />
              <Play className="h-5 w-5 fill-current text-white transition-colors duration-500 group-hover:text-[#012C18]" />
            </span>

            <span className="block text-center text-[13px] font-medium text-[#FAF9F5] sm:text-[14px]">
              {videoPreview.title}
            </span>
          </span>
        </button>

      {/* Modal */}
      {open && (
        <div ref={modalRef} className="fixed inset-0 z-[70]">
          <div
            ref={backdropRef}
            onClick={close}
            role="presentation"
            className="absolute inset-0 bg-[#02170F]/85 backdrop-blur-sm"
          />

          <div className="relative flex h-full items-center justify-center p-4">
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label={videoPreview.title}
              className="relative w-full max-w-[960px] overflow-hidden rounded-2xl bg-[#02170F] shadow-2xl"
            >
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close video"
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF9F5] text-[#012C18] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89A5A]"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="aspect-video w-full">
                {videoPreview.src ? (
                  <video
                    src={videoPreview.src}
                    poster={videoPreview.poster}
                    controls
                    autoPlay
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="relative h-full w-full">
                    <img
                      src={videoPreview.poster}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover opacity-70"
                    />
                    <p className="absolute inset-0 flex items-center justify-center px-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#F4F1E8]">
                      Film coming soon — add a URL to
                      <br />
                      videoPreview.src to play it here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
