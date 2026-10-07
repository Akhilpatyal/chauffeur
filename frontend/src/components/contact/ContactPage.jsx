import React, { useRef } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import Footer from '../footer/Footer';
import { useScrollReveal } from '../../animations/journey/scrollAnimations';
import { contactDetails } from '../../data/contact';
import ContactHero from './ContactHero';
import ContactMethods from './ContactMethods';
import ContactForm from './ContactForm';
import ContactInfo from './ContactInfo';
import ContactFaq from './ContactFaq';
import { RidgeMark } from './contactUi';
import { useDocumentMeta } from '../../lib/seo';

const breadcrumbs = ['Home', 'Contact Us'];

export default function ContactPage({ onPlanTrip }) {
  useDocumentMeta({
    title: 'Contact the Expedition Desk',
    description:
      'Call, WhatsApp or email a trip planner. We reply within two working hours, in Hindi or English, with no booking fees.',
  });

  const ctaScope = useRef(null);
  useScrollReveal(ctaScope, { start: 'top 88%' });

  return (
    <div className="min-h-screen bg-[#F4F1E8] text-[#012C18]">
      <ContactHero onPlanTrip={onPlanTrip} />

      <main className="topographic-bg">
        <div className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#8A9189]">
              {breadcrumbs.map((crumb, i) => (
                <li key={crumb} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-[#C3C8C1]">›</span>}
                  <span
                    className={
                      i === breadcrumbs.length - 1
                        ? 'font-medium text-[#012C18]'
                        : 'transition-colors hover:text-[#075333]'
                    }
                  >
                    {crumb}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <ContactMethods />

        {/* Form + office details */}
        <section className="pb-14">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-8">
              <ContactForm />
              <ContactInfo />
            </div>
          </div>
        </section>

        <ContactFaq />

        {/* Closing CTA */}
        <section ref={ctaScope} className="pb-16">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] px-6 py-8 sm:px-9">
              <RidgeMark className="pointer-events-none absolute -bottom-3 right-6 h-20 w-[320px] text-[#012C18] opacity-[0.07]" />

              <div className="relative flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <h2
                    data-reveal
                    className="font-display text-[26px] leading-[1.15] text-[#012C18] sm:text-[32px]"
                  >
                    Prefer to talk it through?
                  </h2>
                  <p data-reveal className="mt-2 text-[13.5px] text-[#5E6B63] sm:text-[14.5px]">
                    Call the expedition desk and speak to the person who will plan your trip.
                  </p>
                </div>

                <div
                  data-reveal
                  className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
                >
                  <a
                    href={contactDetails.phoneHref}
                    className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#043A25] px-7 py-3.5 text-[12.5px] font-semibold text-[#FAF9F5] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#012C18] hover:shadow-lg"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {contactDetails.phone}
                  </a>

                  <a
                    href={contactDetails.whatsappHref}
                    className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#C9C2B0] px-7 py-3.5 text-[12.5px] font-semibold text-[#012C18] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#043A25] hover:bg-[#043A25]/5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp Us
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
