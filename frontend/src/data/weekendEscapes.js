/*
 * Weekend Escapes — short trips reachable from a major city in a night's drive
 * or a short flight.
 *
 * The navbar and the hero category rail both advertised "Weekend Escapes" with
 * nowhere to send anyone. These are the same shape as a journey but shorter and
 * sold on how little leave you have to take, so they carry `departFrom` and
 * `travelTime` instead of `elevation`.
 *
 * Shared by the listing page (/weekend-escapes) and the detail page
 * (/weekend-escapes/:slug). Keep `slug` stable — it is the public URL.
 */
/*
 * Imagery.
 *
 * Hero shots prefer the first-party files in /public — they are self-hosted,
 * already optimised for this site and unambiguously the right terrain. The
 * Unsplash ids below were each checked against what they actually depict;
 * several ids used elsewhere in this project are portraits or stock office
 * photos, so nothing is reused on the assumption that an id is a landscape.
 *
 * Swapping in real photography later is a one-line change per entry.
 */
const photo = (id, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

export const escapeFilters = [
  { id: 'all', label: 'All escapes' },
  { id: 'mountains', label: 'Mountains' },
  { id: 'treks', label: 'Treks' },
  { id: 'riverside', label: 'Riverside' },
  { id: 'heritage', label: 'Heritage' },
];

export const weekendEscapes = [
  {
    slug: 'kasol-tosh-riverside',
    title: 'Kasol & Tosh Riverside Weekend',
    location: 'Parvati Valley, Himachal Pradesh',
    state: 'Himachal Pradesh',
    tagline: 'Two nights by the Parvati, no itinerary to keep up with.',
    category: 'riverside',
    duration: '3 Days · 2 Nights',
    nights: 2,
    departFrom: 'Delhi',
    travelTime: '12 hr overnight drive',
    difficulty: 'Easy',
    bestTime: 'Mar – Jun · Sep – Nov',
    groupSize: '10–14 Travellers',
    price: '₹6,499',
    originalPrice: '₹8,999',
    discount: '28% OFF',
    rating: 4.8,
    reviews: 164,
    badge: 'Most Booked',
    image: '/banner1.jpg',
    gallery: [
      '/banner1.jpg',
      photo('1571401835393-8c5f35328320'),
      photo('1626621341517-bbf3d9990a23'),
    ],
    tags: ['Riverside Camp', 'Bonfire', 'Village Walk', 'Solo-Friendly'],
    description:
      'Leave Delhi on Friday night, wake up to the Parvati running past your tent. Two slow days of riverside cafés, a walk up to Tosh through pine and apple orchards, and a bonfire that nobody wants to leave. Back at your desk Monday morning.',
    highlights: [
      'Riverside camp at Kasol with the Parvati audible all night',
      'Easy gradient walk from Barshaini up to Tosh village',
      'Himachali dham lunch cooked in a village kitchen',
      'Bonfire and acoustic night with the group',
      'Free afternoon for the Kasol café trail',
    ],
    itinerary: [
      {
        day: 'Night 0',
        title: 'Delhi departure',
        description:
          'Board the overnight Volvo from Majnu ka Tila around 9 pm. Sleep through the plains and wake up near Bhuntar.',
      },
      {
        day: 'Day 01',
        title: 'Arrive Kasol — riverside camp',
        description:
          'Transfer along the Parvati to camp, settle in, and spend the afternoon on the riverbank. Bonfire and dinner after dark.',
      },
      {
        day: 'Day 02',
        title: 'Tosh village walk',
        description:
          'Drive to Barshaini and walk up to Tosh — about two gentle hours. Lunch at a village guesthouse with the Pin Parvati range in view, back to camp by evening.',
      },
      {
        day: 'Day 03',
        title: 'Kasol to Delhi',
        description:
          'A slow morning on the river, then the drive back to Bhuntar for the overnight bus. Reach Delhi early Monday.',
      },
    ],
    inclusions: [
      '2 nights riverside camping on twin/triple sharing',
      '2 breakfasts and 2 dinners, plus one village lunch',
      'All local transfers in the valley by tempo traveller',
      'Trip captain and a local guide for the Tosh walk',
      'Bonfire, permits and camp fees',
    ],
    exclusions: [
      'Delhi–Bhuntar–Delhi Volvo (we book it for you at cost)',
      'Lunches on day 1 and day 3',
      'Anything personal: cafés, shopping, tips',
      'Travel insurance',
    ],
    importantInfo: [
      'The Tosh walk is easy but unpaved — trail shoes, not sneakers.',
      'Nights drop to single digits even in summer; carry one warm layer.',
      'Camps have shared washrooms and intermittent mobile signal.',
    ],
    relatedJourneys: ['spiti-circuit', 'himachal-manali-parvati'],
  },

  {
    slug: 'manali-solang-weekend',
    title: 'Manali & Solang Short Break',
    location: 'Manali, Himachal Pradesh',
    state: 'Himachal Pradesh',
    tagline: 'The classic first mountain weekend, done without the crowds.',
    category: 'mountains',
    duration: '4 Days · 3 Nights',
    nights: 3,
    departFrom: 'Delhi · Chandigarh',
    travelTime: '14 hr drive from Delhi',
    difficulty: 'Easy',
    bestTime: 'Year round',
    groupSize: '12–16 Travellers',
    price: '₹8,999',
    originalPrice: '₹12,500',
    discount: '28% OFF',
    rating: 4.7,
    reviews: 243,
    badge: 'Good First Trip',
    image: '/aboutus.png',
    gallery: ['/aboutus.png', '/banner2.jpg', photo('1544735716-392fe2489ffa')],
    tags: ['Old Manali', 'Solang Valley', 'Café Trail', 'Family-Friendly'],
    description:
      'The cedar lanes of Old Manali, a morning in Solang before the day-trippers arrive, and the Jogini waterfall trail. Short enough for a long weekend, paced so you are not in a vehicle the whole time.',
    highlights: [
      'Stay in Old Manali, walking distance from the café lanes',
      'Early start to Solang Valley ahead of the crowds',
      'Jogini waterfall trail through Vashisht',
      'Hadimba temple in the deodar grove at first light',
      'Optional paragliding or zorbing at Solang',
    ],
    itinerary: [
      {
        day: 'Night 0',
        title: 'Delhi departure',
        description: 'Overnight Volvo from Delhi. Chandigarh joiners board around 1 am.',
      },
      {
        day: 'Day 01',
        title: 'Arrive Manali — Old Manali and Hadimba',
        description:
          'Check in, then an unhurried afternoon: Hadimba temple in the deodar grove and the Old Manali café lanes after dark.',
      },
      {
        day: 'Day 02',
        title: 'Solang Valley',
        description:
          'Early drive up to Solang. Adventure add-ons for anyone who wants them, and a walk out to the quieter end of the meadow for everyone else.',
      },
      {
        day: 'Day 03',
        title: 'Vashisht and the Jogini trail',
        description:
          'Hot springs at Vashisht, then the walk up to Jogini falls — an hour each way through orchards. Free evening on Mall Road.',
      },
      {
        day: 'Day 04',
        title: 'Manali to Delhi',
        description: 'Breakfast, then the overnight bus home. Reach Delhi early the next morning.',
      },
    ],
    inclusions: [
      '3 nights in an Old Manali guesthouse on twin sharing',
      'Daily breakfast and 3 dinners',
      'Solang and Vashisht transfers by tempo traveller',
      'Trip captain throughout',
      'Jogini trail guide',
    ],
    exclusions: [
      'Delhi–Manali–Delhi Volvo (booked at cost on request)',
      'Adventure activities at Solang',
      'Lunches and entry tickets',
      'Travel insurance',
    ],
    importantInfo: [
      'Atal Tunnel and Rohtang can close at short notice in winter; we swap in Naggar and Jana falls when they do.',
      'Solang activities are paid on the spot and weather dependent.',
      'Rooms are simple guesthouse rooms, chosen for location over luxury.',
    ],
    relatedJourneys: ['himachal-manali-parvati', 'spiti-circuit'],
  },

  {
    slug: 'triund-sunrise-trek',
    title: 'Triund Sunrise Trek',
    location: 'Dharamshala, Himachal Pradesh',
    state: 'Himachal Pradesh',
    tagline: 'One night on a ridge with the whole Dhauladhar in front of you.',
    category: 'treks',
    duration: '3 Days · 2 Nights',
    nights: 2,
    departFrom: 'Delhi',
    travelTime: '11 hr overnight drive',
    difficulty: 'Easy to Moderate',
    bestTime: 'Mar – Jun · Sep – Dec',
    groupSize: '10–15 Travellers',
    price: '₹5,999',
    originalPrice: '₹7,999',
    discount: '25% OFF',
    rating: 4.9,
    reviews: 318,
    badge: 'Best for Beginners',
    image: photo('1626621341517-bbf3d9990a23'),
    gallery: [
      photo('1626621341517-bbf3d9990a23'),
      photo('1539635278303-d4002c07eae3'),
      '/banner3.jpg',
    ],
    tags: ['Ridge Camp', 'First Trek', 'Sunrise', 'Stargazing'],
    description:
      'A nine-kilometre walk from McLeod Ganj to a grass ridge at 9,350 ft, a night under the Dhauladhar, and a sunrise that lands on the peaks before it reaches you. The most forgiving introduction to Himalayan trekking there is.',
    highlights: [
      'Camp on the Triund ridge at 9,350 ft',
      'Sunrise over the Dhauladhar range from your tent door',
      'Bhagsu waterfall and the McLeod Ganj kora on the way out',
      'Clear-sky stargazing with no settlement light below',
      'Chai at the Magic View café halfway up',
    ],
    itinerary: [
      {
        day: 'Night 0',
        title: 'Delhi departure',
        description: 'Overnight Volvo to Dharamshala, arriving around 7 am.',
      },
      {
        day: 'Day 01',
        title: 'McLeod Ganj to Triund',
        description:
          'Breakfast and a briefing in McLeod Ganj, then the 9 km ascent via Galu Devi temple — four to five hours at an easy pace. Camp, dinner and a bonfire on the ridge.',
      },
      {
        day: 'Day 02',
        title: 'Sunrise and descent',
        description:
          'Up for sunrise on the ridge, then down to McLeod Ganj by mid-afternoon. Bhagsu falls and the kora circuit before dinner in town.',
      },
      {
        day: 'Day 03',
        title: 'Dharamshala to Delhi',
        description: 'Morning free in McLeod Ganj, then the overnight bus back.',
      },
    ],
    inclusions: [
      '1 night ridge camping and 1 night in a McLeod Ganj guesthouse',
      '2 breakfasts, 2 dinners and a packed trail lunch',
      'Certified trek leader and a local support team',
      'Tents, sleeping bags and mats rated for the season',
      'Forest permits and first-aid cover',
    ],
    exclusions: [
      'Delhi–Dharamshala–Delhi Volvo (booked at cost on request)',
      'Porter or mule hire for personal bags',
      'Meals in McLeod Ganj on day 2 and 3',
      'Travel insurance',
    ],
    importantInfo: [
      'Nine kilometres up with roughly 800 m of gain — no technical sections, but you should be able to walk for four hours.',
      'Ridge temperatures fall below freezing from November; we issue a kit list on booking.',
      'Carry two litres of water. There is one refill point on the trail.',
    ],
    relatedJourneys: ['himachal-manali-parvati', 'kashmir-meadows'],
  },

  {
    slug: 'rishikesh-river-weekend',
    title: 'Rishikesh River Weekend',
    location: 'Rishikesh, Uttarakhand',
    state: 'Uttarakhand',
    tagline: 'Rapids by day, Ganga aarti by dusk, riverside camp by night.',
    category: 'riverside',
    duration: '3 Days · 2 Nights',
    nights: 2,
    departFrom: 'Delhi',
    travelTime: '6 hr drive',
    difficulty: 'Easy',
    bestTime: 'Sep – Jun',
    groupSize: '12–20 Travellers',
    price: '₹5,499',
    originalPrice: '₹7,200',
    discount: '24% OFF',
    rating: 4.6,
    reviews: 276,
    badge: 'Shortest Drive',
    image: photo('1506197603052-3cc9c3a201bd'),
    gallery: [photo('1506197603052-3cc9c3a201bd'), '/banner1.jpg', '/banner2.jpg'],
    tags: ['Rafting', 'Riverside Camp', 'Cliff Jump', 'Group-Friendly'],
    description:
      'Close enough to Delhi to leave after work on Friday. Sixteen kilometres of Grade II–III rapids from Shivpuri, an evening at the Parmarth Niketan aarti, and two nights at a camp on the sand.',
    highlights: [
      '16 km raft from Shivpuri to Nim Beach, Grade II–III',
      'Cliff jump and body-surf stop mid-river',
      'Ganga aarti at Parmarth Niketan',
      'Beatles Ashram murals and the Laxman Jhula lanes',
      'Riverside camp with a beach bonfire',
    ],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Delhi to Rishikesh',
        description:
          'Morning drive, camp check-in by afternoon. Walk across Laxman Jhula and on to the evening aarti at Parmarth Niketan.',
      },
      {
        day: 'Day 02',
        title: 'Rafting and the Beatles Ashram',
        description:
          'Safety briefing, then the 16 km run from Shivpuri with a cliff jump stop. Afternoon at the Beatles Ashram, bonfire on the beach after dinner.',
      },
      {
        day: 'Day 03',
        title: 'Rishikesh to Delhi',
        description:
          'Optional sunrise yoga session, breakfast, and the drive back. Delhi by early evening.',
      },
    ],
    inclusions: [
      '2 nights riverside camping on twin/triple sharing',
      'All meals from day 1 dinner to day 3 breakfast',
      '16 km rafting with certified guides and full safety kit',
      'Delhi–Rishikesh–Delhi transfers by tempo traveller',
      'Bonfire and camp activities',
    ],
    exclusions: [
      'Bungee, zipline and other paid adventure add-ons',
      'Lunch on day 1 and day 3',
      'Anything personal',
      'Travel insurance',
    ],
    importantInfo: [
      'Rafting is suspended during the monsoon (July–August) — those dates run as a camp-and-waterfall weekend instead.',
      'You do not need to swim, but you must wear the provided jacket and helmet.',
      'Alcohol is not permitted at riverside camps under Uttarakhand rules.',
    ],
    relatedJourneys: ['himachal-manali-parvati'],
  },

  {
    slug: 'jaipur-heritage-weekend',
    title: 'Jaipur Heritage Weekend',
    location: 'Jaipur, Rajasthan',
    state: 'Rajasthan',
    tagline: 'Forts at first light, havelis by night, no tour-bus schedule.',
    category: 'heritage',
    duration: '3 Days · 2 Nights',
    nights: 2,
    departFrom: 'Delhi',
    travelTime: '5 hr drive · 4.5 hr train',
    difficulty: 'Easy',
    bestTime: 'Oct – Mar',
    groupSize: '8–14 Travellers',
    price: '₹7,499',
    originalPrice: '₹9,999',
    discount: '25% OFF',
    rating: 4.7,
    reviews: 132,
    badge: 'Winter Pick',
    image: photo('1599661046289-e31897846e41'),
    /* Only one genuinely matching heritage image exists in the current asset
     * pool, so the gallery section stays hidden rather than padded with
     * mountain photographs. Add real Jaipur photography here. */
    gallery: [photo('1599661046289-e31897846e41')],
    tags: ['Heritage Stay', 'Fort Walk', 'Food Trail', 'Couples'],
    description:
      'Amer before the first coach arrives, Nahargarh for the sunset over the old city, and a heritage haveli to come back to. A city weekend that still feels unhurried.',
    highlights: [
      'Amer Fort on a 7 am entry, two hours ahead of the crowds',
      'Nahargarh ramparts at sunset over the walled city',
      'Guided old-city food walk through Johari and Tripolia bazaars',
      'Panna Meena ka Kund stepwell and the Anokhi museum',
      'Two nights in a restored heritage haveli',
    ],
    itinerary: [
      {
        day: 'Day 01',
        title: 'Delhi to Jaipur — old city on foot',
        description:
          'Morning train or drive. Haveli check-in, then an evening food walk through the bazaars with a local guide.',
      },
      {
        day: 'Day 02',
        title: 'Amer, the stepwell and Nahargarh',
        description:
          'Early entry at Amer, then Panna Meena ka Kund and the Anokhi museum. Up to Nahargarh for sunset and dinner on the ramparts.',
      },
      {
        day: 'Day 03',
        title: 'City Palace and departure',
        description:
          'City Palace and Jantar Mantar in the morning, block-printing stop on the way out, and back to Delhi by evening.',
      },
    ],
    inclusions: [
      '2 nights in a heritage haveli on twin sharing',
      'Daily breakfast, one food walk and one rooftop dinner',
      'All city transfers and the Nahargarh sunset drive',
      'Local heritage guide for Amer and the old city',
      'Monument entry at Amer, City Palace and Jantar Mantar',
    ],
    exclusions: [
      'Delhi–Jaipur–Delhi train or coach (booked at cost on request)',
      'Camera fees at monuments',
      'Shopping and personal expenses',
      'Travel insurance',
    ],
    importantInfo: [
      'Amer early entry means a 6 am start — worth it, and not negotiable if you want the courtyards empty.',
      'April to June regularly passes 42°C; we do not run this escape in peak summer.',
      'Modest cover for shoulders and knees is expected at the temples on the route.',
    ],
    relatedJourneys: ['spiti-circuit'],
  },

  {
    slug: 'kodaikanal-misty-weekend',
    title: 'Kodaikanal Misty Weekend',
    location: 'Kodaikanal, Tamil Nadu',
    state: 'Tamil Nadu',
    tagline: 'Shola forest, cliff edges and a lake you can walk around twice.',
    category: 'mountains',
    duration: '3 Days · 2 Nights',
    nights: 2,
    departFrom: 'Bengaluru · Chennai',
    travelTime: '9 hr overnight drive',
    difficulty: 'Easy',
    bestTime: 'Sep – May',
    groupSize: '10–14 Travellers',
    price: '₹6,999',
    originalPrice: '₹9,200',
    discount: '24% OFF',
    rating: 4.6,
    reviews: 98,
    badge: 'South India',
    image: photo('1588668214407-6ea9a6d8c272'),
    gallery: [photo('1588668214407-6ea9a6d8c272'), '/banner2.jpg'],
    tags: ['Shola Forest', 'Lake Walk', 'Viewpoints', 'Couples'],
    description:
      'The Palani hills without the honeymoon circuit. Dolphin’s Nose at dawn, a walk through Pillar Rocks shola, and the lake loop on a cycle before the mist burns off.',
    highlights: [
      'Dolphin’s Nose cliff at sunrise, before the mist lifts',
      'Guided walk through Pillar Rocks shola forest',
      'Cycle loop around Kodai lake',
      'Pine forest and Guna cave trail',
      'Homemade cheese and chocolate at the Kodai dairy',
    ],
    itinerary: [
      {
        day: 'Night 0',
        title: 'Bengaluru or Chennai departure',
        description: 'Overnight coach to Kodaikanal, arriving at first light.',
      },
      {
        day: 'Day 01',
        title: 'Arrive Kodaikanal — lake and pines',
        description:
          'Check in and breakfast, then the lake loop on cycles and an afternoon in the pine forest. Early night.',
      },
      {
        day: 'Day 02',
        title: 'Dolphin’s Nose and Pillar Rocks',
        description:
          'Pre-dawn drive to Dolphin’s Nose for sunrise, then a guided shola walk at Pillar Rocks. Free evening in town.',
      },
      {
        day: 'Day 03',
        title: 'Kodaikanal to home',
        description: 'Coaker’s Walk at sunrise, then the drive back for an overnight coach.',
      },
    ],
    inclusions: [
      '2 nights in a cottage stay on twin sharing',
      'Daily breakfast and 2 dinners',
      'All local transfers including the sunrise drive',
      'Cycle hire for the lake loop',
      'Naturalist guide for the shola walk',
    ],
    exclusions: [
      'Coach to and from Kodaikanal (booked at cost on request)',
      'Lunches',
      'Boat hire and entry tickets',
      'Travel insurance',
    ],
    importantInfo: [
      'Viewpoints fog over without warning; we keep two mornings in the plan so one is usually clear.',
      'Evenings sit around 10°C — one warm layer is enough.',
      'Roads up are steep and winding; carry motion-sickness tablets if you need them.',
    ],
    relatedJourneys: ['meghalaya-living-roots'],
  },
];

export function getEscape(slug) {
  return weekendEscapes.find((escape) => escape.slug === slug) ?? null;
}

/*
 * Related escapes for the detail page: same category first, then anything else,
 * so the rail is never empty even for a one-of-a-kind trip.
 */
export function relatedEscapes(slug, limit = 3) {
  const current = getEscape(slug);
  if (!current) return weekendEscapes.slice(0, limit);

  const others = weekendEscapes.filter((escape) => escape.slug !== slug);
  const sameCategory = others.filter((escape) => escape.category === current.category);
  const rest = others.filter((escape) => escape.category !== current.category);

  return [...sameCategory, ...rest].slice(0, limit);
}
