import React, { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { Banner, Drawer, Pager, StatusBadge, formatDate } from '../components/ui.jsx';
import { CONTENT_TYPES } from '../contentFields.js';
import ContentForm from './ContentForm.jsx';

export default function Content({ user }) {
  const [type, setType] = useState(CONTENT_TYPES[0]);
  const [query, setQuery] = useState({ page: 1, limit: 20, status: 'all', search: '' });
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(null); // a record, or 'new'
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const canWrite = user.permissions.includes('content:write');
  const canPublish = user.permissions.includes('content:publish');

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== '' && value !== undefined),
      );
      setResult(await api.content.list(type.key, params));
    } catch (caught) {
      setError(caught.message);
    }
  }, [type.key, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Switching collection resets paging and search, since neither carries over.
  function changeType(key) {
    setType(CONTENT_TYPES.find((entry) => entry.key === key));
    setQuery({ page: 1, limit: 20, status: 'all', search: '' });
  }

  async function remove(record) {
    const label = record[type.titleField] ?? record.slug;
    if (!window.confirm(`Delete "${label}"? This cannot be undone. Setting the status to archived keeps existing links working.`)) {
      return;
    }
    try {
      await api.content.remove(type.key, record._id);
      setNotice(`Deleted "${label}".`);
      load();
    } catch (caught) {
      setError(caught.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Content</h2>
          <p>Edits go live as soon as they are saved; the cache is cleared on every write.</p>
        </div>
        {canWrite && (
          <button type="button" className="shrink primary" onClick={() => setEditing('new')}>
            New {type.label.replace(/s$/, '').toLowerCase()}
          </button>
        )}
      </div>

      <Banner onDismiss={() => setError(null)}>{error}</Banner>
      <Banner kind="ok" onDismiss={() => setNotice(null)}>{notice}</Banner>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="row">
          <div>
            <label htmlFor="type">Collection</label>
            <select id="type" value={type.key} onChange={(event) => changeType(event.target.value)}>
              {CONTENT_TYPES.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="content-status">Status</label>
            <select
              id="content-status"
              value={query.status}
              onChange={(event) => setQuery((current) => ({ ...current, status: event.target.value, page: 1 }))}
            >
              <option value="all">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label htmlFor="content-search">Search</label>
            <input
              id="content-search"
              value={query.search}
              placeholder="Title or slug"
              onChange={(event) => setQuery((current) => ({ ...current, search: event.target.value, page: 1 }))}
            />
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{type.label.replace(/s$/, '')}</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {result?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">Nothing here yet.</td>
              </tr>
            )}
            {result?.data.map((record) => (
              <tr key={record._id}>
                <td>{record[type.titleField] ?? '—'}</td>
                <td className="mono small">{record.slug}</td>
                <td><StatusBadge value={record.status} /></td>
                <td>{record.isFeatured ? 'Yes' : <span className="muted">No</span>}</td>
                <td className="small">{formatDate(record.updatedAt)}</td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      type="button"
                      className="link shrink"
                      onClick={async () => {
                        // The list projection omits most fields, so the editor
                        // loads the full record before opening.
                        try {
                          const full = await api.content.get(type.key, record._id);
                          setEditing(full.data);
                        } catch (caught) {
                          setError(caught.message);
                        }
                      }}
                    >
                      {canWrite ? 'Edit' : 'View'}
                    </button>
                    {canPublish && (
                      <button type="button" className="link shrink danger" onClick={() => remove(record)}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager meta={result?.meta} onPage={(page) => setQuery((current) => ({ ...current, page }))} />

      {editing && (
        <Drawer
          title={editing === 'new' ? `New ${type.label.replace(/s$/, '').toLowerCase()}` : editing[type.titleField]}
          subtitle={type.label}
          onClose={() => setEditing(null)}
        >
          <ContentForm
            type={type.key}
            record={editing === 'new' ? null : editing}
            canPublish={canPublish}
            onCancel={() => setEditing(null)}
            onSaved={(saved) => {
              setEditing(null);
              setNotice(`Saved "${saved[type.titleField] ?? saved.slug}".`);
              load();
            }}
          />
        </Drawer>
      )}
    </>
  );
}
