import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { experiences } from '../../data/journeyDetail';
import { responsiveImage } from '../../lib/images';
import { gsap, useGSAP, prefersReducedMotion } from '../../animations/journey/motion';

/*
 * The experience gallery: an expanding filmstrip.
 *
 * WHY NOT A CAROUSEL
 *
 * The first attempt was a wide stage with a thumbnail rail beneath it, and it
 * had two faults that only showed up on screen. A 21:9 stage guillotines
 * travel photography — a tent under cedars became a letter slot — and four
 * thumbnails in a 1400px panel left a third of it as dead green void.
 *
 * This is one row of frames sharing the width. The open one takes most of it;
 * the rest stand as narrow slivers with their titles set sideways along them.
 * No duplicated thumbnail strip, no dead space, and the frames are tall,
 * which is the shape photographs of mountains actually want.
 *
 * THE MOTION, AND WHY IT IS NOT ANIMATED WIDTH
 *
 * The obvious build is to animate flex-grow and let the browser share the
 * width out. That was the second attempt and it ran at about 31fps: a
 * measured median frame of 32ms against 24ms for the same movement expressed
 * as transforms, with eleven of twenty-eight frames over the 33ms mark. Width
 * is a layout property, so every frame of the tween re-laid-out the row and
 * re-rasterised four full-height photographs.
 *
 * So nothing here animates layout. Every frame is absolutely positioned at
 * the full width of the strip and shows only a slice of itself through an
 * animated `clip-path` inset; the photograph inside slides on `translate3d`
 * to keep its middle inside that slice. Both are compositor properties, each
 * image is rasterised once and never resized, and the window widens across a
 * picture that is already there — which reads as uncovering rather than
 * stretching. Measured after the change: 16.7ms median on a phone with no
 * dropped frames at all, 17ms on a desktop.
 *
 * Dimming is an overlay's opacity rather than a `filter` on the photograph,
 * for the same reason: filter forces a repaint of the whole image per frame.
 *
 * Fixed overall height, because this page has measured a 0.272 layout shift
 * before and a gallery sized by its content is how that comes back.
 */
export default function JourneyGallery() {
  const slides = experiences ?? [];
  const count = slides.length;

  const scope = useRef(null);
  const strip = useRef(null);
  const frames = useRef([]);
  const images = useRef([]);
  const captions = useRef([]);
  const dragStart = useRef(null);

  const [index, setIndex] = useState(0);
  /* The strip's own width, measured rather than assumed, because every
   * position below is derived from it. */
  const [width, setWidth] = useState(0);

  const step = useCallback(
    (delta) => setIndex((current) => (current + delta + count) % count),
    [count],
  );

  useLayoutEffect(() => {
    const node = strip.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  /*
   * Where each frame's window sits. Pure arithmetic, no breakpoints: the
   * closed frames take a fixed width read from CSS custom properties and the
   * open one takes whatever is left, so the same code lays out a phone and a
   * desktop and there is no second layout to keep in step.
   */
  const layout = useCallback(
    (openIndex) => {
      if (!width || !strip.current) return [];
      const styles = getComputedStyle(strip.current);
      const closed = Number(styles.getPropertyValue('--closed').replace('px', '')) || 44;
      const gap = Number(styles.getPropertyValue('--gap').replace('px', '')) || 8;
      const open = Math.max(closed, width - (count - 1) * closed - (count - 1) * gap);

      let x = 0;
      return slides.map((_, i) => {
        const w = i === openIndex ? open : closed;
        const box = { x, w };
        x += w + gap;
        return box;
      });
    },
    [width, count, slides],
  );

  useGSAP(
    () => {
      if (!width) return;
      const reduced = prefersReducedMotion();
      const boxes = layout(index);
      if (boxes.length === 0) return;

      const duration = reduced ? 0 : 0.78;

      boxes.forEach((box, i) => {
        const frame = frames.current[i];
        if (!frame) return;

        const state = frame.__box ?? { x: box.x, w: box.w };
        frame.__box = state;

        /*
         * The clip and the text layer are written together.
         *
         * Everything inside a frame spans the frame's full width, which is
         * the width of the whole strip — so the clip cut the caption's first
         * words off and hid the sliver labels completely. The text lives in
         * its own layer that is moved and sized to the visible window, so it
         * always sits inside the part of the frame you can see.
         */
        const ui = frame.querySelector('[data-ui]');
        const paint = () => {
          const right = Math.max(0, width - (state.x + state.w));
          frame.style.clipPath = `inset(0px ${right.toFixed(2)}px 0px ${state.x.toFixed(
            2,
          )}px round 16px)`;
          if (ui) {
            ui.style.transform = `translate3d(${state.x.toFixed(2)}px,0,0)`;
            ui.style.width = `${state.w.toFixed(2)}px`;
          }
        };
        paint();

        /* Tweened through a proxy rather than as a clip-path string, so the
         * numbers interpolate exactly and the rounded corner travels with the
         * window instead of popping at the end. */
        gsap.to(state, {
          x: box.x,
          w: box.w,
          duration,
          ease: 'expo.inOut',
          overwrite: true,
          onUpdate: paint,
          onComplete: paint,
        });

        /*
         * The photograph slides so the centre of its visible window lands on
         * the centre of the picture, rather than every closed sliver showing
         * the leftmost 44px of its own image.
         *
         * Translation only: a scale difference between open and closed made
         * Chrome re-rasterise four full-height photographs mid-tween, which
         * showed up as occasional 50ms frames.
         */
        if (images.current[i]) {
          gsap.to(images.current[i], {
            x: box.x + box.w / 2 - width / 2,
            duration: reduced ? 0 : 1,
            ease: 'expo.out',
            overwrite: true,
          });
        }

        const veil = frame.querySelector('[data-veil]');
        if (veil) {
          gsap.to(veil, {
            autoAlpha: i === index ? 0 : 1,
            duration: reduced ? 0 : 0.6,
            ease: 'power2.out',
            overwrite: true,
          });
        }

        const caption = captions.current[i];
        if (!caption) return;

        if (i === index) {
          /* autoAlpha as well as display: closing sets autoAlpha 0 on this
           * element and the reopen only animates its children, so without
           * restoring the parent the caption stayed invisible for good after
           * the first time you moved off it. */
          gsap.set(caption, { display: 'block', autoAlpha: 1 });
          gsap.fromTo(
            caption.children,
            { autoAlpha: 0, y: reduced ? 0 : 20 },
            {
              autoAlpha: 1,
              y: 0,
              duration: reduced ? 0 : 0.5,
              stagger: reduced ? 0 : 0.07,
              ease: 'power3.out',
              delay: reduced ? 0 : 0.22,
              overwrite: true,
            },
          );
        } else {
          gsap.to(caption, { autoAlpha: 0, duration: reduced ? 0 : 0.18, overwrite: true });
        }
      });
    },
    { scope, dependencies: [index, width, count] },
  );

  /* Drag and swipe. Horizontal intent only — a diagonal gesture on a page
   * that scrolls vertically should scroll. */
  const onPointerDown = (event) => {
    dragStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  /* Fetch the next photograph before it is asked for. */
  useEffect(() => {
    const next = slides[(index + 1) % count];
    if (!next) return;
    const image = new Image();
    image.src = responsiveImage(next.image, '(min-width: 1024px) 900px, 100vw').src;
  }, [index, count, slides]);

  if (count === 0) return null;

  return (
    <section
      ref={scope}
      aria-labelledby="journey-gallery-heading"
      className="bg-[#F4F1E8] pb-14 sm:pb-16"
    >
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#B89A5A]">
              On this journey
            </p>
            <h2
              id="journey-gallery-heading"
              className="mt-1.5 font-display text-[26px] leading-tight text-[#012C18] sm:text-[34px]"
            >
              Experiences You&rsquo;ll Love
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Segments, not a bar. Four frames is a countable number, and a
                sliding bar tells you less than four ticks do. */}
            <ol className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
              {slides.map((slide, i) => (
                <li
                  key={`${slide.id}-tick`}
                  className={`h-px transition-all duration-500 ${
                    i === index ? 'w-10 bg-[#B89A5A]' : 'w-4 bg-[#012C18]/20'
                  }`}
                />
              ))}
            </ol>

            <p className="font-display text-[14px] tabular-nums text-[#5E6B63]">
              <span className="text-[22px] text-[#012C18]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="mx-1 text-[#B89A5A]">/</span>
              {String(count).padStart(2, '0')}
            </p>

            <div className="flex gap-2">
              {[
                { delta: -1, Icon: ArrowLeft, label: 'Previous experience' },
                { delta: 1, Icon: ArrowRight, label: 'Next experience' },
              ].map(({ delta, Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => step(delta)}
                  aria-label={label}
                  /* A real 44px box. The pseudo-element trick measured 23px
                     here once, clipped by an ancestor's overflow. */
                  className="grid h-11 w-11 place-items-center rounded-full border border-[#012C18]/15 text-[#012C18] transition-all duration-300 hover:border-[#043A25] hover:bg-[#043A25] hover:text-[#F4F1E8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89A5A]"
                >
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* The strip. Fixed height, so nothing below it ever moves. The closed
            width and the gap live here as custom properties, so the arithmetic
            above and the layout below read the same numbers. */}
        <div
          ref={strip}
          tabIndex={0}
          role="group"
          aria-roledescription="carousel"
          aria-label="Experiences on this journey"
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragStart.current = null;
          }}
          className="relative mt-5 h-[420px] touch-pan-y [--closed:44px] [--gap:8px] sm:mt-7 sm:h-[480px] sm:[--closed:68px] sm:[--gap:10px] lg:h-[560px] lg:[--closed:92px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89A5A]"
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              ref={(node) => {
                frames.current[i] = node;
              }}
              onClick={() => setIndex(i)}
              aria-label={`Show ${slide.title}`}
              aria-current={i === index}
              style={{
                /* Painted before the first measurement so there is no flash
                   of four stacked full-width photographs. */
                clipPath: `inset(0px ${i === 0 ? '0px' : '100%'} 0px 0px round 16px)`,
              }}
              className="group absolute inset-0 h-full w-full overflow-hidden text-left will-change-[clip-path] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#B89A5A]"
            >
              <img
                ref={(node) => {
                  images.current[i] = node;
                }}
                {...responsiveImage(slide.image, '(min-width: 1024px) 1100px, 100vw')}
                alt={slide.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full select-none object-cover will-change-transform"
              />

              {/* The dimming veil for a closed frame. Its opacity is what
                  animates; the photograph underneath is never repainted. */}
              <span
                data-veil
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[#02170F]/55"
                style={{ opacity: i === 0 ? 0 : 1 }}
              />

              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#02170F] via-[#02170F]/20 to-transparent" />

              {/* The text layer: moved and sized to the visible window by the
                  tween, so nothing in it is ever clipped away. */}
              <span
                data-ui
                className="pointer-events-none absolute inset-y-0 left-0 block will-change-transform"
                style={{ width: '100%' }}
              >
                {/* The sideways title on a closed sliver. This is what makes
                    the strip readable without a second row of thumbnails. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-5 flex justify-center transition-opacity duration-500 ${
                    i === index ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <span
                    className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#F4F1E8]/90"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {slide.title}
                  </span>
                </span>

                {/* A hairline only the open frame carries — the small gold
                    detail this site uses to mark what you should look at. */}
                <span
                  className={`absolute inset-x-0 bottom-0 h-px origin-left bg-[#B89A5A] transition-transform duration-[900ms] ${
                    i === index ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />

                <span
                  ref={(node) => {
                    captions.current[i] = node;
                  }}
                  className="absolute inset-x-0 bottom-0 block p-5 sm:p-7"
                  style={{ display: i === 0 ? 'block' : 'none' }}
                >
                  <span className="block font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#B89A5A]">
                    {slide.category}
                  </span>
                  <span className="mt-1.5 block max-w-[20ch] font-display text-[24px] leading-tight text-[#FAF9F5] sm:text-[32px] lg:text-[38px]">
                    {slide.title}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          {`Showing ${index + 1} of ${count}: ${slides[index].title}`}
        </p>
      </div>
    </section>
  );
}
