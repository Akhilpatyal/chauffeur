import React, { useState, useEffect } from 'react';
import { Search, Phone, ArrowRight, Menu, X } from 'lucide-react';
import Logo from '../common/Logo';
import MobileMenu from './MobileMenu';
import { cn } from '../../utils/helpers';

export default function Navbar({ onPlanTripClick, onSearchClick, activePage = 'home' }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Destinations', href: '#destinations' },
    { name: 'Journeys', href: '#journeys' },
    { name: 'Group Tours', href: '#group-tours' },
    { name: 'Weekend Escapes', href: '#destinations' },
    { name: 'Hotels', href: '#hotels' },
    { name: 'Stories', href: '#community' },
    { name: 'About', href: '#why-us' },
  ];

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (href === '#hotels') { window.location.hash = 'hotels'; return; }
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
          isScrolled
            ? 'bg-[#F4F1E8]/95 backdrop-blur-xl border-b border-[#DDD4C1] py-3 shadow-md text-[#003B24]'
            : 'bg-gradient-to-b from-black/70 via-black/30 to-transparent py-5 sm:py-6 text-white'
        )}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-3 focus:outline-none"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Logo
              variant={isScrolled ? 'dark' : 'light'}
              size="md"
              showTagline={false}
            />
          </a>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-9">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className={cn(
                  'text-[14px] font-sans font-medium tracking-wide transition-colors relative py-1 hover:text-[#B89A5A] after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#B89A5A]',
                  link.name === 'Hotels' && activePage === 'hotels' ? 'after:scale-x-100 text-[#B89A5A]' : 'after:scale-x-0',
                  isScrolled ? 'text-[#003B24]' : 'text-[#F4F1E8]'
                )}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right Action Bar */}
          <div className="hidden sm:flex items-center gap-5 xl:gap-6">
            {/* Search */}
            <button
              onClick={onSearchClick}
              className={cn(
                'flex items-center gap-1.5 text-xs font-sans font-medium transition-colors cursor-pointer',
                isScrolled ? 'text-[#003B24] hover:text-[#075333]' : 'text-white/90 hover:text-white'
              )}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            {/* Contact */}
            <a
              href="tel:+919876543210"
              className={cn(
                'flex items-center gap-1.5 text-xs font-sans font-medium transition-colors',
                isScrolled ? 'text-[#003B24] hover:text-[#075333]' : 'text-white/90 hover:text-white'
              )}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Contact</span>
            </a>

            {/* Plan a Journey button */}
            <button
              onClick={onPlanTripClick}
              className="px-5 py-2.5 rounded-lg bg-[#B89A5A] hover:bg-[#A88849] text-[#003B24] text-xs font-sans font-bold tracking-wide uppercase inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <span>Plan a Journey</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={onPlanTripClick}
              className="px-3 py-1.5 bg-[#B89A5A] text-[#003B24] text-xs font-bold rounded-md"
            >
              Plan
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'p-2 rounded-lg',
                isScrolled ? 'text-[#003B24]' : 'text-white'
              )}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navLinks={navLinks}
        onLinkClick={handleLinkClick}
        onPlanTripClick={onPlanTripClick}
      />
    </>
  );
}
