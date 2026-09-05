/*
 * Manali Explorer - journey detail content.
 *
 * REPLACING IMAGERY
 * Every photograph is referenced through the `images` map below, keyed by what
 * the picture should show. Drop a real file into /public (e.g. /journeys/solang.jpg)
 * and change the one line here - no component edits required.
 */
const photo = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

export const images = {
  hero: '/banner1.jpg',
  manaliArrival: photo('1601918774946-25832a4be0d6'),
  solangValley: photo('1516483638261-f4dbaf036963'),
  rohtangPass: photo('1519681393784-d120267933ba'),
  kulluManikaran: photo('1544735716-392fe2489ffa'),
  kasolTosh: photo('1506905925346-21bda4d32df4'),
  departure: photo('1470071459604-3b5ec3a7fe05'),
  paragliding: photo('1516483638261-f4dbaf036963', 900),
  riversideCamping: photo('1504280390367-361c6d9f38f4', 900),
  himachaliFood: photo('1567620905732-2d1ec7ab7445', 900),
  snowActivities: photo('1585937421612-70a008356fbe', 900),
  videoPreview: photo('1596895111956-bf1cf0599ce5', 1600),
};

export const journey = {
  id: 'manali-explorer',
  eyebrow: '6 Days • 5 Nights',
  title: 'Manali',
  titleAccent: 'Explorer',
  subtitle: 'Mountains, valleys & memorable moments.',
  intro:
    'A perfect blend of adventure, relaxation and local experiences in the lap of Himalayas.',
  rating: 4.8,
  reviews: 230,
  badge: 'Best Seller',
  price: 24999,
  priceNote: 'Inclusive of stay, meals, transfers & sightseeing',
  bookingFootnote: 'Flexible Date • Free Cancellation',
  totalDistance: '~320 km',
  heroImage: images.hero,
};

export const quickStats = [
  { icon: 'calendar', value: '6 Days', label: 'Duration' },
  { icon: 'moon', value: '5 Nights', label: 'Stay' },
  { icon: 'pin', value: '12+ Spots', label: 'Covered' },
  { icon: 'meals', value: 'Meals', label: 'Included' },
  { icon: 'support', value: '24/7', label: 'Support' },
];

export const itinerary = [
  {
    day: 1,
    title: 'Arrive in Manali',
    description:
      'Arrive in Manali, check-in at the hotel and relax. Evening at leisure by the riverside.',
    meta: ['Hotel Stay', 'Dinner', 'Altitude: 2,050m'],
    icon: 'bed',
    image: images.manaliArrival,
    imageAlt: 'Timber lodge lit at dusk on the edge of Old Manali',
  },
  {
    day: 2,
    title: 'Solang Valley Adventure',
    description:
      'Enjoy thrilling activities in Solang Valley like paragliding, zorbing & more.',
    meta: ['Breakfast', 'Sightseeing', 'Adventure'],
    icon: 'adventure',
    image: images.solangValley,
    imageAlt: 'Paragliders above the meadows of Solang Valley',
  },
  {
    day: 3,
    title: 'Rohtang Pass Excursion',
    description:
      'Scenic drive to Rohtang Pass. Snow activities and breathtaking Himalayan views.',
    meta: ['Breakfast', 'Sightseeing', 'Photography'],
    icon: 'snow',
    image: images.rohtangPass,
    imageAlt: 'Snow-covered high pass under a clear Himalayan sky',
  },
  {
    day: 4,
    title: 'Kullu & Manikaran',
    description:
      'Visit Kullu Valley, local markets and spiritual Manikaran Sahib Gurudwara.',
    meta: ['Breakfast', 'Sightseeing', 'Local Experience'],
    icon: 'culture',
    image: images.kulluManikaran,
    imageAlt: 'Kullu valley village beneath terraced slopes',
  },
  {
    day: 5,
    title: 'Kasol & Tosh Village',
    description:
      'Explore the beauty of Kasol & Tosh villages. Relax by the Parvati river.',
    meta: ['Breakfast', 'Sightseeing', 'Nature Walk'],
    icon: 'trail',
    image: images.kasolTosh,
    imageAlt: 'River running past pine forest near Kasol',
  },
  {
    day: 6,
    title: 'Departure',
    description:
      'Check-out and proceed for your onward journey with beautiful memories.',
    meta: ['Breakfast', 'Transfer'],
    icon: 'departure',
    image: images.departure,
    imageAlt: 'Mountain road winding out of the valley at sunrise',
  },
];

/*
 * Route map stops. `x`/`y` are coordinates inside the 300x560 SVG viewBox of
 * JourneyRouteMap; `label` is what the pin tooltip shows. The travel path is
 * defined once in that component and each stop is matched to its nearest point
 * on that path at runtime, so nudging a pin never desynchronises the vehicle.
 */
export const routeStops = [
  { day: 1, label: 'Manali', x: 74, y: 62 },
  { day: 2, label: 'Solang Valley', x: 208, y: 132 },
  { day: 3, label: 'Rohtang Pass', x: 104, y: 232 },
  { day: 4, label: 'Kullu & Manikaran', x: 216, y: 330 },
  { day: 5, label: 'Kasol & Tosh', x: 92, y: 430 },
  { day: 6, label: 'Departure', x: 208, y: 512 },
];

export const highlights = [
  { icon: 'road', text: 'Scenic drives & breathtaking views' },
  { icon: 'adventure', text: 'Adventure activities in Solang Valley' },
  { icon: 'snow', text: 'Visit to Rohtang Pass' },
  { icon: 'culture', text: 'Explore local culture & markets' },
  { icon: 'bed', text: 'Comfortable stays & local cuisine' },
];

export const included = [
  'Accommodation (5 Nights)',
  'Daily Breakfast & Dinner',
  'All Sightseeing & Transfers',
  'Toll, Parking & Driver Allowances',
  '24/7 Travel Assistance',
];

export const bestTime = [
  { months: 'March to June', note: 'Pleasant Weather', icon: 'sun' },
  { months: 'September to February', note: 'Snow & Adventure', icon: 'snow' },
];

export const experiences = [
  {
    id: 'paragliding',
    title: 'Paragliding in Solang',
    category: 'Adventure',
    image: images.paragliding,
    alt: 'Paraglider lifting off above Solang Valley',
  },
  {
    id: 'camping',
    title: 'Riverside Camping',
    category: 'Nature',
    image: images.riversideCamping,
    alt: 'Tents pitched beside a Himalayan river',
  },
  {
    id: 'cuisine',
    title: 'Local Himachali Cuisine',
    category: 'Food & Culture',
    image: images.himachaliFood,
    alt: 'A spread of traditional Himachali dishes',
  },
  {
    id: 'snow',
    title: 'Snow Activities',
    category: 'Winter',
    image: images.snowActivities,
    alt: 'Travelers playing in fresh mountain snow',
  },
];

/* Replace with a real, consented review before launch */
export const testimonial = {
  quote: 'The Manali trip was perfectly planned. Every day was memorable!',
  name: 'Rohan Sharma',
  trip: 'Travelled in October 2025',
  rating: 5,
  avatars: [
    photo('1500648767791-00dcc994a43e', 80),
    photo('1494790108377-be9c29b29330', 80),
    photo('1507003211169-0a1dd7228f2d', 80),
  ],
};

export const videoPreview = {
  title: 'Watch Journey Preview',
  caption: 'Manali Explorer · 2 min film',
  poster: images.videoPreview,
  /* Drop an MP4/HLS URL here and the modal plays it instead of the poster */
  src: null,
};

/* ------------------------------------------------------------------ *
 * Per-journey content
 *
 * The detail page can be opened for any journey in journeys.js or
 * groupTours.js. Those records carry a hero, price, rating and highlights,
 * but only some of them carry a real day-by-day plan:
 *
 *   - a hand-authored itinerary (Manali) is used as-is
 *   - a record with its own `itinerary` array is mapped day for day
 *   - a record with neither keeps every other section and shows its real
 *     highlights as the journey outline, rather than inventing a schedule
 * ------------------------------------------------------------------ */
import { journeys } from './journeys';
import { groupTours } from './groupTours';
import { groupTourCards } from './groupToursPage';

/* The hand-authored journey, keyed to the Manali record in journeys.js */
const MANALI_IDS = ['manali-explorer', 'himachal-manali-parvati'];

const dayIcons = ['bed', 'adventure', 'snow', 'culture', 'trail', 'departure'];

/* Trim an itinerary title down to something that fits a map pin */
function shortLabel(text, max = 18) {
  const head = String(text).split(/[—–-]| to | & /)[0].trim();
  return head.length > max ? `${head.slice(0, max - 1).trim()}…` : head;
}

/* Sensible inclusions for a generated day, based on where it falls in the trip */
function metaForDay(index, total) {
  if (index === 0) return ['Hotel Stay', 'Dinner'];
  if (index === total - 1) return ['Breakfast', 'Transfer'];
  return ['Breakfast', 'Sightseeing'];
}

function parseCount(duration, word) {
  const match = new RegExp(`(\\d+)\\s*${word}`, 'i').exec(duration || '');
  return match ? match[1] : null;
}

function statsFor(record) {
  const days = parseCount(record.duration, 'day');
  const nights = parseCount(record.duration, 'night');

  return [
    { icon: 'calendar', value: days ? `${days} Days` : record.duration, label: 'Duration' },
    nights
      ? { icon: 'moon', value: `${nights} Nights`, label: 'Stay' }
      : { icon: 'moon', value: 'Stays', label: 'Included' },
    record.groupSize
      ? { icon: 'pin', value: record.groupSize.replace(' Travelers', ''), label: 'Group Size' }
      : { icon: 'pin', value: '12+ Spots', label: 'Covered' },
    { icon: 'meals', value: 'Meals', label: 'Included' },
    { icon: 'support', value: '24/7', label: 'Support' },
  ];
}

/* Split a title so the last word can take the gold accent */
function splitTitle(title) {
  const words = String(title).trim().split(' ');
  if (words.length === 1) return { title: words[0], titleAccent: '' };
  return { title: words.slice(0, -1).join(' '), titleAccent: words[words.length - 1] };
}

function findRecord(id) {
  return (
    journeys.find((j) => j.id === id) ||
    groupTours.find((t) => t.id === id) ||
    groupTourCards.find((t) => t.id === id) ||
    null
  );
}

export function buildJourneyContent(journeyId) {
  const record = journeyId ? findRecord(journeyId) : null;

  /* Default and Manali both get the fully authored page */
  if (!record || MANALI_IDS.includes(journeyId)) {
    return {
      ...journey,
      price: `₹${journey.price.toLocaleString('en-IN')}`,
      stats: quickStats,
      days: itinerary,
      daysAreScheduled: true,
      highlights,
      routeLabels: routeStops.map((stop) => stop.label),
    };
  }

  const gallery = [record.image, record.secondaryImage].filter(Boolean);
  const recordHighlights = record.highlights || [];
  const hasItinerary = Array.isArray(record.itinerary) && record.itinerary.length > 0;

  const days = hasItinerary
    ? record.itinerary.map((entry, i) => ({
        day: i + 1,
        title: entry.title,
        description: entry.desc || entry.description || '',
        meta: metaForDay(i, record.itinerary.length),
        icon: dayIcons[i % dayIcons.length],
        image: gallery[i % Math.max(gallery.length, 1)] || images.manaliArrival,
        imageAlt: entry.title,
      }))
    : recordHighlights.map((text, i) => ({
        day: i + 1,
        title: text,
        description: '',
        meta: [],
        icon: dayIcons[i % dayIcons.length],
        image: gallery[i % Math.max(gallery.length, 1)] || images.manaliArrival,
        imageAlt: text,
      }));

  return {
    id: record.id,
    eyebrow: record.duration || 'Curated Journey',
    ...splitTitle(record.title),
    subtitle: record.location || record.destination || '',
    intro: record.description || '',
    rating: record.rating,
    reviews: record.reviews,
    badge: record.discount ? record.discount : record.badge || 'Curated',
    price: record.price,
    priceNote: 'Inclusive of stay, meals, transfers & sightseeing',
    bookingFootnote: journey.bookingFootnote,
    totalDistance: journey.totalDistance,
    heroImage: record.image || images.hero,
    stats: statsFor(record),
    days,
    daysAreScheduled: hasItinerary,
    /* Real highlights if the record has them, else its own tags - never filler */
    highlights: (recordHighlights.length ? recordHighlights : record.tags || []).map(
      (text, i) => ({ icon: highlights[i % highlights.length].icon, text })
    ),
    routeLabels: days.map((day) => shortLabel(day.title)),
    /* Used when a record has no stages at all (most group tours) */
    tags: record.tags || [],
    dates: record.dates || null,
    seatsRemaining: record.seatsRemaining ?? null,
    leader: record.leader || null,
  };
}
