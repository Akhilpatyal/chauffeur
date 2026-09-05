import React, { useEffect, useState } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import SearchBar from '../navigation/SearchBar';

const slides = ['/banner1.jpg', '/banner2.jpg', '/banner3.jpg'];

function FlightPlane({ x, y, rotate, className = '' }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} className={className}>
      <path d="M-15 2 L-4 -2 L8 -13 L11 -11 L3 -2 L14 3 L13 6 L0 2 L-7 11 L-10 10 L-7 1 L-15 5 Z" fill="white" />
    </g>
  );
}

function FlightRoutes() {
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full sm:block" viewBox="0 0 1440 810" preserveAspectRatio="none" aria-hidden="true">
        <path d="M155 365 C220 300 316 326 330 402 C339 453 286 479 255 443 C222 406 268 357 352 347 C424 337 468 381 496 412" fill="none" stroke="rgba(255,255,255,.78)" strokeWidth="2" strokeDasharray="4 10" strokeLinecap="round" />
        <path d="M846 273 C936 232 1055 256 1088 332 C1124 415 1034 448 1002 391 C972 338 1040 301 1126 323 C1205 343 1224 407 1174 453" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="2" strokeDasharray="4 10" strokeLinecap="round" />
        <path d="M1110 462 C1176 436 1244 449 1267 491 C1288 530 1263 558 1225 544" fill="none" stroke="rgba(255,255,255,.52)" strokeWidth="1.5" strokeDasharray="3 10" strokeLinecap="round" />
        <FlightPlane x="315" y="351" rotate="-18" />
        <FlightPlane x="1077" y="315" rotate="32" />
        <FlightPlane x="1245" y="543" rotate="158" className="opacity-80" />
      </svg>
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full sm:hidden" viewBox="0 0 390 700" preserveAspectRatio="none" aria-hidden="true">
        <path d="M48 294 C84 257 130 274 134 313 C137 345 111 359 93 341 C74 322 105 293 153 302" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" strokeDasharray="3 9" strokeLinecap="round" />
        <FlightPlane x="126" y="296" rotate="-11" />
      </svg>
    </>
  );
}

export default function HeroSection({ onSearchSubmit }) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative flex min-h-[690px] h-[min(92vh,920px)] flex-col overflow-hidden bg-[#073d52] pt-24 text-white sm:pt-28">
      <div className="absolute inset-0 z-0">
        {slides.map((slide, index) => {
          const isActive = activeSlide === index;
          return <img key={slide} src={slide} alt="" aria-hidden={!isActive} className="absolute inset-0 h-full w-full object-cover object-center" style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'scale(1.09)' : 'scale(1)', transition: isActive ? 'opacity 1.2s ease-in-out, transform 6s ease-out' : 'opacity 1.2s ease-in-out, transform 1.2s ease-in-out' }} />;
        })}
        <div className="absolute inset-0 bg-gradient-to-b from-[#062f48]/60 via-[#073c56]/10 to-[#032d3c]/35" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(0,37,53,.34)_100%)]" />
      </div>

      <FlightRoutes />

      <div className="relative z-20 mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-col items-center justify-center pb-4 pt-12 text-center sm:pt-16">
          <div className="absolute left-[11%] top-[39%] hidden w-40 rounded-2xl border border-white/15 bg-[#07586a]/75 px-5 py-4 text-left shadow-xl backdrop-blur-md xl:block">
            <Sparkles className="mb-2 h-4 w-4 text-[#ffd85d]" /><p className="text-sm font-bold">Best Price</p><p className="text-sm font-bold">Guaranteed</p><p className="mt-1 text-[10px] leading-relaxed text-white/75">Get the best deals on every booking.</p>
          </div>
          <div className="absolute right-[10%] top-[39%] hidden w-40 rounded-2xl border border-white/15 bg-[#07586a]/75 px-5 py-4 text-center shadow-xl backdrop-blur-md xl:block">
            <ShieldCheck className="mx-auto mb-2 h-4 w-4 text-[#ffd85d]" /><p className="text-sm font-bold">Trusted by</p><p className="text-sm font-bold">50K+ Travelers</p><p className="mt-1 text-[10px] leading-relaxed text-white/75">Real reviews. Real experiences.</p>
          </div>

          <div className="relative">
            <p className="relative z-10 -mb-2 text-5xl leading-none text-white drop-shadow-md sm:-mb-4 sm:text-7xl" style={{ fontFamily: "'Caveat', cursive", fontWeight: 500 }}>Travel Beyond</p>
            <h1 className="relative z-0 font-light uppercase leading-[.83] text-[#e7fbff] drop-shadow-lg" style={{ fontFamily: "'Oswald', 'Arial Narrow', sans-serif", fontSize: 'clamp(3.75rem, 9.2vw, 8.5rem)', letterSpacing: '-.055em' }}>Boundaries</h1>
          </div>
          <p className="mt-5 max-w-xs text-sm font-medium leading-relaxed text-white/90 sm:max-w-md sm:text-base">Curated journeys to the world's most breathtaking places.</p>

          <div className="mt-6 flex rounded-full border border-white/20 bg-[#258198]/75 p-1.5 text-xs font-semibold shadow-xl backdrop-blur-sm sm:mt-7 sm:text-sm">
            {['Packages', 'Hotels', 'Weekend Trips', 'Group Tours'].map((item, index) => <button key={item} type="button" onClick={() => { if (item === 'Hotels') window.location.hash = 'hotels'; }} className={`rounded-full px-3 py-2.5 transition-colors sm:px-7 ${index === 0 ? 'bg-[#04354e] text-white shadow-md' : 'text-white/85 hover:bg-white/10'}`}>{item}</button>)}
          </div>
        </div>
        <div className="relative z-20 -mb-1 w-full pb-8 sm:pb-10"><SearchBar onSearchSubmit={onSearchSubmit} /></div>
      </div>
    </section>
  );
}