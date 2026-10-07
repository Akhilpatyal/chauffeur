import React from 'react';
import { Camera, Circle, Mail, MessageCircle, Phone, Tv2 } from 'lucide-react';
import Logo from '../common/Logo';
import { socials } from '../../data/contact';
import { navigateTo } from '../../router';

const ICON_FOR_SOCIAL = { instagram: Camera, facebook: Circle, linkedin: Tv2 };

/* WhatsApp is always available because the number is a real one. */
const SOCIAL_ICONS = [
  ...socials.map((social) => ({
    label: social.label,
    href: social.href,
    icon: ICON_FOR_SOCIAL[social.id] ?? Circle,
  })),
  { label: 'WhatsApp', href: 'https://wa.me/919876543210', icon: MessageCircle },
];

/*
 * Footer navigation.
 *
 * "Journeys" and "Stories" used to be `/#journeys` and `/#journal`, which only
 * worked from the homepage — from any other page they navigated to `/` and left
 * the visitor at the top with nothing scrolled. Both are real pages now, and
 * Weekend Escapes and Destinations have been added because they were reachable
 * from the navbar but not from here.
 */
const linkGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Journeys', href: '/journeys' },
      { label: 'Weekend Escapes', href: '/weekend-escapes' },
      { label: 'Group Tours', href: '/group-tours' },
      { label: 'Destinations', href: '/destinations' },
      { label: 'Hotels', href: '/hotels' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Stories', href: '/stories' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQs', href: '/contact' },
      { label: 'WhatsApp Us', href: 'https://wa.me/919876543210' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cancellation Policy', href: '/cancellation' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#032f27] text-[#f4f1e8]">
      {/* Summit sketch backdrop - screen blend lifts the sepia lines out of the dark green */}
      <img
        src="/footer.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="pointer-events-none absolute bottom-0 right-0 hidden w-[46%] max-w-[680px] opacity-40 mix-blend-screen sm:block"
      />
      <div className="relative mx-auto max-w-[1280px] px-5 py-9 sm:px-8 lg:py-11">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.55fr_1fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col items-start">
            <Logo variant="light" size="lg" showTagline={false} />
            <p className="mt-1 text-[9px] font-bold tracking-[.12em] text-[#d8b56a]">JOURNEYS THAT STAY WITH YOU FOREVER.</p>
            {/*
              Social icons render only where a real URL is configured in
              data/contact.js. A link with href="#" looks live and does
              nothing, which is worse than not showing the icon.
            */}
            <div className="mt-4 flex gap-3">
              {SOCIAL_ICONS.filter((item) => item.href && item.href !== '#').map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/85 transition hover:text-[#d8b56a]"
                >
                  <item.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {linkGroups.map((group) => <div key={group.title}><h3 className="text-[10px] font-bold uppercase tracking-[.15em] text-[#f4f1e8]">{group.title}</h3><ul className="mt-3 space-y-1.5 text-[11px] text-white/70">{group.links.map((link) => <li key={link.label}><a href={link.href} onClick={(e) => { if (link.href.startsWith('/') && !link.href.startsWith('/#')) { e.preventDefault(); navigateTo(link.href); } }} className="transition hover:text-[#d8b56a]">{link.label}</a></li>)}</ul></div>)}
          <div><h3 className="text-[10px] font-bold uppercase tracking-[.15em] text-[#f4f1e8]">Contact</h3><ul className="mt-3 space-y-3 text-[11px] text-white/75"><li><a href="tel:+919876543210" className="flex items-center gap-2 transition hover:text-[#d8b56a]"><Phone className="h-3.5 w-3.5 text-[#d8b56a]" />+91 98765 43210</a></li><li><a href="mailto:hello@taifer.com" className="flex items-center gap-2 transition hover:text-[#d8b56a]"><Mail className="h-3.5 w-3.5 text-[#d8b56a]" />hello@taifer.com</a></li><li><a href="https://wa.me/919876543210" className="flex items-center gap-2 transition hover:text-[#d8b56a]"><MessageCircle className="h-3.5 w-3.5 text-[#d8b56a]" />WhatsApp Us</a></li></ul></div>
        </div>
      </div>
      <div className="relative border-t border-white/10"><div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-4 text-[10px] text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© {new Date().getFullYear()} Taifer. All rights reserved.</span><div className="flex flex-wrap gap-x-4 gap-y-1"><a href="/privacy" className="hover:text-white">Privacy Policy</a><span className="hidden sm:inline">|</span><a href="/terms" className="hover:text-white">Terms & Conditions</a><span className="hidden sm:inline">|</span><a href="/cancellation" className="hover:text-white">Cancellation Policy</a></div></div></div>
    </footer>
  );
}
