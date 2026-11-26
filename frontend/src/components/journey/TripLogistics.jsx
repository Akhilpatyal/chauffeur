import React from 'react';
import {
  MapPin,
  Navigation,
  BedDouble,
  Users,
  Bus,
  ShieldAlert,
  Phone,
  Stethoscope,
} from 'lucide-react';
import { operationsFor } from '../../data/tripOperations';
import { directionsUrl } from '../../lib/maps';

/*
 * The practical half of a trip page: where it starts, where you sleep, who is
 * driving, and who to call.
 *
 * Every block here renders only when the operator has supplied the facts — see
 * data/tripOperations.js. There are no placeholders and no "details on
 * request": a section with nothing real in it is worse than no section, and
 * for a cancellation term or an emergency number, inventing one is worse
 * still. A trip with nothing filled in renders nothing at all and the page
 * reads exactly as it did before.
 */

function Card({ title, icon: Icon, children, id }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5"
    >
      <h3 id={id} className="flex items-center gap-2 font-display text-[19px] text-[#012C18]">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#B89A5A]" strokeWidth={2} />
        {title}
      </h3>
      {children}
    </section>
  );
}

/* A label/value row. Renders nothing when the value is missing, so a card can
 * list every field it knows about without checking each one. */
function Fact({ label, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-[108px] shrink-0 text-[12px] text-[#8A9189]">{label}</dt>
      <dd className="m-0 flex-1 text-[13px] leading-[1.6] text-[#3B473F]">{children}</dd>
    </div>
  );
}

/*
 * "Get directions" — a plain Google Maps link.
 *
 * No API, no key and no quota: it hands the traveller off to the maps app
 * already on their phone, with their own location and live traffic. That is
 * the one thing the route map above cannot do, and it costs nothing however
 * many people tap it.
 */
function DirectionsLink({ lat, lng, query, label = 'Get directions' }) {
  const href = directionsUrl({ lat, lng, query });
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="-ml-1 mt-1 inline-flex min-h-[40px] items-center gap-1.5 px-1 text-[12.5px] font-semibold text-[#075333] transition-colors hover:text-[#012C18] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
    >
      <Navigation aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </a>
  );
}

function PickupCard({ pickup, dropoff }) {
  if (!pickup && !dropoff) return null;

  return (
    <Card title="Pickup &amp; drop-off" icon={MapPin} id="trip-pickup-heading">
      {pickup && (
        <div className="mt-3">
          <p className="text-[13px] font-semibold text-[#012C18]">{pickup.point}</p>
          <dl className="mt-1">
            <Fact label="Report by">{pickup.reportBy}</Fact>
            <Fact label="Departs">{pickup.departsAt}</Fact>
            <Fact label="Note">{pickup.note}</Fact>
          </dl>
          <DirectionsLink lat={pickup.lat} lng={pickup.lng} query={pickup.point} />
        </div>
      )}

      {pickup?.alternatives?.length > 0 && (
        <div className="mt-4 border-t border-[#E3DDCB] pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#8A9189]">
            Other pickup points
          </p>
          <ul className="mt-2 space-y-2">
            {pickup.alternatives.map((alt) => (
              <li key={alt.point} className="text-[13px] text-[#3B473F]">
                <span className="block">
                  {alt.point}
                  {/* The surcharge sits with the option rather than in a
                      footnote, because a charge discovered later is the kind
                      that generates a complaint. */}
                  {alt.surcharge && (
                    <span className="ml-1.5 text-[12px] text-[#8A9189]">— {alt.surcharge}</span>
                  )}
                </span>
                {/* Its own line: inline, the 40px link box collided with the
                    surcharge text beside it. */}
                <DirectionsLink lat={alt.lat} lng={alt.lng} query={alt.point} label="Directions" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {dropoff && (
        <div className="mt-4 border-t border-[#E3DDCB] pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-[#8A9189]">
            Drop-off
          </p>
          <p className="mt-1.5 text-[13px] font-semibold text-[#012C18]">{dropoff.point}</p>
          <dl className="mt-1">
            <Fact label="Expected">{dropoff.expectedBy}</Fact>
            <Fact label="Note">{dropoff.note}</Fact>
          </dl>
        </div>
      )}
    </Card>
  );
}

function StaysCard({ stays }) {
  if (!stays?.length) return null;

  return (
    <Card title="Where you stay" icon={BedDouble} id="trip-stays-heading">
      <ul className="mt-3 space-y-3.5">
        {stays.map((stay, index) => (
          <li
            key={`${stay.place}-${index}`}
            className="border-b border-[#EFE9DA] pb-3.5 last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[13px] font-semibold text-[#012C18]">
                {stay.property ?? stay.category ?? stay.place}
              </span>
              {stay.place && stay.property && (
                <span className="text-[12px] text-[#8A9189]">{stay.place}</span>
              )}
              {stay.nights && (
                <span className="text-[12px] text-[#8A9189]">· {stay.nights}</span>
              )}
            </div>

            {/* "or similar" is said plainly where the property is not fixed.
                Naming a hotel that turns out to be a different one is the
                single most common complaint about packaged trips. */}
            {stay.property && stay.confirmed === false && (
              <p className="mt-0.5 text-[12px] italic text-[#8A9189]">
                or a similar property in the same category
              </p>
            )}

            <dl className="mt-1">
              {stay.property && <Fact label="Category">{stay.category}</Fact>}
              <Fact label="Rooms">{stay.sharing}</Fact>
              <Fact label="Washroom">{stay.washroom}</Fact>
              <Fact label="Heating">{stay.heating}</Fact>
              <Fact label="Meals">{stay.meals}</Fact>
            </dl>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function GroupCard({ group }) {
  if (!group) return null;

  const size =
    group.min && group.max
      ? `${group.min}–${group.max} travellers`
      : group.max
        ? `Up to ${group.max} travellers`
        : null;

  return (
    <Card title="Group &amp; transport" icon={Users} id="trip-group-heading">
      <dl className="mt-3">
        <Fact label="Group size">{size}</Fact>
        <Fact label="Vehicle">{group.vehicle}</Fact>
        <Fact label="Seating">{group.seating}</Fact>
        <Fact label="Type">
          {group.shared === undefined
            ? null
            : group.shared
              ? 'Shared departure — you travel with others who booked the same dates'
              : 'Private departure — the vehicle is yours alone'}
        </Fact>
        <Fact label="Leader">{group.coordinator}</Fact>
        <Fact label="Solo">{group.soloPolicy}</Fact>
      </dl>

      {group.min && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#F4F1E8] p-2.5 text-[12px] leading-[1.6] text-[#5E6B63]">
          <Bus aria-hidden="true" className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#B89A5A]" />
          {/* Stated up front rather than in the terms: a trip that might not
              run is a fact worth knowing before booking flights to Manali. */}
          This departure runs once {group.min} people have booked. We will tell you either way
          well before you need to book onward travel.
        </p>
      )}
    </Card>
  );
}

function SafetyCard({ safety }) {
  if (!safety) return null;

  return (
    <Card title="Safety &amp; emergencies" icon={ShieldAlert} id="trip-safety-heading">
      {safety.coordinator && (
        <a
          href={`tel:${safety.coordinator.replace(/\s+/g, '')}`}
          className="-ml-1 mt-3 inline-flex min-h-[40px] items-center gap-2 px-1 text-[14px] font-semibold text-[#012C18] transition-colors hover:text-[#075333] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075333]"
        >
          <Phone aria-hidden="true" className="h-4 w-4 text-[#B89A5A]" strokeWidth={2} />
          {safety.coordinator}
        </a>
      )}
      {safety.coordinatorHours && (
        <p className="text-[12px] text-[#8A9189]">{safety.coordinatorHours}</p>
      )}

      {safety.medical?.length > 0 && (
        <ul className="mt-3 space-y-2">
          {safety.medical.map((m) => (
            <li key={m.place} className="flex items-start gap-2.5">
              <Stethoscope
                aria-hidden="true"
                className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#B89A5A]"
                strokeWidth={2}
              />
              <span className="text-[12.5px] leading-[1.6] text-[#3B473F]">
                <strong className="font-semibold text-[#012C18]">{m.place}:</strong> {m.facility}
                {m.note && <span className="block text-[#5E6B63]">{m.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-2">
        <Fact label="Evacuation">{safety.evacuation}</Fact>
        <Fact label="Insurance">{safety.insurance}</Fact>
        <Fact label="Weather">{safety.weatherPolicy}</Fact>
      </dl>
    </Card>
  );
}

export default function TripLogistics({ slug, className = '' }) {
  /* `operationsFor` has already dropped anything empty, so a key being
   * present means there is something real to show. */
  const ops = operationsFor(slug);
  const showPickup = Boolean(ops.pickup || ops.dropoff);
  const anything = showPickup || ops.stays || ops.group || ops.safety;

  if (!anything) return null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`} data-reveal>
      {showPickup && <PickupCard pickup={ops.pickup} dropoff={ops.dropoff} />}
      <StaysCard stays={ops.stays} />
      <GroupCard group={ops.group} />
      <SafetyCard safety={ops.safety} />
    </div>
  );
}

export { Card as LogisticsCard, Fact as LogisticsFact, DirectionsLink };
