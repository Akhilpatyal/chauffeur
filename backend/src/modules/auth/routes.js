import { env } from '../../config/env.js';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { REFRESH_COOKIE } from '../../plugins/auth.js';
import { forbidden, unauthorized } from '../../lib/errors.js';
import { randomToken, safeEqual } from '../../lib/crypto.js';
import { loginBody, changePasswordBody } from './schemas.js';
import { login, refresh, logout, changePassword } from './service.js';
import { recordAudit } from '../../services/audit.js';

const CSRF_COOKIE = 'taifer_csrf';

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

/*
 * CSRF, double-submit style.
 *
 * Only two routes are cookie-authenticated (refresh and logout); every other
 * admin route uses a Bearer token, which a cross-site form cannot attach. So
 * those two require a header that matches a non-httpOnly cookie: an attacker's
 * page can make the browser send the cookie, but cannot read it to build the
 * header.
 */
function setCsrfCookie(reply) {
  const token = randomToken(24);
  reply.setCookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
  return token;
}

function assertCsrf(request) {
  const cookie = request.cookies?.[CSRF_COOKIE];
  const header = request.headers['x-csrf-token'];
  if (!cookie || !header || !safeEqual(cookie, header)) {
    throw forbidden('Missing or invalid CSRF token.');
  }
}

export default async function authRoutes(fastify) {
  fastify.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_LOGIN_MAX,
          timeWindow: env.RATE_LIMIT_LOGIN_WINDOW,
          keyGenerator: (request) => `login:${request.ipHash ?? request.ip}`,
        },
      },
      preValidation: validate({ body: loginBody }),
      schema: {
        tags: ['auth'],
        summary: 'Sign in',
        description:
          'Returns a short-lived access token in the body and sets an httpOnly refresh ' +
          'cookie plus a readable CSRF cookie. Accounts lock after repeated failures.',
        body: docSchema(loginBody, 'Login'),
        response: {
          200: {
            description: 'Signed in',
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  expiresIn: { type: 'string' },
                  user: { type: 'object' },
                },
              },
            },
          },
          401: { description: 'Bad credentials', ...errorResponseSchema },
          429: { description: 'Locked out or rate limited', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const result = await login(request.body, {
        ipHash: request.ipHash,
        userAgent: request.headers['user-agent'],
      });

      reply.setCookie(
        REFRESH_COOKIE,
        result.refreshToken,
        cookieOptions(env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      );
      setCsrfCookie(reply);

      const accessToken = fastify.jwt.sign(result.accessTokenPayload);
      return {
        data: { accessToken, expiresIn: env.JWT_ACCESS_TTL, user: result.user },
      };
    },
  );

  fastify.post(
    '/auth/refresh',
    {
      config: {
        rateLimit: { max: 60, timeWindow: '5 minutes' },
      },
      schema: {
        tags: ['auth'],
        summary: 'Rotate the refresh cookie for a new access token',
        description:
          'Requires the refresh cookie and a matching `x-csrf-token` header. Refresh tokens ' +
          'are single-use; presenting a used one revokes the whole session family.',
        response: {
          200: { description: 'New access token', type: 'object' },
          401: { description: 'No valid session', ...errorResponseSchema },
          403: { description: 'CSRF check failed', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      assertCsrf(request);

      const result = await refresh(request.cookies?.[REFRESH_COOKIE], {
        ipHash: request.ipHash,
        userAgent: request.headers['user-agent'],
      });

      reply.setCookie(
        REFRESH_COOKIE,
        result.refreshToken,
        cookieOptions(env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000),
      );

      const accessToken = fastify.jwt.sign(result.accessTokenPayload);
      return { data: { accessToken, expiresIn: env.JWT_ACCESS_TTL, user: result.user } };
    },
  );

  fastify.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign out and revoke the refresh token',
        response: { 204: { description: 'Signed out', type: 'null' } },
      },
    },
    async (request, reply) => {
      assertCsrf(request);
      await logout(request.cookies?.[REFRESH_COOKIE]);
      reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
      reply.clearCookie(CSRF_COOKIE, { path: '/' });
      return reply.status(204).send();
    },
  );

  fastify.get(
    '/auth/me',
    {
      preHandler: fastify.authenticate,
      schema: {
        tags: ['auth'],
        summary: 'The signed-in user and their permissions',
        security: [{ bearerAuth: [] }],
        response: {
          200: { description: 'Current user', type: 'object' },
          401: { description: 'Not signed in', ...errorResponseSchema },
        },
      },
    },
    async (request) => ({ data: request.user }),
  );

  fastify.post(
    '/auth/change-password',
    {
      preHandler: fastify.authenticate,
      preValidation: validate({ body: changePasswordBody }),
      schema: {
        tags: ['auth'],
        summary: 'Change your own password',
        description: 'Invalidates every other session for the account.',
        security: [{ bearerAuth: [] }],
        body: docSchema(changePasswordBody, 'ChangePassword'),
        response: {
          204: { description: 'Changed', type: 'null' },
          400: { description: 'Current password incorrect', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) throw unauthorized();
      await changePassword(request.user.id, request.body);
      await recordAudit({
        request,
        action: 'auth.password-change',
        entity: 'admin_user',
        entityId: request.user.id,
        entityLabel: request.user.email,
      });
      reply.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
      return reply.status(204).send();
    },
  );
}
