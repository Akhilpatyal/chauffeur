import React, { useState, useEffect } from 'react';
import { Search, Phone, ArrowRight, Menu, X } from 'lucide-react';
import Logo from '../common/Logo';
import MobileMenu from './MobileMenu';
import { cn } from '../../utils/helpers';
import { navigateTo } from '../../router';

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

  /*
   * `path` links are their own page; `anchor` links are homepage sections.
   *
   * Journeys, Weekend Escapes and Stories were anchors pointing at homepage
   * sections — Weekend Escapes went to the destinations grid, which was not
   * even the right content. All three now have real pages.
   */
  const navLinks = [
    { name: 'Journeys', path: '/journeys' },
    { name: 'Weekend Escapes', path: '/weekend-escapes' },
    { name: 'Group Tours', path: '/group-tours' },
    { name: 'Hotels', path: '/hotels' },
    { name: 'Stories', path: '/stories' },
    { name: 'About', path: '/about' },
  ];

  /*
   * Which nav item to highlight for a given route key.
   *
   * The old check compared `link.path` to `/${activePage}`, which silently
   * failed for hyphenated routes (`weekendEscapes` is served at
   * `/weekend-escapes`) and never highlighted a detail page. Detail routes map
   * to their parent so the trail stays visible while reading one journey.
   */
  const ACTIVE_PATH_FOR_PAGE = {
    journeys: '/journeys',
    journey: '/journeys',
    weekendEscapes: '/weekend-escapes',
    weekendEscape: '/weekend-escapes',
    stories: '/stories',
    story: '/stories',
    'group-tours': '/group-tours',
    hotels: '/hotels',
    about: '/about',
  };
  const activePath = ACTIVE_PATH_FOR_PAGE[activePage] ?? null;

  const handleLinkClick = (e, link) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    setMobileMenuOpen(false);

    if (link.path) {
      navigateTo(link.path);
      return;
    }

    const target = document.getElementById(link.anchor);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    /* Section lives on the home page - go there first, then scroll */
    navigateTo('/');
    window.setTimeout(() => {
      document.getElementById(link.anchor)?.scrollIntoView({ behavior: 'smooth' });
    }, 180);
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
              if (activePage !== 'home') {
                navigateTo('/');
                return;
              }
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
                href={link.path || `/#${link.anchor}`}
                onClick={(e) => handleLinkClick(e, link)}
                className={cn(
                  'text-[14px] font-sans font-medium tracking-wide relative py-1 transition-all duration-300 hover:-translate-y-px hover:text-[#B89A5A]',
                  'after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#B89A5A] after:origin-left after:transition-transform after:duration-300 hover:after:scale-x-100',
                  link.path === activePath
                    ? 'after:scale-x-100 text-[#B89A5A]'
                    : 'after:scale-x-0',
                  isScrolled ? 'text-[#003B24]' : 'text-[#F4F1E8]'
                )}
                aria-current={link.path === activePath ? 'page' : undefined}
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
              href="/contact"
              onClick={(e) => handleLinkClick(e, { path: '/contact' })}
              className={cn(
                'flex items-center gap-1.5 text-xs font-sans font-medium transition-colors',
                activePage === 'contact' ? 'text-[#B89A5A]' : '',
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
