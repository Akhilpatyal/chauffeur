/*
 * Money, as integer paise.
 *
 * Every amount stored or computed anywhere in the booking system is an
 * integer number of the currency's minor unit — paise for INR. Nothing is
 * ever a float.
 *
 * This is not pedantry. `0.1 + 0.2` is `0.30000000000000004` in IEEE 754, and
 * a quotation is a sum of a dozen line items against which somebody pays a
 * deposit and later a balance. Carry floats through that and the balance ends
 * at ₹0.01 owing forever, which is both a support ticket and an invoice that
 * does not reconcile.
 *
 * The rule, enforced by these helpers: parse once at the edge, store integers,
 * format only for display.
 */

/* ₹1 = 100 paise. If a non-INR currency is ever added, this becomes a lookup
 * by currency code — several currencies have 0 or 3 minor digits. */
const MINOR_UNITS_PER_MAJOR = 100;

export const DEFAULT_CURRENCY = 'INR';

/*
 * A rupee figure from a human or a form, as paise.
 *
 * Accepts "14,999", "₹14,999.50", 14999 and 14999.5. Returns null for
 * anything it cannot read, rather than NaN or 0 — a price that silently
 * becomes zero is far worse than one that is rejected.
 */
export function toMinor(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * MINOR_UNITS_PER_MAJOR);
  }

  const cleaned = String(value).replace(/[₹,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * MINOR_UNITS_PER_MAJOR);
}

/* Paise back to a number of rupees, for an API response that a client will
 * format itself. */
export function toMajor(minor) {
  if (typeof minor !== 'number' || !Number.isFinite(minor)) return null;
  return minor / MINOR_UNITS_PER_MAJOR;
}

/*
 * For display: "₹14,999" or "₹14,999.50".
 *
 * Paise are dropped when they are zero, because "₹14,999.00" on a price card
 * reads as a system talking to itself. They are kept when non-zero, because
 * hiding them makes a total look wrong next to its line items.
 */
export function formatMinor(minor, currency = DEFAULT_CURRENCY) {
  if (typeof minor !== 'number' || !Number.isFinite(minor)) return null;

  const major = minor / MINOR_UNITS_PER_MAJOR;
  const hasPaise = minor % MINOR_UNITS_PER_MAJOR !== 0;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(major);
}

/* Sum of integers, guarding against a stray float or undefined sneaking into
 * a line-item array and poisoning a total. */
export function sumMinor(amounts = []) {
  return amounts.reduce((total, amount) => {
    if (typeof amount !== 'number' || !Number.isInteger(amount)) return total;
    return total + amount;
  }, 0);
}

/*
 * A percentage of an amount, rounded to the paise.
 *
 * Used for deposits and refund tiers. Rounds half up, which favours the
 * customer on a refund by at most one paise and is the convention a finance
 * team expects.
 */
export function percentOf(minor, percent) {
  if (typeof minor !== 'number' || typeof percent !== 'number') return null;
  return Math.round((minor * percent) / 100);
}

/* A Mongoose field definition for an amount. Integer, never negative unless
 * explicitly allowed, so a typo cannot create a negative invoice line. */
export const minorAmountField = ({ required = false, allowNegative = false, defaultValue } = {}) => ({
  type: Number,
  required,
  ...(defaultValue === undefined ? {} : { default: defaultValue }),
  validate: {
    validator: (value) =>
      value === null ||
      value === undefined ||
      (Number.isInteger(value) && (allowNegative || value >= 0)),
    message: 'Amounts are stored as whole paise and cannot be fractional or negative.',
  },
});
