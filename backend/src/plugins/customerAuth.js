import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '../config/env.js';
import { Customer } from '../models/Customer.js';
import { unauthorized } from '../lib/errors.js';

export const CUSTOMER_REFRESH_COOKIE = 'taifer_crt';

/*
 * Authentication for travellers, kept deliberately apart from the admin's.
 *
 * WHY A SECOND NAMESPACE RATHER THAN A ROLE
 *
 * The obvious shortcut is one token type with a `role` claim and a check on
 * every admin route. That works until the day somebody adds a route and
 * forgets the check, and then a customer token opens the lead export.
 *
 * Instead the two are different audiences — `taifer-admin` and
 * `taifer-customer` — verified through separate @fastify/jwt namespaces with
 * separate secrets. A customer token presented to an admin route does not
 * fail a permission check that someone had to remember to write; it fails
 * signature and audience verification inside the library. The boundary holds
 * by construction rather than by diligence.
 *
 * The cookie name differs too, so the two sessions coexist in one browser —
 * which matters, because the people testing this are signed into both.
 */
async function customerAuthPlugin(fastify) {
  await fastify.register(jwt, {
    /* Its own namespace: this adds request.customerJwtVerify() and
     * reply.customerJwtSign() without touching the admin pair. */
    namespace: 'customer',
    jwtVerify: 'customerJwtVerify',
    jwtSign: 'customerJwtSign',
    /*
     * A distinct secret. Sharing one would mean a forged audience claim is
     * the only thing between a customer token and the admin API, and an
     * audience claim is data inside a token we would be signing ourselves.
     * Separate keys make the separation cryptographic.
     */
    secret: env.JWT_CUSTOMER_SECRET,
    sign: {
      expiresIn: env.JWT_ACCESS_TTL,
      iss: 'taifer-api',
      aud: 'taifer-customer',
    },
    verify: { allowedIss: 'taifer-api', allowedAud: 'taifer-customer' },
  });

  /*
   * Loads the customer on every request rather than trusting the token's
   * claims. One indexed read, and it buys instant effect for a deactivation
   * or a "sign me out everywhere" — the same reasoning as the admin plugin,
   * and the same cost, since this runs on account pages rather than on the
   * public site.
   */
  fastify.decorate('authenticateCustomer', async function authenticateCustomer(request) {
    let payload;
    try {
      payload = await request.customerJwtVerify();
    } catch (error) {
      const expired = error?.code === 'FAST_JWT_EXPIRED' || /expired/i.test(error?.message ?? '');
      throw unauthorized(
        expired ? 'Your session has expired. Please sign in again.' : 'Please sign in to continue.',
      );
    }

    const customer = await Customer.findById(payload.sub).lean();
    if (!customer || !customer.isActive) {
      throw unauthorized('This account is no longer active.');
    }
    if ((customer.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
      throw unauthorized('Your session is no longer valid. Please sign in again.');
    }

    /*
     * No `role` and no `permissions`. A customer's authority is entirely
     * "this row is mine", checked by ownership on each route, and giving the
     * object a role field invites somebody to start branching on it.
     */
    request.customer = {
      id: String(customer._id),
      name: customer.name,
      email: customer.email,
      phone: customer.phone ?? null,
    };
  });

  /*
   * For endpoints that behave differently when signed in but must still work
   * when not — a trip page prefilling a known traveller's details, say.
   * Never throws: an invalid or absent token simply means no customer.
   */
  fastify.decorate('optionalCustomer', async function optionalCustomer(request) {
    try {
      await fastify.authenticateCustomer(request);
    } catch {
      request.customer = null;
    }
  });
}

export default fp(customerAuthPlugin, { name: 'customer-auth', dependencies: ['security'] });
