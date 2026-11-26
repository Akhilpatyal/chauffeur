import React from 'react';
import { Receipt, CalendarClock, FileCheck, RotateCcw } from 'lucide-react';
import { operationsFor } from '../../data/tripOperations';
import { LogisticsCard as Card, LogisticsFact as Fact } from './TripLogistics';

/*
 * What it costs and what happens if plans change.
 *
 * This is the part of the page people read twice, usually after deciding they
 * want to go and before deciding they trust you with a deposit. It is also the
 * part where made-up content does real damage: a refund schedule is a term of
 * contract, and India's consumer-protection rules treat a misleading one as an
 * unfair trade practice rather than a marketing slip.
 *
 * So every block renders only from figures the operator has actually entered
 * in data/tripOperations.js. Nothing here falls back to a sensible default,
 * because there is no such thing as a sensible default refund percentage.
 */

function CostsCard({ costs }) {
  if (!costs) return null;

  return (
    <Card title="What it costs" icon={Receipt} id="trip-costs-heading">
      {costs.base && (
        <p className="mt-3 text-[15px] font-semibold text-[#012C18]">{costs.base}</p>
      )}

      {costs.extras?.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {costs.extras.map((extra) => (
            <li
              key={extra.item}
              className="flex items-baseline justify-between gap-3 border-b border-[#EFE9DA] pb-1.5 text-[13px] last:border-0"
            >
              <span className="text-[#3B473F]">{extra.item}</span>
              <span className="shrink-0 font-semibold text-[#012C18]">{extra.amount}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-2">
        <Fact label="Taxes">{costs.taxes}</Fact>
        <Fact label="Not included">{costs.notIncluded}</Fact>
      </dl>
    </Card>
  );
}

function PolicyCard({ policy }) {
  if (!policy) return null;

  return (
    <Card title="Booking &amp; payment" icon={CalendarClock} id="trip-policy-heading">
      <dl className="mt-3">
        <Fact label="To book">{policy.deposit}</Fact>
        <Fact label="Balance">{policy.balanceDue}</Fact>
        <Fact label="Pay by">{policy.methods?.join(', ')}</Fact>
        <Fact label="Confirmed">{policy.confirmsAt}</Fact>
      </dl>
    </Card>
  );
}

function RefundCard({ policy }) {
  if (!policy?.refundTiers?.length && !policy?.reschedule) return null;

  return (
    <Card title="If you need to cancel" icon={RotateCcw} id="trip-refund-heading">
      {policy.refundTiers?.length > 0 && (
        <>
          {/* A table rather than prose. People read this looking for one row —
              the one that matches how far out they are — and a paragraph
              makes them parse all of it to find it. */}
          <table className="mt-3 w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b border-[#E3DDCB] pb-1.5 text-left text-[11.5px] font-semibold uppercase tracking-wider text-[#8A9189]">
                  You cancel
                </th>
                <th className="border-b border-[#E3DDCB] pb-1.5 text-right text-[11.5px] font-semibold uppercase tracking-wider text-[#8A9189]">
                  You get back
                </th>
              </tr>
            </thead>
            <tbody>
              {policy.refundTiers.map((tier) => (
                <tr key={tier.window}>
                  <td className="border-b border-[#EFE9DA] py-2 pr-3 align-top leading-[1.5] text-[#3B473F]">
                    {tier.window}
                  </td>
                  <td className="border-b border-[#EFE9DA] py-2 text-right align-top font-semibold text-[#012C18]">
                    {tier.refund}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11.5px] leading-[1.6] text-[#8A9189]">
            Percentages apply to the amount already paid. Bank or gateway charges on a refund are
            not ours to return.
          </p>
        </>
      )}

      {policy.reschedule && (
        <dl className="mt-2">
          <Fact label="Change date">{policy.reschedule}</Fact>
        </dl>
      )}
    </Card>
  );
}

function DocumentsCard({ documents }) {
  if (!documents?.length) return null;

  return (
    <Card title="What to bring" icon={FileCheck} id="trip-documents-heading">
      <ul className="mt-3 space-y-2">
        {documents.map((doc) => (
          <li key={doc} className="flex items-start gap-2.5">
            <FileCheck
              aria-hidden="true"
              className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#075333]"
              strokeWidth={2}
            />
            <span className="text-[12.5px] leading-[1.6] text-[#3B473F]">{doc}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function BookingTerms({ slug, className = '' }) {
  const ops = operationsFor(slug);
  const hasRefund = Boolean(ops.policy?.refundTiers?.length || ops.policy?.reschedule);

  if (!ops.costs && !ops.policy && !ops.documents) return null;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`} data-reveal>
      <CostsCard costs={ops.costs} />
      <PolicyCard policy={ops.policy} />
      {hasRefund && <RefundCard policy={ops.policy} />}
      <DocumentsCard documents={ops.documents} />
    </div>
  );
}
