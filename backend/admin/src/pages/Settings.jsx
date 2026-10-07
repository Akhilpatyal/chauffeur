import React, { useEffect, useState } from 'react';
import api from '../api.js';
import { Banner, formatDate } from '../components/ui.jsx';

export default function Settings({ user, onPasswordChanged }) {
  const [flags, setFlags] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);

  const canToggleFlags = user.permissions.includes('flags:write');
  const canReadAudit = user.permissions.includes('audit:read');

  useEffect(() => {
    api.flags.list().then((response) => setFlags(response.data)).catch((caught) => setError(caught.message));
    if (canReadAudit) {
      api.audit({ limit: 25 }).then((response) => setAudit(response.data)).catch(() => setAudit([]));
    }
  }, [canReadAudit]);

  async function toggle(flag) {
    setError(null);
    try {
      await api.flags.set(flag.key, { value: !flag.value });
      const refreshed = await api.flags.list();
      setFlags(refreshed.data);
      setNotice(
        !flag.value
          ? `${flag.key} is now on.`
          : `${flag.key} is now off. Visitors will see the message below instead of a silent failure.`,
      );
    } catch (caught) {
      setError(caught.message);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(passwords);
      // The server invalidates every session on a password change, so the only
      // correct next step is to sign in again.
      onPasswordChanged();
    } catch (caught) {
      const details = caught.details;
      setError(
        Array.isArray(details) && details.length > 0
          ? details.map((issue) => issue.message).join(' ')
          : caught.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Settings</h2>
          <p>Operational switches, your password, and a record of who changed what.</p>
        </div>
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>
      <Banner kind="ok" onDismiss={() => setNotice(null)}>{notice}</Banner>

      <div className="grid cols-2">
        <div className="card">
          <strong>Feature flags</strong>
          <p className="muted small">
            Turning submissions off makes the public forms return a clear message rather than
            appearing to work. Use it during maintenance, never as a way to stem volume.
          </p>
          <div className="stack" style={{ marginTop: 10 }}>
            {flags.map((flag) => (
              <div key={flag.key} style={{ borderTop: '1px solid #eee7d8', paddingTop: 10 }}>
                <div className="row" style={{ alignItems: 'center' }}>
                  <div>
                    <div className="mono">{flag.key}</div>
                    <div className="muted small">{flag.description}</div>
                  </div>
                  <div className="shrink">
                    <span className={`badge ${flag.value ? 'published' : 'lost'}`}>
                      {flag.value ? 'on' : 'off'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink"
                    disabled={!canToggleFlags}
                    onClick={() => toggle(flag)}
                  >
                    Turn {flag.value ? 'off' : 'on'}
                  </button>
                </div>
                {!flag.value && flag.message && (
                  <div className="muted small" style={{ marginTop: 6 }}>
                    Visitors see: “{flag.message}”
                  </div>
                )}
              </div>
            ))}
            {!canToggleFlags && (
              <p className="muted small">Only a super admin can change these.</p>
            )}
          </div>
        </div>

        <form className="card stack" onSubmit={changePassword}>
          <strong>Your password</strong>
          <p className="muted small" style={{ margin: 0 }}>
            At least 12 characters. Changing it signs you out everywhere, including this tab.
          </p>
          <div>
            <label htmlFor="current">Current password</label>
            <input
              id="current"
              type="password"
              autoComplete="current-password"
              required
              value={passwords.currentPassword}
              onChange={(event) => setPasswords((c) => ({ ...c, currentPassword: event.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="next">New password</label>
            <input
              id="next"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              value={passwords.newPassword}
              onChange={(event) => setPasswords((c) => ({ ...c, newPassword: event.target.value }))}
            />
          </div>
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'Saving...' : 'Change password'}
          </button>
        </form>
      </div>

      {canReadAudit && (
        <div className="card" style={{ marginTop: 14 }}>
          <strong>Recent activity</strong>
          <div className="table-wrap" style={{ marginTop: 10, maxHeight: '40vh' }}>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>What</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">Nothing recorded yet.</td>
                  </tr>
                )}
                {audit.map((entry) => (
                  <tr key={entry._id}>
                    <td className="small">{formatDate(entry.createdAt)}</td>
                    <td className="small">{entry.actorName ?? '—'}</td>
                    <td className="small mono">{entry.action}</td>
                    <td className="small">
                      {entry.entityLabel ?? entry.entityId ?? entry.entity}
                      <div className="muted">{entry.entity}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
