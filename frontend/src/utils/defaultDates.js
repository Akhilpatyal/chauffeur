/*
 * Default check-in and check-out shown in the hero search bars.
 *
 * These were hardcoded as "12 Dec 2025" / "15 Dec 2025", so long after that
 * weekend passed the site was still proposing it as a default — the same class
 * of bug as the expired departure list, just quieter.
 *
 * Computed instead: the coming weekend, which is what most people searching a
 * travel site are actually looking at.
 */
const format = (date) =>
  date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function nextWeekend(from = new Date()) {
  const checkIn = new Date(from);
  checkIn.setHours(0, 0, 0, 0);

  /* Friday is day 5. If today is already Friday or later, jump to next week's
   * Friday rather than offering a date that has effectively gone. */
  const daysUntilFriday = (5 - checkIn.getDay() + 7) % 7 || 7;
  checkIn.setDate(checkIn.getDate() + daysUntilFriday);

  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);

  return { checkIn, checkOut, checkInLabel: format(checkIn), checkOutLabel: format(checkOut) };
}
