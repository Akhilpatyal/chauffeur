import React from 'react';
import { Camera, Circle, Mail, MessageCircle, Phone, Tv2 } from 'lucide-react';
import Logo from '../common/Logo';

const linkGroups = [
  { title: 'Explore', links: ['Destinations', 'Journeys', 'Group Tours', 'Weekend Escapes', 'Hotels'] },
  { title: 'Company', links: ['About Us', 'Our Story', 'Careers', 'Media Kit', 'Partner With Us'] },
  { title: 'Support', links: ['Contact Us', 'FAQ', 'Cancellation Policy', 'Travel Guide', 'Terms & Conditions'] },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#032f27] text-[#f4f1e8]">
      <svg className="pointer-events-none absolute right-0 top-0 hidden h-full w-[42%] opacity-[.17] lg:block" viewBox="0 0 640 210" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
        <path d="M12 175 L112 70 L166 113 L257 12 L351 111 L433 41 L612 186 M77 180 L174 97 L229 178 M300 180 L395 80 L525 180" fill="none" stroke="#d8b56a" strokeWidth="2" />
        <path d="M0 190 H640" stroke="#d8b56a" strokeWidth="1" />
      </svg>
      <div className="relative mx-auto max-w-[1280px] px-5 py-9 sm:px-8 lg:py-11">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.55fr_1fr_1fr_1fr_1.2fr]">
          <div className="flex flex-col items-start">
            <Logo variant="light" size="md" showTagline={false} />
            <p className="mt-1 text-[9px] font-bold tracking-[.12em] text-[#d8b56a]">JOURNEYS THAT STAY WITH YOU FOREVER.</p>
            <div className="mt-4 flex gap-3">
              <a href="#" aria-label="Instagram" className="text-white/85 transition hover:text-[#d8b56a]"><Camera className="h-4 w-4" /></a>
              <a href="#" aria-label="YouTube" className="text-white/85 transition hover:text-[#d8b56a]"><Tv2 className="h-4 w-4" /></a>
              <a href="#" aria-label="Facebook" className="text-white/85 transition hover:text-[#d8b56a]"><Circle className="h-4 w-4" /></a>
              <a href="#" aria-label="WhatsApp" className="text-white/85 transition hover:text-[#d8b56a]"><MessageCircle className="h-4 w-4" /></a>
            </div>
          </div>
          {linkGroups.map((group) => <div key={group.title}><h3 className="text-[10px] font-bold uppercase tracking-[.15em] text-[#f4f1e8]">{group.title}</h3><ul className="mt-3 space-y-1.5 text-[11px] text-white/70">{group.links.map((link) => <li key={link}><a href="#" className="transition hover:text-[#d8b56a]">{link}</a></li>)}</ul></div>)}
          <div><h3 className="text-[10px] font-bold uppercase tracking-[.15em] text-[#f4f1e8]">Contact</h3><ul className="mt-3 space-y-3 text-[11px] text-white/75"><li><a href="tel:+919876543210" className="flex items-center gap-2 transition hover:text-[#d8b56a]"><Phone className="h-3.5 w-3.5 text-[#d8b56a]" />+91 98765 43210</a></li><li><a href="mailto:hello@taifer.com" className="flex items-center gap-2 transition hover:text-[#d8b56a]"><Mail className="h-3.5 w-3.5 text-[#d8b56a]" />hello@taifer.com</a></li><li><a href="https://wa.me/919876543210" className="flex items-center gap-2 transition hover:text-[#d8b56a]"><MessageCircle className="h-3.5 w-3.5 text-[#d8b56a]" />WhatsApp Us</a></li></ul></div>
        </div>
      </div>
      <div className="relative border-t border-white/10"><div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-5 py-4 text-[10px] text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>Â© 2025 Taifer. All rights reserved.</span><div className="flex flex-wrap gap-x-4 gap-y-1"><a href="#" className="hover:text-white">Privacy Policy</a><span className="hidden sm:inline">|</span><a href="#" className="hover:text-white">Terms & Conditions</a><span className="hidden sm:inline">|</span><a href="#" className="hover:text-white">Cookie Policy</a></div></div></div>
    </footer>
  );
}
