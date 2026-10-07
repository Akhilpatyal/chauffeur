import { startTestApp, stopTestApp, clearCollections } from './helpers/app.js';
import { NewsletterSubscriber } from '../src/models/NewsletterSubscriber.js';
import { sha256, randomToken } from '../src/lib/crypto.js';

let app;

const subscribe = (payload) =>
  app.inject({ method: 'POST', url: '/api/v1/newsletter', payload });

/*
 * The opt-in token only exists inside the email, so tests reach it the same way
 * the confirm endpoint does: by replacing the stored hash with one they know.
 */
async function issueConfirmToken(email) {
  const token = randomToken(32);
  await NewsletterSubscriber.updateOne(
    { email },
    { $set: { confirmTokenHash: sha256(token), confirmTokenExpiresAt: new Date(Date.now() + 3600_000) } },
  );
  return token;
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

describe('POST /api/v1/newsletter', () => {
  it('creates a pending subscriber rather than a confirmed one', async () => {
    const response = await subscribe({ email: 'reader@example.com', sourcePage: '/' });

    expect(response.statusCode).toBe(202);
    expect(response.json().data.status).toBe('pending');

    const subscriber = await NewsletterSubscriber.findOne({ email: 'reader@example.com' }).lean();
    expect(subscriber.status).toBe('pending');
    // Nothing is on the list until the link is clicked.
    expect(subscriber.consent.confirmedAt).toBeUndefined();
  });

  it('records the consent trail', async () => {
    await subscribe({ email: 'reader@example.com', sourcePage: '/hotels' });

    const subscriber = await NewsletterSubscriber.findOne({ email: 'reader@example.com' }).lean();
    expect(subscriber.consent.requestedAt).toBeInstanceOf(Date);
    expect(subscriber.consent.ipHash).toMatch(/^[a-f0-9]{40}$/);
    expect(subscriber.consent.sourcePage).toBe('/hotels');
  });

  it('rejects a malformed address', async () => {
    const response = await subscribe({ email: 'not-an-email' });
    expect(response.statusCode).toBe(422);
  });

  it('discards a honeypot signup without storing anything', async () => {
    const response = await subscribe({ email: 'bot@example.com', website: 'spam' });
    expect(response.statusCode).toBe(202);
    expect(await NewsletterSubscriber.countDocuments({})).toBe(0);
  });

  it('does not store the token in plaintext', async () => {
    await subscribe({ email: 'reader@example.com' });
    const subscriber = await NewsletterSubscriber.findOne({ email: 'reader@example.com' }).lean();
    expect(subscriber.confirmTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hides the token fields from serialised output', async () => {
    await subscribe({ email: 'reader@example.com' });
    const subscriber = await NewsletterSubscriber.findOne({ email: 'reader@example.com' });
    const json = subscriber.toJSON();
    expect(json.confirmTokenHash).toBeUndefined();
    expect(json.unsubscribeTokenHash).toBeUndefined();
  });
});

describe('double opt-in confirmation', () => {
  it('confirms a pending subscriber and redirects to the site', async () => {
    await subscribe({ email: 'reader@example.com' });
    const token = await issueConfirmToken('reader@example.com');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/newsletter/confirm?token=${token}`,
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('newsletter=confirmed');

    const subscriber = await NewsletterSubscriber.findOne({ email: 'reader@example.com' }).lean();
    expect(subscriber.status).toBe('confirmed');
    expect(subscriber.consent.confirmedAt).toBeInstanceOf(Date);
    // The token is single-use.
    expect(subscriber.confirmTokenHash).toBeNull();
    // Confirming issues the unsubscribe token the welcome email links to.
    expect(subscriber.unsubscribeTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('redirects with an invalid marker for an unknown token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/newsletter/confirm?token=0000000000000000000000',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toContain('newsletter=invalid');
  });

  it('refuses an expired token', async () => {
    await subscribe({ email: 'reader@example.com' });
    const token = await issueConfirmToken('reader@example.com');
    await NewsletterSubscriber.updateOne(
      { email: 'reader@example.com' },
      { $set: { confirmTokenExpiresAt: new Date(Date.now() - 1000) } },
    );

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/newsletter/confirm?token=${token}`,
    });

    expect(response.headers.location).toContain('newsletter=invalid');
    const subscriber = await NewsletterSubscriber.findOne({ email: 'reader@example.com' }).lean();
    expect(subscriber.status).toBe('pending');
  });

  it('tells an already-confirmed address it is already subscribed', async () => {
    await subscribe({ email: 'reader@example.com' });
    const token = await issueConfirmToken('reader@example.com');
    await app.inject({ method: 'GET', url: `/api/v1/newsletter/confirm?token=${token}` });

    // Re-submitting the form must not send another opt-in email.
    const response = await subscribe({ email: 'reader@example.com' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.status).toBe('already_subscribed');
  });
});

describe('unsubscribe', () => {
  it('marks a confirmed subscriber unsubscribed', async () => {
    await subscribe({ email: 'reader@example.com' });
    const confirmToken = await issueConfirmToken('reader@example.com');
    await app.inject({ method: 'GET', url: `/api/v1/newsletter/confirm?token=${confirmToken}` });

    const unsubscribeToken = randomToken(32);
    await NewsletterSubscriber.updateOne(
      { email: 'reader@example.com' },
      { $set: { unsubscribeTokenHash: sha256(unsubscribeToken) } },
    );

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/newsletter/unsubscribe?token=${unsubscribeToken}`,
    });

    expect(response.headers.location).toContain('newsletter=unsubscribed');
    const subscriber = await NewsletterSubscriber.findOne({ email: 'reader@example.com' }).lean();
    expect(subscriber.status).toBe('unsubscribed');
    expect(subscriber.unsubscribedAt).toBeInstanceOf(Date);
  });
});
