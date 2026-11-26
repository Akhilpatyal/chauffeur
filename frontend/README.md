# Taifer — site

The public site: journeys, weekend escapes, destinations, hotels, stories and
the enquiry forms. React 19 + Vite + Tailwind 4, deployed as static files.

```bash
npm install
npm run dev      # http://localhost:5173, proxies /api to localhost:4000
npm run build    # -> dist
```

The backend is optional in development. Every page renders from bundled data
when the API is unreachable — see **Content** below.

---

## Contents

- [How routing works](#how-routing-works)
- [Content](#content)
- [Images](#images)
- [Typography](#typography)
- [Touch targets](#touch-targets)
- [Claims about the business](#claims-about-the-business)
- [Checking your work](#checking-your-work)

---

## How routing works

`src/router.js` is a small history router — no react-router. Paths are real
(`/hotels`, not `/#hotels`), because hash URLs are a single page to a search
engine and only the homepage could ever be indexed. `vercel.json` rewrites
unknown paths to `index.html` so deep links work; Vite's dev server does the
same.

`resolveRoute` maps a pathname to `{ page, param }`. Collections follow one
convention: no second segment is the listing, a second segment is the detail
page for that slug. Anything unrecognised resolves to `notFound` and renders a
real 404 rather than silently showing the homepage.

Use `linkProps(path)` for internal links. It returns a real `href` a crawler
can follow plus a click handler that routes without a full page load, and it
leaves modified clicks alone so middle-click and ctrl-click still open a tab.

---

## Content

`src/lib/content.js` renders bundled data first and upgrades to the API.

```js
const { items, source } = useContent('journeys', bundledJourneys, normaliseJourney);
```

The important detail is **when** it upgrades. It used to swap the live data in
as soon as the fetch resolved, about a second after paint. The bundled copy and
the API's are not the same length — five journeys against six — so the swap
reflowed the grid under whoever was reading it. The measured layout shift on
`/journeys` was 0.272, where 0.25 is the threshold for "poor", and it landed at
exactly the moment someone reaches for a card.

So the fetch still happens on mount, but the result is only *displayed* from
the next mount onwards. `warmContentCache()` runs at app start during idle
time, so the cache is usually filled before a visitor reaches a listing page at
all. Someone landing directly on a listing URL sees the deployed copy for that
one view and live content from their next navigation.

**If you change this, measure CLS before and after.** The temptation to "just
swap it in" is exactly how the shift got there.

---

## Images

This is the easiest thing on the site to get wrong, and it was wrong
everywhere: all 91 images were at least twice their displayed size, none had a
`srcset`, and one 4.9 MB photograph was being downloaded to paint an 80px
thumbnail.

**Remote photographs** (Unsplash) go through `src/lib/images.js`:

```jsx
import { responsiveImage } from '../../lib/images';

<img
  {...responsiveImage(trip.image, '(min-width: 1024px) 420px, 100vw')}
  alt={trip.title}
  loading="lazy"
  decoding="async"
/>
```

It derives a `srcset` by rewriting Unsplash's `w` parameter, so it works on any
existing URL without touching the data. The second argument describes how wide
the image actually renders — that is the one thing the browser cannot work out
before layout, and the only way to misuse this: too large and the saving
disappears, too small and the image looks soft.

**The site's own photographs** go through `src/components/common/Photo.jsx`:

```jsx
<Photo name="banner1" alt="" sizes="100vw" priority />
```

`public/img/` holds WebP variants at 320/640/1024/1600/2048 plus a 1600px JPEG
fallback, generated from the 6000px masters that remain in `public/`. Pass
`priority` only for an image in the first screenful — it disables lazy loading
and raises fetch priority, which is right for a hero and wasteful for anything
else.

`responsiveImage` also recognises a bare `/banner1.jpg` and swaps in the right
variant, so a record written before the variants existed — or typed into the
admin dashboard from memory — still gets the small file.

### Regenerating the variants

The masters stay in `public/` as the source of truth. To rebuild after adding
or replacing one, resize with LANCZOS to the widths above at WebP quality 80.
A cheaper filter leaves visible aliasing on ridgelines, which is the entire
subject matter of these photographs.

> The masters total 13.6 MB and are no longer referenced by any component.
> They are still shipped because they sit in `public/`. Moving them somewhere
> unserved would cut that from the deploy — left as a deliberate decision for
> whoever owns the originals.

---

## Typography

Five families, loaded in one request from `index.html`. Do not add an
`@import` to `index.css` — there used to be one, and because a CSS `@import`
cannot start until the stylesheet itself has parsed, the fonts queued behind it
and the page sat in fallback type for noticeably longer. The two loaders also
disagreed: Manrope arrived and was never used, while JetBrains Mono, Caveat and
Oswald could not start downloading until late.

| Family | Used for |
|---|---|
| Plus Jakarta Sans | body and UI |
| DM Serif Display | headings (`font-display`) |
| Instrument Serif | editorial accents (`font-editorial`) |
| JetBrains Mono | coordinates, labels, departure tables |
| Caveat, Oswald | the homepage hero wordmark, nowhere else |

### The small-type floor

The design leans on small uppercase tracked labels — around 175 of them. That
reads as editorial on a desktop and is genuinely hard to read on a phone.
`index.css` redefines the steps below the `sm` breakpoint:

```css
@media (max-width: 639.98px) {
  .text-\[10px\] { font-size: 11px; }   /* and 10.5, 11, 11.5, 12 */
}
```

The desktop design is untouched, and `sm:text-[…]` variants are unaffected
because they apply from 640px up. **Nothing should be written below
`text-[10px]`** — anything smaller is not covered by the floor, which is how an
8.5px badge survived two passes.

SVG `<text>` is a trap here: it scales with the viewBox, so a label specified
at 11 units rendered at 8.9px on a narrow screen. The contact map's labels are
HTML positioned over the drawing for that reason.

---

## Touch targets

Anything tappable should be at least 40px on its cross axis. Most components
set this directly. For a small icon button in open space there is a utility:

```jsx
<button className="tap-target h-8 w-8 …">
```

It grows a pseudo-element rather than the button, so the drawn size and the
surrounding layout are unchanged, and only on `pointer: coarse`.

**It does not work everywhere, and fails silently.** The pseudo-element is
clipped by any ancestor with `overflow: hidden` and painted under any
absolutely positioned sibling later in the DOM — both normal inside a card,
which is where small icon buttons usually live. Measured there, it reached 23px
instead of 44 with nothing to indicate a problem.

Where it cannot apply, make the button a real 40px box and draw the small
visible circle on an inner `<span>`. `StayCard`, `OurTeam`, `ContactInfo` and
`PopularGroupTours` all do that. Watch the stacking order too: the Save buttons
on the hotel cards needed `z-10` because the caption block was painting over
their lower half and swallowing taps.

---

## Claims about the business

`src/data/companyFacts.js` is the rule: a number is either **derived** from the
catalogue at build time, or **claimed** by the business and carrying a
`verified` flag. An unverified claim is not rendered at all.

This is not only a trust matter. India's 2023 consumer-protection guidance on
dark patterns treats fabricated or unverifiable reviews and ratings as a
prohibited practice.

Claims removed under this rule so far: "10K+ Happy Travelers", "4.9★ Average
Rating", "250+ Journeys" under a "CERTIFIED RECORD" heading, "Trusted by 50K+
Travelers / Real reviews. Real experiences.", and "10,000+ subscribers" in four
places. To publish one for real, put the figure in `companyFacts.js`, set
`verified: true`, and fill in `basis` so the next person can re-check it.

---

## Checking your work

The things that break on this site are not visible in a screenshot: a 4px
overflow, an 11px label, a button that is 28px to a thumb, a grid that reflows
a second after paint. Measure them.

| What | How |
|---|---|
| Layout shift | `PerformanceObserver` on `layout-shift`, installed via `addInitScript` so it catches the initial paint |
| Tap targets | `document.elementFromPoint` walking outward from the centre — a box measurement misses both the `tap-target` pseudo-element and anything clipping it |
| Image waste | compare `naturalWidth` against `getBoundingClientRect().width * devicePixelRatio`, at `deviceScaleFactor: 2` |
| Small text | computed `fontSize`, converting SVG text by the viewBox scale first |
| Touch rules | the Playwright context needs `hasTouch: true`, or every `pointer: coarse` rule is inert and you are measuring a desktop page at phone width |

Two detectors that gave false positives and cost real time: comparing elements
from a mixed selector list as if they were siblings (it reports the content
between them as a gap), and treating a missing `width` attribute as a layout
shift risk when a Tailwind `h-5 w-5` reserves space perfectly well.
