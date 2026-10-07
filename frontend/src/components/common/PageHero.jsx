import React from 'react';

/*
 * The dark image hero every inner page opens with.
 *
 * Lifted verbatim out of DestinationPage, which already set the pattern: a
 * full-bleed photograph, a three-stop gradient dark enough to keep the type
 * legible over any image, and a bottom fade into the ivory page background so
 * the hero and the content below read as one surface.
 *
 * Extracted rather than copied so the four new pages cannot drift from it — and
 * so a change to the overlay happens in one place.
 */
export default function PageHero({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  image,
  imageAlt = '',
  facts = [],
  children,
}) {
  return (
    <section className="relative overflow-hidden bg-[#012C18]">
      <img
        src={image}
        alt={imageAlt}
        /* Decorative when it carries no information the heading does not. */
        aria-hidden={imageAlt ? undefined : 'true'}
        /* The hero is the largest paint on the page, so it is never lazy. */
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02170F]/85 via-[#022014]/65 to-[#02170F]/90" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F4F1E8]" />

      <div className="relative mx-auto max-w-[1400px] px-4 pt-28 pb-10 text-center sm:px-6 sm:pt-32 lg:px-8">
        {eyebrow && (
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#F4F1E8]/75">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-3 font-display text-[38px] leading-[1.05] text-[#FAF9F5] sm:text-5xl lg:text-[56px]">
          {title}
          {titleAccent && <span className="text-[#B89A5A]"> {titleAccent}</span>}
        </h1>

        {subtitle && (
          <p className="mx-auto mt-3 max-w-[58ch] text-[13.5px] text-white/75 sm:text-[15px]">
            {subtitle}
          </p>
        )}

        {facts.length > 0 && (
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-[11.5px] font-medium text-white/80"
              >
                {Icon && <Icon className="h-3.5 w-3.5 text-[#B89A5A]" strokeWidth={1.75} />}
                {label}: <span className="text-white">{value}</span>
              </li>
            ))}
          </ul>
        )}

        {children}
      </div>
    </section>
  );
}
