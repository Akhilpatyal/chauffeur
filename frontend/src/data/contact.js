/*
 * Contact page content.
 * Phone, email and address are the same details the footer uses - update both
 * if they change.
 */
export const contactDetails = {
  phone: '+91 98765 43210',
  phoneHref: 'tel:+919876543210',
  whatsapp: 'Chat on WhatsApp',
  whatsappHref: 'https://wa.me/919876543210',
  email: 'hello@taifer.com',
  emailHref: 'mailto:hello@taifer.com',
  addressLines: ['Taifer — The Great Outdoors', 'Mall Road, Manali', 'Himachal Pradesh 175131'],
  mapsHref: 'https://maps.google.com/?q=Mall+Road+Manali+Himachal+Pradesh',
};

export const contactHero = {
  eyebrow: 'We’d love to hear from you',
  title: 'Get in',
  titleAccent: 'Touch',
  subtitle: 'Real people, real answers — usually within two hours.',
  image: '/banner2.jpg',
};

export const deskCard = {
  title: 'Expedition Desk',
  status: 'Open today',
  hours: [
    { days: 'Mon – Sat', time: '9:00 – 19:00' },
    { days: 'Sunday', time: '10:00 – 16:00' },
  ],
  note: 'IST (GMT +5:30)',
};

export const heroTrust = [
  { icon: 'clock', label: 'Replies within 2 hours' },
  { icon: 'compass', label: 'Expert trip planners' },
  { icon: 'price', label: 'No booking fees' },
  { icon: 'chat', label: 'Support in Hindi & English' },
];

export const contactMethods = [
  {
    id: 'call',
    icon: 'phone',
    title: 'Call Us',
    body: 'Speak to a trip planner about routes, dates and pricing.',
    action: contactDetails.phone,
    href: contactDetails.phoneHref,
  },
  {
    id: 'whatsapp',
    icon: 'chat',
    title: 'WhatsApp',
    body: 'Quick questions, photos of stays, live updates on the road.',
    action: 'Start a chat',
    href: contactDetails.whatsappHref,
  },
  {
    id: 'email',
    icon: 'mail',
    title: 'Email Us',
    body: 'Send a brief and we’ll come back with a draft itinerary.',
    action: contactDetails.email,
    href: contactDetails.emailHref,
  },
  {
    id: 'visit',
    icon: 'pin',
    title: 'Visit Us',
    body: 'Drop by the Manali desk for a chai and a map on the table.',
    action: 'Get directions',
    href: contactDetails.mapsHref,
  },
];

/* Options shown in the enquiry form's interest field */
export const enquiryTopics = [
  'A custom journey',
  'A group tour',
  'Hotels & stays',
  'Corporate / large group',
  'Something else',
];

export const officeHours = deskCard.hours;

export const socials = [
  { id: 'instagram', label: 'Instagram', href: '#' },
  { id: 'facebook', label: 'Facebook', href: '#' },
  { id: 'linkedin', label: 'LinkedIn', href: '#' },
];

export const faqs = [
  {
    q: 'How quickly will I hear back?',
    a: 'Within two working hours on weekdays, and the same day on Sundays. Enquiries sent after 19:00 IST are answered first thing next morning.',
  },
  {
    q: 'Can you build a completely custom itinerary?',
    a: 'Yes — most of what we run started as a custom brief. Tell us your dates, pace and budget and we will send a draft route within 48 hours.',
  },
  {
    q: 'Do you charge a planning fee?',
    a: 'No. Planning, route drafts and revisions are free. You only pay once you confirm a journey.',
  },
  {
    q: 'What is your cancellation policy?',
    a: 'Most journeys are free to cancel up to 21 days before departure. Exact terms travel with each itinerary and are shown before you pay.',
  },
  {
    q: 'Do you handle corporate or large groups?',
    a: 'We do — families, offsites and college groups from 15 to 60 travellers. Mention the headcount in your message and we will assign a dedicated coordinator.',
  },
];
