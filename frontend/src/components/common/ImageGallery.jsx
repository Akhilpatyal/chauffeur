import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

/*
 * Gallery grid with a lightbox.
 *
 * Deliberately dependency-free: the project already ships GSAP and Lenis, and a
 * lightbox is a focus trap plus two key handlers, which is not worth another
 * package in the bundle.
 *
 * Keyboard support is the point — arrow keys move between images and Escape
 * closes, matching the drawer behaviour elsewhere in the app.
 */
export default function ImageGallery({ images = [], alt = '' }) {
  const [openIndex, setOpenIndex] = useState(null);
  const isOpen = openIndex !== null;

  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') setOpenIndex(null);
      if (event.key === 'ArrowRight') setOpenIndex((i) => (i + 1) % images.length);
      if (event.key === 'ArrowLeft') setOpenIndex((i) => (i - 1 + images.length) % images.length);
    };

    window.addEventListener('keydown', onKey);
    /* Stop the page scrolling behind the lightbox. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((src, index) => (
          <li key={src} className={index === 0 ? 'col-span-2' : ''}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              aria-label={`Open image ${index + 1} of ${images.length}`}
              className="group block w-full overflow-hidden rounded-xl border border-[#E3DDCB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]"
            >
              <img
                src={src}
                alt={`${alt} — image ${index + 1}`}
                loading="lazy"
                className={`w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.05] ${
                  index === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={(event) => event.target === event.currentTarget && setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Close image viewer"
            autoFocus
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>

          <figure className="max-h-full">
            <img
              src={images[openIndex]}
              alt={`${alt} — image ${openIndex + 1}`}
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
            <figcaption className="mt-3 text-center font-mono text-[11px] text-white/70">
              {openIndex + 1} / {images.length}
              <span className="ml-3 hidden sm:inline">Use the arrow keys to browse, Esc to close</span>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
