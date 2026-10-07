import React, { useId, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  FileCheck2,
  Mountain,
  Route,
  Signal,
  TriangleAlert,
} from 'lucide-react';
import { AMS_RISK, AMS_SYMPTOMS } from '../../data/tripReadiness';

/*
 * The practical facts a traveller needs before booking.
 *
 * Collapsible because there is a lot of it and most is reference material —
 * but the two sections that prevent actual harm, season and altitude, are open
 * by default. Someone who books a Kunzum La crossing for April, or flies into
 * Leh and heads for Khardung La the next morning, has a problem no refund
 * policy fixes.
 *
 * Everything renders from data/tripReadiness.js, so a fact is corrected once
 * rather than per trip.
 */
function Section({ icon: Icon, title, summary, defaultOpen = false, tone = 'default', children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className="border-t border-[#E7E1D2] first:border-t-0">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-start gap-3 py-4 text-left transition-colors hover:text-[#075333]"
        >
          <Icon
            aria-hidden="true"
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              tone === 'warning' ? 'text-[#B4472A]' : 'text-[#B89A5A]'
            }`}
            strokeWidth={2}
          />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[17px] leading-snug text-[#012C18]">
              {title}
            </span>
            {summary && (
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[#5E6B63]">
                {summary}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`mt-1 h-4 w-4 shrink-0 text-[#8A9189] transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>

      {open && (
        <div id={id} className="pb-5 pl-7">
          {children}
        </div>
      )}
    </section>
  );
}

const Row = ({ label, value }) =>
  value ? (
    <div className="border-l-2 border-[#E7E1D2] pl-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9189]">{label}</dt>
      <dd className="mt-0.5 text-[13px] leading-relaxed text-[#43514A]">{value}</dd>
    </div>
  ) : null;

export default function TripReadiness({ readiness }) {
  if (!readiness) return null;

  const { season, roads, permits, altitude, fitness, ground, region, lastReviewed } = readiness;
  const risk = AMS_RISK[altitude.risk] ?? AMS_RISK.none;
  const highAltitude = altitude.risk === 'high';

  return (
    <section
      data-reveal
      aria-labelledby="trip-readiness-heading"
      className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="trip-readiness-heading"
          className="font-display text-[22px] leading-tight text-[#012C18] sm:text-[26px]"
        >
          Before you book
        </h2>
        <p className="text-[11px] text-[#8A9189]">
          {region} · reviewed {lastReviewed}
        </p>
      </div>

      <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-[#5E6B63]">
        The practical detail that decides whether a trip works for you. Pass opening dates shift by
        weeks with the snowfall, so treat every window here as typical rather than guaranteed — we
        confirm the real status before every departure.
      </p>

      <div className="mt-5">
        <Section
          icon={CalendarRange}
          title="When this route actually works"
          summary={`Best: ${season.best}`}
          defaultOpen
        >
          <p className="max-w-[70ch] text-[13px] leading-[1.75] text-[#43514A]">{season.summary}</p>

          {season.avoid?.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {season.avoid.map((item) => (
                <li key={item.window} className="rounded-xl border border-[#F0D9D0] bg-[#FDF4F1] p-3.5">
                  <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#B4472A]">
                    <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    Avoid: {item.window}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#6E5047]">{item.why}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          icon={Route}
          title="Roads and passes"
          summary={`${roads.length} route${roads.length === 1 ? '' : 's'} that affect this trip`}
        >
          <ul className="space-y-3.5">
            {roads.map((road) => (
              <li key={road.name}>
                <p className="text-[13px] font-semibold text-[#012C18]">{road.name}</p>
                <p className="mt-0.5 font-mono text-[11.5px] text-[#075333]">{road.window}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#5E6B63]">{road.note}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={FileCheck2} title="Permits and documents" summary="What you need to carry">
          <ul className="space-y-4">
            {permits.map((permit) => (
              <li key={permit.who}>
                <p className="text-[13px] font-semibold text-[#012C18]">{permit.who}</p>
                <dl className="mt-1.5 space-y-1.5">
                  <Row label="Needs" value={permit.what} />
                  <Row label="Arranged" value={permit.where} />
                  <Row label="Carry" value={permit.carry} />
                </dl>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          icon={Mountain}
          title="Altitude"
          summary={risk.label}
          tone={highAltitude ? 'warning' : 'default'}
          defaultOpen={highAltitude}
        >
          <p className="max-w-[70ch] text-[13px] leading-[1.75] text-[#43514A]">{risk.note}</p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Row label="Highest you sleep" value={altitude.maxSleeping} />
            <Row label="Highest you reach" value={altitude.maxReached} />
          </dl>

          {altitude.plan?.length > 0 && (
            <>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9189]">
                How we acclimatise you
              </p>
              <ol className="mt-2 space-y-1.5">
                {altitude.plan.map((step, index) => (
                  <li key={step} className="flex gap-2.5 text-[13px] leading-relaxed text-[#43514A]">
                    <span className="font-mono text-[11px] text-[#B89A5A]">{index + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </>
          )}

          {altitude.note && (
            <p className="mt-4 max-w-[70ch] text-[12.5px] leading-relaxed text-[#5E6B63]">
              {altitude.note}
            </p>
          )}

          {/* The one block on this page that can prevent a serious outcome. */}
          {highAltitude && (
            <div className="mt-5 rounded-xl border border-[#F0D9D0] bg-[#FDF4F1] p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-bold text-[#B4472A]">
                <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                Altitude sickness — what to watch for
              </p>
              <ul className="mt-2 space-y-1">
                {AMS_SYMPTOMS.watchFor.map((symptom) => (
                  <li key={symptom} className="text-[12.5px] leading-relaxed text-[#6E5047]">
                    {symptom}
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[12.5px] font-medium leading-relaxed text-[#8A3B22]">
                {AMS_SYMPTOMS.rule}
              </p>
            </div>
          )}
        </Section>

        <Section icon={Mountain} title="How hard it is" summary={fitness.level}>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label="On your feet" value={fitness.walking} />
            <Row label="In a vehicle" value={fitness.driving} />
          </dl>

          {fitness.notFor?.length > 0 && (
            <>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8A9189]">
                Talk to us first if any of these apply
              </p>
              <ul className="mt-2 space-y-1.5">
                {fitness.notFor.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-[#43514A]">
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <Section icon={Signal} title="On the ground" summary="Signal, cash, power and food">
          <dl className="grid gap-3 sm:grid-cols-2">
            <Row label="Phone signal" value={ground.network} />
            <Row label="Cash and ATMs" value={ground.money} />
            <Row label="Power" value={ground.power} />
            <Row label="Where you sleep" value={ground.stays} />
            <Row label="Food" value={ground.food} />
          </dl>
        </Section>
      </div>
    </section>
  );
}
