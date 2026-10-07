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
