import React, { useState } from 'react';
import api, { ApiError } from '../api.js';
import { Banner } from '../components/ui.jsx';

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await api.login(email, password));
    } catch (caught) {
      // The server deliberately gives one message for both a wrong password and
      // an unknown account; passing it through keeps that property intact.
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card stack" onSubmit={submit}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Taifer Admin</h2>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Sign in to manage enquiries and site content.
          </p>
        </div>

        <Banner>{error}</Banner>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button className="primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="muted small" style={{ margin: 0 }}>
          Accounts are created by a super admin. Repeated failed attempts lock the account
          temporarily.
        </p>
      </form>
    </div>
  );
}
