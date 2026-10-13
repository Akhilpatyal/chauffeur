import React, { useCallback, useEffect, useState } from 'react';
import api from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import Content from './pages/Content.jsx';
import People from './pages/People.jsx';
import Observability from './pages/Observability.jsx';
import Settings from './pages/Settings.jsx';
import { Banner } from './components/ui.jsx';

/*
 * Navigation is derived from the signed-in user's permissions, not from their
 * role name. The two usually agree, but a per-user override is the whole point
 * of having them — a caller granted the export permission should see the thing
 * they were granted, and a role check would hide it.
 *
 * A hidden tab is not a security measure; every route behind these checks the
 * same permission again on the server, recomputed from the database on every
 * request. This only stops the app offering a page that would refuse to load.
 */
const NAV = [
  { key: 'dashboard', label: 'Dashboard', permission: 'dashboard.view' },
  { key: 'leads', label: 'Enquiries', permission: 'leads.view' },
  { key: 'content', label: 'Content', permission: 'content.view' },
  { key: 'people', label: 'People', permission: 'users.view' },
  /* Either tab of the monitoring screen is enough to justify the entry; the
   * screen itself hides the half the user cannot read. */
  { key: 'monitoring', label: 'Monitoring', anyOf: ['observability.view', 'security.view'] },
  { key: 'settings', label: 'Settings' },
];

function visibleNav(user) {
  const held = new Set(user.permissions ?? []);
  return NAV.filter((item) => {
    if (item.anyOf) return item.anyOf.some((permission) => held.has(permission));
    if (item.permission) return held.has(item.permission);
    return true;
  });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [booting, setBooting] = useState(true);

  /*
   * On load, try the refresh cookie before showing the login form. Someone who
   * signed in yesterday and still has a valid cookie should land on the
   * dashboard, not be asked for their password again.
   */
  useEffect(() => {
    api
      .restoreSession()
      .then((session) => setUser(session.user))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
    setPage('dashboard');
  }, []);

  if (booting) {
    return (
      <div className="login">
        <p className="muted">Checking your session…</p>
      </div>
    );
  }

  if (!user) return <Login onSignedIn={setUser} />;

  const nav = visibleNav(user);
  /* A caller signing in has no dashboard permission, so landing them on a page
   * that immediately 403s would be the first thing they ever saw. */
  const current = nav.some((item) => item.key === page) ? page : nav[0]?.key ?? 'settings';

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Taifer</h1>
        <nav>
          {nav.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={current === item.key ? 'page' : undefined}
              onClick={() => setPage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <div className="who">
          <div>{user.name}</div>
          <div style={{ opacity: 0.8 }}>{user.role.replace(/_/g, ' ')}</div>
          {/* What they can see, in words. Saves the "why can't I find that
              lead" conversation before it starts. */}
          {user.scope && user.scope !== 'all' && (
            <div style={{ opacity: 0.6, fontSize: 11 }}>
              {user.scope === 'team' ? 'your teams’ enquiries' : 'enquiries assigned to you'}
            </div>
          )}
          <button type="button" className="link" style={{ color: '#e8e4d8', marginTop: 8 }} onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main>
        {user.mustChangePassword && (
          <Banner kind="warn">
            This account is still on a temporary password. Change it under Settings before using
            the dashboard further.
          </Banner>
        )}

        {current === 'dashboard' && <Dashboard user={user} onOpenLeads={() => setPage('leads')} />}
        {current === 'leads' && <Leads user={user} />}
        {current === 'content' && <Content user={user} />}
        {current === 'people' && <People user={user} />}
        {current === 'monitoring' && <Observability user={user} />}
        {current === 'settings' && <Settings user={user} onPasswordChanged={signOut} />}
      </main>
    </div>
  );
}
