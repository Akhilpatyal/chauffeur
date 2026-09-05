import React from 'react';
import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { contactDetails, contactHero, deskCard, heroTrust } from '../../data/contact';
import { ContactIcon } from './contactUi';

/* One segment of the quick-contact bar - mirrors the Hotels search bar field */
function Field({ icon: Icon, label, href, value, className = '' }) {
  return (
    <a
      href={href}
      className={`group flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[#F4F1E8] sm:px-5 ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0 text-[#075333]" strokeWidth={1.75} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-[#8A9189]">
          {label}
        </span>
        <span className="block truncate text-[13px] font-semibold text-[#012C18]">
          {value}
        </span>
      </span>
    </a>
  );
}

export default function ContactHero({ onPlanTrip }) {
  return (
    <section className="relative overflow-hidden bg-[#012C18]">
      {/* Backdrop - same treatment as the Hotels and Group Tours banners */}
      <img
        src={contactHero.image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#02170F]/85 via-[#022014]/65 to-[#02170F]/90" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F4F1E8]" />

      <div className="relative mx-auto max-w-[1400px] px-4 pt-28 pb-10 sm:px-6 sm:pt-32 lg:px-8">
        {/* Floating desk-hours card */}
        <div className="absolute right-8 top-24 hidden w-[188px] rounded-2xl border border-white/15 bg-[#02170F]/55 p-3 backdrop-blur-md xl:block">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/12">
              <ContactIcon name="clock" className="h-3.5 w-3.5 text-[#B89A5A]" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[12px] font-semibold leading-tight text-white">
                {deskCard.title}
              </span>
              <span className="flex items-center gap-1 text-[9.5px] text-white/65">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6FBF8B]" />
                {deskCard.status}
              </span>
            </span>
          </div>

          <ul className="mt-2.5 space-y-1.5">
            {deskCard.hours.map((slot) => (
              <li
                key={slot.days}
                className="flex items-center justify-between text-[9.5px] text-white/80"
              >
                <span>{slot.days}</span>
                <span className="font-semibold text-white">{slot.time}</span>
              </li>
            ))}
          </ul>

          <p className="mt-2.5 border-t border-white/10 pt-2 text-center text-[8.5px] text-white/55">
            {deskCard.note}
          </p>
        </div>

        {/* Headline */}
        <div className="text-center">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#F4F1E8]/75">
            {contactHero.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[38px] leading-[1.05] text-[#FAF9F5] sm:text-5xl lg:text-[56px]">
            {contactHero.title}{' '}
            <span className="text-[#B89A5A]">{contactHero.titleAccent}</span>
          </h1>
          <p className="mt-3 text-[13.5px] text-white/75 sm:text-[15px]">
            {contactHero.subtitle}
          </p>
        </div>

        {/* Quick contact bar - sits where the search bar does on the other pages */}
        <div className="mx-auto mt-8 flex w-full max-w-[1000px] flex-col overflow-hidden rounded-3xl border border-white/25 bg-[#FAF9F5] p-1.5 shadow-[0_24px_60px_-24px_rgba(1,44,24,0.75)] lg:flex-row lg:items-stretch lg:rounded-full">
          <Field
            icon={Phone}
            label="Call us"
            href={contactDetails.phoneHref}
            value={contactDetails.phone}
            className="flex-[1.4] rounded-2xl border-b border-[#E7E1D2] lg:rounded-full lg:border-b-0 lg:border-r"
          />
          <Field
            icon={MessageCircle}
            label="WhatsApp"
            href={contactDetails.whatsappHref}
            value="Chat with us"
            className="flex-1 rounded-2xl border-b border-[#E7E1D2] lg:rounded-full lg:border-b-0 lg:border-r"
          />
          <Field
            icon={Mail}
            label="Email"
            href={contactDetails.emailHref}
            value={contactDetails.email}
            className="flex-[1.3] rounded-2xl lg:rounded-full"
          />

          <button
            type="button"
            onClick={onPlanTrip}
            className="mt-1.5 inline-flex items-center justify-center gap-2 rounded-full bg-[#043A25] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#FAF9F5] transition hover:bg-[#012C18] lg:mt-0 lg:ml-1"
          >
            Plan a Journey
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Trust strip */}
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {heroTrust.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-[11.5px] font-medium text-white/80"
            >
              <ContactIcon
                name={item.icon}
                className="h-3.5 w-3.5 text-[#B89A5A]"
                strokeWidth={1.75}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
