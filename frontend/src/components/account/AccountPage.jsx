import React, { useCallback, useEffect, useState } from 'react';
import { LayoutGrid, Luggage, UserRound, LogOut, Loader2 } from 'lucide-react';
import { account, ensureSession, getCustomer, onSessionChange } from '../../lib/account';
import { navigateTo, linkProps } from '../../router';
import { useDocumentMeta } from '../../lib/seo';
import { rememberReturnTo } from './AuthPage';
import { Banner } from './accountUi';
import AccountOverview from './AccountOverview';
import AccountTrips from './AccountTrips';
import BookingDetail from './BookingDetail';
import AccountProfile from './AccountProfile';

/*
 * The signed-in area.
 *
 * One shell around every account screen, which is what keeps the session
 * guard in a single place. A guard repeated per page is a guard that will be
 * missing from the seventh one somebody adds.
 *
 * The guard is a convenience, not a security boundary. Every endpoint behind
 * these screens authenticates independently and scopes by ownership in the
 * query — hiding a page has never stopped anybody from calling an API.
 */
const NAV = [
  { key: 'overview', label: 'Overview', path: '/account', icon: LayoutGrid },
  { key: 'trips', label: 'My trips', path: '/account/trips', icon: Luggage },
  { key: 'profile', label: 'Profile', path: '/account/profile', icon: UserRound },
];

export default function AccountPage({ section = 'overview', reference = null }) {
  const [customer, setCustomer] = useState(null);
  /* Three states, not two. "Checking" and "signed out" look identical to a
   * boolean and must not: rendering the sign-in prompt while a valid cookie
   * is still being exchanged would bounce a returning customer to a form
   * they do not need. */
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);

  useDocumentMeta({
    title: section === 'trips' ? 'My trips' : section === 'profile' ? 'Profile' : 'Your account',
    description: 'Your trip requests, quotations and bookings with Taifer.',
    noindex: true,
  });

  useEffect(() => onSessionChange(setCustomer), []);

  useEffect(() => {
    let cancelled = false;
    /* Shares the one session check with the rest of the app rather than
     * starting another refresh, which would rotate the token again. */
    ensureSession().then((ok) => {
      if (cancelled) return;
      setCustomer(ok ? getCustomer() : null);
      setStatus(ok ? 'in' : 'out');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await account.signOut();
    navigateTo('/');
  }, []);

  if (status === 'checking') {
    return (
      <main className="topographic-bg grid min-h-screen place-items-center">
        <p className="flex items-center gap-2 text-[14px] text-[#5E6B63]">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          Checking your session…
        </p>
      </main>
    );
  }

  if (status === 'out') {
    /* Remembered so signing in returns them here rather than to a generic
     * dashboard — most people arrive at this page from a link in an email
     * about one specific booking. */
    const here = typeof window !== 'undefined' ? window.location.pathname : '/account';

    return (
      <main className="topographic-bg grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-[400px] rounded-2xl border border-[#E3DDCB] bg-[#FAF9F5] p-6 text-center">
          <h1 className="font-display text-[24px] text-[#012C18]">Sign in to continue</h1>
          <p className="mt-2 text-[13.5px] leading-[1.7] text-[#5E6B63]">
            Your trips, quotations and payments live behind your account.
          </p>
          <a
            {...linkProps('/signin')}
            onClick={(event) => {
              rememberReturnTo(here);
              linkProps('/signin').onClick(event);
            }}
            className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#043A25] px-5 text-[14px] font-semibold text-[#FAF9F5] transition-colors hover:bg-[#012C18]"
          >
            Sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="topographic-bg min-h-screen">
      {/* pt-28/32 rather than a plain py: the site header is fixed and 84px
          tall, so anything less puts the greeting underneath it. */}
      <div className="mx-auto max-w-[1100px] px-4 pt-28 pb-12 sm:px-6 sm:pt-32 sm:pb-16">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          {/* min-w-0 as well as break-words: `overflow-wrap` wraps the text
              but does not reduce the element's min-content width, so without
              this the flex item still refuses to shrink below a long email
              address and the block is clipped on a narrow screen. */}
          <div className="min-w-0">
            <h1 className="font-display text-[28px] leading-tight text-[#012C18] sm:text-[32px]">
              {customer?.name ? `Hello, ${customer.name.split(' ')[0]}` : 'Your account'}
            </h1>
            <p className="mt-1 break-words text-[13.5px] text-[#5E6B63]">{customer?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-[40px] items-center gap-1.5 px-1 text-[13px] font-semibold text-[#5E6B63] transition-colors hover:text-[#012C18]"
          >
            <LogOut aria-hidden="true" className="h-3.5 w-3.5" />
            Sign out
          </button>
        </header>

        {/* Horizontal on every size rather than a sidebar that becomes a
            drawer: three items do not justify a drawer, and a row of three
            is reachable with a thumb. */}
        <nav aria-label="Account" className="mt-6 flex gap-1 border-b border-[#DDD4C1]">
          {NAV.map((item) => {
            const active = section === item.key || (section === 'trips' && item.key === 'trips');
            return (
              <a
                key={item.key}
                {...linkProps(item.path)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center gap-1.5 border-b-2 px-3 text-[13.5px] font-semibold transition-colors ${
                  active
                    ? 'border-[#075333] text-[#075333]'
                    : 'border-transparent text-[#5E6B63] hover:text-[#012C18]'
                }`}
              >
                <item.icon aria-hidden="true" className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-6">
          <Banner onDismiss={() => setError(null)}>{error}</Banner>

          {section === 'overview' && <AccountOverview onError={setError} />}
          {section === 'trips' && !reference && <AccountTrips onError={setError} />}
          {section === 'trips' && reference && (
            <BookingDetail reference={reference} onError={setError} />
          )}
          {section === 'profile' && <AccountProfile customer={customer} onError={setError} />}
        </div>
      </div>
    </main>
  );
}
