import React from 'react';

/*
 * Shown while a route chunk downloads.
 *
 * Deliberately not a spinner: it reserves the same dark hero band and ivory
 * body the real pages open with, so the layout does not jump when the chunk
 * arrives. On a fast connection this is never seen; on a slow one it looks
 * like the page loading rather than the site breaking.
 */
export default function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#F4F1E8]" role="status" aria-live="polite">
      <span className="sr-only">Loading page…</span>

      {/* Hero placeholder, matching PageHero's height and colour */}
      <div className="relative overflow-hidden bg-[#012C18] pt-28 pb-10 sm:pt-32">
        <div className="mx-auto max-w-[1400px] px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto h-3 w-40 animate-pulse rounded bg-white/15" />
          <div className="mx-auto mt-5 h-11 w-[min(420px,80%)] animate-pulse rounded bg-white/20" />
          <div className="mx-auto mt-4 h-3 w-[min(540px,90%)] animate-pulse rounded bg-white/10" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F4F1E8]" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[320px] animate-pulse rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
