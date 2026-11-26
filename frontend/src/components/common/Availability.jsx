import React from 'react';
import { Check, Clock3, Sparkles } from 'lucide-react';
import { availabilityFor, OPEN, SEASONAL } from '../../data/availability';

/*
 * The "not yet" furniture: a tag for cards, and a panel for detail pages.
 *
 * WHY A SEASONAL TAG LOOKS DIFFERENT FROM A COMING-SOON ONE
 *
 * They are different news. "Opens May 2027" is a date somebody can plan
 * around and is worth reading; "Coming soon" is an apology. Giving them the
 * same grey pill teaches people to ignore both, so the seasonal one is gold
 * — the same colour this site already uses for things worth noticing — and
 * the coming-soon one is quiet.
 *
 * An open product gets no tag at all. A badge reading "Available" on
 * everything we sell is noise that makes the real badges harder to see.
 */
export function AvailabilityTag({ id, className = '', showOpen = false }) {
  const availability = availabilityFor(id);
  const open = availability.state === OPEN;

  /*
   * An open product normally gets no tag: a badge reading "Available" on
   * everything we sell is noise that makes the real badges harder to see.
   *
   * `showOpen` is for the one place that is the exception — a grid where
   * almost everything is closed. There, saying which single card you can
   * actually book is the most useful thing on the screen, and its absence
   * reads as an oversight rather than as a default.
   */
  if (open && !showOpen) return null;

  if (open) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-md bg-[#0F6B45] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[#F4F1E8] ${className}`}
      >
        <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
        Available
      </span>
    );
  }

  const seasonal = availability.state === SEASONAL;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider ${
        seasonal
          ? 'bg-[#B89A5A] text-[#012C18]'
          : 'bg-[#012C18]/88 text-[#E6E2D4] backdrop-blur-sm'
      } ${className}`}
    >
      {seasonal ? (
        <Clock3 aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
      ) : (
        <Sparkles aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
      )}
      {availability.label}
    </span>
  );
}

/*
 * The detail-page version: says what is happening and why, and offers the
 * one thing a visitor can usefully do about it.
 *
 * It replaces the booking controls rather than sitting beside them. A
 * disabled "Check availability" button next to an explanation is a worse
 * version of this, because somebody will click it anyway and learn nothing.
 *
 * `onNotify` opens the existing enquiry modal, so interest in a closed trip
 * lands in the same inbox as everything else rather than needing its own
 * waitlist that nobody would remember to read.
 */
export function AvailabilityNotice({ id, onNotify, className = '' }) {
  const availability = availabilityFor(id);
  if (availability.state === OPEN) return null;

  const seasonal = availability.state === SEASONAL;

  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${
        seasonal ? 'border-[#E8C97A] bg-[#FFF8E7]' : 'border-[#DDD4C1] bg-[#F4F1E8]'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            seasonal ? 'bg-[#B89A5A]/25 text-[#8A5B00]' : 'bg-[#012C18]/10 text-[#043A25]'
          }`}
        >
          {seasonal ? (
            <Clock3 aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
          ) : (
            <Sparkles aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
          )}
        </span>

        <div className="min-w-0">
          <h3
            className={`font-display text-[19px] leading-snug sm:text-[21px] ${
              seasonal ? 'text-[#5A3D00]' : 'text-[#012C18]'
            }`}
          >
            {availability.headline}
          </h3>
          <p
            className={`mt-2 max-w-[60ch] text-[13.5px] leading-[1.75] ${
              seasonal ? 'text-[#7A5A18]' : 'text-[#4A5B50]'
            }`}
          >
            {availability.note}
          </p>

          {onNotify && (
            <button
              type="button"
              onClick={onNotify}
              className={`mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition-colors ${
                seasonal
                  ? 'bg-[#043A25] text-[#FAF9F5] hover:bg-[#012C18]'
                  : 'border border-[#043A25]/30 bg-white text-[#043A25] hover:bg-[#EFEDE4]'
              }`}
            >
              {availability.cta}
            </button>
          )}

          {/* Said plainly so nobody expects a confirmation that is not
              coming: this is a note to the desk, not an automated waitlist. */}
          {onNotify && (
            <p
              className={`mt-2.5 text-[12px] leading-[1.7] ${
                seasonal ? 'text-[#8A5B00]/80' : 'text-[#8A9189]'
              }`}
            >
              We will write to you ourselves when it opens. Nothing is booked and nothing is
              charged.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AvailabilityTag;
