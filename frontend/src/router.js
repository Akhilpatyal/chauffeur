import { useEffect, useState } from 'react';

/*
 * Minimal history router.
 *
 * The site used hash URLs (/#hotels), which search engines treat as a single
 * page — only the homepage could ever be indexed. These are real paths
 * (/hotels), so every page can rank and be linked to.
 *
 * Vercel serves index.html for unknown paths (see vercel.json rewrites), and
 * Vite's dev server does the same, so deep links work in both.
 */

/* Old hash links people may already have shared */
const LEGACY_HASHES = {
  hotels: '/hotels',
  about: '/about',
  contact: '/contact',
  'group-tours': '/group-tours',
  journey: '/journeys',
  privacy: '/privacy',
  terms: '/terms',
  cancellation: '/cancellation',
};

/* Section anchors that live on the homepage rather than being their own page */
export const HOME_ANCHORS = ['journeys', 'destinations', 'journal', 'why-us', 'group-tours-section'];

export function navigateTo(path) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    return;
  }
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/* Turn a legacy /#hotels URL into /hotels once, before the app renders */
export function redirectLegacyHash() {
  if (typeof window === 'undefined') return;
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (!raw) return;

  const [name, id] = raw.split('/');
  if (HOME_ANCHORS.includes(name)) return; // genuine in-page anchor

  const base = LEGACY_HASHES[name];
  if (!base) return;

  window.history.replaceState({}, '', id ? `${base}/${id}` : base);
}

export function usePathname() {
  const [pathname, setPathname] = useState(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname
  );

  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);

  return pathname;
}

/*
 * Maps a pathname to { page, param }.
 * Unknown paths resolve to `notFound` so visitors get a real 404 rather than
 * being silently dropped on the homepage.
 */
export function resolveRoute(pathname) {
  const [first, second] = pathname.replace(/^\/+|\/+$/g, '').split('/');

  if (!first) return { page: 'home', param: null };

  switch (first) {
    case 'hotels':
    case 'about':
    case 'contact':
    case 'group-tours':
      return { page: first, param: null };
    case 'journeys':
      return { page: 'journey', param: second || null };
    case 'destinations':
      return second
        ? { page: 'destination', param: second }
        : { page: 'destinations', param: null };
    case 'privacy':
    case 'terms':
    case 'cancellation':
      return { page: 'legal', param: first };
    default:
      return { page: 'notFound', param: first };
  }
}

/*
 * Props for an internal link: a real href search engines can follow, plus a
 * click handler that routes without a full page load.
 */
export function linkProps(path) {
  return {
    href: path,
    onClick: (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      navigateTo(path);
    },
  };
}
