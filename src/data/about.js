const photo = (id, w = 1400) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

export const aboutImages = {
  hero: '/aboutus.png',
  /* Sepia summit sketch used as section atmosphere */
  mountainSketch: '/footer.png',
  whoWeAre: photo('1601918774946-25832a4be0d6'),
  story: photo('1470071459604-3b5ec3a7fe05'),
  whyTaifer: photo('1551632811-561732d1e306'),
  traveler: photo('1504280390367-361c6d9f38f4'),
  finalCta: photo('1464822759023-fed622ff2c3b'),
};

export const aboutStats = [
  { icon: 'mountain', value: 10, suffix: 'K+', label: 'Happy Explorers' },
  { icon: 'map-pin', value: 250, suffix: '+', label: 'Destinations' },
  { icon: 'compass', value: 50, suffix: '+', label: 'Curated Journeys' },
  { icon: 'star', value: 4.9, suffix: '★', label: 'Average Rating' },
  { icon: 'users', value: 10, suffix: '+', label: 'Years of Experience' },
];

export const philosophyPillars = [
  {
    icon: 'leaf',
    title: 'Sustainable\nTravel',
    body: 'We minimize our impact and promote eco-friendly experiences.',
  },
  {
    icon: 'users',
    title: 'Local\nCommunities',
    body: 'We partner with locals to create jobs and keep experiences authentic.',
  },
  {
    icon: 'shield',
    title: 'Safe &\nResponsible',
    body: 'Your safety is our priority. Every trip is planned with care and responsibility.',
  },
  {
    icon: 'heart',
    title: 'Real\nExperiences',
    body: 'No tourist traps. Only real places and real stories.',
  },
];

export const storyChapters = [
  {
    step: '01',
    title: 'The Beginning',
    year: '2016',
    body: 'A handful of friends, one borrowed van and a winter road to Spiti. We came back with more questions than photographs.',
    image: photo('1506905925346-21bda4d32df4'),
  },
  {
    step: '02',
    title: 'Finding the Unexplored',
    year: '2019',
    body: 'We started mapping the routes nobody was selling — hamlets past the last bus stop, passes that open for eleven weeks a year.',
    image: photo('1519681393784-d120267933ba'),
  },
  {
    step: '03',
    title: 'Growing the Community',
    year: '2022',
    body: 'Travelers came back and brought people with them. Guides, hosts and drivers became partners rather than vendors.',
    image: photo('1533105079780-92b9be482077'),
  },
  {
    step: '04',
    title: 'The Journey Ahead',
    year: 'Today',
    body: 'Ten years in, the brief is unchanged: fewer people per trip, deeper places, and journeys that stay with you long after.',
    image: photo('1454391304352-2bf4678b1a7a'),
  },
];

export const whyPoints = [
  {
    number: '01',
    icon: 'map',
    title: 'Local Expertise',
    body: 'Our routes are built with guides who grew up on these trails, not from a search engine.',
  },
  {
    number: '02',
    icon: 'sparkles',
    title: 'Handpicked Experiences',
    body: 'Every stay, meal and detour is visited and verified by our team before it reaches you.',
  },
  {
    number: '03',
    icon: 'tent',
    title: 'Small Group Adventures',
    body: 'Twelve travelers, never forty. Small groups move quietly and go further in.',
  },
  {
    number: '04',
    icon: 'headset',
    title: 'Real Human Support',
    body: 'A person answers — before you book, on the road and long after you are home.',
  },
];

export const communityImages = [
  photo('1517824806704-9040b037703b', 900),
  photo('1533105079780-92b9be482077', 900),
  photo('1478131143081-80f7f84ca84d', 900),
  photo('1519085360753-af0119f7cbe7', 900),
  photo('1506905925346-21bda4d32df4', 900),
];

export const communityStats = [
  { value: '10K+', label: 'Explorers' },
  { value: '50+', label: 'Journeys' },
  { value: '250+', label: 'Destinations' },
];

/* Replace with a real, consented traveler review before launch */
export const travelerStory = {
  quote:
    "Taifer didn't just plan a trip for us. They gave us memories we'll tell for a lifetime.",
  name: 'Rohan & Ananya',
  trip: 'Spiti Valley Travelers',
  rating: 4.9,
  reviewCount: '2,900+',
  image: aboutImages.traveler,
  avatars: [
    photo('1500648767791-00dcc994a43e', 80),
    photo('1494790108377-be9c29b29330', 80),
    photo('1507003211169-0a1dd7228f2d', 80),
    photo('1534528741775-53994a69daeb', 80),
  ],
};
