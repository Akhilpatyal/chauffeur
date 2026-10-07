import React from 'react';
import { linkProps } from '../../router';

/*
 * Breadcrumb trail.
 *
 * Items are `{ label, path? }`; the last one is the current page and is never a
 * link. Earlier items with a `path` become real anchors through `linkProps`, so
 * they are crawlable and middle-clickable — the journey detail page previously
 * rendered its trail as plain `<span>`s, which looked like navigation but went
 * nowhere.
 *
 * Also emits BreadcrumbList structured data, which is what makes Google show
 * the trail instead of a bare URL in results.
 */
export default function Breadcrumb({ items, className = '' }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.path ? { item: `${window.location.origin}${item.path}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A9189]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="text-[#C3C8C1]">
                  ›
                </span>
              )}
              {isLast || !item.path ? (
                <span
                  className={isLast ? 'font-medium text-[#012C18]' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <a {...linkProps(item.path)} className="transition-colors hover:text-[#075333]">
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>

      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </nav>
  );
}
