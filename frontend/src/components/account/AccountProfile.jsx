import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { account, AccountError } from '../../lib/account';
import {
  Banner,
  Field,
  Skeleton,
  inputClass,
  buttonClass,
  secondaryButtonClass,
} from './accountUi';

/*
 * The customer's own details.
 *
 * WHAT IS NOT ASKED FOR
 *
 * No identity documents, no date of birth, no address. Those are collected
 * per trip where a permit actually requires them, not held on an account
 * against the possibility. The less of this we store, the less there is to
 * leak — and a signup form that asks for a passport number loses people who
 * were only going to ask about Spiti.
 *
 * The emergency contact is here but optional and explained, because it is
 * the one intrusive field with an obvious reason.
 */
export default function AccountProfile({ customer: initial, onError }) {
  const [customer, setCustomer] = useState(initial ?? null);
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(null);

  useEffect(() => {
    let cancelled = false;
    account
      .me()
      .then((response) => {
        if (cancelled) return;
        setCustomer(response.data);
        setForm({
          name: response.data.name ?? '',
          phone: response.data.phone ?? '',
          marketingOptIn: Boolean(response.data.marketingOptIn),
          emergencyContact: {
            name: response.data.emergencyContact?.name ?? '',
            phone: response.data.emergencyContact?.phone ?? '',
            relationship: response.data.emergencyContact?.relationship ?? '',
          },
        });
      })
      .catch((error) => !cancelled && onError?.(error.message));
    return () => {
      cancelled = true;
    };
  }, [onError]);

  if (!form) return <Skeleton rows={2} />;

  const set = (key) => (event) =>
    setForm((current) => ({
      ...current,
      [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    }));

  const setEmergency = (key) => (event) =>
    setForm((current) => ({
      ...current,
      emergencyContact: { ...current.emergencyContact, [key]: event.target.value },
    }));

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setFieldErrors({});
    setNotice(null);

    try {
      /* Empty strings become null rather than being stored as "", so an
       * absent phone number reads as absent everywhere downstream instead of
       * as a value that happens to be blank. */
      const response = await account.updateProfile({
        name: form.name,
        phone: form.phone || null,
        marketingOptIn: form.marketingOptIn,
        emergencyContact: {
          name: form.emergencyContact.name || null,
          phone: form.emergencyContact.phone || null,
          relationship: form.emergencyContact.relationship || null,
        },
      });
      setCustomer(response.data);
      setNotice('Saved.');
    } catch (error) {
      if (error instanceof AccountError) {
        setFieldErrors(error.fields ?? {});
        onError?.(error.message);
      } else {
        onError?.('Could not save your details.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordBusy(true);
    setPasswordErrors({});
    setPasswordNotice(null);

    try {
      await account.changePassword(password);
      setPassword({ currentPassword: '', newPassword: '' });
      /* Said explicitly: changing a password ends every other session, which
       * is a surprise if somebody is also signed in on a phone. */
      setPasswordNotice(
        'Password changed. You have been signed out on every other device.',
      );
    } catch (error) {
      if (error instanceof AccountError) {
        setPasswordErrors(error.fields ?? {});
        setPasswordNotice(null);
        onError?.(error.message);
      }
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
        <h2 className="font-display text-[19px] text-[#012C18]">Your details</h2>
        <Banner kind="ok" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>

        <form onSubmit={saveProfile} className="mt-3 space-y-4" noValidate>
          <Field label="Name" id="profile-name" error={fieldErrors.name}>
            <input
              id="profile-name"
              className={inputClass}
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
            />
          </Field>

          <Field
            label="Email"
            id="profile-email"
            hint="Write to us if you need to change the address you sign in with."
          >
            <input
              id="profile-email"
              className={`${inputClass} cursor-not-allowed bg-[#F1EFE7] text-[#8A9189]`}
              value={customer?.email ?? ''}
              readOnly
              /* Not editable here on purpose: changing the sign-in address is
                 a separate verified operation, so taking over a session does
                 not mean taking over the account. */
              aria-describedby="profile-email-note"
            />
          </Field>

          <Field label="Phone" id="profile-phone" error={fieldErrors.phone}>
            <input
              id="profile-phone"
              type="tel"
              className={inputClass}
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
            />
          </Field>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={form.marketingOptIn}
              onChange={set('marketingOptIn')}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#043A25]"
            />
            <span className="text-[13px] leading-[1.6] text-[#3B473F]">
              Send me the monthly trail log
              <span className="block text-[12px] text-[#8A9189]">
                One email a month. Booking emails come either way.
              </span>
            </span>
          </label>

          <button type="submit" className={buttonClass} disabled={busy}>
            {busy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
            Save details
          </button>
        </form>
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
          <h2 className="font-display text-[19px] text-[#012C18]">Emergency contact</h2>
          <p className="mt-1.5 text-[12.5px] leading-[1.7] text-[#5E6B63]">
            Someone we can reach if something happens on the road. Optional, and only used for
            that.
          </p>

          <form onSubmit={saveProfile} className="mt-3 space-y-4" noValidate>
            <Field label="Their name" id="emergency-name">
              <input
                id="emergency-name"
                className={inputClass}
                value={form.emergencyContact.name}
                onChange={setEmergency('name')}
              />
            </Field>
            <Field label="Their phone" id="emergency-phone">
              <input
                id="emergency-phone"
                type="tel"
                className={inputClass}
                value={form.emergencyContact.phone}
                onChange={setEmergency('phone')}
              />
            </Field>
            <Field label="Relationship" id="emergency-relationship">
              <input
                id="emergency-relationship"
                className={inputClass}
                value={form.emergencyContact.relationship}
                onChange={setEmergency('relationship')}
                placeholder="Partner, parent, friend…"
              />
            </Field>
            <button type="submit" className={secondaryButtonClass} disabled={busy}>
              Save contact
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-5">
          <h2 className="flex items-center gap-2 font-display text-[19px] text-[#012C18]">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#B89A5A]" />
            Password
          </h2>
          <Banner kind="ok" onDismiss={() => setPasswordNotice(null)}>
            {passwordNotice}
          </Banner>

          <form onSubmit={changePassword} className="mt-3 space-y-4" noValidate>
            <Field
              label="Current password"
              id="current-password"
              error={passwordErrors.currentPassword}
            >
              <input
                id="current-password"
                type="password"
                className={inputClass}
                value={password.currentPassword}
                onChange={(event) =>
                  setPassword((c) => ({ ...c, currentPassword: event.target.value }))
                }
                autoComplete="current-password"
              />
            </Field>
            <Field
              label="New password"
              id="new-password"
              error={passwordErrors.newPassword}
              hint="At least 12 characters."
            >
              <input
                id="new-password"
                type="password"
                className={inputClass}
                value={password.newPassword}
                onChange={(event) =>
                  setPassword((c) => ({ ...c, newPassword: event.target.value }))
                }
                autoComplete="new-password"
              />
            </Field>
            <button type="submit" className={secondaryButtonClass} disabled={passwordBusy}>
              {passwordBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
              Change password
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
