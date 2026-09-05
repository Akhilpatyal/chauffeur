/*
 * Legal page content.
 *
 * IMPORTANT — READ BEFORE LAUNCH
 * The sections and headings below are the standard structure an Indian travel
 * business needs, and the operational facts (cancellation windows, contact
 * details) match what the rest of the site already states. They are NOT legal
 * advice and are not a substitute for review by your lawyer.
 *
 * Anything wrapped in [[ ]] is a deliberate placeholder that must be filled in
 * or removed before you publish — the page renders these in amber so they are
 * impossible to miss.
 */
export const legalMeta = {
  lastUpdated: '5 September 2026',
  company: 'TAIFER — The Great Outdoors',
  entity: '[[Registered legal entity name, e.g. Taifer Travel Pvt. Ltd.]]',
  registration: '[[CIN / firm registration number]]',
  gstin: '[[GSTIN]]',
  email: 'hello@taifer.com',
  phone: '+91 98765 43210',
  address: 'Mall Road, Manali, Himachal Pradesh 175131, India',
  jurisdiction: '[[City]], Himachal Pradesh',
};

export const legalPages = {
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    intro:
      'This policy explains what we collect when you enquire about or book a journey with us, why we collect it, and the choices you have.',
    sections: [
      {
        heading: 'Information we collect',
        body: 'When you send an enquiry, subscribe to trail notes or book a journey, we collect the details you give us: name, email address, phone number, travel dates, group size and any preferences or medical information you choose to share so we can plan safely. We also collect basic technical data such as browser type and pages visited.',
      },
      {
        heading: 'How we use it',
        body: 'To answer your enquiry, prepare itineraries and quotes, make bookings with stays and transport partners on your behalf, send trip documents, and — only if you opt in — send occasional travel notes. We do not sell your data.',
      },
      {
        heading: 'Who we share it with',
        body: 'Only the partners needed to deliver your trip: accommodation providers, transport operators, guides and, where applicable, payment processors. Each receives the minimum needed. [[List your payment gateway and any analytics or email tools you use.]]',
      },
      {
        heading: 'How long we keep it',
        body: 'Enquiry records are kept for [[retention period]]. Booking and invoice records are kept for as long as Indian tax law requires.',
      },
      {
        heading: 'Your rights',
        body: `You can ask us to show, correct or delete the personal data we hold about you, and you can unsubscribe from emails at any time using the link in any message or by writing to ${legalMeta.email}.`,
      },
      {
        heading: 'Cookies',
        body: '[[State whether the site uses analytics or marketing cookies. At the time of writing this site stores nothing beyond what the browser needs to display the page — update this line if you add analytics.]]',
      },
      {
        heading: 'Contact',
        body: `Questions about this policy: ${legalMeta.email} or ${legalMeta.phone}, ${legalMeta.address}.`,
      },
    ],
  },

  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    intro:
      'These terms apply when you book a journey, group tour or stay through us. Please read them alongside the specific itinerary you are booking.',
    sections: [
      {
        heading: 'Who we are',
        body: `${legalMeta.company}, operated by ${legalMeta.entity}, registration ${legalMeta.registration}, GSTIN ${legalMeta.gstin}, at ${legalMeta.address}.`,
      },
      {
        heading: 'Booking and confirmation',
        body: 'A booking is confirmed only when we acknowledge it in writing and the deposit has been received. Prices quoted are per person on the basis stated in the itinerary and may change until the booking is confirmed.',
      },
      {
        heading: 'Payment',
        body: '[[State your deposit percentage, the balance due date before departure, and the payment methods you accept.]]',
      },
      {
        heading: 'What is included',
        body: 'Each itinerary lists its inclusions and exclusions. Anything not listed — airfare to the start point, personal expenses, travel insurance, entry fees not specified, and costs arising from delays outside our control — is not included.',
      },
      {
        heading: 'Changes by you',
        body: 'Date changes and name changes are subject to availability and to any charges levied by our partners. Ask us as early as possible.',
      },
      {
        heading: 'Changes or cancellation by us',
        body: 'Mountain travel depends on weather, road and permit conditions. We may alter a route, stay or activity for safety reasons, and will offer the nearest reasonable alternative. If we cancel a departure outright, you may choose a full refund or an alternative date.',
      },
      {
        heading: 'Your responsibilities',
        body: 'You are responsible for valid identification and permits, for disclosing medical conditions that affect high-altitude travel, and for behaving in a way that does not endanger you, other travellers or local communities.',
      },
      {
        heading: 'Travel insurance',
        body: '[[State whether insurance is required or recommended, and what cover travellers should hold for high-altitude journeys.]]',
      },
      {
        heading: 'Liability',
        body: '[[Your lawyer should draft this clause. It must state the limits of your liability and cannot exclude liability that Indian law does not allow you to exclude.]]',
      },
      {
        heading: 'Governing law',
        body: `These terms are governed by the laws of India, and disputes fall under the courts of ${legalMeta.jurisdiction}.`,
      },
    ],
  },

  cancellation: {
    slug: 'cancellation',
    title: 'Cancellation & Refund Policy',
    intro:
      'Plans change. This is what happens to your money when they do. The window that applies to your trip is shown on your itinerary and takes precedence over the summary below.',
    sections: [
      {
        heading: 'Cancellation by you',
        body: '[[Confirm these bands with your finance and partner terms before publishing.]] As a guide: cancel 21 days or more before departure for a full refund less any non-recoverable deposit; 20 to 8 days before departure for a partial refund; 7 days or fewer before departure, no refund, as stays, permits and transport are committed by then.',
      },
      {
        heading: 'How to cancel',
        body: `Write to ${legalMeta.email} or call ${legalMeta.phone}. The cancellation takes effect on the date we receive your written request.`,
      },
      {
        heading: 'Refund timelines',
        body: 'Approved refunds are returned to the original payment method within [[number]] working days of confirmation. Bank or gateway charges, where applicable, are deducted.',
      },
      {
        heading: 'Cancellation by us',
        body: 'If we cancel a departure, you may take a full refund or move to another date at no extra cost. We are not able to reimburse separately booked flights or trains, which is why we recommend refundable tickets.',
      },
      {
        heading: 'Weather, roads and force majeure',
        body: 'Passes close, roads wash out and permits get withdrawn. Where a trip is disrupted by events outside our control we will do everything we can to reroute; costs already committed to partners may not be recoverable.',
      },
      {
        heading: 'No-shows and unused services',
        body: 'Services not used during a journey — a missed night, a skipped activity — are not refundable.',
      },
    ],
  },
};
