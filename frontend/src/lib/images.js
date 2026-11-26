/*
 * Responsive sources for remote photographs.
 *
 * THE PROBLEM THIS SOLVES
 *
 * Every image on the site was requested at one fixed width, chosen once in a
 * data file and used everywhere that record appears. The same 1200px file
 * backed a full-width hero and a 56px avatar, so a phone downloaded around
 * 190 KB to paint a thumbnail the size of a thumbnail. Measured across the
 * site, all 91 images on a 375px screen were at least twice the size they
 * were displayed at, and none carried a `srcset`.
 *
 * Unsplash resizes on demand through its `w` query parameter, so a srcset can
 * be derived from any existing URL without touching the data. The browser
 * then picks using the `sizes` hint, which is the one thing it cannot work
 * out for itself before layout.
 *
 * Non-Unsplash URLs pass through untouched and simply get no srcset, which is
 * the correct behaviour rather than a silent failure — local files are served
 * through components/common/Photo.jsx instead, which has real variants.
 */

/* Steps rather than a continuum: each distinct width is a separate file for
 * Unsplash to generate and a separate entry in every CDN cache along the way.
 * Five covers a 56px avatar through to a retina hero. */
const DEFAULT_WIDTHS = [320, 640, 960, 1280, 1920];

const isUnsplash = (url) => typeof url === 'string' && url.includes('images.unsplash.com');

/*
 * The four local masters, upgraded to their generated variants.
 *
 * They live in `public` as 6000px originals and are still referenced by the
 * occasional record — a seed written before the variants existed, or an
 * editor typing a path they remember into the admin dashboard. One of those
 * slipped through and the journeys listing was serving a 3.7 MB file into a
 * 341px card. Catching it here means any source of content gets the small
 * version, rather than each source having to remember.
 */
const LEGACY_MASTERS = /^\/(banner1|banner2|banner3|aboutus)\.(jpg|png)$/;

/* An already-generated variant. Matched as well as the master so that a
 * record pointing at, say, the 1024px file still gets the 320px one when it
 * is only ever shown in an 80px box — which is exactly what the story
 * thumbnails were doing after the data was repointed. */
const GENERATED = /^\/img\/(banner1|banner2|banner3|aboutus)-\d+\.(webp|jpg)$/;

const LOCAL_STEPS = [320, 640, 1024, 1600, 2048];

function localVariant(url, width) {
  if (typeof url !== 'string') return url;
  const match = LEGACY_MASTERS.exec(url) ?? GENERATED.exec(url);
  if (!match) return url;
  /* Nearest generated step at or above what is needed. */
  const step = LOCAL_STEPS.find((w) => w >= width) ?? LOCAL_STEPS.at(-1);
  return `/img/${match[1]}-${step}.webp`;
}

/* Returns the URL with its width parameter replaced. */
export function atWidth(url, width) {
  if (!isUnsplash(url)) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('w', String(width));
    /* `auto=format` lets Unsplash serve WebP or AVIF to browsers that accept
     * them, which is a larger saving than the resize on most photographs. */
    if (!parsed.searchParams.has('auto')) parsed.searchParams.set('auto', 'format');
    return parsed.toString();
  } catch {
    return url;
  }
}

/*
 * A srcset string, or undefined when the URL is not one we can resize.
 *
 * Undefined rather than an empty string on purpose: React omits the attribute
 * entirely, whereas `srcset=""` is invalid and some browsers treat it as a
 * broken candidate list and skip the image.
 */
export function srcSetFor(url, widths = DEFAULT_WIDTHS) {
  if (!isUnsplash(url)) return undefined;
  return widths.map((w) => `${atWidth(url, w)} ${w}w`).join(', ');
}

/*
 * Everything an <img> needs for one photograph.
 *
 *   const img = responsiveImage(trip.image, '(min-width: 1024px) 420px, 100vw');
 *   <img {...img} alt={trip.title} />
 *
 * `sizes` is required by the caller because it describes the layout, and
 * guessing it wrong is the only way to misuse this: too large and the saving
 * disappears, too small and the image looks soft.
 */
export function responsiveImage(url, sizes, { widths } = {}) {
  if (isUnsplash(url)) {
    return { src: atWidth(url, 1280), srcSet: srcSetFor(url, widths), sizes };
  }

  /* A local master gets the variant nearest the declared size. `sizes` is a
   * CSS expression rather than a number, so the width is read from it where
   * it is a plain pixel value and otherwise assumed to be full-bleed. */
  const declared = /^(\d+)px$/.exec(String(sizes ?? '').trim());
  /* Doubled, so a 2x screen still gets a sharp image. */
  const upgraded = localVariant(url, declared ? Number(declared[1]) * 2 : 1600);
  return { src: upgraded, srcSet: undefined, sizes: undefined };
}
