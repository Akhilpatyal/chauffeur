import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '../config/env.js';
import { AdminUser, ROLE_PERMISSIONS } from '../models/AdminUser.js';
import { unauthorized, forbidden } from '../lib/errors.js';

export const REFRESH_COOKIE = 'taifer_rt';

/*
 * Access tokens are short-lived and stateless; the refresh token lives in an
 * httpOnly cookie and is checked against the database on every use.
 *
 * `authenticate` still loads the user row on each request. That is one indexed
 * read on admin traffic only (a handful of people, not the public site), and
 * it buys three things a pure-JWT check cannot: instant deactivation, instant
 * role changes, and "log out everywhere" via tokenVersion.
 */
async function authPlugin(fastify) {
  await fastify.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL, iss: 'taifer-api', aud: 'taifer-admin' },
    verify: { allowedIss: 'taifer-api', allowedAud: 'taifer-admin' },
  });

  fastify.decorate('authenticate', async function authenticate(request) {
    let payload;
    try {
      payload = await request.jwtVerify();
    } catch (error) {
      const expired = error?.code === 'FAST_JWT_EXPIRED' || /expired/i.test(error?.message ?? '');
      throw unauthorized(expired ? 'Your session has expired. Please sign in again.' : 'Authentication required.');
    }

    const user = await AdminUser.findById(payload.sub).lean();
    if (!user || !user.isActive) throw unauthorized('This account is no longer active.');
    if ((user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
      throw unauthorized('Your session is no longer valid. Please sign in again.');
    }

    request.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] ?? [],
      mustChangePassword: user.mustChangePassword,
    };
  });

  /*
   * Permission check, not role check. Routes state what they need
   * ('leads:export'), so adding a third role later is a change to one table
   * rather than a hunt through every route file.
   */
  fastify.decorate('requirePermission', function requirePermission(...needed) {
    return async function checkPermission(request) {
      if (!request.user) await fastify.authenticate(request);
      const held = new Set(request.user.permissions);
      const missing = needed.filter((permission) => !held.has(permission));
      if (missing.length > 0) {
        throw forbidden(`This action requires: ${missing.join(', ')}.`);
      }
    };
  });

  fastify.decorate('requireRole', function requireRole(...roles) {
    return async function checkRole(request) {
      if (!request.user) await fastify.authenticate(request);
      if (!roles.includes(request.user.role)) {
        throw forbidden('Your role does not allow this action.');
      }
    };
  });
}

export default fp(authPlugin, { name: 'auth', dependencies: ['security'] });
