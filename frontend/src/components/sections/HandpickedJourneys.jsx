import React from 'react';
import { ArrowRight, Clock3, Flag, MapPin, Mountain, Play, Sparkles, Star, Users } from 'lucide-react';
import { journeys } from '../../data/journeys';

function FlightPath() {
  return (
    <svg className="pointer-events-none absolute left-[28%] top-7 hidden h-28 w-[40%] lg:block" viewBox="0 0 620 120" fill="none" aria-hidden="true">
      <path d="M5 93 C70 112 102 61 174 65 C265 71 270 76 328 61 C387 45 354 1 390 8 C435 18 376 99 442 90 C501 83 549 40 604 7" stroke="#31574d" strokeWidth="1.4" strokeDasharray="4 8" strokeLinecap="round" opacity=".72" />
      <path d="M601 2 L614 10 L603 13 L600 20 L596 12 L587 8 L596 6 Z" fill="#073F32" />
    </svg>
  );
}

function JourneyRow({ item, onClick }) {
  const highlighted = item.id === 'ladakh-expedition';
  return (
    <button onClick={onClick} className={`group relative flex w-full shrink-0 items-center gap-3 rounded-[18px] border bg-[#fffdf7] p-3 text-left shadow-[0_5px_18px_rgba(7,63,50,.05)] transition duration-300 hover:-translate-y-1 hover:border-[#0b604b] hover:shadow-[0_12px_25px_rgba(7,63,50,.1)] sm:p-3.5 ${highlighted ? 'border-[#13805f] ring-1 ring-[#13805f]/20' : 'border-[#ded8c9]'}`}>
      {highlighted && <span className="absolute right-[-2px] top-[-2px] rounded-bl-lg rounded-tr-[15px] bg-[#073f32] px-2 py-1 text-[8px] font-bold tracking-[.16em] text-[#e2bd74]">POPULAR</span>}
      <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover transition duration-500 group-hover:scale-105 sm:h-16 sm:w-16" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base leading-tight text-[#123d34] sm:text-lg">{item.title}</span>
        <span className="mt-1 block text-xs text-[#718078]">{item.duration}</span>
        <span className="mt-1 block text-sm font-bold text-[#123d34]">{item.price}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#123d34]"><Star className="h-3.5 w-3.5 fill-[#c69a52] text-[#c69a52]" />{item.rating}</span>
    </button>
  );
}

function FeaturedJourneyCard({ onClick }) {
  return (
    <button onClick={onClick} className="group relative min-h-[460px] overflow-hidden rounded-[24px] text-left shadow-[0_14px_30px_rgba(7,63,50,.17)] sm:min-h-[590px]">
      <img src={journeys[0].image} alt="Spiti Valley mountain landscape" className="absolute inset-0 h-full w-full object-cover transition duration-[1200ms] group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#021e1a] via-[#032f27]/25 to-[#032f27]/5" />
      <span className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-lg bg-[#073f32]/90 px-3 py-2 text-[10px] font-bold tracking-wider text-[#e2bd74] backdrop-blur-sm"><Star className="h-3 w-3 fill-current" /> FEATURED JOURNEY</span>
      <span className="absolute right-6 top-6 flex items-center">
        <span className="mr-3 font-editorial text-xl leading-none text-white/90">Watch<br />the magic</span>
        <span className="grid h-16 w-16 place-items-center rounded-full border border-white/70 bg-white text-[#073f32] shadow-[0_0_0_7px_rgba(255,255,255,.12)] transition group-hover:scale-110"><Play className="ml-1 h-5 w-5 fill-current" /></span>
      </span>
      <span className="absolute right-[83px] top-[92px] font-editorial text-2xl text-white/85">?</span>
      <span className="absolute bottom-6 left-6 right-6 text-white">
        <span className="font-display text-4xl leading-none sm:text-5xl">Spiti Valley</span>
        <span className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/90"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-[#d8b56a]" />6 Days</span><span className="inline-flex items-center gap-1"><Mountain className="h-3.5 w-3.5 text-[#d8b56a]" />High Altitude</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#d8b56a]" />Small Group</span></span>
        <span className="my-4 block h-px bg-white/25" />
        <span className="flex items-center justify-between gap-3"><span className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1 text-sm text-[#f0d28d]"><Star className="h-4 w-4 fill-current" />4.9 (120 Reviews)</span><span className="text-lg font-bold">From ₹14,999</span></span><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#073f32] transition duration-300 group-hover:translate-x-1"><ArrowRight className="h-5 w-5" /></span></span>
      </span>
    </button>
  );
}

function FeaturedExpedition({ onClick }) {
  return (
    <article className="relative min-h-[450px] overflow-hidden rounded-[24px] bg-[#032f27] p-7 text-[#fffdf7] shadow-[0_14px_30px_rgba(7,63,50,.17)] sm:min-h-[590px]">
      <img src={journeys[0].secondaryImage || journeys[0].image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#032f27]/95 via-[#073f32]/78 to-[#032f27]/95" />
      <div className="relative z-10 flex h-full min-h-[394px] flex-col justify-between sm:min-h-[534px]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-md bg-[#073f32]/85 px-2.5 py-2 text-[10px] font-bold tracking-[.14em] text-[#e2bd74]"><Flag className="h-3.5 w-3.5 fill-current" />FEATURED EXPEDITION</span>
          <h3 className="mt-7 font-display text-4xl leading-[.88] sm:text-5xl">Spiti<br />Beyond the<br />Ordinary</h3>
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-semibold tracking-wider text-[#f7e5bd]"><span className="inline-flex items-center gap-1.5 rounded-md bg-[#22634f]/70 px-2.5 py-2"><Clock3 className="h-3.5 w-3.5 text-[#e2bd74]" />6 DAYS</span><span className="inline-flex items-center gap-1.5 rounded-md bg-[#22634f]/70 px-2.5 py-2"><Users className="h-3.5 w-3.5 text-[#e2bd74]" />SMALL GROUP</span><span className="inline-flex items-center gap-1.5 rounded-md bg-[#22634f]/70 px-2.5 py-2"><Mountain className="h-3.5 w-3.5 text-[#e2bd74]" />HIGH ALTITUDE</span></div>
        </div>
        <div>
          <svg className="mb-4 h-20 w-full opacity-60" viewBox="0 0 300 70" fill="none" aria-hidden="true"><path d="M38 49 C74 24 103 57 142 42 C181 27 182 18 219 25 C246 30 258 18 278 8" stroke="#e8e1c9" strokeWidth="1.2" strokeDasharray="3 6" /><circle cx="38" cy="49" r="5" stroke="#e2bd74" strokeWidth="2" /><path d="M276 5 L286 9 L279 13 Z" fill="#e2bd74" /></svg>
          <button onClick={onClick} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#c69a52] px-4 py-4 text-sm font-bold tracking-wide text-[#073f32] transition hover:-translate-y-0.5 hover:bg-[#d8b56a]">DISCOVER THE JOURNEY <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
          <div className="mt-5 flex items-center justify-between text-[10px] font-mono tracking-wide text-[#f5f1e8]/80"><span>32°14'32"N 77°10'18"E</span><MapPin className="h-5 w-5 text-[#e2bd74]" /></div>
        </div>
      </div>
    </article>
  );
}

export default function HandpickedJourneys({ onSelectJourney, onExploreAll }) {
  const items = [
    { id: 'kashmir-lakes', title: 'Kashmir Great Lakes', duration: '6 Days · Moderate', price: 'From ₹18,499', rating: '4.8', image: journeys[1].image, journey: journeys[1] },
    { id: 'ladakh-expedition', title: 'Ladakh Road Expedition', duration: '8 Days · Road Trip', price: 'From ₹24,999', rating: '4.9', image: journeys[2].image, journey: journeys[2] },
    { id: 'himachal-escape', title: 'Himachal Escape', duration: '5 Days · Easy', price: 'From ₹9,999', rating: '4.7', image: journeys[4].image, journey: journeys[4] },
    { id: 'meghalaya-explorer', title: 'Meghalaya Explorer', duration: '4 Days · Easy', price: 'From ₹8,499', rating: '4.6', image: journeys[3].image, journey: journeys[3] },
    { id: 'uttarakhand-trails', title: 'Uttarakhand Trails', duration: '6 Days · Moderate', price: 'From ₹12,499', rating: '4.8', image: journeys[0].image, journey: journeys[0] },
  ];

  return (
    <section id="journeys" className="relative overflow-hidden bg-[#f5f1e8] py-16 text-[#123d34] sm:py-24">
      <FlightPath />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="relative mb-10 flex flex-col gap-5 lg:mb-12 lg:flex-row lg:items-start lg:justify-between">
          <div><span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-[#31574d]"><Sparkles className="h-3.5 w-3.5 text-[#c69a52]" />EXPLORE THE WORLD</span><h2 className="mt-3 max-w-2xl font-display text-5xl leading-[.86] tracking-tight sm:text-6xl lg:text-7xl">Your next adventure<br /><span className="italic text-[#c69a52]">starts</span> here.</h2></div>
          <button onClick={onExploreAll} className="group mt-2 inline-flex items-center gap-2 self-start text-xs font-bold tracking-[.12em] text-[#123d34] transition hover:text-[#c69a52]">VIEW ALL JOURNEYS <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
        </header>

        <div className="grid items-stretch gap-7 lg:grid-cols-[1.25fr_.95fr_.82fr]">
          <FeaturedJourneyCard onClick={() => onSelectJourney(journeys[0])} />
          <div className="order-3 flex gap-3 overflow-x-auto pb-2 lg:order-2 lg:flex-col lg:overflow-visible lg:pb-0">{items.map((item) => <JourneyRow key={item.id} item={item} onClick={() => onSelectJourney(item.journey)} />)}</div>
          <div className="order-2 lg:order-3"><FeaturedExpedition onClick={() => onSelectJourney(journeys[0])} /></div>
        </div>
      </div>
    </section>
  );
}