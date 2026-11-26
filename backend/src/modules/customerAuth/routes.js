import { env } from '../../config/env.js';
import { validate, docSchema, errorResponseSchema } from '../../lib/validate.js';
import { CUSTOMER_REFRESH_COOKIE } from '../../plugins/customerAuth.js';
import { csrfInvalid } from '../../lib/errors.js';
import { randomToken, safeEqual } from '../../lib/crypto.js';
import { registerBody, loginBody, changePasswordBody, updateProfileBody } from './schemas.js';
import {
  register,
  login,
  refresh,
  logout,
  logoutEverywhere,
  changePassword,
  issueTokens,
  customerPayload,
} from './service.js';
import { Customer } from '../../models/Customer.js';

/*
 * Customer sessions.
 *
 * The shape mirrors the admin routes — short-lived bearer token in memory,
 * long-lived refresh token in an httpOnly cookie, CSRF double-submit on the
 * two cookie-authenticated endpoints — but every name is different so the two
 * sessions coexist in one browser without colliding. That matters more than
 * it sounds: the people testing this are signed into both at once.
 */
const CSRF_COOKIE = 'taifer_ccsrf';

/* Scoped to the customer auth path so the cookie is not attached to every
 * request to the site, including the public pages a CDN may cache. */
function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/api/v1/account/auth',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

function setCsrfCookie(reply) {
  const token = randomToken(24);
  reply.setCookie(CSRF_COOKIE, token, {
    /* Readable by script on purpose: the client has to echo it in a header,
     * which is exactly what a cross-site page cannot do. */
    httpOnly: false,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60,
  });
  return token;
}

/* Cleared alongside the refresh cookie. Leaving it behind would not let
 * anybody in — it is only ever compared against a header — but a browser
 * holding it after sign-out makes the client believe a session is still
 * there and ask the server to prove otherwise on every page load. */
function clearCsrfCookie(reply) {
  reply.clearCookie(CSRF_COOKIE, {
    path: '/',
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  });
}

function assertCsrf(request) {
  const cookie = request.cookies?.[CSRF_COOKIE];
  const header = request.headers['x-csrf-token'];
  if (!cookie || !header || !safeEqual(cookie, header)) {
    throw csrfInvalid();
  }
}

const REFRESH_MAX_AGE = () => env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000;

const requestMetaFrom = (request) => ({
  ipHash: request.ipHash,
  userAgent: request.headers['user-agent'],
});

export default async function customerAuthRoutes(fastify) {
  /* Signed with the customer key and audience, never the admin pair. */
  const signAccess = (reply, customer) =>
    reply.customerJwtSign({ sub: String(customer.id ?? customer._id), tv: customer.tokenVersion ?? 0 });

  fastify.post(
    '/account/auth/register',
    {
      config: {
        /* Tighter than sign-in: registration creates rows and sends mail, so
         * it is the more attractive endpoint to hammer. */
        rateLimit: {
          max: 5,
          timeWindow: '15 minutes',
          keyGenerator: (request) => `register:${request.ipHash ?? request.ip}`,
        },
      },
      preValidation: validate({ body: registerBody }),
      schema: {
        tags: ['account'],
        summary: 'Create a customer account',
        description:
          'Responds identically whether or not the address is already registered — a distinct ' +
          '"already exists" reply would let anyone test who has an account here.',
        body: docSchema(registerBody, 'CustomerRegister'),
        response: {
          201: { description: 'Account created, or silently not', type: 'object' },
          429: { description: 'Too many attempts', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const meta = requestMetaFrom(request);
      const { duplicate, customer } = await register(request.body, meta);

      if (duplicate) {
        /* No session, but the same shape and status as success. The caller
         * cannot tell the branches apart. */
        return reply.status(201).send({
          data: { created: true, signedIn: false },
          meta: { message: 'Check your email to continue.' },
        });
      }

      /* Signed in directly rather than by calling login(): the password was
       * just verified by being set, and routing back through login would
       * re-hash it and write a second, misleading security event. */
      const { refreshToken } = await issueTokens(customer, meta);

      reply.setCookie(CUSTOMER_REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE()));
      setCsrfCookie(reply);

      const accessToken = await signAccess(reply, {
        id: customer._id,
        tokenVersion: customer.tokenVersion,
      });

      return reply.status(201).send({
        data: {
          created: true,
          signedIn: true,
          accessToken,
          expiresIn: env.JWT_ACCESS_TTL,
          customer: customerPayload(customer),
        },
      });
    },
  );

  fastify.post(
    '/account/auth/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
          keyGenerator: (request) => `clogin:${request.ipHash ?? request.ip}`,
        },
      },
      preValidation: validate({ body: loginBody }),
      schema: {
        tags: ['account'],
        summary: 'Sign in',
        body: docSchema(loginBody, 'CustomerLogin'),
        response: {
          200: { description: 'Signed in', type: 'object' },
          401: { description: 'Wrong details', ...errorResponseSchema },
          429: { description: 'Locked out', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const result = await login(request.body, requestMetaFrom(request));

      reply.setCookie(CUSTOMER_REFRESH_COOKIE, result.refreshToken, cookieOptions(REFRESH_MAX_AGE()));
      setCsrfCookie(reply);

      const customer = await Customer.findById(result.customer.id).select('tokenVersion').lean();
      const accessToken = await signAccess(reply, {
        id: result.customer.id,
        tokenVersion: customer?.tokenVersion ?? 0,
      });

      return { data: { accessToken, expiresIn: env.JWT_ACCESS_TTL, customer: result.customer } };
    },
  );

  fastify.post(
    '/account/auth/refresh',
    {
      schema: {
        tags: ['account'],
        summary: 'Exchange the refresh cookie for a new access token',
        description: 'Rotates the refresh token. A reused one revokes the whole family.',
        response: {
          200: { description: 'Refreshed', type: 'object' },
          401: { description: 'No valid session', ...errorResponseSchema },
          403: { description: 'CSRF check failed', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      assertCsrf(request);

      const result = await refresh(request.cookies?.[CUSTOMER_REFRESH_COOKIE], requestMetaFrom(request));

      reply.setCookie(CUSTOMER_REFRESH_COOKIE, result.refreshToken, cookieOptions(REFRESH_MAX_AGE()));
      setCsrfCookie(reply);

      const customer = await Customer.findById(result.customer.id).select('tokenVersion').lean();
      const accessToken = await signAccess(reply, {
        id: result.customer.id,
        tokenVersion: customer?.tokenVersion ?? 0,
      });

      return { data: { accessToken, expiresIn: env.JWT_ACCESS_TTL, customer: result.customer } };
    },
  );

  fastify.post(
    '/account/auth/logout',
    {
      schema: {
        tags: ['account'],
        summary: 'Sign out of this device',
        response: { 204: { description: 'Signed out', type: 'null' } },
      },
    },
    async (request, reply) => {
      assertCsrf(request);
      await logout(request.cookies?.[CUSTOMER_REFRESH_COOKIE]);
      reply.clearCookie(CUSTOMER_REFRESH_COOKIE, { path: '/api/v1/account/auth' });
      clearCsrfCookie(reply);
      return reply.status(204).send();
    },
  );

  fastify.post(
    '/account/auth/logout-all',
    {
      preHandler: fastify.authenticateCustomer,
      schema: {
        tags: ['account'],
        summary: 'Sign out everywhere',
        description: 'For a shared or lost device. Ends every session immediately.',
        security: [{ bearerAuth: [] }],
        response: { 204: { description: 'All sessions ended', type: 'null' } },
      },
    },
    async (request, reply) => {
      await logoutEverywhere(request.customer.id);
      reply.clearCookie(CUSTOMER_REFRESH_COOKIE, { path: '/api/v1/account/auth' });
      clearCsrfCookie(reply);
      return reply.status(204).send();
    },
  );

  fastify.get(
    '/account/me',
    {
      preHandler: fastify.authenticateCustomer,
      schema: {
        tags: ['account'],
        summary: 'The signed-in customer',
        security: [{ bearerAuth: [] }],
        response: {
          200: { description: 'Profile', type: 'object' },
          401: { description: 'Not signed in', ...errorResponseSchema },
        },
      },
    },
    async (request) => {
      const customer = await Customer.findById(request.customer.id);
      return { data: customer.toJSON() };
    },
  );

  fastify.patch(
    '/account/me',
    {
      /* Auth first: preValidation runs before preHandler, so leaving the
       * check in preHandler answers an unauthenticated request with a schema
       * error rather than a 401. */
      preValidation: [fastify.authenticateCustomer, validate({ body: updateProfileBody })],
      schema: {
        tags: ['account'],
        summary: 'Update your profile',
        description:
          'The sign-in email is not editable here — changing it is a separate, verified ' +
          'operation, so that taking over a session does not mean taking over the account.',
        security: [{ bearerAuth: [] }],
        body: docSchema(updateProfileBody, 'CustomerProfileUpdate'),
        response: { 200: { description: 'Updated', type: 'object' } },
      },
    },
    async (request) => {
      const customer = await Customer.findById(request.customer.id);
      customer.set(request.body);
      await customer.save();
      return { data: customer.toJSON() };
    },
  );

  fastify.post(
    '/account/auth/change-password',
    {
      /* Auth first: preValidation runs before preHandler, so leaving the
       * check in preHandler answers an unauthenticated request with a schema
       * error rather than a 401. */
      preValidation: [fastify.authenticateCustomer, validate({ body: changePasswordBody })],
      schema: {
        tags: ['account'],
        summary: 'Change your password',
        description: 'Ends every other session.',
        security: [{ bearerAuth: [] }],
        body: docSchema(changePasswordBody, 'CustomerChangePassword'),
        response: {
          200: { description: 'Changed', type: 'object' },
          400: { description: 'Current password wrong', ...errorResponseSchema },
        },
      },
    },
    async (request, reply) => {
      const customer = await changePassword(request.customer.id, request.body);
      reply.clearCookie(CUSTOMER_REFRESH_COOKIE, { path: '/api/v1/account/auth' });
      clearCsrfCookie(reply);
      return { data: customer };
    },
  );
}
