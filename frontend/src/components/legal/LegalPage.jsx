import React, { Fragment, useRef } from 'react';
import { ArrowRight, Mail, Phone } from 'lucide-react';
import Footer from '../footer/Footer';
import { legalMeta, legalPages } from '../../data/legal';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { useDocumentMeta } from '../../lib/seo';

/*
 * Renders any of the three legal documents. Text wrapped in [[ ]] in the data
 * file is highlighted as an unfinished placeholder so nothing ships half-written.
 */
function Body({ text }) {
  const parts = String(text).split(/(\[\[[^\]]+\]\])/g);
  return (
    <p className="text-[13.5px] leading-[1.85] text-[#4A5B50]">
      {parts.map((part, i) =>
        part.startsWith('[[') ? (
          <mark
            key={i}
            className="rounded bg-[#F6E7C8] px-1.5 py-0.5 text-[#7A5A18]"
            title="Placeholder — replace before publishing"
          >
            {part.slice(2, -2)}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </p>
  );
}

export default function LegalPage({ slug, onNavigate }) {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 88%', stagger: 0.05, y: 18 });

  const page = legalPages[slug] || legalPages.privacy;
  const others = Object.values(legalPages).filter((p) => p.slug !== page.slug);

  useDocumentMeta({
    title: page.title,
    description: typeof page.intro === 'string' ? page.intro.slice(0, 180) : undefined,
  });

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      {/* Compact header - no photograph, this is a reference document */}
      <header className="relative overflow-hidden bg-[#012C18] pt-28 pb-10 sm:pt-32">
        <div className="topographic-bg-dark absolute inset-0 opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#F4F1E8]" />

        <div className="relative mx-auto max-w-[1400px] px-4 text-center sm:px-6 lg:px-8">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#F4F1E8]/75">
            Legal
          </p>
          <h1 className="mt-3 font-display text-[32px] leading-[1.05] text-[#FAF9F5] sm:text-[44px]">
            {page.title}
          </h1>
          <p className="mt-3 text-[12.5px] text-white/70">
            Last updated {legalMeta.lastUpdated}
          </p>
        </div>
      </header>

      <main ref={scope} className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            {/* Document */}
            <article className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-9">
              <p data-reveal className="text-[14.5px] leading-[1.8] text-[#5E6B63]">
                {page.intro}
              </p>

              <div className="mt-8 space-y-7">
                {page.sections.map((section, i) => (
                  <section key={section.heading} data-reveal>
                    <h2 className="font-display text-[21px] leading-tight text-[#012C18]">
                      <span className="mr-2 font-mono text-[12px] text-[#B89A5A]">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {section.heading}
                    </h2>
                    <div className="mt-2">
                      <Body text={section.body} />
                    </div>
                  </section>
                ))}
              </div>
            </article>

            {/* Aside */}
            <aside className="space-y-4">
              <nav
                aria-label="Other policies"
                className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5"
              >
                <h2 className="font-display text-[19px] text-[#012C18]">Other policies</h2>
                <ul className="mt-3 space-y-2.5">
                  {others.map((other) => (
                    <li key={other.slug}>
                      <a
                        href={`#${other.slug}`}
                        onClick={(event) => {
                          event.preventDefault();
                          onNavigate?.(other.slug);
                        }}
                        className="group inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#075333] transition-colors hover:text-[#012C18]"
                      >
                        {other.title}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              <section className="rounded-2xl border border-[#E0D6BE] bg-[#E9E1CD] p-5">
                <h2 className="font-display text-[19px] text-[#012C18]">Questions?</h2>
                <p className="mt-2 text-[12px] leading-[1.6] text-[#5E6B63]">
                  A person answers — before you book and long after.
                </p>
                <ul className="mt-3 space-y-2.5">
                  <li>
                    <a
                      href={`mailto:${legalMeta.email}`}
                      className="flex items-center gap-2.5 text-[12.5px] text-[#4A5B50] transition-colors hover:text-[#012C18]"
                    >
                      <Mail className="h-4 w-4 shrink-0 text-[#8A713C]" strokeWidth={1.7} />
                      {legalMeta.email}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`tel:${legalMeta.phone.replace(/\s/g, '')}`}
                      className="flex items-center gap-2.5 text-[12.5px] text-[#4A5B50] transition-colors hover:text-[#012C18]"
                    >
                      <Phone className="h-4 w-4 shrink-0 text-[#8A713C]" strokeWidth={1.7} />
                      {legalMeta.phone}
                    </a>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
