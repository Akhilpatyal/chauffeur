/*
 * Trip readiness — the practical facts a traveller needs before booking, and
 * the ones operators usually leave out.
 *
 * Keyed by region. Journeys, weekend escapes and destinations all resolve into
 * the same record, so a fact is corrected in one place.
 *
 * TWO RULES FOR WHOEVER MAINTAINS THIS:
 *
 * 1. Pass opening and closing dates move by weeks from year to year with the
 *    snowfall. Everything here is a TYPICAL window, labelled as such, and the
 *    UI says so. Never present a window as a guarantee — a visitor who books
 *    flights around a date we stated as fact has a real grievance.
 *
 * 2. Permit rules change, and they differ by nationality. `lastReviewed` is
 *    shown to the visitor. If it goes stale, that is visible to them, which is
 *    the correct incentive.
 */
export const AMS_RISK = {
  none: {
    label: 'No altitude risk',
    note: 'Stays below 8,000 ft. Altitude sickness is not a concern on this route.',
  },
  moderate: {
    label: 'Moderate altitude',
    note: 'Sleeps above 8,000 ft. Most people adjust fine, but ascend slowly and tell your trip leader about any headache.',
  },
  high: {
    label: 'High altitude — plan required',
    note: 'Sleeps above 11,000 ft or crosses passes above 15,000 ft. Acute Mountain Sickness is a genuine risk and the acclimatisation schedule is not optional.',
  },
};

/* Shown with every high-altitude trip. Descent is the only reliable treatment,
 * and saying so plainly matters more than any gear list. */
export const AMS_SYMPTOMS = {
  watchFor: [
    'Headache that does not clear with water and rest',
    'Nausea, loss of appetite or vomiting',
    'Dizziness, unusual breathlessness at rest',
    'Trouble sleeping, confusion or stumbling',
  ],
  rule: 'Tell your trip leader immediately. If symptoms do not improve, you go down — with someone, straight away. Descending is the only treatment that reliably works, and it is never treated as giving up.',
};

export const tripReadiness = {
  spiti: {
    region: 'Spiti Valley, Himachal Pradesh',
    lastReviewed: 'September 2026',

    season: {
      best: 'Mid-June to early October',
      summary:
        'Spiti has two doors. The Shimla road through Kinnaur stays open most of the year; the Manali road over Kunzum La is a summer-only route. Which months work depends entirely on which way you come in.',
      avoid: [
        {
          window: 'Mid-July to end of August',
          why: 'Monsoon on the Kinnaur approach. Landslides and road closures on the Sutlej stretch are routine, and a one-day block is common.',
        },
        {
          window: 'November to April',
          why: 'Kunzum La is shut, Chandratal is inaccessible, and Kaza drops below -20°C. Winter Spiti is possible via Shimla but is an expedition, not a holiday.',
        },
      ],
    },

    roads: [
      {
        name: 'Kunzum La (14,931 ft) — the Manali approach',
        window: 'Typically opens late May to mid-June, closes with the first heavy snow in October',
        note: 'Chandratal is only reachable while this pass is open. If you have booked Chandratal, this is the date that decides your trip.',
      },
      {
        name: 'Shimla – Kinnaur – Sumdo — the all-season approach',
        window: 'Open most of the year, subject to landslide closures',
        note: 'Slower and lower, which also makes it the better way to gain altitude gradually.',
      },
      {
        name: 'Atal Tunnel (Manali side)',
        window: 'Open year round, weather permitting',
        note: 'Replaced the Rohtang Pass crossing, so no Rohtang permit is needed to reach Lahaul.',
      },
    ],

    permits: [
      {
        who: 'Foreign nationals',
        what: 'Inner Line Permit for the Sumdo – Kaza stretch',
        where: 'Issued at Rekong Peo, Kaza or Shimla. We arrange it when you travel with us.',
        carry: 'Passport and visa copies, plus two passport photographs.',
      },
      {
        who: 'Indian nationals',
        what: 'No permit for Spiti itself',
        where: 'Carry a government photo ID for checkposts and hotel registration.',
        carry: 'Aadhaar, passport or driving licence.',
      },
    ],

    altitude: {
      risk: 'high',
      maxSleeping: 'Kaza, 12,500 ft',
      maxReached: 'Komic and Kunzum La, around 15,000 ft',
      plan: [
        'Night 1–2 at Kalpa or Nako (around 9,000–12,000 ft) before going deeper',
        'Night 3 onward at Kaza, 12,500 ft',
        'Day trips to Langza, Hikkim and Komic only after two nights at Kaza',
        'Chandratal last, not first — it is the highest place you sleep',
      ],
      note: 'Coming in from Manali gains 10,000 ft in a day and is the single most common cause of a ruined Spiti trip. Our routes come up the Kinnaur side for this reason.',
    },

    fitness: {
      level: 'Moderate — no trekking experience needed',
      walking: '1–2 hours a day, on uneven ground at altitude',
      driving: '5–8 hours a day on mountain roads, some unsurfaced',
      notFor: [
        'Uncontrolled high blood pressure, or any heart or lung condition, without written clearance from your doctor',
        'Pregnancy — above 12,000 ft is not advised',
        'Anyone who has had altitude sickness badly before, without talking to us first',
        'Severe motion sickness, unless medicated — the roads are continuous switchbacks',
      ],
    },

    ground: {
      network:
        'BSNL is the only network that works across most of the valley. Jio has patchy 4G in Kaza. Expect no signal at all between villages.',
      money:
        'Kaza has the only ATMs in the valley and they run empty in peak season. Carry enough cash for the whole trip from Manali, Shimla or Rekong Peo.',
      power: 'Mains power in Kaza and larger villages; solar and generators elsewhere. Carry a power bank.',
      stays: 'Homestays and guesthouses. Shared bathrooms are common, hot water is bucket-fed in many villages.',
      food: 'Simple vegetarian food is the norm. Tell us in advance about allergies — substitutions are hard to arrange once you are up there.',
    },
  },

  ladakh: {
    region: 'Ladakh',
    lastReviewed: 'September 2026',

    season: {
      best: 'June to September',
      summary:
        'Leh itself is reachable by air all year. What changes with the season is whether the two highways and the lake roads are open, and how cold the nights are.',
      avoid: [
        {
          window: 'November to March',
          why: 'Both highways close. Only flights get in, temperatures fall below -20°C, and most lake roads and guesthouses shut.',
        },
      ],
    },

    roads: [
      {
        name: 'Srinagar – Leh via Zoji La (11,575 ft)',
        window: 'Typically opens April or May, closes November',
        note: 'The gentler way to arrive: you gain altitude over two days instead of stepping off a plane at 11,500 ft.',
      },
      {
        name: 'Manali – Leh via Baralacha La and Tanglang La',
        window: 'Typically opens late May or June, closes October',
        note: 'Crosses four passes above 16,000 ft. Spectacular, and the hardest possible way to acclimatise.',
      },
      {
        name: 'Khardung La (17,582 ft) and Chang La (17,590 ft)',
        window: 'Open through summer, closed by snow at short notice',
        note: 'Never attempt either in your first 48 hours in Leh, whatever the road status says.',
      },
    ],

    permits: [
      {
        who: 'Indian nationals',
        what: 'Inner Line Permit for Nubra, Pangong, Tso Moriri and Hanle',
        where: 'Applied for online through the Leh district administration, or arranged by us.',
        carry: 'Government photo ID. Keep several printed copies — permits are checked and collected at multiple points.',
      },
      {
        who: 'Foreign nationals',
        what: 'Protected Area Permit for the same regions',
        where: 'Requires a registered agent and cannot be self-applied. We handle it.',
        carry: 'Passport and visa copies, plus passport photographs.',
      },
    ],

    altitude: {
      risk: 'high',
      maxSleeping: 'Pangong or Nubra, around 14,000 ft',
      maxReached: 'Khardung La, 17,582 ft',
      plan: [
        'Two full nights in Leh (11,562 ft) doing nothing strenuous — this is non-negotiable if you fly in',
        'Only then the Nubra or Pangong road',
        'Sleep lower than the highest point you reached that day, wherever the route allows',
        'No alcohol for the first 48 hours',
      ],
      note: 'Flying Delhi to Leh takes you from near sea level to 11,562 ft in ninety minutes. Your body has no way to prepare for that, and fitness does not help. The first two days are rest days by design, not padding in the itinerary.',
    },

    fitness: {
      level: 'Moderate — the altitude is the difficulty, not the walking',
      walking: '1–3 hours a day, mostly short walks and monastery visits',
      driving: '6–9 hours on some days, on high passes',
      notFor: [
        'Any heart or lung condition, sickle cell trait, or uncontrolled blood pressure, without written clearance from your doctor',
        'Pregnancy',
        'Anyone with a history of HAPE or HACE',
        'Children under 5 and adults over 70, unless we have spoken first',
      ],
    },

    ground: {
      network:
        'Only postpaid connections work in Ladakh — prepaid SIMs from the rest of India do not register at all. BSNL reaches furthest. No signal at Pangong or much of Nubra.',
      money: 'ATMs in Leh only. Carry cash for everything beyond the town.',
      power: 'Leh is on mains power with load shedding. Camps at Pangong and Nubra run generators for a few hours each evening.',
      stays: 'Hotels and guesthouses in Leh, fixed camps at the lakes. Nights are cold even in July.',
      food: 'Good variety in Leh, limited and mostly vegetarian beyond it. The dry air dehydrates you fast — drink more than you think you need.',
    },
  },

  himachal: {
    region: 'Manali, Parvati Valley & Dharamshala',
    lastReviewed: 'September 2026',

    season: {
      best: 'March to June, and September to November',
      summary:
        'Low enough that altitude is not the issue. The season is decided by the monsoon and by whether you want snow.',
      avoid: [
        {
          window: 'Mid-July to end of August',
          why: 'Peak monsoon. Landslides close the Chandigarh–Manali and Kullu–Kasol roads most seasons, and river levels make camping unsafe. We move riverside camps to higher ground or reschedule.',
        },
      ],
    },

    roads: [
      {
        name: 'Atal Tunnel to Lahaul',
        window: 'Open year round, closed briefly after heavy snow',
        note: 'Because the tunnel bypasses Rohtang, no Rohtang permit is needed for Lahaul.',
      },
      {
        name: 'Rohtang Pass (13,058 ft)',
        window: 'Typically mid-May to October',
        note: 'Still needs an online permit with a daily vehicle quota, and closes on Tuesdays for maintenance. Only relevant if you specifically want the pass itself.',
      },
      {
        name: 'Barshaini to Tosh and Kheerganga',
        window: 'Walkable most of the year; snow underfoot December to March',
        note: 'The last stretch to Tosh is on foot whatever the season.',
      },
    ],

    permits: [
      {
        who: 'Everyone',
        what: 'No permit for Manali, Kasol, Tosh or Dharamshala',
        where: 'Photo ID is required at every hotel and homestay check-in.',
        carry: 'Aadhaar, passport or driving licence. Foreign nationals: passport and visa.',
      },
      {
        who: 'Anyone driving over Rohtang',
        what: 'Online pass permit, limited daily quota',
        where: 'Himachal tourism portal, usually booked a day ahead.',
        carry: 'Printed permit and vehicle papers.',
      },
    ],

    altitude: {
      risk: 'moderate',
      maxSleeping: 'Tosh or Triund, around 7,900–9,350 ft',
      maxReached: 'Rohtang Pass, 13,058 ft, on trips that include it',
      plan: [
        'No special acclimatisation needed for Manali, Kasol or McLeod Ganj',
        'For Triund, walk up slowly and drink through the climb',
        'If a trip crosses Rohtang, it is a day visit from a low base — you do not sleep high',
      ],
      note: 'Headaches here are far more often dehydration than altitude. Drink before you are thirsty.',
    },

    fitness: {
      level: 'Easy to moderate',
      walking: '2–5 hours on trek days, much less otherwise',
      driving: '4–12 hours on arrival and departure days, mostly overnight',
      notFor: [
        'Anyone unable to walk uphill for two hours on the trek routes',
        'Recent knee or ankle surgery — the descents are steep and loose',
      ],
    },

    ground: {
      network: 'All networks work in Manali, Kasol and McLeod Ganj. Signal drops in Tosh and above Barshaini, and on the Triund ridge.',
      money: 'ATMs in Manali, Kullu, Bhuntar and McLeod Ganj. Tosh and the upper villages are cash only.',
      power: 'Reliable in towns; power cuts are routine in villages during storms.',
      stays: 'Guesthouses and riverside camps. Camps have shared washrooms and no heating.',
      food: 'Wide choice in the café towns. Village kitchens are simple and mostly vegetarian.',
    },
  },

  meghalaya: {
    region: 'Meghalaya',
    lastReviewed: 'September 2026',

    season: {
      best: 'October to April',
      summary:
        'No altitude concern anywhere. The entire question is rain — this is the wettest inhabited place on earth, and that is not a figure of speech.',
      avoid: [
        {
          window: 'June to September',
          why: 'Monsoon proper. The root bridge trails turn into waterfalls, the stone steps are genuinely dangerous, and viewpoints sit inside cloud for days.',
        },
      ],
    },

    roads: [
      {
        name: 'Shillong to Cherrapunji and Dawki',
        window: 'Open year round',
        note: 'Journeys take far longer in the rains than the distance suggests.',
      },
    ],

    permits: [
      {
        who: 'Everyone',
        what: 'No permit for Meghalaya',
        where: 'Neighbouring Arunachal and Nagaland do require one — ask us if you are extending.',
        carry: 'Photo ID for stays and the Bangladesh border viewpoint at Dawki.',
      },
    ],

    altitude: {
      risk: 'none',
      maxSleeping: 'Shillong, around 4,900 ft',
      maxReached: 'Around 6,000 ft',
      plan: [],
      note: 'The physical demand here is stairs, not altitude.',
    },

    fitness: {
      level: 'Moderate to challenging on the root bridge days',
      walking: 'The Double Decker root bridge is roughly 3,500 steps down and the same back up, with no alternative route out',
      driving: '3–6 hours between bases',
      notFor: [
        'Knee problems — the descent is the hard part, and there is no way to shorten it once you commit',
        'Anyone who cannot manage several hours of continuous steps',
      ],
    },

    ground: {
      network: 'Good in Shillong, patchy in the villages, none in the gorges.',
      money: 'ATMs in Shillong and Cherrapunji. Carry cash for homestays and guides.',
      power: 'Generally reliable; cuts during storms.',
      stays: 'Homestays in Nongriat and Mawlynnong, hotels in Shillong.',
      food: 'Local Khasi food plus standard Indian. Vegetarian options are limited in villages — tell us ahead.',
    },
  },

  kashmir: {
    region: 'Kashmir Valley',
    lastReviewed: 'September 2026',

    season: {
      best: 'April to early June, and September to October',
      summary:
        'Srinagar sits at 5,200 ft, so altitude is not a concern in the valley. The seasons differ so sharply that each one is effectively a different trip.',
      avoid: [
        {
          window: 'Mid-July to August',
          why: 'The monsoon reaches the Pir Panjal. Views close in and the high meadows turn to mud.',
        },
        {
          window: 'Late December to January',
          why: 'Chillai Kalan, the forty coldest days. Beautiful if you came for snow, hard going otherwise — long power cuts are normal.',
        },
      ],
    },

    roads: [
      {
        name: 'Zoji La towards Ladakh',
        window: 'Typically April or May to November',
        note: 'Only relevant if you are continuing to Ladakh overland.',
      },
      {
        name: 'Srinagar, Gulmarg, Pahalgam and Sonmarg',
        window: 'Open year round; Sonmarg and the Gulmarg upper slopes close after heavy snow',
        note: 'The Gulmarg gondola closes in high wind at short notice, in any season.',
      },
    ],

    permits: [
      {
        who: 'Everyone',
        what: 'No permit for the valley',
        where: 'Photo ID is checked at hotels, houseboats and on some roads.',
        carry: 'Aadhaar, passport or driving licence.',
      },
    ],

    altitude: {
      risk: 'moderate',
      maxSleeping: 'Srinagar or Pahalgam, 5,200–7,200 ft',
      maxReached: 'Apharwat by gondola, around 13,000 ft',
      plan: [
        'No acclimatisation needed for the valley itself',
        'Apharwat is a brief gondola ride to 13,000 ft — short exposure, but go slowly at the top',
        'The Great Lakes trek is a separate undertaking and sleeps above 11,000 ft',
      ],
      note: 'Most visitors feel nothing. The gondola is the one place where a sudden 8,000 ft jump catches people out.',
    },

    fitness: {
      level: 'Easy, unless you add the Great Lakes trek',
      walking: '1–3 hours a day of easy walking',
      driving: '2–5 hours between bases',
      notFor: ['Nothing specific for the valley itinerary'],
    },

    ground: {
      network: 'Only postpaid SIMs from outside the region work. Prepaid connections issued elsewhere in India will not register.',
      money: 'ATMs across Srinagar and the towns. Houseboats and shikaras are cash.',
      power: 'Cuts are frequent in winter. Heated rooms are worth paying for between December and February.',
      stays: 'Houseboats on Dal Lake, hotels and guesthouses elsewhere.',
      food: 'Excellent Kashmiri food, Wazwan on request. Vegetarian is easy to arrange here.',
    },
  },

  uttarakhand: {
    region: 'Rishikesh & Uttarakhand',
    lastReviewed: 'September 2026',

    season: {
      best: 'September to June',
      summary: 'Low altitude. Everything here is decided by the river and the monsoon.',
      avoid: [
        {
          window: 'July to mid-September',
          why: 'Rafting is suspended by the state during the monsoon, and riverside camps are moved or closed. We run these dates as a waterfall and temple weekend instead, and say so upfront.',
        },
      ],
    },

    roads: [
      {
        name: 'Delhi to Rishikesh',
        window: 'Open year round',
        note: 'Monsoon traffic and waterlogging can add hours to the drive.',
      },
    ],

    permits: [
      {
        who: 'Everyone',
        what: 'No permit for Rishikesh',
        where: 'Rafting operators register every participant by ID.',
        carry: 'Photo ID. Under-18s need a guardian signature.',
      },
    ],

    altitude: {
      risk: 'none',
      maxSleeping: 'Around 1,200 ft',
      maxReached: 'Around 1,800 ft',
      plan: [],
      note: 'No altitude considerations on this route.',
    },

    fitness: {
      level: 'Easy',
      walking: '1–2 hours, plus optional trails',
      driving: '6 hours each way from Delhi',
      notFor: [
        'Rafting excludes pregnancy, recent surgery, and some heart conditions — the operator checks this on the day',
        'You do not need to swim, but you must wear the jacket and helmet provided',
      ],
    },

    ground: {
      network: 'Good across Rishikesh; patchy at riverside camps.',
      money: 'ATMs in town. Camps are cash.',
      power: 'Reliable in town; camps run on limited generator hours.',
      stays: 'Riverside camps with shared washrooms, hotels in town.',
      food: 'Rishikesh is vegetarian by law, and alcohol is not permitted in the town or at riverside camps.',
    },
  },

  rajasthan: {
    region: 'Rajasthan',
    lastReviewed: 'September 2026',

    season: {
      best: 'October to March',
      summary: 'No altitude, no monsoon problem. Heat is the entire constraint.',
      avoid: [
        {
          window: 'April to June',
          why: 'Regularly above 42°C, and fort courtyards hold the heat long after sunset. We do not run heritage weekends in these months.',
        },
      ],
    },

    roads: [
      {
        name: 'Delhi to Jaipur',
        window: 'Open year round',
        note: 'Five hours by road, four and a half by train. The train is more reliable on a Friday evening.',
      },
    ],

    permits: [
      {
        who: 'Everyone',
        what: 'No permit; monument tickets only',
        where: 'Included in our heritage weekends where listed.',
        carry: 'Photo ID. Camera fees are charged separately at some monuments.',
      },
    ],

    altitude: {
      risk: 'none',
      maxSleeping: 'Around 1,400 ft',
      maxReached: 'Nahargarh, around 2,000 ft',
      plan: [],
      note: 'No altitude considerations on this route.',
    },

    fitness: {
      level: 'Easy, with a lot of walking on uneven stone',
      walking: '3–5 hours a day across forts and bazaars',
      driving: '1–2 hours within the city',
      notFor: [
        'Anyone who cannot manage long stretches of uneven steps — Amer and Nahargarh have no step-free route',
      ],
    },

    ground: {
      network: 'Good everywhere.',
      money: 'ATMs and cards widely accepted; bazaars prefer cash.',
      power: 'Reliable.',
      stays: 'Restored heritage havelis.',
      food: 'Everything available. Modest cover for shoulders and knees is expected at temples on the route.',
    },
  },

  tamilnadu: {
    region: 'Kodaikanal & the Palani Hills',
    lastReviewed: 'September 2026',

    season: {
      best: 'September to May',
      summary:
        'Around 7,200 ft, which is high enough to be cold but not high enough for altitude sickness. Mist is the variable that decides what you actually see.',
      avoid: [
        {
          window: 'October to December',
          why: 'The north-east monsoon. Viewpoints sit inside cloud for days and the shola trails stay wet.',
        },
      ],
    },

    roads: [
      {
        name: 'Ghat road up to Kodaikanal',
        window: 'Open year round',
        note: 'Steep and continuously winding. Carry motion-sickness tablets if you need them.',
      },
    ],

    permits: [
      {
        who: 'Everyone',
        what: 'No permit; forest entry fees at some trails',
        where: 'Paid on the day, included where listed.',
        carry: 'Photo ID.',
      },
    ],

    altitude: {
      risk: 'moderate',
      maxSleeping: 'Kodaikanal, around 7,200 ft',
      maxReached: 'Around 8,000 ft',
      plan: [],
      note: 'High enough that evenings are genuinely cold. Altitude sickness is not a realistic concern here.',
    },

    fitness: {
      level: 'Easy',
      walking: '2–4 hours a day on forest trails and the lake loop',
      driving: '9 hours overnight from Bengaluru or Chennai',
      notFor: ['Nothing specific; the shola walk is gentle and optional'],
    },

    ground: {
      network: 'Good in town, patchy on the trails.',
      money: 'ATMs in town. Smaller places are cash.',
      power: 'Reliable, with cuts during storms.',
      stays: 'Cottages and guesthouses. Heating is rare — bring a warm layer.',
      food: 'Good local and South Indian food; the dairy is worth a stop.',
    },
  },
};

/*
 * Resolves a trip to its readiness record.
 *
 * Trips name their location in prose ("Spiti Valley, Himachal Pradesh"), so the
 * lookup matches keywords rather than requiring every trip to carry an explicit
 * key. Returns null when nothing matches and the UI omits the panel — no panel
 * is better than a wrong one.
 */
const MATCHERS = [
  ['spiti', /spiti|kaza|kinnaur|chandratal|langza|kibber|tabo/i],
  ['ladakh', /ladakh|leh\b|nubra|pangong|khardung|zanskar/i],
  ['kashmir', /kashmir|srinagar|gulmarg|pahalgam|sonmarg|dal lake/i],
  ['meghalaya', /meghalaya|shillong|cherrapunji|nongriat|dawki|mawlynnong/i],
  ['uttarakhand', /rishikesh|uttarakhand|haridwar|chopta|nainital/i],
  ['rajasthan', /rajasthan|jaipur|jaisalmer|jodhpur|udaipur|pushkar/i],
  ['tamilnadu', /kodaikanal|palani|tamil nadu|ooty/i],
  /*
   * Himachal is matched last on purpose: it is the broadest pattern and Spiti
   * is administratively part of the same state, so checking it first would
   * swallow every Spiti trip and show the wrong altitude plan.
   */
  ['himachal', /himachal|manali|kasol|tosh|parvati|dharamshala|mcleod|triund|solang|kullu/i],
];

export function readinessFor(...hints) {
  const haystack = hints.filter(Boolean).join(' ');
  for (const [key, pattern] of MATCHERS) {
    if (pattern.test(haystack)) return tripReadiness[key];
  }
  return null;
}
