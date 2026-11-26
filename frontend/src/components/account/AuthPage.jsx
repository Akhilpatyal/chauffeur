import React, { useEffect, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { account, ensureSession, AccountError } from '../../lib/account';
import { navigateTo, linkProps } from '../../router';
import { useDocumentMeta } from '../../lib/seo';
import { Banner, Field, inputClass, buttonClass } from './accountUi';

/*
 * Sign in and create an account.
 *
 * One component for both because they differ by two fields and a verb;
 * two components would be two places to fix the return-to behaviour below.
 *
 * WHY NOBODY IS MADE TO SIGN IN TO BROWSE
 *
 * This page is only ever reached by someone who has decided to book. Asking
 * for an account before that is the most reliable way to lose a visitor who
 * was only looking — so nothing on the public site links here except the
 * booking flow.
 */

/*
 * Where to go after signing in.
 *
 * Kept in sessionStorage rather than a query parameter. A `?next=` is
 * attacker-controlled and the classic open-redirect: a link to
 * `/signin?next=https://evil.example` sends somebody off-site from a page
 * that looks like ours. Storage is same-origin by construction, and the
 * value is still checked below.
 */
const RETURN_KEY = 'taifer_return_to';

export function rememberReturnTo(path) {
  try {
    if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')) {
      sessionStorage.setItem(RETURN_KEY, path);
    }
  } catch {
    /* Private mode. Losing the return path costs one extra click. */
  }
}

function takeReturnTo() {
  try {
    const path = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    /* Re-checked on the way out, not only on the way in: storage is
     * same-origin but it is still data, and a leading `//` is a protocol-
     * relative URL that leaves the site. */
    return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
      ? path
      : null;
  } catch {
    return null;
  }
}

export default function AuthPage({ mode = 'signin' }) {
  const isRegister = mode === 'signup';

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  useDocumentMeta({
    title: isRegister ? 'Create an account' : 'Sign in',
    description: 'Track your trip requests, quotations and bookings with Taifer.',
    /* Not a page search engines should index or rank. */
    noindex: true,
  });

  /* Already signed in and landed here by typing the URL — send them on
   * rather than showing a form that will immediately redirect. */
  useEffect(() => {
    ensureSession().then((ok) => {
      if (ok) navigateTo(takeReturnTo() ?? '/account');
    });
  }, []);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    setNotice(null);

    try {
      if (isRegister) {
        const result = await account.register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
        });

        if (!result.signedIn) {
          /*
           * The address was already registered. The server answers
           * identically either way so this page cannot be used to test who
           * has an account here, and the wording stays true in both cases.
           */
          setNotice(
            'If that address is new, your account is ready. If you already have one, sign in below instead.',
          );
          setBusy(false);
          return;
        }
      } else {
        await account.signIn(form.email, form.password);
      }

      navigateTo(takeReturnTo() ?? '/account');
    } catch (caught) {
      if (caught instanceof AccountError) {
        setError(caught.message);
        setFieldErrors(caught.fields ?? {});
      } else {
        setError('Something went wrong. Please try again.');
      }
      setBusy(false);
    }
  }

  return (
    <main className="topographic-bg min-h-screen">
      {/* Clears the fixed 84px site header, which py-14 did not. */}
      <div className="mx-auto flex max-w-[460px] flex-col px-4 pt-28 pb-14 sm:px-6 sm:pt-32 sm:pb-20">
        <h1 className="font-display text-[30px] leading-tight text-[#012C18] sm:text-[36px]">
          {isRegister ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-[14px] leading-[1.7] text-[#5E6B63]">
          {isRegister
            ? 'So you can follow your request, read your quotation and keep your trip details in one place.'
            : 'Sign in to see your trips, quotations and payments.'}
        </p>

        <div className="mt-7 rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5 sm:p-6">
          <Banner onDismiss={() => setError(null)}>{error}</Banner>
          <Banner kind="warn" onDismiss={() => setNotice(null)}>
            {notice}
          </Banner>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {isRegister && (
              <Field label="Your name" id="auth-name" error={fieldErrors.name}>
                <input
                  id="auth-name"
                  className={inputClass}
                  value={form.name}
                  onChange={set('name')}
                  autoComplete="name"
                  required
                />
              </Field>
            )}

            <Field label="Email" id="auth-email" error={fieldErrors.email}>
              <input
                id="auth-email"
                type="email"
                className={inputClass}
                value={form.email}
                onChange={set('email')}
                autoComplete="email"
                required
              />
            </Field>

            <Field
              label="Password"
              id="auth-password"
              error={fieldErrors.password}
              hint={isRegister ? 'At least 12 characters. A short phrase works well.' : undefined}
            >
              <input
                id="auth-password"
                type="password"
                className={inputClass}
                value={form.password}
                onChange={set('password')}
                /* Tells a password manager to offer a new one rather than
                   autofilling the old. */
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                required
              />
            </Field>

            {isRegister && (
              <Field
                label="Phone"
                id="auth-phone"
                error={fieldErrors.phone}
                hint="Optional. Useful if we need to reach you about a departure."
              >
                <input
                  id="auth-phone"
                  type="tel"
                  className={inputClass}
                  value={form.phone}
                  onChange={set('phone')}
                  autoComplete="tel"
                />
              </Field>
            )}

            <button type="submit" className={`${buttonClass} w-full`} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  {isRegister ? 'Creating…' : 'Signing in…'}
                </>
              ) : (
                <>
                  {isRegister ? 'Create account' : 'Sign in'}
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[13.5px] text-[#5E6B63]">
          {isRegister ? 'Already have an account? ' : 'New here? '}
          <a
            {...linkProps(isRegister ? '/signin' : '/signup')}
            className="font-semibold text-[#075333] underline underline-offset-2"
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </a>
        </p>

        <p className="mt-6 text-center text-[12px] leading-[1.7] text-[#8A9189]">
          You do not need an account to browse trips or send an enquiry — only to track a booking.
        </p>
      </div>
    </main>
  );
}
