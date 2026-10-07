import React, { useCallback, useEffect, useState } from 'react';
import api from './api.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import Content from './pages/Content.jsx';
import Settings from './pages/Settings.jsx';
import { Banner } from './components/ui.jsx';

const NAV = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leads', label: 'Leads' },
  { key: 'content', label: 'Content' },
  { key: 'settings', label: 'Settings' },
];

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

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>Taifer</h1>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-current={page === item.key ? 'page' : undefined}
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

        {page === 'dashboard' && <Dashboard onOpenLeads={() => setPage('leads')} />}
        {page === 'leads' && <Leads user={user} />}
        {page === 'content' && <Content user={user} />}
        {page === 'settings' && <Settings user={user} onPasswordChanged={signOut} />}
      </main>
    </div>
  );
}
