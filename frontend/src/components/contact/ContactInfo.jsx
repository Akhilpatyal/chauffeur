import React from 'react';
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { contactDetails, officeHours, socials } from '../../data/contact';
import { SocialIcon } from './contactUi';

/* Stylised office locator - same illustrated language as the journey route map */
function OfficeMap() {
  return (
    <div className="relative h-[150px] overflow-hidden rounded-xl border border-[#E0E6DC] bg-[#E8EFE4]">
      <svg
        viewBox="0 0 300 150"
        className="block h-full w-full"
        role="img"
        aria-label="Illustrated map of the Manali office location"
      >
        <defs>
          <radialGradient id="officeGlow" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#F2F6EE" />
            <stop offset="100%" stopColor="#E1EADC" />
          </radialGradient>
        </defs>
        <rect width="300" height="150" fill="url(#officeGlow)" />

        {/* Ridges */}
        <g stroke="#CBD8C4" fill="none" strokeWidth="1" strokeLinejoin="round">
          <path d="M-10 46 L34 18 L66 40 L108 8 L150 44 L192 16 L240 46 L310 20" />
          <path d="M-10 120 L40 96 L84 118 L128 88 L176 116 L222 92 L310 122" />
        </g>

        {/* River */}
        <path
          d="M18 0 C34 40 10 70 30 104 C44 128 26 140 34 150"
          fill="none"
          stroke="#B6D6E8"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Roads */}
        <path
          d="M0 92 C70 78 150 100 300 74"
          fill="none"
          stroke="#C9D3C3"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M0 92 C70 78 150 100 300 74"
          fill="none"
          stroke="#EFF4EC"
          strokeWidth="2"
          strokeDasharray="6 8"
        />
        <text x="176" y="70" fontSize="8" fill="#8A9189">
          Mall Road
        </text>

        {/* Office pin */}
        <g transform="translate(150 86)">
          <circle r="12" fill="#D65A3A" opacity="0.18" />
          <path
            d="M0 0 C-6.4 -8 -9 -11.4 -9 -15.4 A9 9 0 0 1 9 -15.4 C9 -11.4 6.4 -8 0 0 Z"
            fill="#D65A3A"
          />
          <circle cy="-15.2" r="3.1" fill="#FAF9F5" />
          <text x="14" y="-12" fontSize="9.5" fontWeight="700" fill="#012C18">
            Taifer Desk
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function ContactInfo() {
  return (
    <div className="space-y-4">
      {/* Office */}
      <section
        aria-labelledby="office-heading"
        className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5"
      >
        <h3 id="office-heading" className="font-display text-[19px] text-[#012C18]">
          Our Office
        </h3>

        <div className="mt-3">
          <OfficeMap />
        </div>

        <address className="mt-4 not-italic">
          <span className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B89A5A]" strokeWidth={1.7} />
            <span className="text-[12.5px] leading-[1.7] text-[#4A5B50]">
              {contactDetails.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </span>
        </address>

        <a
          href={contactDetails.mapsHref}
          target="_blank"
          rel="noreferrer"
          className="group mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#075333] transition-colors hover:text-[#012C18]"
        >
          Get directions
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </a>
      </section>

      {/* Direct lines */}
      <section
        aria-labelledby="direct-heading"
        className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5"
      >
        <h3 id="direct-heading" className="font-display text-[19px] text-[#012C18]">
          Direct Lines
        </h3>

        <ul className="mt-3 space-y-3">
          {[
            { icon: Phone, label: contactDetails.phone, href: contactDetails.phoneHref },
            { icon: MessageCircle, label: 'WhatsApp us', href: contactDetails.whatsappHref },
            { icon: Mail, label: contactDetails.email, href: contactDetails.emailHref },
          ].map(({ icon: Icon, label, href }) => (
            <li key={label}>
              <a
                href={href}
                className="flex items-center gap-2.5 text-[12.5px] text-[#4A5B50] transition-colors hover:text-[#012C18]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#B89A5A]" strokeWidth={1.7} />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Hours */}
      <section
        aria-labelledby="hours-heading"
        className="rounded-2xl border border-[#E0D6BE] bg-[#E9E1CD] p-5"
      >
        <h3
          id="hours-heading"
          className="flex items-center gap-2 font-display text-[19px] text-[#012C18]"
        >
          <Clock className="h-4 w-4 text-[#8A713C]" strokeWidth={1.7} />
          Desk Hours
        </h3>

        <ul className="mt-3 space-y-2">
          {officeHours.map((slot) => (
            <li
              key={slot.days}
              className="flex items-center justify-between text-[12.5px] text-[#4A5B50]"
            >
              <span>{slot.days}</span>
              <span className="font-semibold text-[#012C18]">{slot.time}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2 border-t border-[#DFD4B8] pt-4">
          {socials.map((social) => (
            <a
              key={social.id}
              href={social.href}
              aria-label={social.label}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF9F5] text-[#012C18] transition-colors hover:bg-[#043A25] hover:text-[#B89A5A]"
            >
              <SocialIcon network={social.id} />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
