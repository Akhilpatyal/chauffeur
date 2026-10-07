import { useEffect } from 'react';

/*
 * Per-page metadata for a single-page app.
 *
 * index.html carries the site-level title, description and Open Graph tags,
 * which is all a crawler sees on the homepage. Every other route rendered the
 * same tags, so a shared journey link previewed as the homepage and no inner
 * page could rank for its own content.
 *
 * This hook rewrites the handful of tags that matter per route and restores the
 * site defaults on unmount, so nothing leaks between pages.
 */
const SITE_NAME = 'TAIFER — The Great Outdoors';

/* Read once, before any page overwrites them. */
const defaults = {
  title: typeof document === 'undefined' ? '' : document.title,
  description: readMeta('name', 'description'),
  ogTitle: readMeta('property', 'og:title'),
  ogDescription: readMeta('property', 'og:description'),
  ogImage: readMeta('property', 'og:image'),
  ogType: readMeta('property', 'og:type'),
};

function readMeta(attribute, key) {
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[${attribute}="${key}"]`)?.getAttribute('content') ?? '';
}

function setMeta(attribute, key, value) {
  if (typeof document === 'undefined' || value === undefined || value === null) return;
  let tag = document.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

function setLink(rel, href) {
  if (typeof document === 'undefined') return;
  let tag = document.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    tag?.remove();
    return;
  }
  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute('href', href);
}

/*
 * `title` is the page-specific part; the site name is appended so tabs and
 * search results read "Spiti Valley Expedition — TAIFER …" rather than one of
 * forty identical entries.
 */
export function useDocumentMeta({
  title,
  description,
  image,
  type = 'website',
  canonicalPath,
  /* Keeps a page out of search results. Used by the 404, where every mistyped
   * URL would otherwise become a thin duplicate competing with real pages. */
  noindex = false,
  /*
   * `skip` exists because React runs child effects before parent effects. A
   * parent that called this hook unconditionally would run last and overwrite
   * whatever the page component had just set, which is exactly what made every
   * route render the default title. The parent now opts out instead.
   */
  skip = false,
} = {}) {
  useEffect(() => {
    if (skip) return undefined;

    const fullTitle = title ? `${title} | ${SITE_NAME}` : defaults.title;

    document.title = fullTitle;
    setMeta('name', 'description', description ?? defaults.description);
    setMeta('property', 'og:title', title ?? defaults.ogTitle);
    setMeta('property', 'og:description', description ?? defaults.ogDescription);
    setMeta('property', 'og:image', image ?? defaults.ogImage);
    setMeta('property', 'og:type', type);
    setMeta('name', 'twitter:title', title ?? defaults.ogTitle);
    setMeta('name', 'twitter:description', description ?? defaults.ogDescription);
    setMeta('name', 'twitter:image', image ?? defaults.ogImage);

    /*
     * Canonical and og:url are built from the live origin rather than a
     * hardcoded domain, so they are correct on the production domain, on
     * preview deploys and locally without a build-time variable.
     */
    const path = canonicalPath ?? window.location.pathname;
    const url = `${window.location.origin}${path}`;

    if (noindex) {
      setMeta('name', 'robots', 'noindex, follow');
      /* A noindex page should not claim a canonical URL. */
      setLink('canonical', null);
    } else {
      setMeta('name', 'robots', 'index, follow');
      setLink('canonical', url);
    }
    setMeta('property', 'og:url', url);

    return () => {
      document.title = defaults.title;
      setMeta('name', 'description', defaults.description);
      setMeta('property', 'og:title', defaults.ogTitle);
      setMeta('property', 'og:description', defaults.ogDescription);
      setMeta('property', 'og:image', defaults.ogImage);
      setMeta('property', 'og:type', defaults.ogType || 'website');
      setMeta('name', 'robots', 'index, follow');
    };
  }, [title, description, image, type, canonicalPath, noindex, skip]);
}

export default useDocumentMeta;
