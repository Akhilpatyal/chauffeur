import React from 'react';
import { ArrowRight, Clock3, Flag, Mountain, Sparkles, Star, Users } from 'lucide-react';
import { journeys } from '../../data/journeys';
import { responsiveImage } from '../../lib/images';
import { navigateTo } from '../../router';

/*
 * The one trip we are running, and the ones that are not open yet.
 *
 * This section used to lead on Spiti with an invented 4.9 rating and a price
 * against every card. Spiti is out of season until May, so everything here now
 * points at Bir Billing and the rest say plainly that they are not open.
 *
 * NO PRICES ON A CLOSED CARD
 *
 * A price is an offer. Printing "From ₹18,499" beside "Coming Soon" invites
 * somebody to hold us to a number for a trip we cannot sell, so the closed
 * cards carry no figure at all.
 *
 * Bir Billing has no journey record in data/journeys.js yet — it exists as a
 * destination — so the cards route to /destinations/bir-billing. When the
 * desk supplies an itinerary it becomes a journey and these point there.
 */
const BIR = {
  href: '/destinations/bir-billing',
  image: '/img/banner2-1600.webp',
  secondaryImage: '/img/banner3-1600.webp',
};

function FlightPath() {
  return (
    <svg className="pointer-events-none absolute left-[28%] top-7 hidden h-28 w-[40%] lg:block" viewBox="0 0 620 120" fill="none" aria-hidden="true">
      <path d="M5 93 C70 112 102 61 174 65 C265 71 270 76 328 61 C387 45 354 1 390 8 C435 18 376 99 442 90 C501 83 549 40 604 7" stroke="#31574d" strokeWidth="1.4" strokeDasharray="4 8" strokeLinecap="round" opacity=".72" />
      <path d="M601 2 L614 10 L603 13 L600 20 L596 12 L587 8 L596 6 Z" fill="#073F32" />
    </svg>
  );
}

function JourneyRow({ item, onClick }) {
  const highlighted = Boolean(item.popular);
  const open = Boolean(item.open);
  return (
    <button onClick={onClick} className={`group relative flex w-full shrink-0 items-center gap-3 rounded-[18px] border bg-[#fffdf7] p-3 text-left shadow-[0_5px_18px_rgba(7,63,50,.05)] transition duration-300 hover:-translate-y-1 hover:border-[#0b604b] hover:shadow-[0_12px_25px_rgba(7,63,50,.1)] sm:p-3.5 ${highlighted ? 'border-[#13805f] ring-1 ring-[#13805f]/20' : 'border-[#ded8c9]'}`}>
      {highlighted && <span className="absolute right-[-2px] top-[-2px] rounded-bl-lg rounded-tr-[15px] bg-[#073f32] px-2 py-1 text-[10.5px] font-bold tracking-[.16em] text-[#e2bd74]">POPULAR</span>}
      {/* 64px at most. This was handed the same 1200px file as the heroes —
          twenty-one times the pixels it can show. */}
      <img {...responsiveImage(item.image, '64px')} alt="" loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover transition duration-500 group-hover:scale-105 sm:h-16 sm:w-16" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base leading-tight text-[#123d34] sm:text-lg">{item.title}</span>
        <span className="mt-1 block text-xs text-[#718078]">{item.duration}</span>
        {open ? (
          <span className="mt-1 block text-sm font-bold text-[#123d34]">{item.price}</span>
        ) : (
          <span className="mt-1 block font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#8a9189]">
            Coming soon
          </span>
        )}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#123d34] transition-transform group-hover:translate-x-1" />
    </button>
  );
}

function FeaturedJourneyCard({ onClick }) {
  return (
    <button onClick={onClick} className="group relative min-h-[460px] overflow-hidden rounded-[24px] text-left shadow-[0_14px_30px_rgba(7,63,50,.17)] sm:min-h-[590px]">
      <img src={BIR.image} alt="Paragliders over the Bir Billing valley" className="absolute inset-0 h-full w-full object-cover transition duration-[1200ms] group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#021e1a] via-[#032f27]/25 to-[#032f27]/5" />
      <span className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-lg bg-[#073f32]/90 px-3 py-2 text-[10px] font-bold tracking-wider text-[#e2bd74] backdrop-blur-sm"><Star className="h-3 w-3 fill-current" /> FEATURED JOURNEY</span>
      {/* Was a play button reading "Watch the magic?" with no film behind
          it. It is a label now, not an affordance — a play control that opens
          nothing is the clearest possible way to lose someone's trust on the
          first click. */}
      <span className="absolute right-6 top-6 text-right font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/85">
        A Journey<br />to Remember
      </span>
      <span className="absolute bottom-6 left-6 right-6 text-white">
        <span className="font-display text-4xl leading-none sm:text-5xl">The Bir Billing Escape</span>
        <span className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/90"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-[#d8b56a]" />3 Days</span><span className="inline-flex items-center gap-1"><Mountain className="h-3.5 w-3.5 text-[#d8b56a]" />Mountain Escape</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-[#d8b56a]" />Small Group</span></span>
        <span className="my-4 block h-px bg-white/25" />
        <span className="flex items-center justify-between gap-3">{/* The 4.9 from 120 reviews was invented, like every other rating in
            this data. It comes back when there are real ones. */}
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="text-lg font-bold">From ₹8,999</span></span><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#073f32] transition duration-300 group-hover:translate-x-1"><ArrowRight className="h-5 w-5" /></span></span>
      </span>
    </button>
  );
}

function FeaturedExpedition({ onClick }) {
  return (
    <article className="relative min-h-[450px] overflow-hidden rounded-[24px] bg-[#032f27] p-7 text-[#fffdf7] shadow-[0_14px_30px_rgba(7,63,50,.17)] sm:min-h-[590px]">
      <img src={BIR.secondaryImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#032f27]/95 via-[#073f32]/78 to-[#032f27]/95" />
      <div className="relative z-10 flex h-full min-h-[394px] flex-col justify-between sm:min-h-[534px]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-md bg-[#073f32]/85 px-2.5 py-2 text-[10px] font-bold tracking-[.14em] text-[#e2bd74]"><Flag className="h-3.5 w-3.5 fill-current" />FEATURED EXPEDITION</span>
          <h3 className="mt-7 font-display text-4xl leading-[.88] sm:text-5xl">Bir Billing:<br />Beyond the<br />Clouds.</h3>
          <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-semibold tracking-wider text-[#f7e5bd]"><span className="inline-flex items-center gap-1.5 rounded-md bg-[#22634f]/70 px-2.5 py-2"><Clock3 className="h-3.5 w-3.5 text-[#e2bd74]" />3 DAYS</span><span className="inline-flex items-center gap-1.5 rounded-md bg-[#22634f]/70 px-2.5 py-2"><Mountain className="h-3.5 w-3.5 text-[#e2bd74]" />MOUNTAIN ESCAPE</span><span className="inline-flex items-center gap-1.5 rounded-md bg-[#22634f]/70 px-2.5 py-2"><Users className="h-3.5 w-3.5 text-[#e2bd74]" />SMALL GROUP</span></div>
        </div>
        <div>
          <svg className="mb-4 h-20 w-full opacity-60" viewBox="0 0 300 70" fill="none" aria-hidden="true"><path d="M38 49 C74 24 103 57 142 42 C181 27 182 18 219 25 C246 30 258 18 278 8" stroke="#e8e1c9" strokeWidth="1.2" strokeDasharray="3 6" /><circle cx="38" cy="49" r="5" stroke="#e2bd74" strokeWidth="2" /><path d="M276 5 L286 9 L279 13 Z" fill="#e2bd74" /></svg>
          <button onClick={onClick} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#c69a52] px-4 py-4 text-sm font-bold tracking-wide text-[#073f32] transition hover:-translate-y-0.5 hover:bg-[#d8b56a]">VIEW THE EXPEDITION <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></button>
        </div>
      </div>
    </article>
  );
}

export default function HandpickedJourneys() {
  const items = [
    {
      id: 'bir-billing-escape',
      title: 'The Bir Billing Escape',
      duration: '3 Days · Easy',
      price: 'From ₹8,999',
      image: BIR.image,
      href: BIR.href,
      open: true,
      popular: true,
    },
    { id: 'kashmir-lakes', title: 'Kashmir Great Lakes', duration: 'Kashmir', image: journeys[1].image, href: '/destinations/kashmir' },
    { id: 'ladakh-expedition', title: 'Ladakh Tour', duration: 'Ladakh', image: journeys[2].image, href: '/destinations/ladakh', popular: true },
    { id: 'meghalaya-explorer', title: 'Meghalaya Explorer', duration: 'Meghalaya', image: journeys[3].image, href: '/destinations/meghalaya' },
    { id: 'spiti-circuit', title: 'Spiti Valley High Road', duration: 'Himachal Pradesh', image: journeys[0].image, href: '/journeys/spiti-circuit' },
  ];

  return (
    <section id="journeys" className="relative overflow-hidden bg-[#f5f1e8] py-16 text-[#123d34] sm:py-24">
      <FlightPath />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="relative mb-10 flex flex-col gap-5 lg:mb-12 lg:flex-row lg:items-start lg:justify-between">
          <div><span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[.16em] text-[#31574d]"><Sparkles className="h-3.5 w-3.5 text-[#c69a52]" />EXPLORE THE WORLD</span><h2 className="mt-3 max-w-2xl font-display text-5xl leading-[.86] tracking-tight sm:text-6xl lg:text-7xl">Your next adventure<br /><span className="italic text-[#c69a52]">starts</span> here.</h2></div>
        </header>

        <div className="grid items-stretch gap-7 lg:grid-cols-[1.25fr_.95fr_.82fr]">
          <FeaturedJourneyCard onClick={() => navigateTo(BIR.href)} />
          <div className="order-3 flex gap-3 overflow-x-auto pb-2 lg:order-2 lg:flex-col lg:overflow-visible lg:pb-0">{items.map((item) => <JourneyRow key={item.id} item={item} onClick={() => navigateTo(item.href)} />)}</div>
          <div className="order-2 lg:order-3"><FeaturedExpedition onClick={() => navigateTo(BIR.href)} /></div>
        </div>
      </div>
    </section>
  );
}