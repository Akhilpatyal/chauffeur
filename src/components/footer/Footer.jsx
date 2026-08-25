import React from 'react';
import { Phone, Mail, MessageCircle, ArrowUp, ShieldCheck, Camera, Tv2 } from 'lucide-react';
import Logo from '../common/Logo';

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#012C18] text-[#F4F1E8] pt-14 pb-8">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* Top Row: Logo + Statement */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-10 border-b border-white/10">
          <div className="space-y-2">
            <Logo variant="light" size="lg" showTagline={false} />
            <p className="text-xs font-mono text-[#DDD4C1]/60">THE GREAT OUTDOORS ARE WAITING.</p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-3">
            <a href="#" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#043A25] flex items-center justify-center text-white transition-colors" aria-label="Instagram">
              <Camera className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#043A25] flex items-center justify-center text-white transition-colors" aria-label="YouTube">
              <Tv2 className="w-3.5 h-3.5" />
            </a>
            <a href="#" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-[#043A25] flex items-center justify-center text-white transition-colors" aria-label="WhatsApp">
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 4-Column Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 py-10 border-b border-white/10 text-xs font-sans">
          
          {/* Explore */}
          <div>
            <h4 className="font-mono font-bold uppercase tracking-[0.15em] text-[#B89A5A] text-[11px] mb-3">Explore</h4>
            <ul className="space-y-2 text-[#DDD4C1]/75">
              <li><a href="#destinations" className="hover:text-white transition-colors">Destinations</a></li>
              <li><a href="#journeys" className="hover:text-white transition-colors">Journeys</a></li>
              <li><a href="#group-tours" className="hover:text-white transition-colors">Group Tours</a></li>
              <li><a href="#destinations" className="hover:text-white transition-colors">Weekend Escapes</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-mono font-bold uppercase tracking-[0.15em] text-[#B89A5A] text-[11px] mb-3">Company</h4>
            <ul className="space-y-2 text-[#DDD4C1]/75">
              <li><a href="#why-us" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#community" className="hover:text-white transition-colors">Our Story</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Media Kit</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-mono font-bold uppercase tracking-[0.15em] text-[#B89A5A] text-[11px] mb-3">Support</h4>
            <ul className="space-y-2 text-[#DDD4C1]/75">
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Cancellation Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Travel Guide</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-mono font-bold uppercase tracking-[0.15em] text-[#B89A5A] text-[11px] mb-3">Contact</h4>
            <ul className="space-y-2 text-[#DDD4C1]/75">
              <li>
                <a href="tel:+919876543210" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[#B89A5A]" />
                  <span>+91 98765 43210</span>
                </a>
              </li>
              <li>
                <a href="mailto:hello@taifer.com" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-[#B89A5A]" />
                  <span>hello@taifer.com</span>
                </a>
              </li>
              <li>
                <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <MessageCircle className="w-3 h-3 text-[#25D366]" />
                  <span>WhatsApp Us</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright Row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#DDD4C1]/50 font-mono">
          <div className="flex flex-wrap items-center gap-4">
            <span>© 2026 TAIFER — THE GREAT OUTDOORS.</span>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
            <span>·</span>
            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[#B89A5A]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Certified Wilderness Operator</span>
            </div>

            <button
              onClick={scrollToTop}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
