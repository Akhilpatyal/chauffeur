/*
 * Trail Journal — the editorial content behind /stories and /stories/:slug,
 * and the "From the Trail Journal" section on the homepage.
 *
 * `id` doubles as the URL slug, so these were already shareable identifiers
 * before the stories pages existed. Keep them stable.
 *
 * `body` is an ordered list of blocks rather than one HTML string: it keeps the
 * markup out of the data, lets the detail page style headings, pull quotes and
 * inline images consistently, and makes a future CMS migration a mapping job
 * rather than a parsing job.
 *
 *   { type: 'paragraph', text }
 *   { type: 'heading',   text }
 *   { type: 'quote',     text, attribution? }
 *   { type: 'list',      items[] }
 *   { type: 'image',     src, alt, caption? }
 */
const photo = (id, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

export const storyCategories = [
  'All stories',
  'Expeditions & High Passes',
  'Mountain Wisdom',
  'Seasonal Guide',
  'Weekend Escapes',
  'Astronomy & Nature',
];

export const journalArticles = [
  {
    id: '7-himalayan-places',
    title: '7 Himalayan places you should see before you turn 30',
    category: 'Expeditions & High Passes',
    readingTime: '6 min read',
    author: 'Rohan Varma',
    authorRole: 'Senior Expedition Leader',
    date: 'May 2026',
    image: '/banner3.jpg',
    excerpt:
      "From the wind-carved pinnacles of Spiti's Pin Valley to the azure heights of Gurudongmar, these are the sacred sanctuaries where the Himalayas test your endurance and reward your spirit.",
    featured: true,
    tags: ['Spiti', 'High Passes', 'Bucket List'],
    relatedJourneys: ['spiti-circuit', 'ladakh-traverse'],
    content:
      'There is an ancient Pahadi proverb: the mountains do not belong to those who measure them, but to those who let the silence enter their chest.',
    body: [
      {
        type: 'paragraph',
        text:
          'There is an ancient Pahadi proverb: the mountains do not belong to those who measure them, but to those who let the silence enter their chest. After a decade of running routes through the Western and Eastern Himalaya, these are the seven places our expedition leaders keep going back to — and the reasons they are worth the leave you will have to take.',
      },
      {
        type: 'heading',
        text: '1. Pin Valley, Spiti',
      },
      {
        type: 'paragraph',
        text:
          'A cold desert inside a cold desert. The Pin runs grey-green through ochre scree, and the villages — Mudh, Sagnam, Kungri — sit at the end of roads that stop existing in winter. Go in late June when the barley is in and the snow leopard trackers are still around to talk to.',
      },
      {
        type: 'heading',
        text: '2. Gurudongmar Lake, North Sikkim',
      },
      {
        type: 'paragraph',
        text:
          'At 17,800 ft, one of the highest lakes in the world, and the only place on this list where altitude is a genuine constraint rather than an inconvenience. Permits are issued at Gangtok and checked three times on the way up. Two nights at Lachen first, without exception.',
      },
      {
        type: 'quote',
        text:
          'You do not acclimatise by being fit. You acclimatise by being patient. The strongest people on a trip are usually the ones who struggle most, because they push through the headache instead of stopping.',
        attribution: 'Tenzin Dorje, lead mountaineer',
      },
      {
        type: 'heading',
        text: '3. Chandratal, Lahaul',
      },
      {
        type: 'paragraph',
        text:
          'The crescent lake past Kunzum Pass. Camping on the shore has been restricted since 2021 and that is a good thing — the designated camps are two kilometres back and the water is clear again. Walk the full circuit at dusk; it takes an hour and almost nobody does it.',
      },
      {
        type: 'image',
        src: photo('1571401835393-8c5f35328320', 1400),
        alt: 'A high-altitude lake ringed by bare scree slopes under a clear sky',
        caption: 'Chandratal at dusk, from the far side of the circuit trail.',
      },
      {
        type: 'heading',
        text: '4 to 7: the ones we will not oversell',
      },
      {
        type: 'list',
        items: [
          'Nako, Kinnaur — a mud-walled village around a lake at 12,000 ft, reached on the old Hindustan-Tibet road.',
          'Double Decker root bridge, Nongriat — 3,500 steps down, and the only way back is up them.',
          'Zanskar, in winter — the Chadar is a serious undertaking and not a holiday; go with people who have done it.',
          'Gurez Valley, Kashmir — opened to civilians recently, and the quietest place on this list by a distance.',
        ],
      },
      {
        type: 'paragraph',
        text:
          'None of these need to happen before you turn thirty. But the version of each of them that exists today will not exist in twenty years, and that is the honest argument for going now.',
      },
    ],
  },

  {
    id: 'beginners-trek-guide',
    title: "A beginner's guide to your first high-altitude mountain trek",
    category: 'Mountain Wisdom',
    readingTime: '4 min read',
    author: 'Ananya Mukherjee',
    authorRole: 'Trek Leader & Wilderness First Responder',
    date: 'May 2026',
    image: photo('1626621341517-bbf3d9990a23', 1600),
    excerpt:
      'How to acclimatize properly, what shoes actually matter, and why pacing your breathing transforms an exhausting ascent into effortless rhythm.',
    featured: false,
    tags: ['First Trek', 'Acclimatisation', 'Gear'],
    relatedJourneys: ['himachal-manali-parvati'],
    body: [
      {
        type: 'paragraph',
        text:
          'Most people who have a bad first trek did not get unlucky. They walked too fast on day one, wore the wrong shoes, and treated a headache as something to push through. All three are fixable before you leave home.',
      },
      { type: 'heading', text: 'Walk slower than feels natural' },
      {
        type: 'paragraph',
        text:
          'The test is simple: you should be able to hold a conversation in full sentences for the entire ascent. If you cannot, you are going too fast — regardless of how fit you are. Fitness lets you recover faster; it does not help you absorb oxygen that is not there.',
      },
      { type: 'heading', text: 'The gear that actually decides your day' },
      {
        type: 'list',
        items: [
          'Shoes with ankle support and a broken-in sole. Not running shoes. Walk 20 km in them before the trip.',
          'Two pairs of wool or synthetic socks. Cotton holds water and gives you blisters.',
          'A warm layer you can put on without taking your pack off.',
          'Two litres of water capacity, minimum, and the discipline to actually drink it.',
        ],
      },
      {
        type: 'quote',
        text:
          'Drink before you are thirsty, eat before you are hungry, and put the layer on before you are cold. At altitude, catching up is much harder than staying ahead.',
        attribution: 'Standard briefing on every Taifer trek',
      },
      { type: 'heading', text: 'Know the three symptoms that end a trek' },
      {
        type: 'paragraph',
        text:
          'A headache that does not respond to water and rest, nausea, and loss of coordination. Any of those and you go down, immediately, with someone. Altitude sickness is not a test of character and descending is not a failure — it is the only treatment that works reliably.',
      },
      {
        type: 'paragraph',
        text:
          'Start with something forgiving. A ridge camp at 9,000 ft with a four-hour walk in teaches you more about how your body handles altitude than any amount of reading, and you can be home by Monday.',
      },
    ],
  },

  {
    id: 'best-time-kashmir',
    title: 'When is the truly best time to visit Kashmir? A seasonal compass',
    category: 'Seasonal Guide',
    readingTime: '5 min read',
    author: 'Farooq Ahmed',
    authorRole: 'Regional Lead, Kashmir',
    date: 'Apr 2026',
    image: photo('1595815771614-ade9d652a65d', 1600),
    excerpt:
      'Spring almond blossoms, golden autumn chinar leaves, or deep winter powder? We break down the real weather and crowd patterns month by month.',
    featured: false,
    tags: ['Kashmir', 'Seasons', 'Planning'],
    relatedJourneys: ['kashmir-meadows'],
    body: [
      {
        type: 'paragraph',
        text:
          'There is no single best time to visit Kashmir, which is an unsatisfying answer until you realise it means four genuinely different valleys share one name. Here is what each season actually gives you.',
      },
      { type: 'heading', text: 'Late March to April — almond blossom' },
      {
        type: 'paragraph',
        text:
          'Badamwari opens pink for about two weeks, the tulip garden follows, and the crowds have not arrived. Days are 15–18°C, nights still cold. The high meadows are closed, so this is a Srinagar-and-Pahalgam season rather than a trekking one.',
      },
      { type: 'heading', text: 'May to June — everything open, everyone there' },
      {
        type: 'paragraph',
        text:
          'Gulmarg gondola running to Apharwat, Sonmarg accessible, the Great Lakes trek opening by late June. Also peak domestic season: book houseboats six weeks out and expect company at every viewpoint.',
      },
      { type: 'heading', text: 'September to October — the one we would pick' },
      {
        type: 'paragraph',
        text:
          'Chinars turn, rice is harvested, the light goes long and gold, and the crowds have gone home. Trekking is still open until mid-October. If you can only go once, go now.',
      },
      {
        type: 'quote',
        text:
          'Ask anyone from Srinagar which month they would choose and they will say October. Then they will tell you not to tell anyone.',
      },
      { type: 'heading', text: 'December to February — snow, and real cold' },
      {
        type: 'paragraph',
        text:
          'Gulmarg becomes a serious ski destination and Srinagar drops below freezing for weeks. Chillai Kalan, the forty coldest days, starts in late December. Power cuts are routine; heated accommodation is not a luxury here, it is the whole plan.',
      },
      {
        type: 'list',
        items: [
          'Blossom and quiet: late March to mid-April',
          'Everything accessible: late May to June',
          'Best overall light and least crowding: September to mid-October',
          'Skiing and snow: January to February',
          'Avoid: mid-July to August, when the monsoon reaches the Pir Panjal and views close in',
        ],
      },
    ],
  },

  {
    id: 'hidden-long-weekend-escapes',
    title: '10 hidden escapes within 8 hours of Delhi and Mumbai',
    category: 'Weekend Escapes',
    readingTime: '5 min read',
    author: 'Siddharth Rao',
    authorRole: 'Routes & Itineraries',
    date: 'May 2026',
    image: photo('1588668214407-6ea9a6d8c272', 1600),
    excerpt:
      'Ditch the crowded tourist malls. Here are tranquil pine hamlets, private heritage Havelis, and secluded coastal coves for quick recharge.',
    featured: false,
    tags: ['Weekend', 'Short Breaks', 'Delhi', 'Mumbai'],
    relatedEscapes: ['kasol-tosh-riverside', 'triund-sunrise-trek', 'jaipur-heritage-weekend'],
    body: [
      {
        type: 'paragraph',
        text:
          'Every hill station within six hours of a metro is full by 10 am on a Saturday. These are the places one valley over — close enough for two nights, far enough that you are not queuing for a viewpoint.',
      },
      { type: 'heading', text: 'From Delhi' },
      {
        type: 'list',
        items: [
          'Tosh, Parvati Valley — one village past Kasol, and reachable only on foot from Barshaini, which is exactly why it stays quiet.',
          'Triund, Dharamshala — a ridge camp at 9,350 ft after a four-hour walk. The best first trek in the country.',
          'Pangot, Uttarakhand — 15 km past Nainital, 580 recorded bird species, and almost no day-trippers.',
          'Chopta, Uttarakhand — meadows at 8,800 ft and the Tungnath temple walk above them.',
          'Jaipur, Rajasthan — not hidden, but Amer at 7 am is a completely different monument from Amer at 11.',
        ],
      },
      { type: 'heading', text: 'From Mumbai' },
      {
        type: 'list',
        items: [
          'Kashid — the beach Alibaug traffic drives past, 30 km further south.',
          'Bhandardara — Arthur Lake, Randha falls and the Kalsubai night trek in one weekend.',
          'Tamhini Ghat — monsoon-only, and worth the one window it gives you.',
          'Gokarna — an overnight train and five beaches joined by a cliff path.',
          'Malvan — the Sindhudurg sea fort and the best fish thali on the Konkan coast.',
        ],
      },
      {
        type: 'quote',
        text:
          'The trick is not finding somewhere nobody knows. It is going to a place everybody knows at the hour nobody goes.',
      },
      {
        type: 'paragraph',
        text:
          'Three of these run as fixed-departure weekend escapes with transport and stays arranged, which mostly saves you the Friday-night logistics. The rest are perfectly doable on your own with a car and an early start.',
      },
    ],
  },

  {
    id: 'spiti-stargazing-guide',
    title: 'The art of high-altitude stargazing: Bortle Class 1 skies in Spiti',
    category: 'Astronomy & Nature',
    readingTime: '7 min read',
    author: 'Kavya Nambiar',
    authorRole: 'Naturalist & Astrophotography Guide',
    date: 'Mar 2026',
    /* Placeholder: a Bortle 1 night-sky photograph belongs here. */
    image: '/banner3.jpg',
    excerpt:
      'Standing at 14,000 ft where the atmosphere is razor-thin, the Milky Way casts actual shadows on the Himalayan scree slopes.',
    featured: false,
    tags: ['Spiti', 'Stargazing', 'Astrophotography'],
    relatedJourneys: ['spiti-circuit'],
    body: [
      {
        type: 'paragraph',
        text:
          'Bortle Class 1 is the darkest sky the scale describes, and there are not many places left on the planet that qualify. Langza, Komic and Hikkim all do. At 14,000 ft with no settlement light for forty kilometres, the Milky Way is bright enough to throw a faint shadow on pale scree — which sounds like an exaggeration until the first time you see it.',
      },
      { type: 'heading', text: 'Pick the moon, not the month' },
      {
        type: 'paragraph',
        text:
          'Most people plan around weather and get defeated by a full moon. A gibbous moon washes out everything but the brightest stars. Aim for the five nights either side of a new moon, then worry about cloud cover.',
      },
      { type: 'heading', text: 'What the altitude actually changes' },
      {
        type: 'list',
        items: [
          'Thinner atmosphere means less scattering — stars hold their colour instead of twinkling into white.',
          'Humidity is near zero, so there is almost no airglow on long exposures.',
          'It is also brutally cold. Batteries die in under an hour; keep spares inside your jacket.',
        ],
      },
      {
        type: 'image',
        src: '/banner3.jpg',
        alt: 'A bare high-altitude ridge above a glacial lake in Spiti',
        caption: 'The Langza plateau, late September.',
      },
      { type: 'heading', text: 'A starting point for the camera' },
      {
        type: 'paragraph',
        text:
          'Widest lens you own, aperture wide open, ISO 3200, 15 seconds, manual focus set on a bright star using live view at maximum magnification. Shoot raw. Then stop fiddling and look up for twenty minutes — the photographs are not the reason to be there.',
      },
      {
        type: 'quote',
        text:
          'Give your eyes half an hour in full darkness with no phone screen. What you can see at minute thirty is not the same sky you saw at minute one.',
        attribution: 'Kavya Nambiar',
      },
      {
        type: 'paragraph',
        text:
          'Late September and early October are the sweet spot: the monsoon has cleared the dust out of the air, the roads are still open, and the nights are long without being unsurvivable.',
      },
    ],
  },
];

export function getStory(slug) {
  return journalArticles.find((article) => article.id === slug) ?? null;
}

/*
 * Related stories: same category first, then the rest in publication order, so
 * the rail is always full even for a category with a single entry.
 */
export function relatedStories(slug, limit = 3) {
  const current = getStory(slug);
  const others = journalArticles.filter((article) => article.id !== slug);
  if (!current) return others.slice(0, limit);

  const sameCategory = others.filter((article) => article.category === current.category);
  const rest = others.filter((article) => article.category !== current.category);
  return [...sameCategory, ...rest].slice(0, limit);
}
