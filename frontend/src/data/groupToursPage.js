/*
 * Group Tours landing page content.
 *
 * `groupTourCards` doubles as a record source for the journey detail page -
 * journeyDetail.js looks tours up here by id, so "View Details" opens a real
 * page for each card. Ids that already exist as journeys (manali-explorer,
 * spiti-circuit) resolve to those richer records instead.
 */
const photo = (id, w = 1000) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

export const groupHero = {
  eyebrow: 'Explore Together • Create Memories',
  title: 'Group',
  titleAccent: 'Tours',
  subtitle: 'Shared journeys. Bigger smiles.',
  intro:
    'Carefully curated group experiences with like-minded travelers. More connections, more adventures.',
  image: '/banner3.jpg',
  assurances: [
    { icon: 'users', label: 'Small Groups' },
    { icon: 'shield', label: 'Safe & Trusted' },
    { icon: 'price', label: 'Best Price Guarantee' },
  ],
};

export const groupBenefits = {
  title: 'Group Travel Benefits',
  items: [
    { icon: 'route', label: 'Handpicked Itineraries' },
    { icon: 'leader', label: 'Expert Tour Leaders' },
    { icon: 'stay', label: 'Comfortable Stays' },
    { icon: 'support', label: '24/7 On-Trip Support' },
  ],
  cta: 'Get Group Quote',
  footnote: 'Custom Groups • Flexible Dates',
};

export const searchTrust = [
  { icon: 'sparkles', label: 'Curated Stays' },
  { icon: 'shield', label: 'Best Price Assured' },
  { icon: 'star', label: 'Verified Reviews' },
  { icon: 'calendar', label: 'Flexible Cancellation' },
];

export const tourFilters = [
  'All Tours',
  'Adventure',
  'Weekend Getaways',
  'Cultural',
  'Himalayan',
];

export const groupTourCards = [
  {
    id: 'manali-explorer',
    dates: '12 Dec – 17 Dec 2025',
    seatsRemaining: 6,
    badge: 'Best Seller',
    category: 'Himalayan',
    duration: '6D · 5N',
    title: 'Manali Explorer',
    description: 'Mountains, valleys & memorable moments.',
    includes: ['Meals', 'Stay', 'Sightseeing'],
    groupSize: '8 - 14 People',
    price: '₹24,999',
    image: photo('1601918774946-25832a4be0d6'),
    rating: 4.8,
    reviews: 230,
    highlights: [
      'Solang Valley adventure day',
      'Rohtang Pass snow excursion',
      'Kullu, Manikaran & Kasol villages',
    ],
  },
  {
    id: 'kasol-tosh-escape',
    dates: '19 Dec – 23 Dec 2025',
    seatsRemaining: 4,
    badge: 'Popular',
    category: 'Weekend Getaways',
    duration: '5D · 4N',
    title: 'Kasol & Tosh Escape',
    description: 'Rivers, cafes & mountain magic.',
    includes: ['Meals', 'Stay', 'Sightseeing'],
    groupSize: '6 - 12 People',
    price: '₹19,999',
    image: photo('1506905925346-21bda4d32df4'),
    rating: 4.7,
    reviews: 168,
    highlights: [
      'Parvati river walks in Kasol',
      'Slow mornings in Tosh village',
      'Bonfire evenings with the group',
    ],
  },
  {
    id: 'spiti-circuit',
    dates: '02 Jan – 08 Jan 2026',
    seatsRemaining: 8,
    badge: 'Adventure',
    category: 'Adventure',
    duration: '7D · 6N',
    title: 'Spiti Valley Expedition',
    description: 'High passes, monasteries & raw beauty.',
    includes: ['Meals', 'Stay', 'Sightseeing'],
    groupSize: '8 - 12 People',
    price: '₹28,999',
    image: photo('1519681393784-d120267933ba'),
    rating: 4.95,
    reviews: 248,
  },
  {
    id: 'himachal-heritage-trail',
    dates: '09 Jan – 14 Jan 2026',
    seatsRemaining: 5,
    badge: 'Cultural',
    category: 'Cultural',
    duration: '6D · 5N',
    title: 'Himachal Heritage Trail',
    description: 'Temples, traditions & timeless stories.',
    includes: ['Meals', 'Stay', 'Sightseeing'],
    groupSize: '8 - 14 People',
    price: '₹22,999',
    image: photo('1544735716-392fe2489ffa'),
    rating: 4.7,
    reviews: 142,
    highlights: [
      'Old temples of the Kullu valley',
      'Craft villages and local markets',
      'Slate-roof heritage homestays',
    ],
  },
  {
    id: 'hampta-pass-trek',
    dates: '23 Jan – 28 Jan 2026',
    seatsRemaining: 7,
    badge: 'Trekking',
    category: 'Adventure',
    duration: '6D · 5N',
    title: 'Hampta Pass Trek',
    description: 'Thrilling trek through scenic landscapes.',
    includes: ['Meals', 'Stay', 'Sightseeing'],
    groupSize: '6 - 10 People',
    price: '₹23,999',
    image: photo('1551632811-561732d1e306'),
    rating: 4.85,
    reviews: 196,
    highlights: [
      'Crossing the 14,100 ft Hampta Pass',
      'Camping at Balu ka Ghera',
      'Chandratal lake detour',
    ],
  },
];

export const whyTravelGroup = [
  {
    icon: 'friends',
    title: 'Make New Friends',
    body: 'Connect with like-minded travelers and build lifelong friendships.',
  },
  {
    icon: 'shared',
    title: 'Shared Experiences',
    body: 'Share adventures, laughter and unforgettable moments together.',
  },
  {
    icon: 'leader',
    title: 'Expert Guidance',
    body: 'Travel with experienced tour leaders who know the way.',
  },
  {
    icon: 'hassle',
    title: 'Hassle-Free Travel',
    body: 'We handle everything so you can focus on the journey.',
  },
  {
    icon: 'price',
    title: 'Value for Money',
    body: 'Group discounts on stays, transport & activities to save more.',
  },
  {
    icon: 'shield',
    title: 'Safe & Secure',
    body: 'Your safety is our priority with trusted partners and 24/7 support.',
  },
];

export const groupInclusions = [
  { icon: 'stay', label: 'Stay', note: 'Comfortable accommodation' },
  { icon: 'meals', label: 'Meals', note: 'Daily breakfast & dinner' },
  { icon: 'transport', label: 'Transport', note: 'All transfers & sightseeing' },
  { icon: 'activities', label: 'Activities', note: 'Entry fees & experiences' },
  { icon: 'leader', label: 'Tour Leader', note: 'Expert guidance throughout' },
  { icon: 'support', label: 'Support', note: '24/7 on-trip assistance' },
];

export const departures = [
  {
    id: 'dep-manali-12dec',
    tourId: 'manali-explorer',
    day: '12',
    month: 'Dec',
    title: 'Manali Explorer',
    duration: '6 Days · 5 Nights',
    seatsLeft: 6,
    price: '₹24,999',
  },
  {
    id: 'dep-kasol-19dec',
    tourId: 'kasol-tosh-escape',
    day: '19',
    month: 'Dec',
    title: 'Kasol & Tosh Escape',
    duration: '5 Days · 4 Nights',
    seatsLeft: 4,
    price: '₹19,999',
  },
  {
    id: 'dep-spiti-02jan',
    tourId: 'spiti-circuit',
    day: '02',
    month: 'Jan',
    title: 'Spiti Valley Expedition',
    duration: '7 Days · 6 Nights',
    seatsLeft: 8,
    price: '₹28,999',
  },
  {
    id: 'dep-heritage-09jan',
    tourId: 'himachal-heritage-trail',
    day: '09',
    month: 'Jan',
    title: 'Himachal Heritage Trail',
    duration: '6 Days · 5 Nights',
    seatsLeft: 5,
    price: '₹22,999',
  },
];

export const privateGroup = {
  image: photo('1517824806704-9040b037703b', 900),
  imageAlt: 'A tour group gathered together on a mountain road',
  title: 'Planning a Private Group?',
  body: 'We organize custom trips for families, friends, corporate teams & more.',
  perks: [
    'Custom Itineraries',
    'Special Group Discounts',
    'Flexible Dates',
    'Dedicated Support',
  ],
  cta: 'Get Custom Quote',
};

/* Replace with real, consented reviews before launch */
export const groupTestimonials = [
  {
    id: 'priya',
    quote:
      'The Manali group tour was amazing! Our coordinator was very helpful and the group was full of positive energy.',
    name: 'Priya Sharma',
    rating: 5,
    avatars: [photo('1494790108377-be9c29b29330', 80), photo('1500648767791-00dcc994a43e', 80)],
  },
  {
    id: 'arjun',
    quote:
      'Spiti trip with Taifer was a dream come true. Great arrangements, good stays and an incredible group of people.',
    name: 'Arjun Mehta',
    rating: 5,
    avatars: [photo('1507003211169-0a1dd7228f2d', 80), photo('1534528741775-53994a69daeb', 80)],
  },
  {
    id: 'neha',
    quote:
      'Well-organized, safe and budget-friendly. Highly recommend their group tours for anyone who loves to travel!',
    name: 'Neha Verma',
    rating: 5,
    avatars: [photo('1573497019940-1c28c88b4f3e', 80), photo('1517841905240-472988babdf9', 80)],
  },
];
