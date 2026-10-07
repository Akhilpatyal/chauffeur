import { AdminUser } from '../../models/AdminUser.js';
import { RefreshToken } from '../../models/RefreshToken.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { unauthorized, tooManyRequests, badRequest } from '../../lib/errors.js';
import { randomToken, sha256 } from '../../lib/crypto.js';

const REFRESH_TTL_MS = () => env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

/*
 * Login.
 *
 * The same generic message is returned for an unknown email and a wrong
 * password, so the endpoint cannot be used to enumerate which addresses have
 * accounts. Lockout is per account and time-boxed; the IP rate limit in front
 * of the route handles distributed guessing.
 */
export async function login({ email, password }, requestMeta) {
  const user = await AdminUser.findOne({ email }).select('+passwordHash');

  if (!user || !user.isActive) {
    // Constant-ish work either way: a fast "no such user" reply is a timing
    // oracle for which addresses exist.
    await AdminUser.hashPassword(password).catch(() => {});
    throw unauthorized('Those credentials do not match an account.');
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil - Date.now()) / 60_000);
    throw tooManyRequests(`Too many failed attempts. Try again in ${minutes} minute(s).`);
  }

  const valid = await user.verifyPassword(password);

  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= env.LOGIN_MAX_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60_000);
      user.failedLoginAttempts = 0;
      logger.warn({ email, ipHash: requestMeta.ipHash }, 'admin account locked');
    }
    await user.save();
    throw unauthorized('Those credentials do not match an account.');
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = null;
  user.lastLoginAt = new Date();
  user.lastLoginIpHash = requestMeta.ipHash;
  await user.save();

  const tokens = await issueTokens(user, requestMeta);
  logger.info({ userId: String(user._id), role: user.role }, 'admin signed in');
  return { user: user.toJSON(), ...tokens };
}

export async function issueTokens(user, requestMeta, family = null) {
  const refreshToken = randomToken(48);
  const tokenFamily = family ?? randomToken(16);

  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(refreshToken),
    family: tokenFamily,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS()),
    userAgent: requestMeta.userAgent,
    ipHash: requestMeta.ipHash,
  });

  return {
    refreshToken,
    accessTokenPayload: {
      sub: String(user._id),
      role: user.role,
      name: user.name,
      tv: user.tokenVersion ?? 0,
    },
  };
}

/*
 * Refresh with rotation and reuse detection.
 *
 * A refresh token is single-use. If one that has already been used comes back,
 * the only realistic explanation is that it was stolen, so the whole family is
 * revoked and both the attacker and the legitimate user are logged out. That is
 * the correct trade: one inconvenient re-login beats a silent session takeover.
 */
export async function refresh(presentedToken, requestMeta) {
  if (!presentedToken) throw unauthorized('No session to refresh.');

  const stored = await RefreshToken.findOne({ tokenHash: sha256(presentedToken) });
  if (!stored) throw unauthorized('Your session is no longer valid. Please sign in again.');

  if (stored.revokedAt) {
    throw unauthorized('Your session was revoked. Please sign in again.');
  }

  if (stored.usedAt) {
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    logger.error(
      { userId: String(stored.user), family: stored.family, ipHash: requestMeta.ipHash },
      'refresh token reuse detected, family revoked',
    );
    throw unauthorized('Your session was revoked for security. Please sign in again.');
  }

  if (stored.expiresAt < new Date()) throw unauthorized('Your session has expired.');

  const user = await AdminUser.findById(stored.user);
  if (!user || !user.isActive) throw unauthorized('This account is no longer active.');

  const next = await issueTokens(user, requestMeta, stored.family);

  stored.usedAt = new Date();
  stored.rotatedTo = sha256(next.refreshToken);
  await stored.save();

  return { user: user.toJSON(), ...next };
}

export async function logout(presentedToken) {
  if (!presentedToken) return;
  await RefreshToken.updateOne(
    { tokenHash: sha256(presentedToken) },
    { $set: { revokedAt: new Date() } },
  );
}

/* Invalidates every session for a user: bumping tokenVersion kills outstanding
 * access tokens, revoking the rows kills outstanding refresh tokens. */
export async function logoutEverywhere(userId) {
  await Promise.all([
    AdminUser.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } }),
    RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } }),
  ]);
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await AdminUser.findById(userId).select('+passwordHash');
  if (!user) throw unauthorized();

  if (!(await user.verifyPassword(currentPassword))) {
    throw badRequest('Your current password is not correct.');
  }
  if (currentPassword === newPassword) {
    throw badRequest('The new password must be different from the current one.');
  }

  user.passwordHash = await AdminUser.hashPassword(newPassword);
  user.mustChangePassword = false;
  user.tokenVersion += 1; // every existing session is now invalid
  await user.save();

  await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  logger.info({ userId: String(userId) }, 'admin password changed');
}
