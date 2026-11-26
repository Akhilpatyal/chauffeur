import { env } from '../config/env.js';

/*
 * Inline-styled HTML because every mail client strips <style> blocks
 * unpredictably. Kept deliberately plain: these are transactional messages
 * that must render in Gmail, Outlook and a phone lock screen preview.
 */
const BRAND = { forest: '#043A25', ink: '#012C18', ivory: '#FAF9F5', gold: '#B89A5A', muted: '#5E6B63' };

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function layout({ heading, bodyHtml, footerNote }) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:${BRAND.ivory};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E3DDCB;border-radius:16px;overflow:hidden">
<tr><td style="background:${BRAND.forest};padding:20px 28px">
<div style="color:${BRAND.gold};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700">Taifer</div>
<div style="color:${BRAND.ivory};font-size:20px;margin-top:4px">${esc(heading)}</div>
</td></tr>
<tr><td style="padding:28px">${bodyHtml}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #E3DDCB;color:${BRAND.muted};font-size:11px;line-height:1.6">
${footerNote ?? ''}
</td></tr></table></body></html>`;
}

function rows(pairs) {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:${BRAND.muted};font-size:12px;white-space:nowrap;vertical-align:top">${esc(label)}</td>
<td style="padding:6px 0;font-size:13px;color:${BRAND.ink};vertical-align:top">${esc(value)}</td></tr>`,
    )
    .join('');
}

/* Sent to the sales desk the moment a lead lands. */
export function leadAdminAlert(lead) {
  const dashboardUrl = `${env.SITE_PUBLIC_URL.replace(/\/$/, '')}/admin/leads/${lead._id}`;
  const prefs = lead.tripPreferences ?? {};
  const body = `
<p style="margin:0 0 16px;font-size:14px">A new enquiry just came in from <strong>${esc(lead.context?.sourcePage || 'the website')}</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
${rows([
  ['Name', lead.name],
  ['Email', lead.email],
  ['Phone', lead.phone],
  ['Interested in', lead.topic || lead.interest?.title],
  ['Destination', prefs.destination],
  ['Vibe', prefs.vibe],
  ['Duration', prefs.duration],
  ['Budget', prefs.budget],
  ['Month', prefs.month],
  ['Travel dates', lead.travelDates],
  ['Travellers', lead.groupSize],
  ['Source', lead.source],
  ['Campaign', lead.utm?.campaign],
  ['Previous enquiries', lead.enquiryCount > 1 ? `${lead.enquiryCount - 1} earlier` : ''],
])}
</table>
${lead.message ? `<div style="margin-top:18px;padding:14px;background:${BRAND.ivory};border-radius:10px;font-size:13px;line-height:1.6;white-space:pre-wrap">${esc(lead.message)}</div>` : ''}
<p style="margin:22px 0 0">
<a href="${dashboardUrl}" style="display:inline-block;background:${BRAND.forest};color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:13px;font-weight:600">Open in dashboard</a>
<a href="mailto:${esc(lead.email)}" style="display:inline-block;margin-left:8px;color:${BRAND.forest};font-size:13px;padding:11px 0">Reply directly</a>
</p>`;

  return {
    subject: `New enquiry: ${lead.name}${lead.topic ? ` — ${lead.topic}` : ''}`,
    html: layout({
      heading: 'New enquiry',
      bodyHtml: body,
      footerNote: 'You are receiving this because your address is in LEAD_ALERT_EMAILS.',
    }),
    replyTo: lead.email,
  };
}

/* Auto-confirmation to the person who submitted the form. */
export function leadCustomerConfirmation(lead) {
  const firstName = String(lead.name || '').split(' ')[0] || 'there';
  const body = `
<p style="margin:0 0 14px;font-size:15px">Hello ${esc(firstName)},</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.7">Thank you for reaching out. Your enquiry is with a trip planner now, and you will hear back within two working hours.</p>
${lead.message ? `<div style="padding:14px;background:${BRAND.ivory};border-radius:10px;font-size:13px;line-height:1.6;color:${BRAND.muted};white-space:pre-wrap"><strong style="color:${BRAND.ink}">What you told us</strong><br><br>${esc(lead.message)}</div>` : ''}
<p style="margin:18px 0 0;font-size:14px;line-height:1.7">If it is urgent, call us on <a href="tel:+919876543210" style="color:${BRAND.forest}">+91 98765 43210</a> or message us on WhatsApp and we will pick up.</p>
<p style="margin:18px 0 0;font-size:14px">Warmly,<br>The Taifer expedition desk</p>`;

  return {
    subject: 'We have your enquiry — Taifer',
    html: layout({
      heading: 'Your enquiry is in',
      bodyHtml: body,
      footerNote: 'This is an automated confirmation for an enquiry you submitted on taifer.com.',
    }),
  };
}

/* Double opt-in: nothing is added to the list until this link is clicked. */
export function newsletterOptIn({ email, token }) {
  const url = `${env.API_PUBLIC_URL.replace(/\/$/, '')}/api/v1/newsletter/confirm?token=${encodeURIComponent(token)}`;
  const body = `
<p style="margin:0 0 14px;font-size:14px;line-height:1.7">Confirm this address and we will send you the monthly trail log: stories, routes and journeys worth knowing about. Nothing else.</p>
<p style="margin:20px 0">
<a href="${url}" style="display:inline-block;background:${BRAND.forest};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:13px;font-weight:600">Confirm subscription</a>
</p>
<p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6">If the button does not work, paste this into your browser:<br>${esc(url)}</p>`;

  return {
    subject: 'Confirm your Taifer subscription',
    html: layout({
      heading: 'One click to confirm',
      bodyHtml: body,
      footerNote: `This link expires in 48 hours. If you did not request it, ignore this email — ${esc(email)} will not be added to any list.`,
    }),
  };
}

export function newsletterWelcome({ email, unsubscribeToken }) {
  const unsubscribeUrl = `${env.API_PUBLIC_URL.replace(/\/$/, '')}/api/v1/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  const body = `
<p style="margin:0 0 14px;font-size:14px;line-height:1.7">You are on the list. Once a month we send one letter: where we have been, what the weather is actually doing up there, and which departures still have seats.</p>
<p style="margin:0;font-size:14px;line-height:1.7">No sales blasts, no third parties.</p>`;

  return {
    subject: 'Welcome to the trail log',
    html: layout({
      heading: 'You are on the list',
      bodyHtml: body,
      footerNote: `Sent to ${esc(email)}. <a href="${unsubscribeUrl}" style="color:${BRAND.muted}">Unsubscribe</a> at any time.`,
    }),
  };
}

/*
 * Booking emails.
 *
 * One rule governs every one of them: an unconfirmed booking is never written
 * as though it were a ticket. A request-received email that opens "Your trip
 * is booked!" is how a traveller ends up buying flights to Manali for a
 * departure nobody has agreed to run — and the apology for that costs far
 * more than the enthusiasm gained.
 *
 * So the subject lines and headings say what has actually happened, and the
 * body says plainly what has not.
 */

/* The dashboard link that belongs in every booking email. Relative paths are
 * built against the public site, never the API. */
const bookingUrl = (booking) =>
  `${env.SITE_PUBLIC_URL.replace(/\/$/, '')}/account/trips/${encodeURIComponent(booking.reference)}`;

export function bookingRequestReceived(booking, customer) {
  const firstName = String(customer?.name || booking.contact?.name || '').split(' ')[0] || 'there';
  const tripName = booking.trip?.title || 'your custom trip';

  const body = `
<p style="margin:0 0 14px;font-size:15px">Hello ${esc(firstName)},</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.7">We have your request for <strong>${esc(tripName)}</strong>. Your reference is <strong style="font-family:ui-monospace,monospace;letter-spacing:.04em">${esc(booking.reference)}</strong> — quote it if you call or write.</p>

<div style="padding:14px;background:#FFF8E7;border:1px solid ${BRAND.gold};border-radius:10px;font-size:13.5px;line-height:1.7;color:${BRAND.ink}">
  <strong>Nothing is booked yet.</strong><br>
  Availability on these routes depends on guesthouses, drivers and permits that we confirm by hand. We are doing that now and will come back to you either way — usually within one working day.
</div>

${rows([
  ['Trip', esc(tripName)],
  ['Travellers', String(booking.travellerCount)],
  booking.startDate
    ? ['Dates', new Date(booking.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })]
    : null,
  ['Reference', esc(booking.reference)],
].filter(Boolean))}

<p style="margin:18px 0 0;font-size:14px;line-height:1.7">You can follow progress at any time: <a href="${bookingUrl(booking)}" style="color:${BRAND.forest}">track this request</a>.</p>
<p style="margin:18px 0 0;font-size:14px">Warmly,<br>The Taifer expedition desk</p>`;

  return {
    /* Says "request", not "booking". The subject line is the part most people
     * read and the easiest place to create a false impression. */
    subject: `Request received — ${booking.reference}`,
    html: layout({
      heading: 'We have your request',
      bodyHtml: body,
      footerNote:
        'This confirms we received your request. It is not a booking confirmation — we will send that separately if and when the trip is confirmed.',
    }),
  };
}

/* The desk's copy. Terse, because it is read in a list. */
export function bookingRequestAdminAlert(booking, customer) {
  const body = `
<p style="margin:0 0 14px;font-size:14px">A new ${booking.kind === 'custom' ? 'custom trip' : 'departure'} request.</p>
${rows([
  ['Reference', esc(booking.reference)],
  ['Trip', esc(booking.trip?.title || '— custom —')],
  ['Customer', esc(customer?.name || booking.contact?.name || 'Unknown')],
  ['Email', esc(customer?.email || booking.contact?.email || '')],
  ['Phone', esc(customer?.phone || booking.contact?.phone || '—')],
  ['Travellers', String(booking.travellerCount)],
  booking.startDate
    ? ['Dates', new Date(booking.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })]
    : null,
  booking.preferences?.specialRequests
    ? ['Notes', esc(booking.preferences.specialRequests)]
    : null,
].filter(Boolean))}
<p style="margin:18px 0 0;font-size:13px;color:${BRAND.muted}">Check availability and quote from the reservations board.</p>`;

  return {
    subject: `New request ${booking.reference} — ${booking.trip?.title || 'custom trip'}`,
    html: layout({ heading: 'New reservation request', bodyHtml: body }),
  };
}

/* Money, formatted for a mail client. Amounts are stored in paise, so the
 * division happens here and nowhere earlier. */
const inr = (minor, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    (minor ?? 0) / 100,
  );

/*
 * The quotation.
 *
 * The lines are itemised in the email rather than hidden behind a link,
 * because a price somebody has to click to see is a price they read with
 * suspicion. The email still links to the account, which is where accepting
 * actually happens — acceptance needs a signed-in customer, not a link that
 * anyone the mail was forwarded to could press.
 */
export function quotationSent(booking, quotation, customer) {
  const firstName = String(customer?.name || booking.contact?.name || '').split(' ')[0] || 'there';
  const tripName = booking.trip?.title || 'your trip';
  const revision = quotation.version > 1;

  const lines = (quotation.items ?? [])
    .map(
      (item) => `
  <tr>
    <td style="padding:7px 0;font-size:13.5px;color:${BRAND.ink}">
      ${esc(item.label)}
      ${item.quantity && item.quantity !== 1 ? `<span style="color:${BRAND.muted}"> · ${esc(String(item.quantity))}${item.unitLabel ? ` ${esc(item.unitLabel)}` : ''} × ${inr(item.unitAmount, quotation.currency)}</span>` : ''}
    </td>
    <td style="padding:7px 0;font-size:13.5px;text-align:right;color:${BRAND.ink};white-space:nowrap">${inr(item.amount, quotation.currency)}</td>
  </tr>`,
    )
    .join('');

  const body = `
<p style="margin:0 0 14px;font-size:15px">Hello ${esc(firstName)},</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.7">${
    revision
      ? `Here is a revised quotation for <strong>${esc(tripName)}</strong>.`
      : `Here is your quotation for <strong>${esc(tripName)}</strong>.`
  } Reference <strong style="font-family:ui-monospace,monospace;letter-spacing:.04em">${esc(booking.reference)}</strong>.</p>

${revision && quotation.revisionReason ? `<p style="margin:0 0 14px;padding:12px;background:#F4F1E8;border-radius:10px;font-size:13.5px;line-height:1.7;color:${BRAND.ink}"><strong>What changed:</strong> ${esc(quotation.revisionReason)}</p>` : ''}

${quotation.summary ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:${BRAND.ink}">${esc(quotation.summary)}</p>` : ''}

<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 4px">
  ${lines}
  <tr><td colspan="2" style="border-top:1px solid #E3DDCB;padding:0"></td></tr>
  <tr>
    <td style="padding:10px 0 0;font-size:15px;font-weight:600;color:${BRAND.ink}">Total</td>
    <td style="padding:10px 0 0;font-size:15px;font-weight:600;text-align:right;color:${BRAND.ink}">${inr(quotation.totalAmount, quotation.currency)}</td>
  </tr>
  ${quotation.advanceAmount > 0 ? `<tr><td style="padding:4px 0 0;font-size:13.5px;color:${BRAND.muted}">Deposit to confirm</td><td style="padding:4px 0 0;font-size:13.5px;text-align:right;color:${BRAND.muted}">${inr(quotation.advanceAmount, quotation.currency)}</td></tr>` : ''}
</table>

${
  quotation.expiresAt
    ? `<p style="margin:16px 0 0;font-size:13.5px;line-height:1.7;color:${BRAND.muted}">This price holds until <strong>${new Date(quotation.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong>. Guesthouses and drivers on these routes will not hold space longer than that on a maybe.</p>`
    : ''
}

${
  quotation.cancellationTerms
    ? `<div style="margin:16px 0 0;padding:12px;background:#FFF8E7;border:1px solid ${BRAND.gold};border-radius:10px;font-size:13px;line-height:1.7;color:${BRAND.ink}"><strong>If you need to cancel</strong><br>${esc(quotation.cancellationTerms)}</div>`
    : ''
}

<p style="margin:20px 0 0;font-size:14px;line-height:1.7"><a href="${bookingUrl(booking)}" style="display:inline-block;padding:11px 20px;background:${BRAND.forest};color:#FAF9F5;border-radius:10px;text-decoration:none;font-weight:600">Review and accept</a></p>
<p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:${BRAND.muted}">Nothing is charged by accepting — it tells us to hold the trip and send payment details.</p>
<p style="margin:18px 0 0;font-size:14px">Warmly,<br>The Taifer expedition desk</p>`;

  return {
    subject: revision
      ? `Revised quotation (v${quotation.version}) — ${booking.reference}`
      : `Your quotation — ${booking.reference}`,
    html: layout({
      heading: revision ? 'A revised quotation' : 'Your quotation',
      bodyHtml: body,
      footerNote:
        'Accepting a quotation does not charge you. It confirms the price so we can hold your trip and send payment details separately.',
    }),
  };
}

/* The desk's copy when a customer accepts. Terse: it is read in a list, and
 * what matters is that money is now expected. */
export function quotationAcceptedAlert(booking, quotation, customer) {
  const body = `
<p style="margin:0 0 12px;font-size:14px;line-height:1.7"><strong>${esc(customer?.name ?? booking.contact?.name ?? 'A customer')}</strong> accepted quotation v${quotation.version} on <strong>${esc(booking.reference)}</strong>.</p>
${rows(
  [
    ['Trip', esc(booking.trip?.title ?? 'Custom trip')],
    ['Total', inr(quotation.totalAmount, quotation.currency)],
    quotation.advanceAmount > 0
      ? ['Deposit due', inr(quotation.advanceAmount, quotation.currency)]
      : null,
    ['Travellers', String(booking.travellerCount)],
  ].filter(Boolean),
)}
<p style="margin:16px 0 0;font-size:13.5px;line-height:1.7;color:${BRAND.muted}">The booking is now awaiting payment. It is not confirmed until the suppliers are, which the confirmation gate still checks.</p>`;

  return {
    subject: `Quotation accepted — ${booking.reference}`,
    html: layout({ heading: 'Quotation accepted', bodyHtml: body }),
  };
}

/* And when they decline or ask for changes — the desk needs this at least as
 * much as the acceptance, because it is the one that can still be rescued. */
export function quotationRespondedAlert(booking, quotation, customer) {
  const declined = quotation.status === 'declined';
  const body = `
<p style="margin:0 0 12px;font-size:14px;line-height:1.7"><strong>${esc(customer?.name ?? booking.contact?.name ?? 'A customer')}</strong> ${declined ? 'declined' : 'asked for changes to'} quotation v${quotation.version} on <strong>${esc(booking.reference)}</strong>.</p>
${
  quotation.customerResponse
    ? `<div style="padding:12px;background:#F4F1E8;border-radius:10px;font-size:13.5px;line-height:1.7;color:${BRAND.ink}"><strong>They said:</strong><br>${esc(quotation.customerResponse)}</div>`
    : `<p style="font-size:13.5px;color:${BRAND.muted}">They left no message.</p>`
}
<p style="margin:16px 0 0;font-size:13.5px;line-height:1.7;color:${BRAND.muted}">The booking is still open. ${declined ? 'Decide whether a different price or trip is worth offering.' : 'Send a new version when you have one.'}</p>`;

  return {
    subject: `${declined ? 'Quotation declined' : 'Changes requested'} — ${booking.reference}`,
    html: layout({ heading: declined ? 'Quotation declined' : 'Changes requested', bodyHtml: body }),
  };
}

/*
 * A booking changed status.
 *
 * One template for every move rather than a dozen near-identical ones: what
 * differs between "we are checking" and "you are confirmed" is a sentence,
 * and a dozen files drift apart in tone the moment anyone edits one of them.
 *
 * Statuses with nothing useful to say to a customer are absent from this map
 * and send no mail at all. An email that says "your booking changed" without
 * saying what that means for the reader is worse than silence.
 */
const STATUS_MAIL = {
  AVAILABILITY_CHECK: {
    heading: 'We are checking availability',
    line: 'We are speaking to the guesthouses, drivers and permit offices for your dates. We will come back to you either way.',
  },
  CONFIRMED: {
    heading: 'Your trip is confirmed',
    line: 'Everything is booked and held. We will send joining instructions and what to pack nearer the time.',
  },
  REJECTED: {
    heading: 'We cannot run this trip',
    line: 'We are sorry — we could not make these dates work.',
  },
  CANCELLED: {
    heading: 'Your booking is cancelled',
    line: 'Your booking has been cancelled.',
  },
  COMPLETED: {
    heading: 'Welcome home',
    line: 'Thank you for travelling with us. If you have a few minutes, we would genuinely like to hear how it went.',
  },
  EXPIRED: {
    heading: 'This request has lapsed',
    line: 'We did not hear back, so we have closed this request. If you are still interested, just ask — we can pick it up again.',
  },
};

export function hasStatusMail(status) {
  return Boolean(STATUS_MAIL[status]);
}

export function bookingStatusChanged(booking, customer, { reason } = {}) {
  const copy = STATUS_MAIL[booking.status];
  if (!copy) return null;

  const firstName = String(customer?.name || booking.contact?.name || '').split(' ')[0] || 'there';
  const tripName = booking.trip?.title || 'your trip';

  const body = `
<p style="margin:0 0 14px;font-size:15px">Hello ${esc(firstName)},</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.7">${esc(copy.line)}</p>
${rows(
  [
    ['Trip', esc(tripName)],
    ['Reference', esc(booking.reference)],
    booking.startDate
      ? ['Dates', new Date(booking.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })]
      : null,
  ].filter(Boolean),
)}
${
  /* The reason the desk gave, shown verbatim. A rejection the customer
     cannot understand generates a phone call, and the person answering it
     needs the customer to have read the same words they did. */
  reason
    ? `<div style="margin:16px 0 0;padding:12px;background:#FDF1EE;border:1px solid #F2D2C9;border-radius:10px;font-size:13.5px;line-height:1.7;color:#7A2E1F"><strong>Why</strong><br>${esc(reason)}</div>`
    : ''
}
<p style="margin:18px 0 0;font-size:14px;line-height:1.7"><a href="${bookingUrl(booking)}" style="color:${BRAND.forest}">See your booking</a></p>
<p style="margin:18px 0 0;font-size:14px">Warmly,<br>The Taifer expedition desk</p>`;

  return {
    subject: `${copy.heading} — ${booking.reference}`,
    html: layout({ heading: copy.heading, bodyHtml: body }),
  };
}
