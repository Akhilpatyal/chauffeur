import React, { useEffect } from 'react';
import { ArrowRight, CircleCheckBig, MapPin, Star, X } from 'lucide-react';
import { AmenityChip, money } from './hotelUi';

export default function HotelDetailDrawer({ stay, onClose }) {
  useEffect(() => {
    if (!stay) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [stay, onClose]);

  if (!stay) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#02170F]/55 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={stay.name}
        onClick={(e) => e.stopPropagation()}
        className="ml-auto flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-[#FAF9F5] shadow-2xl"
      >
        <div className="relative h-72 shrink-0">
          <img src={stay.image} alt={stay.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02170F]/60 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#FAF9F5] text-[#012C18] transition hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="absolute left-4 top-4 rounded-md bg-[#B89A5A] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#012C18]">
            {stay.highlight || stay.badge}
          </span>
        </div>

        <div className="p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B89A5A]">
            Taifer Curated Stay
          </p>
          <h2 className="mt-2 font-display text-[34px] leading-tight text-[#012C18]">
            {stay.name}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#7C857E]">
            <MapPin className="h-3.5 w-3.5" />
            {stay.location} · {stay.distance} · Manali, Himachal Pradesh
          </p>

          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#3B473F]">
            <Star className="h-3.5 w-3.5 fill-[#B89A5A] text-[#B89A5A]" />
            <span className="font-bold">{stay.rating}</span>
            {stay.ratingLabel}
            <span className="text-[#98A09A]">({stay.reviews} reviews)</span>
          </p>

          <p className="mt-5 text-[13px] leading-relaxed text-[#5E6B63]">
            {stay.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {stay.amenities.map((a) => (
              <AmenityChip key={a} label={a} />
            ))}
          </div>

          {stay.freeCancellation && (
            <p className="mt-4 flex items-center gap-1.5 text-[11.5px] font-medium text-[#2F7A4F]">
              <CircleCheckBig className="h-3.5 w-3.5" />
              Free cancellation up to 48 hours before check-in
            </p>
          )}

          <div className="mt-7 flex items-end justify-between border-t border-[#E7E1D2] pt-5">
            <p>
              <span className="font-display text-[28px] text-[#012C18]">
                {money(stay.price)}
              </span>
              <span className="ml-1 text-[11px] text-[#7C857E]">/ night</span>
              <span className="mt-0.5 block text-[10px] text-[#98A09A]">
                + taxes &amp; fees
              </span>
            </p>
            {stay.discount && (
              <span className="rounded-md bg-[#FBE9E3] px-2 py-1 text-[10.5px] font-bold text-[#D65A3A]">
                {stay.discount}% OFF
              </span>
            )}
          </div>

          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#043A25] py-4 text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#FAF9F5] transition hover:bg-[#012C18]"
          >
            View Full Stay
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}
