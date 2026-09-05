import React, { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { faqs } from '../../data/contact';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { RidgeMark } from './contactUi';

export default function ContactFaq() {
  const scope = useRef(null);
  const [openIndex, setOpenIndex] = useState(0);
  useScrollReveal(scope, { start: 'top 86%', stagger: 0.07 });

  return (
    <section ref={scope} aria-labelledby="contact-faq-heading" className="pb-14">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <h2
            id="contact-faq-heading"
            data-reveal
            className="font-display text-[28px] leading-none text-[#012C18] sm:text-[32px]"
          >
            Common Questions
          </h2>
          <RidgeMark className="h-7 w-20 text-[#C3BCA6]" />
        </div>

        <ul className="mt-6 grid gap-3 lg:grid-cols-2">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;

            return (
              <li
                key={faq.q}
                data-reveal
                className={`h-fit rounded-xl border bg-[#FAF9F5] transition-colors ${
                  isOpen ? 'border-[#B89A5A]/60' : 'border-[#E3DDCB]'
                }`}
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
                  >
                    <span className="text-[13.5px] font-semibold text-[#012C18]">
                      {faq.q}
                    </span>
                    <Plus
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 text-[#B89A5A] transition-transform duration-300 ${
                        isOpen ? 'rotate-45' : ''
                      }`}
                    />
                  </button>
                </h3>

                <div id={panelId} hidden={!isOpen} className="px-4 pb-4">
                  <p className="text-[12.5px] leading-[1.75] text-[#5E6B63]">{faq.a}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
