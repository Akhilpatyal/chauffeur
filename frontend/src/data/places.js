/*
 * Gazetteer — real coordinates for the places our routes actually visit.
 *
 * The route map used to be a decorative SVG: one fixed squiggle with pins
 * spaced evenly along it, the same shape whether the trip was in Spiti or
 * Meghalaya, over invented contour lines and a painted river. It looked like a
 * map and told you nothing. Someone trying to work out how far Kaza is from
 * Manali, or which side of the valley Chandratal sits on, learned nothing from
 * it.
 *
 * These are WGS84 decimal degrees, [latitude, longitude]. Elevations are in
 * feet, because that is the unit the rest of the site uses and the unit Indian
 * mountain travellers think in.
 *
 * Accuracy note: these are village and landmark centres, good to roughly a
 * few hundred metres. That is the right precision for "where is this and how
 * far apart are the stops". It is NOT navigation data and the map says so.
 */
export const places = {
  /* ── Himachal: Spiti and Kinnaur ─────────────────────────────────────── */
  shimla: { name: 'Shimla', lat: 31.1048, lng: 77.1734, ft: 7238, kind: 'town' },
  kalpa: { name: 'Kalpa', lat: 31.5389, lng: 78.2581, ft: 9711, kind: 'village' },
  nako: { name: 'Nako', lat: 31.8797, lng: 78.6306, ft: 11942, kind: 'village' },
  tabo: { name: 'Tabo', lat: 32.0950, lng: 78.3850, ft: 10761, kind: 'monastery' },
  kaza: { name: 'Kaza', lat: 32.2260, lng: 78.0720, ft: 12467, kind: 'town' },
  key: { name: 'Key Monastery', lat: 32.2975, lng: 78.0119, ft: 13668, kind: 'monastery' },
  kibber: { name: 'Kibber', lat: 32.3297, lng: 78.0106, ft: 14200, kind: 'village' },
  hikkim: { name: 'Hikkim', lat: 32.2706, lng: 78.0375, ft: 14567, kind: 'village' },
  komic: { name: 'Komic', lat: 32.2742, lng: 78.0969, ft: 15050, kind: 'village' },
  langza: { name: 'Langza', lat: 32.2683, lng: 78.0683, ft: 14500, kind: 'village' },
  kunzum: { name: 'Kunzum La', lat: 32.4028, lng: 77.6425, ft: 14931, kind: 'pass' },
  chandratal: { name: 'Chandratal', lat: 32.4772, lng: 77.6186, ft: 14100, kind: 'lake' },

  /* ── Himachal: Kullu, Parvati and Kangra ─────────────────────────────── */
  manali: { name: 'Manali', lat: 32.2432, lng: 77.1892, ft: 6726, kind: 'town' },
  solang: { name: 'Solang Valley', lat: 32.3167, lng: 77.1569, ft: 8399, kind: 'valley' },
  rohtang: { name: 'Rohtang Pass', lat: 32.3717, lng: 77.2466, ft: 13058, kind: 'pass' },
  atalTunnel: { name: 'Atal Tunnel', lat: 32.4036, lng: 77.1872, ft: 10171, kind: 'landmark' },
  vashisht: { name: 'Vashisht', lat: 32.2566, lng: 77.1887, ft: 6594, kind: 'village' },
  jogini: { name: 'Jogini Falls', lat: 32.2639, lng: 77.1931, ft: 7218, kind: 'landmark' },
  naggar: { name: 'Naggar', lat: 32.1167, lng: 77.1667, ft: 5900, kind: 'village' },
  kullu: { name: 'Kullu', lat: 31.9578, lng: 77.1092, ft: 3983, kind: 'town' },
  manikaran: { name: 'Manikaran', lat: 32.0269, lng: 77.3450, ft: 5203, kind: 'village' },
  kasol: { name: 'Kasol', lat: 32.0100, lng: 77.3150, ft: 5249, kind: 'village' },
  barshaini: { name: 'Barshaini', lat: 32.0117, lng: 77.3950, ft: 7218, kind: 'village' },
  tosh: { name: 'Tosh', lat: 31.9950, lng: 77.4100, ft: 7874, kind: 'village' },
  kheerganga: { name: 'Kheerganga', lat: 31.9900, lng: 77.4800, ft: 9711, kind: 'landmark' },
  dharamshala: { name: 'Dharamshala', lat: 32.2190, lng: 76.3234, ft: 4780, kind: 'town' },
  mcleodganj: { name: 'McLeod Ganj', lat: 32.2392, lng: 76.3222, ft: 6831, kind: 'town' },
  triund: { name: 'Triund', lat: 32.2667, lng: 76.3500, ft: 9350, kind: 'ridge' },
  bhagsu: { name: 'Bhagsu Falls', lat: 32.2411, lng: 76.3356, ft: 6660, kind: 'landmark' },

  /* ── Ladakh ──────────────────────────────────────────────────────────── */
  leh: { name: 'Leh', lat: 34.1526, lng: 77.5771, ft: 11562, kind: 'town' },
  khardungla: { name: 'Khardung La', lat: 34.2786, lng: 77.6044, ft: 17582, kind: 'pass' },
  nubra: { name: 'Nubra Valley', lat: 34.6833, lng: 77.5667, ft: 10000, kind: 'valley' },
  diskit: { name: 'Diskit', lat: 34.5467, lng: 77.5550, ft: 10171, kind: 'monastery' },
  hunder: { name: 'Hunder', lat: 34.5733, lng: 77.4983, ft: 10075, kind: 'village' },
  pangong: { name: 'Pangong Tso', lat: 33.7500, lng: 78.6667, ft: 14270, kind: 'lake' },
  changla: { name: 'Chang La', lat: 34.0167, lng: 77.9333, ft: 17590, kind: 'pass' },
  thiksey: { name: 'Thiksey Monastery', lat: 34.0558, lng: 77.6672, ft: 11800, kind: 'monastery' },
  tsomoriri: { name: 'Tso Moriri', lat: 32.9000, lng: 78.3000, ft: 15075, kind: 'lake' },
  zojila: { name: 'Zoji La', lat: 34.2767, lng: 75.4700, ft: 11575, kind: 'pass' },

  /* ── Kashmir ─────────────────────────────────────────────────────────── */
  srinagar: { name: 'Srinagar', lat: 34.0837, lng: 74.7973, ft: 5200, kind: 'town' },
  dallake: { name: 'Dal Lake', lat: 34.1200, lng: 74.8600, ft: 5200, kind: 'lake' },
  gulmarg: { name: 'Gulmarg', lat: 34.0484, lng: 74.3805, ft: 8694, kind: 'town' },
  apharwat: { name: 'Apharwat Peak', lat: 34.0458, lng: 74.3400, ft: 13780, kind: 'peak' },
  pahalgam: { name: 'Pahalgam', lat: 34.0161, lng: 75.3150, ft: 7200, kind: 'town' },
  betaab: { name: 'Betaab Valley', lat: 34.0400, lng: 75.3400, ft: 7700, kind: 'valley' },
  sonmarg: { name: 'Sonmarg', lat: 34.3000, lng: 75.2900, ft: 8957, kind: 'town' },

  /* ── Meghalaya ───────────────────────────────────────────────────────── */
  shillong: { name: 'Shillong', lat: 25.5788, lng: 91.8933, ft: 4908, kind: 'town' },
  cherrapunji: { name: 'Cherrapunji (Sohra)', lat: 25.2702, lng: 91.7323, ft: 4396, kind: 'town' },
  nongriat: { name: 'Nongriat', lat: 25.2486, lng: 91.7150, ft: 1870, kind: 'village' },
  mawlynnong: { name: 'Mawlynnong', lat: 25.2017, lng: 91.9167, ft: 1640, kind: 'village' },
  dawki: { name: 'Dawki', lat: 25.1939, lng: 92.0203, ft: 290, kind: 'landmark' },
  nohkalikai: { name: 'Nohkalikai Falls', lat: 25.2769, lng: 91.6856, ft: 3960, kind: 'landmark' },

  /* ── Uttarakhand ─────────────────────────────────────────────────────── */
  rishikesh: { name: 'Rishikesh', lat: 30.0869, lng: 78.2676, ft: 1178, kind: 'town' },
  shivpuri: { name: 'Shivpuri', lat: 30.1283, lng: 78.3811, ft: 1312, kind: 'village' },
  laxmanjhula: { name: 'Laxman Jhula', lat: 30.1253, lng: 78.3294, ft: 1200, kind: 'landmark' },
  haridwar: { name: 'Haridwar', lat: 29.9457, lng: 78.1642, ft: 1023, kind: 'town' },

  /* ── Rajasthan ───────────────────────────────────────────────────────── */
  jaipur: { name: 'Jaipur', lat: 26.9124, lng: 75.7873, ft: 1417, kind: 'town' },
  amer: { name: 'Amer Fort', lat: 26.9855, lng: 75.8513, ft: 1640, kind: 'landmark' },
  nahargarh: { name: 'Nahargarh Fort', lat: 26.9375, lng: 75.8156, ft: 2000, kind: 'landmark' },
  jaisalmer: { name: 'Jaisalmer', lat: 26.9157, lng: 70.9083, ft: 751, kind: 'town' },
  jodhpur: { name: 'Jodhpur', lat: 26.2389, lng: 73.0243, ft: 764, kind: 'town' },
  pushkar: { name: 'Pushkar', lat: 26.4899, lng: 74.5511, ft: 1580, kind: 'town' },

  /* ── Tamil Nadu ──────────────────────────────────────────────────────── */
  kodaikanal: { name: 'Kodaikanal', lat: 10.2381, lng: 77.4892, ft: 7200, kind: 'town' },
  dolphinsnose: { name: "Dolphin's Nose", lat: 10.2167, lng: 77.5000, ft: 6600, kind: 'landmark' },
  pillarrocks: { name: 'Pillar Rocks', lat: 10.2258, lng: 77.4553, ft: 7200, kind: 'landmark' },

  /* ── Gateways ────────────────────────────────────────────────────────── */
  delhi: { name: 'Delhi', lat: 28.6139, lng: 77.2090, ft: 702, kind: 'city' },
  chandigarh: { name: 'Chandigarh', lat: 30.7333, lng: 76.7794, ft: 1017, kind: 'city' },
  bhuntar: { name: 'Bhuntar', lat: 31.8800, lng: 77.1500, ft: 3615, kind: 'airport' },
  bengaluru: { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, ft: 3020, kind: 'city' },
  chennai: { name: 'Chennai', lat: 13.0827, lng: 80.2707, ft: 22, kind: 'city' },
};

/*
 * Aliases: the spellings that appear in itinerary copy, mapped to gazetteer
 * keys. Longer phrases are listed first so "Key Monastery" wins over "Key"
 * and "Dal Lake" is not swallowed by a looser match.
 */
const ALIASES = [
  ['key monastery', 'key'], ['key gompa', 'key'],
  ['kunzum pass', 'kunzum'], ['kunzum la', 'kunzum'],
  ['rohtang pass', 'rohtang'], ['atal tunnel', 'atalTunnel'],
  ['solang valley', 'solang'], ['jogini', 'jogini'],
  ['chandratal', 'chandratal'], ['moon lake', 'chandratal'],
  ['mcleod ganj', 'mcleodganj'], ['mcleodganj', 'mcleodganj'],
  ['bhagsu', 'bhagsu'], ['triund', 'triund'],
  ['khardung la', 'khardungla'], ['chang la', 'changla'], ['zoji la', 'zojila'],
  ['pangong', 'pangong'], ['nubra', 'nubra'], ['tso moriri', 'tsomoriri'],
  ['thiksey', 'thiksey'], ['diskit', 'diskit'], ['hunder', 'hunder'],
  ['dal lake', 'dallake'], ['apharwat', 'apharwat'], ['betaab', 'betaab'],
  ['nohkalikai', 'nohkalikai'], ['mawlynnong', 'mawlynnong'],
  ['cherrapunji', 'cherrapunji'], ['sohra', 'cherrapunji'], ['nongriat', 'nongriat'],
  ['laxman jhula', 'laxmanjhula'], ['shivpuri', 'shivpuri'],
  ['amer', 'amer'], ['nahargarh', 'nahargarh'],
  ["dolphin's nose", 'dolphinsnose'], ['dolphins nose', 'dolphinsnose'],
  ['pillar rocks', 'pillarrocks'],
  ['manikaran', 'manikaran'], ['barshaini', 'barshaini'], ['kheerganga', 'kheerganga'],
  ['vashisht', 'vashisht'], ['naggar', 'naggar'], ['bhuntar', 'bhuntar'],
  /* Single-word place names, checked last. */
  ['shimla', 'shimla'], ['kalpa', 'kalpa'], ['nako', 'nako'], ['tabo', 'tabo'],
  ['kaza', 'kaza'], ['kibber', 'kibber'], ['hikkim', 'hikkim'], ['komic', 'komic'],
  ['langza', 'langza'], ['manali', 'manali'], ['kullu', 'kullu'], ['kasol', 'kasol'],
  ['tosh', 'tosh'], ['dharamshala', 'dharamshala'], ['leh', 'leh'],
  ['srinagar', 'srinagar'], ['gulmarg', 'gulmarg'], ['pahalgam', 'pahalgam'],
  ['sonmarg', 'sonmarg'], ['shillong', 'shillong'], ['dawki', 'dawki'],
  ['rishikesh', 'rishikesh'], ['haridwar', 'haridwar'], ['jaipur', 'jaipur'],
  ['jaisalmer', 'jaisalmer'], ['jodhpur', 'jodhpur'], ['pushkar', 'pushkar'],
  ['kodaikanal', 'kodaikanal'], ['delhi', 'delhi'], ['chandigarh', 'chandigarh'],
  ['bengaluru', 'bengaluru'], ['chennai', 'chennai'],
];

/*
 * Every place mentioned in a piece of text, in the order they appear.
 *
 * Matching on word boundaries matters: without it "Leh" matches inside
 * "Dharamshala" and the Kangra valley ends up with a Ladakh pin.
 */
export function placesIn(text) {
  const haystack = String(text ?? '').toLowerCase();
  const found = [];

  for (const [alias, key] of ALIASES) {
    const pattern = new RegExp(`\\b${alias}\\b`, 'i');
    const index = haystack.search(pattern);
    if (index === -1) continue;
    if (found.some((entry) => entry.key === key)) continue;
    found.push({ key, index });
  }

  return found
    .sort((a, b) => a.index - b.index)
    .map((entry) => ({ key: entry.key, ...places[entry.key] }))
    .filter((place) => place.lat !== undefined);
}

/*
 * Turns itinerary stages into mapped stops.
 *
 * A stage mentioning two places ("Shimla to Kalpa") contributes the one it
 * ends at, because that is where the traveller sleeps — except on the first
 * stage, where the start point is worth showing too.
 */
export function routeFromStages(stages = []) {
  const stops = [];

  stages.forEach((stage, index) => {
    const text = `${stage.title ?? ''} ${stage.label ?? ''}`;
    const matched = placesIn(text);
    if (matched.length === 0) return;

    /*
     * "Shimla to Kalpa" is a transit day: the traveller ends at the second
     * place, so that is the pin. "Kaza, Key Gompa & Kibber" is a day spent
     * around a base, where the first place named is the base and the rest are
     * excursions from it — pinning the last one would drop Kaza off the map
     * entirely and make the route look like it skipped the main town.
     */
    const isTransit = /\bto\b|\u2013|\u2014|->/.test(text);
    const primary = isTransit ? matched[matched.length - 1] : matched[0];

    /* On the opening stage the departure point is worth its own pin. */
    if (index === 0 && isTransit && matched.length > 1) {
      stops.push({ day: stage.day ?? index + 1, place: matched[0], isStart: true });
    }

    if (!stops.some((stop) => stop.place.key === primary.key)) {
      stops.push({ day: stage.day ?? index + 1, place: primary, nearby: matched.filter((m) => m.key !== primary.key) });
    }
  });

  return stops;
}

/* Great-circle distance in km — honest about being a straight line. */
export function straightLineKm(a, b) {
  const R = 6371;
  const rad = (value) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
