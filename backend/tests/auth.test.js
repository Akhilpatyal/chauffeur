import { startTestApp, stopTestApp, clearCollections, createAdmin, signIn } from './helpers/app.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { RefreshToken } from '../src/models/RefreshToken.js';

let app;
const PASSWORD = 'correct-horse-battery';

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await stopTestApp(app);
});

beforeEach(async () => {
  await clearCollections();
  await createAdmin({ password: PASSWORD });
});

const login = (payload) => app.inject({ method: 'POST', url: '/api/v1/auth/login', payload });

describe('POST /api/v1/auth/login', () => {
  it('returns an access token and sets the refresh cookie', async () => {
    const response = await login({ email: 'admin@taifer.test', password: PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.accessToken).toBeTruthy();
    expect(response.json().data.user.passwordHash).toBeUndefined();

    const refresh = response.cookies.find((cookie) => cookie.name === 'taifer_rt');
    expect(refresh.httpOnly).toBe(true);

    // The CSRF cookie must be readable by the dashboard, so it is not httpOnly.
    const csrf = response.cookies.find((cookie) => cookie.name === 'taifer_csrf');
    expect(csrf.httpOnly).toBeFalsy();
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const wrongPassword = await login({ email: 'admin@taifer.test', password: 'nope-nope-nope' });
    const unknownUser = await login({ email: 'ghost@taifer.test', password: 'nope-nope-nope' });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownUser.statusCode).toBe(401);
    expect(unknownUser.json().error.message).toBe(wrongPassword.json().error.message);
  });

  it('locks the account after the configured number of failures', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login({ email: 'admin@taifer.test', password: 'wrong-password-here' });
    }

    const locked = await login({ email: 'admin@taifer.test', password: PASSWORD });
    expect(locked.statusCode).toBe(429);
    expect(locked.json().error.code).toBe('RATE_LIMITED');

    const user = await AdminUser.findOne({ email: 'admin@taifer.test' }).lean();
    expect(user.lockedUntil).toBeInstanceOf(Date);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the user and their derived permissions', async () => {
    const session = await signIn(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.role).toBe('super_admin');
    expect(response.json().data.permissions).toContain('leads:export');
  });

  it('rejects a request with no token', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/auth/me' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a tampered token', async () => {
    const session = await signIn(app);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${session.accessToken.slice(0, -4)}aaaa` },
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('refresh token rotation', () => {
  const refreshWith = (session, overrides = {}) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: {
        cookie: session.cookieHeader,
        'x-csrf-token': session.cookies.taifer_csrf,
        ...overrides,
      },
    });

  it('issues a new access token and a new refresh cookie', async () => {
    const session = await signIn(app);
    const response = await refreshWith(session);

    expect(response.statusCode).toBe(200);
    expect(response.json().data.accessToken).toBeTruthy();

    const rotated = response.cookies.find((cookie) => cookie.name === 'taifer_rt');
    expect(rotated.value).not.toBe(session.cookies.taifer_rt);
  });

  it('refuses a refresh without the CSRF header', async () => {
    const session = await signIn(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { cookie: session.cookieHeader },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('refuses a CSRF header that does not match the cookie', async () => {
    const session = await signIn(app);
    const response = await refreshWith(session, { 'x-csrf-token': 'some-other-value' });
    expect(response.statusCode).toBe(403);
  });

  it('revokes the whole family when a used token is replayed', async () => {
    const session = await signIn(app);

    const first = await refreshWith(session);
    expect(first.statusCode).toBe(200);

    // Replaying the original token: the only way this happens is theft.
    const replay = await refreshWith(session);
    expect(replay.statusCode).toBe(401);

    // The token handed out by the legitimate refresh is revoked too.
    const rotated = first.cookies.find((cookie) => cookie.name === 'taifer_rt').value;
    const afterReplay = await refreshWith({
      cookieHeader: `taifer_rt=${rotated}; taifer_csrf=${session.cookies.taifer_csrf}`,
      cookies: session.cookies,
    });
    expect(afterReplay.statusCode).toBe(401);

    const live = await RefreshToken.countDocuments({ revokedAt: null, usedAt: null });
    expect(live).toBe(0);
  });

  it('revokes the refresh token on logout', async () => {
    const session = await signIn(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { cookie: session.cookieHeader, 'x-csrf-token': session.cookies.taifer_csrf },
    });

    expect(response.statusCode).toBe(204);
    expect(await refreshWith(session).then((r) => r.statusCode)).toBe(401);
  });
});

describe('role-based access control', () => {
  it('denies a sales agent an action reserved for super admins', async () => {
    await createAdmin({
      email: 'agent@taifer.test',
      name: 'Agent',
      role: 'sales_agent',
      password: PASSWORD,
    });
    const session = await signIn(app, { email: 'agent@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('allows a sales agent to read leads', async () => {
    await createAdmin({
      email: 'agent@taifer.test',
      name: 'Agent',
      role: 'sales_agent',
      password: PASSWORD,
    });
    const session = await signIn(app, { email: 'agent@taifer.test', password: PASSWORD });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/leads',
      headers: session.authHeader,
    });

    expect(response.statusCode).toBe(200);
  });

  it('invalidates existing sessions when a password changes', async () => {
    const session = await signIn(app);

    const changed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: session.authHeader,
      payload: { currentPassword: PASSWORD, newPassword: 'a-much-longer-new-passphrase' },
    });
    expect(changed.statusCode).toBe(204);

    // tokenVersion moved on, so the old access token no longer verifies.
    const afterChange = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: session.authHeader,
    });
    expect(afterChange.statusCode).toBe(401);
  });

  it('rejects a short new password', async () => {
    const session = await signIn(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: session.authHeader,
      payload: { currentPassword: PASSWORD, newPassword: 'short' },
    });
    expect(response.statusCode).toBe(422);
  });
});
