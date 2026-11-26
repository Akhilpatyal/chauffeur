import React from 'react';
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { contactDetails, officeHours, socials } from '../../data/contact';
import { SocialIcon } from './contactUi';

/* Stylised office locator - same illustrated language as the journey route map */
function OfficeMap() {
  return (
    /*
     * The box matches the drawing's 2:1 ratio instead of being a fixed 150px
     * tall. With a fixed height the SVG kept its own proportions and was
     * letterboxed inside a wider box — at a 768px viewport the box was 676px
     * across with the map occupying 300 of them, so 380px of it was empty.
     */
    <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl border border-[#E0E6DC] bg-[#E8EFE4]">
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
        {/* 11 user units in a 300-unit viewBox, so about 12px rendered at
            phone width. At 8 it came out near 9px — the two labels on this
            map were the smallest text anywhere on the site. */}
        {/* The two labels are HTML, below, not SVG text — see the note
            there. */}

        {/* Office pin */}
        <g transform="translate(150 86)">
          <circle r="12" fill="#D65A3A" opacity="0.18" />
          <path
            d="M0 0 C-6.4 -8 -9 -11.4 -9 -15.4 A9 9 0 0 1 9 -15.4 C9 -11.4 6.4 -8 0 0 Z"
            fill="#D65A3A"
          />
          <circle cy="-15.2" r="3.1" fill="#FAF9F5" />
        </g>
      </svg>

      {/*
        Labels as HTML on top of the map rather than <text> inside it.
        SVG text is part of the drawing, so it shrinks with the viewBox: at a
        320px viewport these rendered at 8.9px, the smallest type anywhere on
        the site and well under the floor every other label respects. As HTML
        they hold their size at any width and pick up the same font stack and
        mobile floor as the rest of the page.

        Positions are percentages of the box, which land exactly where the old
        SVG coordinates did now that the container shares the drawing's ratio.
        aria-hidden because the <svg> above already carries the description.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[11%] top-[46%] text-[11px] text-[#7A827B]"
      >
        Mall Road
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[55%] top-[43%] text-[12px] font-bold text-[#012C18]"
      >
        Taifer Desk
      </span>
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
                className="flex min-h-[40px] items-center gap-2.5 text-[13px] text-[#4A5B50] transition-colors hover:text-[#012C18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
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

        <div className="-ml-1 mt-3 flex items-center border-t border-[#DFD4B8] pt-3">
          {socials.map((social) => (
            <a
              key={social.id}
              href={social.href}
              aria-label={social.label}
              /* 40px link, 32px circle drawn inside, negative margin so the
                 row still starts where the heading does. Matches the footer
                 and the team cards. */
              className="group/social grid h-10 w-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#043A25]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAF9F5] text-[#012C18] transition-colors group-hover/social:bg-[#043A25] group-hover/social:text-[#B89A5A]">
                <SocialIcon network={social.id} />
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
