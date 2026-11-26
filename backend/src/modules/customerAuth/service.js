import { Customer } from '../../models/Customer.js';
import { CustomerRefreshToken } from '../../models/CustomerRefreshToken.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { unauthorized, tooManyRequests, badRequest } from '../../lib/errors.js';
import { randomToken, sha256 } from '../../lib/crypto.js';
import { recordSecurityEvent } from '../../services/securityEvents.js';

/*
 * Customer sign-up and sign-in.
 *
 * Password-based, matching the admin side, and deliberately so: you chose
 * consistency over an emailed code. The mechanics mirror modules/auth with
 * three differences that matter.
 *
 *   - Separate token audience and secret, so a customer session can never
 *     reach an admin route. See plugins/customerAuth.js.
 *   - Separate refresh store, so no query can hand an admin row to customer
 *     logic. See models/CustomerRefreshToken.js.
 *   - Sign-up exists. There is no self-service admin account; there very much
 *     is a self-service customer one, which makes registration an abuse
 *     surface the admin side does not have.
 */

const REFRESH_TTL_MS = () => env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

/* Matches the admin lockout. Five wrong guesses is far beyond a typo and far
 * below anything that would inconvenience a real person. */
const MAX_ATTEMPTS = () => env.LOGIN_MAX_ATTEMPTS ?? 5;
const LOCKOUT_MINUTES = () => env.LOGIN_LOCKOUT_MINUTES ?? 15;

/*
 * What the client receives. Never the password hash, the lockout counters or
 * the saved travellers' id numbers — see the schema's toJSON.
 */
function customerPayload(customer) {
  return {
    ...customer.toJSON(),
    id: String(customer._id),
  };
}

export async function issueTokens(customer, requestMeta = {}, family = null) {
  const refreshToken = randomToken(48);
  const tokenFamily = family ?? randomToken(16);

  await CustomerRefreshToken.create({
    user: customer._id,
    tokenHash: sha256(refreshToken),
    family: tokenFamily,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS()),
    userAgent: requestMeta.userAgent,
    ipHash: requestMeta.ipHash,
  });

  return { refreshToken, family: tokenFamily };
}

/*
 * Registration.
 *
 * An existing address does NOT get a distinct error. "That email is already
 * registered" turns this endpoint into a way to test whether someone has an
 * account here, which for a travel site is a privacy leak of its own —
 * knowing a person books trips is information. Instead the same generic
 * response goes back either way and, where the address does exist, an email
 * tells the real owner that somebody tried.
 */
export async function register({ name, email, password, phone, marketingOptIn }, requestMeta = {}) {
  const existing = await Customer.findOne({ email }).select('_id isActive');

  if (existing) {
    await recordSecurityEvent({
      type: 'login.failed',
      ...requestMeta,
      actorEmail: email,
      detail: { reason: 'signup_existing_email' },
    });
    /* Deliberately indistinguishable from success to the caller. The route
     * returns the same body in both branches. */
    return { duplicate: true, customer: null };
  }

  const customer = await Customer.create({
    name,
    email,
    phone: phone ?? null,
    marketingOptIn: Boolean(marketingOptIn),
    passwordHash: await Customer.hashPassword(password),
  });

  logger.info({ customerId: String(customer._id) }, 'customer registered');
  await recordSecurityEvent({
    type: 'login.success',
    ...requestMeta,
    actor: customer._id,
    actorEmail: customer.email,
    actorRole: 'customer',
    detail: { reason: 'registration' },
  });

  return { duplicate: false, customer };
}

export async function login({ email, password }, requestMeta = {}) {
  const customer = await Customer.findOne({ email }).select(
    '+passwordHash +failedLoginAttempts +lockedUntil',
  );

  if (!customer || !customer.isActive) {
    /* Constant-ish work either way: returning quickly for an unknown address
     * is a timing oracle for which addresses have accounts. */
    await Customer.hashPassword(password).catch(() => {});
    await recordSecurityEvent({
      type: 'login.failed',
      ...requestMeta,
      actorEmail: email,
      detail: { reason: customer ? 'account_inactive' : 'no_such_account', audience: 'customer' },
    });
    throw unauthorized('Those details do not match an account.');
  }

  if (customer.lockedUntil && customer.lockedUntil > new Date()) {
    const minutes = Math.ceil((customer.lockedUntil - Date.now()) / 60_000);
    await recordSecurityEvent({
      type: 'login.failed',
      ...requestMeta,
      actor: customer._id,
      actorEmail: customer.email,
      actorRole: 'customer',
      detail: { reason: 'locked_out', minutesRemaining: minutes, audience: 'customer' },
    });
    throw tooManyRequests(`Too many attempts. Try again in ${minutes} minute(s).`);
  }

  if (!(await customer.verifyPassword(password))) {
    customer.failedLoginAttempts = (customer.failedLoginAttempts ?? 0) + 1;
    const justLocked = customer.failedLoginAttempts >= MAX_ATTEMPTS();
    if (justLocked) {
      customer.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES() * 60_000);
      customer.failedLoginAttempts = 0;
    }
    await customer.save();

    await recordSecurityEvent({
      type: justLocked ? 'login.locked' : 'login.failed',
      ...requestMeta,
      actor: customer._id,
      actorEmail: customer.email,
      actorRole: 'customer',
      detail: { reason: 'wrong_password', audience: 'customer' },
    });
    throw unauthorized('Those details do not match an account.');
  }

  customer.failedLoginAttempts = 0;
  customer.lockedUntil = null;
  customer.lastLoginAt = new Date();
  customer.lastLoginIpHash = requestMeta.ipHash ?? null;
  await customer.save();

  const tokens = await issueTokens(customer, requestMeta);
  await recordSecurityEvent({
    type: 'login.success',
    ...requestMeta,
    actor: customer._id,
    actorEmail: customer.email,
    actorRole: 'customer',
  });

  return { customer: customerPayload(customer), ...tokens };
}

/*
 * Refresh with rotation and reuse detection.
 *
 * Identical in behaviour to the admin path: a token that comes back after it
 * was already rotated can only have been replayed, so the whole family is
 * revoked and both the attacker and the real customer are signed out. One
 * inconvenient re-login beats a session quietly shared with someone else.
 */
export async function refresh(presentedToken, requestMeta = {}) {
  if (!presentedToken) throw unauthorized('No session to refresh.');

  const stored = await CustomerRefreshToken.findOne({ tokenHash: sha256(presentedToken) });
  if (!stored) throw unauthorized('Your session is no longer valid. Please sign in again.');
  if (stored.revokedAt) throw unauthorized('Your session was ended. Please sign in again.');

  if (stored.usedAt) {
    await CustomerRefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    logger.error(
      { customerId: String(stored.user), family: stored.family, ipHash: requestMeta.ipHash },
      'customer refresh token reuse detected, family revoked',
    );
    await recordSecurityEvent({
      type: 'token.reuse_detected',
      ...requestMeta,
      actor: stored.user,
      detail: { family: stored.family, audience: 'customer' },
    });
    throw unauthorized('Your session was ended for security. Please sign in again.');
  }

  if (stored.expiresAt < new Date()) throw unauthorized('Your session has expired.');

  const customer = await Customer.findById(stored.user);
  if (!customer || !customer.isActive) throw unauthorized('This account is no longer active.');

  const next = await issueTokens(customer, requestMeta, stored.family);

  stored.usedAt = new Date();
  stored.rotatedTo = sha256(next.refreshToken);
  await stored.save();

  return { customer: customerPayload(customer), ...next };
}

export async function logout(presentedToken) {
  if (!presentedToken) return;
  await CustomerRefreshToken.updateOne(
    { tokenHash: sha256(presentedToken) },
    { $set: { revokedAt: new Date() } },
  );
}

/* Every device. Bumping tokenVersion kills outstanding access tokens;
 * revoking the rows kills outstanding refresh tokens. */
export async function logoutEverywhere(customerId) {
  await Promise.all([
    Customer.updateOne({ _id: customerId }, { $inc: { tokenVersion: 1 } }),
    CustomerRefreshToken.updateMany(
      { user: customerId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ),
  ]);
}

export async function changePassword(customerId, { currentPassword, newPassword }) {
  const customer = await Customer.findById(customerId).select('+passwordHash');
  if (!customer) throw unauthorized();

  if (!(await customer.verifyPassword(currentPassword))) {
    throw badRequest('Your current password is not correct.');
  }
  if (currentPassword === newPassword) {
    throw badRequest('The new password must be different from the current one.');
  }

  customer.passwordHash = await Customer.hashPassword(newPassword);
  /* Every other session dies with the old password. */
  customer.tokenVersion += 1;
  await customer.save();

  await CustomerRefreshToken.updateMany(
    { user: customerId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  await recordSecurityEvent({
    type: 'password.changed',
    actor: customer._id,
    actorEmail: customer.email,
    actorRole: 'customer',
  });

  return customerPayload(customer);
}

export { customerPayload };
