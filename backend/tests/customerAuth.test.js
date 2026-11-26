import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { Customer } from '../src/models/Customer.js';
import { CustomerRefreshToken } from '../src/models/CustomerRefreshToken.js';
import { SecurityEvent } from '../src/models/SecurityEvent.js';

/*
 * Customer accounts, and the wall between them and the admin.
 *
 * The tests that matter most here are the negative ones. A customer session
 * reaching an admin route is the worst thing this system could do, and it is
 * the kind of failure that looks fine until somebody tries it — so the
 * boundary is asserted from both directions rather than assumed from the
 * configuration.
 */
let app;

const SIGNUP = {
  name: 'Maya Iyer',
  email: 'maya@example.com',
  password: 'correct-horse-battery',
  phone: '+91 98765 00000',
};

/*
 * A fresh source address per test.
 *
 * Registration and sign-in are rate limited per IP — five and ten attempts in
 * fifteen minutes — which is correct for the real world and means a whole
 * test file hammering one address trips its own limiter partway through.
 * `trustProxy` is on, so a forwarded header is what the limiter keys on.
 *
 * Tests that are specifically about the lockout keep one address deliberately;
 * everything else gets its own so the limiter never becomes the reason an
 * unrelated assertion fails.
 */
let addressCounter = 0;
const freshAddress = () => {
  addressCounter += 1;
  return `203.0.113.${addressCounter % 250}`;
};

const from = (ip) => ({ 'x-forwarded-for': ip });

const register = (overrides = {}, ip = freshAddress()) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/account/auth/register',
    headers: from(ip),
    payload: { ...SIGNUP, ...overrides },
  });

const logIn = (overrides = {}, ip = freshAddress()) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/account/auth/login',
    headers: from(ip),
    payload: { email: SIGNUP.email, password: SIGNUP.password, ...overrides },
  });

const asCustomer = (token) => ({ authorization: `Bearer ${token}` });

/* The cookies and CSRF header the refresh and logout routes need. */
function sessionFrom(response) {
  const cookies = response.cookies.reduce((acc, c) => ({ ...acc, [c.name]: c.value }), {});
  return {
    token: response.json().data.accessToken,
    cookies,
    cookieHeader: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
    csrf: cookies.taifer_ccsrf,
  };
}

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
});

describe('registration', () => {
  it('creates an account and signs the customer straight in', async () => {
    const response = await register();

    expect(response.statusCode).toBe(201);
    expect(response.json().data.signedIn).toBe(true);
    expect(response.json().data.accessToken).toBeTruthy();
    expect(response.json().data.customer.email).toBe('maya@example.com');

    expect(await Customer.countDocuments({})).toBe(1);
  });

  it('never returns the password hash', async () => {
    const response = await register();
    expect(JSON.stringify(response.json())).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('does not reveal whether an address is already registered', async () => {
    const first = await register();
    const second = await register({ name: 'Someone Else', password: 'a-different-password' });

    /* Same status and same shape. Knowing that a person has an account on a
     * travel site is itself information about them, so the endpoint must not
     * be usable to test addresses. */
    expect(second.statusCode).toBe(first.statusCode);
    expect(Object.keys(second.json().data).sort()).toEqual(
      expect.arrayContaining(['created']),
    );
    expect(second.json().data.created).toBe(true);
    /* But no session is issued, and no second account exists. */
    expect(second.json().data.signedIn).toBe(false);
    expect(await Customer.countDocuments({})).toBe(1);
  });

  it('refuses a password short enough to guess', async () => {
    const response = await register({ email: 'short@example.com', password: 'hunter22' });
    expect(response.statusCode).toBe(422);
  });

  it('does not opt anybody into marketing by default', async () => {
    await register();
    const customer = await Customer.findOne({ email: SIGNUP.email }).lean();
    /* Pre-ticked consent is the pattern India's 2023 dark-pattern guidance
     * names directly. */
    expect(customer.marketingOptIn).toBe(false);
  });
});

describe('signing in', () => {
  beforeEach(async () => {
    await register();
  });

  it('issues a token and a refresh cookie', async () => {
    const response = await logIn();
    expect(response.statusCode).toBe(200);

    const session = sessionFrom(response);
    expect(session.token).toBeTruthy();
    expect(session.cookies.taifer_crt).toBeTruthy();

    /* Its own cookie name, so a customer and an admin session coexist in one
     * browser instead of overwriting each other. */
    expect(session.cookies.taifer_rt).toBeUndefined();
  });

  it('gives the same answer for a wrong password and an unknown address', async () => {
    const wrongPassword = await logIn({ password: 'not-the-password' });
    const unknownEmail = await logIn({ email: 'nobody@example.com' });

    expect(wrongPassword.statusCode).toBe(unknownEmail.statusCode);
    expect(wrongPassword.json().error.message).toBe(unknownEmail.json().error.message);
  });

  it('records the attempt on the security timeline even though the reply does not', async () => {
    await logIn({ password: 'not-the-password' });

    const event = await SecurityEvent.findOne({ type: 'login.failed' }).lean();
    expect(event.detail.audience).toBe('customer');
    expect(event.detail.reason).toBe('wrong_password');
  });

  it('locks the account after repeated failures', async () => {
    /* One address throughout: this is about the per-account counter, and the
     * assertion is that the account locks rather than that the IP limiter
     * fires first. */
    const attacker = '198.51.100.7';
    for (let i = 0; i < 5; i += 1) await logIn({ password: `wrong-${i}` }, attacker);

    const locked = await logIn({}, attacker);
    expect(locked.statusCode).toBe(429);
    expect(locked.json().error.message).toMatch(/try again in/i);

    const event = await SecurityEvent.findOne({ type: 'login.locked' }).lean();
    expect(event).not.toBeNull();
  });
});

describe('the wall between customers and the admin panel', () => {
  it('refuses a customer token on every admin route', async () => {
    await register();
    const customer = sessionFrom(await logIn());

    /* A spread of routes rather than one, because the guarantee has to hold
     * for routes nobody thought about individually. */
    for (const url of [
      '/api/v1/admin/leads',
      '/api/v1/admin/users',
      '/api/v1/admin/teams',
      '/api/v1/admin/observability/summary',
      '/api/v1/admin/content/journeys',
    ]) {
      const response = await app.inject({ method: 'GET', url, headers: asCustomer(customer.token) });
      expect([401, 403]).toContain(response.statusCode);
    }
  });

  it('refuses an admin token on a customer route', async () => {
    await createAdmin();
    const admin = await signIn(app);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/account/me',
      headers: admin.authHeader,
    });

    /* The audiences and signing keys differ, so this fails verification
     * rather than a permission check somebody had to remember to write. */
    expect(response.statusCode).toBe(401);
  });

  it('keeps the two sessions apart in one browser', async () => {
    await createAdmin();
    await register();

    const admin = await signIn(app);
    const customer = sessionFrom(await logIn());

    /* Both cookie jars at once, as a developer testing the site would have. */
    const bothCookies = `${admin.cookieHeader}; ${customer.cookieHeader}`;

    const adminRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: bothCookies, 'x-csrf-token': admin.cookies.taifer_csrf },
    });
    const customerRefresh = await app.inject({
      method: 'POST',
      url: '/api/v1/account/auth/refresh',
      headers: { cookie: bothCookies, 'x-csrf-token': customer.csrf },
    });

    expect(adminRefresh.statusCode).toBe(200);
    expect(customerRefresh.statusCode).toBe(200);
    /* And each refreshed the right account. */
    expect(customerRefresh.json().data.customer.email).toBe(SIGNUP.email);
  });
});

describe('sessions', () => {
  it('rotates the refresh token and revokes the family on reuse', async () => {
    await register();
    const first = sessionFrom(await logIn());

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/v1/account/auth/refresh',
      headers: { cookie: first.cookieHeader, 'x-csrf-token': first.csrf },
    });
    expect(refreshed.statusCode).toBe(200);

    /* Replaying the original cookie. The only innocent explanation is a lost
     * response racing a retry; the likely one is theft. */
    const replay = await app.inject({
      method: 'POST',
      url: '/api/v1/account/auth/refresh',
      headers: { cookie: first.cookieHeader, 'x-csrf-token': first.csrf },
    });
    expect(replay.statusCode).toBe(401);

    /*
     * Every token in the replayed family is revoked — both the one that was
     * stolen and the one rotated from it, so the attacker and the real
     * customer are signed out together.
     *
     * Scoped to the family, not the whole collection: registration issued a
     * session of its own in a separate family, and that one is untouched,
     * which is correct. Revoking unrelated sessions because one was replayed
     * would be its own bug.
     */
    const families = await CustomerRefreshToken.find({}).select('family revokedAt').lean();
    const replayed = families.filter((t) => t.family === families[1].family);
    expect(replayed.length).toBeGreaterThanOrEqual(2);
    expect(replayed.every((t) => t.revokedAt !== null)).toBe(true);

    /* The registration family survives. */
    const untouched = families.filter((t) => t.family !== families[1].family);
    expect(untouched.every((t) => t.revokedAt === null)).toBe(true);
  });

  it('refuses a refresh with no CSRF header', async () => {
    await register();
    const session = sessionFrom(await logIn());

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/account/auth/refresh',
      headers: { cookie: session.cookieHeader },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('CSRF_INVALID');
  });

  it('ends every session when the password changes', async () => {
    await register();
    const session = sessionFrom(await logIn());

    const changed = await app.inject({
      method: 'POST',
      url: '/api/v1/account/auth/change-password',
      headers: asCustomer(session.token),
      payload: { currentPassword: SIGNUP.password, newPassword: 'an-entirely-new-password' },
    });
    expect(changed.statusCode).toBe(200);

    /* The token issued before the change must stop working immediately,
     * rather than lingering until it expires. */
    const after = await app.inject({
      method: 'GET',
      url: '/api/v1/account/me',
      headers: asCustomer(session.token),
    });
    expect(after.statusCode).toBe(401);
  });

  it('signs out of every device on request', async () => {
    await register();
    const phone = sessionFrom(await logIn());
    const laptop = sessionFrom(await logIn());

    await app.inject({
      method: 'POST',
      url: '/api/v1/account/auth/logout-all',
      headers: asCustomer(laptop.token),
    });

    const stillSignedIn = await app.inject({
      method: 'GET',
      url: '/api/v1/account/me',
      headers: asCustomer(phone.token),
    });
    expect(stillSignedIn.statusCode).toBe(401);
  });
});

describe('the profile', () => {
  it('returns the signed-in customer without secrets', async () => {
    await register();
    const session = sessionFrom(await logIn());

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/account/me',
      headers: asCustomer(session.token),
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.email).toBe(SIGNUP.email);
    const body = JSON.stringify(response.json());
    expect(body).not.toMatch(/passwordHash|failedLoginAttempts|lockedUntil|lastLoginIpHash/);
  });

  it('updates editable fields', async () => {
    await register();
    const session = sessionFrom(await logIn());

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/account/me',
      headers: asCustomer(session.token),
      payload: {
        name: 'Maya S Iyer',
        emergencyContact: { name: 'Rahul Iyer', phone: '+91 98765 11111', relationship: 'Brother' },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.name).toBe('Maya S Iyer');
    expect(response.json().data.emergencyContact.name).toBe('Rahul Iyer');
  });

  it('will not let the sign-in email be changed through a profile edit', async () => {
    await register();
    const session = sessionFrom(await logIn());

    await app.inject({
      method: 'PATCH',
      url: '/api/v1/account/me',
      headers: asCustomer(session.token),
      payload: { name: 'Maya', email: 'attacker@example.com' },
    });

    /* Changing the address an account signs in with is a separate, verified
     * operation — otherwise taking over a session takes over the account. */
    const customer = await Customer.findById(session.token ? undefined : null).catch(() => null);
    expect(customer).toBeNull();
    const stored = await Customer.findOne({ email: SIGNUP.email }).lean();
    expect(stored).not.toBeNull();
    expect(await Customer.findOne({ email: 'attacker@example.com' }).lean()).toBeNull();
  });

  it('refuses the profile to anyone not signed in', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/account/me' });
    expect(response.statusCode).toBe(401);
  });
});
