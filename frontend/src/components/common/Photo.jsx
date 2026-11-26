import React from 'react';

/*
 * One of the site's own photographs, served at a size that suits the box.
 *
 * WHY THIS EXISTS
 *
 * The four hero photographs are 6000px masters of up to 4.9 MB, and the same
 * file was used for a full-bleed hero and for an 80px journal thumbnail. On a
 * phone that meant downloading 4.9 MB to paint 80 pixels. Every image on the
 * site was at least twice the size it was displayed at, and none carried a
 * `srcset`, so a 375px phone and a 1440px desktop were served identically.
 *
 * The variants in `public/img` are generated from the masters, which stay
 * where they are untouched. Widths step from a thumbnail to a retina hero, and
 * the browser picks using `sizes` — so the caller's one job is to describe how
 * wide the image will actually be, which is the one thing a component cannot
 * work out for itself.
 *
 * WebP with a JPEG fallback. Every browser this site supports reads WebP, but
 * a missing hero is an unpleasant way to find the exception.
 */
const WIDTHS = [320, 640, 1024, 1600, 2048];

export default function Photo({
  /* File stem in public/img — 'banner1', 'aboutus', and so on. */
  name,
  alt = '',
  /* How wide the image renders, in CSS terms. Getting this wrong is the only
   * way to misuse this component: too large and the saving is lost, too small
   * and it looks soft. Default assumes full-bleed. */
  sizes = '100vw',
  className = '',
  /* True only for an image in the first screenful. It turns off lazy loading
   * and raises fetch priority, which is right for a hero and wasteful for
   * anything else. */
  priority = false,
  ...rest
}) {
  const webp = WIDTHS.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');

  return (
    /* `display: contents` so the wrapper leaves no box of its own. Several
     * callers position the image with `absolute inset-0` against a section,
     * and a static <picture> in between would both break that intent and add
     * an empty inline line box to the flow. */
    <picture className="contents">
      <source type="image/webp" srcSet={webp} sizes={sizes} />
      <img
        src={`/img/${name}-1600.jpg`}
        alt={alt}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        /* `async` lets the browser paint surrounding text without waiting to
         * decode a large photograph. */
        decoding={priority ? 'auto' : 'async'}
        fetchPriority={priority ? 'high' : undefined}
        className={className}
        {...rest}
      />
    </picture>
  );
}
