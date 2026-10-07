/*
 * Departure dates.
 *
 * The site used to list departures as fixed strings — "12 Dec – 17 Dec 2025",
 * "14 Jun – 20 Jun 2026". Every one of them was in the past, so the busiest
 * page on the site advertised trips that had already finished. Hardcoded dates
 * are guaranteed to end up that way; it is only a question of when.
 *
 * So dates are no longer stored. Each trip stores a SCHEDULE RULE, and the
 * next departures are computed from today whenever the page renders. They
 * cannot go stale, and they cannot fall outside the season.
 *
 * `seasonMonths` is the honest part: it is drawn from the same road and pass
 * windows as data/tripReadiness.js, so the generator will never offer a Spiti
 * departure in February, when Kunzum La is under several metres of snow.
 */
const CADENCE_DAYS = { weekly: 7, fortnightly: 14, monthly: 28 };

/*
 * month numbers are 1-12. A trip that runs year round lists all twelve.
 * `weekday` is 0 (Sunday) to 6 (Saturday) — most of these depart on a Friday
 * night so travellers only spend one day of leave.
 */
export const departureSchedules = {
  'spiti-circuit': {
    cadence: 'fortnightly',
    weekday: 6,
    seasonMonths: [6, 7, 9, 10],
    note: 'Kunzum La and Chandratal decide this season. We do not run August departures.',
  },
  'ladakh-traverse': {
    cadence: 'fortnightly',
    weekday: 6,
    seasonMonths: [6, 7, 8, 9],
    note: 'Runs while the Manali and Srinagar highways are both open.',
  },
  'kashmir-meadows': {
    cadence: 'weekly',
    weekday: 6,
    seasonMonths: [4, 5, 6, 9, 10],
    note: 'Spring blossom and the autumn chinar season. We skip the monsoon weeks.',
  },
  'meghalaya-living-roots': {
    cadence: 'fortnightly',
    weekday: 6,
    seasonMonths: [10, 11, 12, 1, 2, 3, 4],
    note: 'Dry season only — the root bridge steps are genuinely dangerous in the rains.',
  },
  'himachal-manali-parvati': {
    cadence: 'weekly',
    weekday: 5,
    seasonMonths: [3, 4, 5, 6, 9, 10, 11, 12],
    note: 'Year round apart from peak monsoon.',
  },

  /* Weekend escapes depart on a Friday night so one day of leave covers it. */
  'kasol-tosh-riverside': {
    cadence: 'weekly',
    weekday: 5,
    seasonMonths: [3, 4, 5, 6, 9, 10, 11],
  },
  'manali-solang-weekend': {
    cadence: 'weekly',
    weekday: 5,
    seasonMonths: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12],
  },
  'triund-sunrise-trek': {
    cadence: 'weekly',
    weekday: 5,
    seasonMonths: [3, 4, 5, 6, 9, 10, 11, 12],
  },
  'rishikesh-river-weekend': {
    cadence: 'weekly',
    weekday: 5,
    seasonMonths: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12],
    note: 'Rafting is suspended during the monsoon, so July and August are not offered.',
  },
  'jaipur-heritage-weekend': {
    cadence: 'fortnightly',
    weekday: 5,
    seasonMonths: [10, 11, 12, 1, 2, 3],
    note: 'Not run between April and June — Amer in 44°C is not a holiday.',
  },
  'kodaikanal-misty-weekend': {
    cadence: 'fortnightly',
    weekday: 5,
    seasonMonths: [1, 2, 3, 4, 5, 9],
  },
};

const startOfDay = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

/*
 * Next `count` departures for a trip, starting from `from` (today by default).
 *
 * Walks forward one cadence step at a time and keeps the dates that land in an
 * open month. The 400-step ceiling bounds the loop: a trip configured with an
 * impossible season (say monthly cadence over a single month) must not spin
 * forever in a render.
 */
export function upcomingDepartures(slug, { count = 4, nights = 2, from = new Date() } = {}) {
  const schedule = departureSchedules[slug];
  if (!schedule) return [];

  const step = CADENCE_DAYS[schedule.cadence] ?? 14;
  const cursor = startOfDay(from);

  /* Move to the next matching weekday. */
  const offset = (schedule.weekday - cursor.getDay() + 7) % 7;
  cursor.setDate(cursor.getDate() + offset);

  const results = [];
  for (let guard = 0; guard < 400 && results.length < count; guard += 1) {
    if (schedule.seasonMonths.includes(cursor.getMonth() + 1)) {
      const end = new Date(cursor);
      end.setDate(end.getDate() + nights);
      results.push({
        id: `${slug}-${cursor.toISOString().slice(0, 10)}`,
        start: new Date(cursor),
        end,
        label: formatRange(cursor, end),
        month: cursor.toLocaleDateString('en-IN', { month: 'short' }),
        day: String(cursor.getDate()).padStart(2, '0'),
      });
    }
    cursor.setDate(cursor.getDate() + step);
  }

  return results;
}

export function formatRange(start, end) {
  const sameMonth = start.getMonth() === end.getMonth();
  const d = (date) => String(date.getDate()).padStart(2, '0');
  const m = (date) => date.toLocaleDateString('en-IN', { month: 'short' });

  return sameMonth
    ? `${d(start)} – ${d(end)} ${m(end)} ${end.getFullYear()}`
    : `${d(start)} ${m(start)} – ${d(end)} ${m(end)} ${end.getFullYear()}`;
}

export const scheduleNote = (slug) => departureSchedules[slug]?.note ?? null;
