import React, { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { contactMethods } from '../../data/contact';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { ContactIcon } from './contactUi';

export default function ContactMethods() {
  const scope = useRef(null);
  useScrollReveal(scope, { start: 'top 88%', stagger: 0.08 });

  return (
    <section ref={scope} aria-labelledby="contact-methods-heading" className="pt-12 pb-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 id="contact-methods-heading" className="sr-only">
          Ways to reach us
        </h2>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contactMethods.map((method) => (
            <li key={method.id}>
              <a
                href={method.href}
                data-reveal
                className="group flex h-full flex-col rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#B89A5A]/60 hover:shadow-[0_18px_40px_-30px_rgba(1,44,24,0.6)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#043A25] text-[#B89A5A] transition-transform duration-300 group-hover:scale-105">
                  <ContactIcon name={method.icon} className="h-4 w-4" />
                </span>

                <h3 className="mt-4 font-display text-[19px] leading-tight text-[#012C18]">
                  {method.title}
                </h3>

                <p className="mt-2 flex-1 text-[12.5px] leading-[1.65] text-[#7C857E]">
                  {method.body}
                </p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#075333]">
                  {method.action}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
