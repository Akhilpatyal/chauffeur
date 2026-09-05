import React from 'react';
import { X, Phone, Compass } from 'lucide-react';
import Logo from '../common/Logo';
import MagneticButton from '../common/MagneticButton';

export default function MobileMenu({ isOpen, onClose, navLinks, onLinkClick, onPlanTripClick }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#012C18] text-[#F4F1E8] flex flex-col justify-between p-6 sm:p-8 animate-fadeIn lg:hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/15 pb-4">
        <Logo variant="light" size="sm" showTagline={false} />
        <button
          onClick={onClose}
          className="p-2 text-white hover:text-[#B89A5A] cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-7 h-7" />
        </button>
      </div>

      {/* Nav Links */}
      <div className="py-8 space-y-5 flex flex-col justify-center">
        {navLinks.map((link, idx) => (
          <a
            key={link.name}
            href={link.href}
            onClick={(e) => onLinkClick(e, link.href)}
            className="font-display text-2xl sm:text-3xl text-[#F4F1E8] hover:text-[#B89A5A] transition-colors flex items-center justify-between"
          >
            <span>{link.name}</span>
            <span className="text-xs font-mono text-[#B89A5A]">0{idx + 1}</span>
          </a>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="border-t border-white/15 pt-6 space-y-4">
        <div className="flex items-center justify-between text-xs text-[#DDD4C1]/80 font-mono">
          <span>EXPEDITION DESK</span>
          <a href="tel:+919876543210" className="text-[#B89A5A] font-bold">+91 98765 43210</a>
        </div>

        <MagneticButton
          variant="forest"
          size="lg"
          className="w-full justify-center text-xs"
          onClick={() => {
            onClose();
            onPlanTripClick();
          }}
        >
          Plan a Journey
        </MagneticButton>
      </div>
    </div>
  );
}
