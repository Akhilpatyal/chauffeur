import React, { useState } from 'react';
import api from '../api.js';
import { Banner } from '../components/ui.jsx';
import { FIELDS } from '../contentFields.js';

/* Lists are edited as one-per-line text, which is far faster for a content
 * editor than a repeater with add/remove buttons. */
const toLines = (value) => (Array.isArray(value) ? value.join('\n') : '');
const fromLines = (value) =>
  value.split('\n').map((line) => line.trim()).filter(Boolean);

function initialValues(type, record) {
  const values = {};
  for (const field of FIELDS[type]) {
    const current = record?.[field.name];
    switch (field.kind) {
      case 'list':
        values[field.name] = toLines(current);
        break;
      case 'money':
        values[field.name] = current?.display ?? (current?.amount ?? '');
        break;
      case 'boolean':
        values[field.name] = Boolean(current);
        break;
      case 'multiselect':
        values[field.name] = Array.isArray(current) ? current : [];
        break;
      default:
        values[field.name] = current ?? '';
    }
  }
  // Latitude and longitude are stored inside a GeoJSON point, which is
  // [lng, lat] — the reverse of how the form reads.
  if (type === 'destinations' && record?.coordinates?.coordinates) {
    const [lng, lat] = record.coordinates.coordinates;
    values.lat = lat;
    values.lng = lng;
  }
  return values;
}

/* Parses "Rs 14,999" or "14999" into the { amount, display } shape the API
 * expects, preserving whatever the editor typed for display. */
function parseMoney(input) {
  const raw = String(input ?? '').trim();
  if (!raw) return undefined;
  const amount = Number.parseFloat(raw.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(amount)) return undefined;
  return { amount, currency: 'INR', display: /^[\d.]+$/.test(raw) ? undefined : raw };
}

function buildPayload(type, values) {
  const payload = {};

  for (const field of FIELDS[type]) {
    const value = values[field.name];

    switch (field.kind) {
      case 'list':
        payload[field.name] = fromLines(value ?? '');
        break;
      case 'money': {
        const money = parseMoney(value);
        if (money) payload[field.name] = money;
        break;
      }
      case 'number':
        // An empty number field means "leave unset", not zero.
        if (value !== '' && value !== null && value !== undefined) {
          payload[field.name] = Number(value);
        }
        break;
      case 'boolean':
        payload[field.name] = Boolean(value);
        break;
      case 'multiselect':
        payload[field.name] = value ?? [];
        break;
      default:
        if (value !== '' && value !== null && value !== undefined) payload[field.name] = value;
    }
  }

  return payload;
}

function Field({ field, value, onChange, onUpload, uploading }) {
  const id = `field-${field.name}`;
  const common = { id, value: value ?? '', onChange: (event) => onChange(field.name, event.target.value) };

  return (
    <div style={{ gridColumn: ['textarea', 'list'].includes(field.kind) ? '1 / -1' : undefined }}>
      <label htmlFor={id}>
        {field.label}
        {field.required && <span style={{ color: '#d65a3a' }}> *</span>}
      </label>

      {field.kind === 'textarea' && <textarea rows={field.rows ?? 3} {...common} />}

      {field.kind === 'list' && (
        <textarea rows={field.rows ?? 4} placeholder="One per line" {...common} />
      )}

      {field.kind === 'select' && (
        <select {...common}>
          {field.options.map((option) => (
            <option key={option} value={option}>{option || '—'}</option>
          ))}
        </select>
      )}

      {field.kind === 'multiselect' && (
        <div className="row" style={{ gap: 12 }}>
          {field.options.map((option) => (
            <label
              key={option}
              className="shrink"
              style={{ display: 'flex', gap: 6, alignItems: 'center', textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'inherit', fontSize: 13 }}
            >
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={(value ?? []).includes(option)}
                onChange={(event) => {
                  const next = new Set(value ?? []);
                  if (event.target.checked) next.add(option);
                  else next.delete(option);
                  onChange(field.name, [...next]);
                }}
              />
              {option.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      )}

      {field.kind === 'boolean' && (
        <input
          id={id}
          type="checkbox"
          style={{ width: 'auto' }}
          checked={Boolean(value)}
          onChange={(event) => onChange(field.name, event.target.checked)}
        />
      )}

      {field.kind === 'number' && (
        <input id={id} type="number" step={field.step ?? '1'} value={value ?? ''} onChange={(event) => onChange(field.name, event.target.value)} />
      )}

      {field.kind === 'image' && (
        <div className="stack">
          <input {...common} placeholder="https://… or upload" />
          <div className="row">
            <input
              className="shrink"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(field, file);
                event.target.value = '';
              }}
            />
            {value && (
              <img
                src={value}
                alt=""
                className="shrink"
                style={{ height: 44, width: 68, objectFit: 'cover', borderRadius: 6 }}
              />
            )}
          </div>
        </div>
      )}

      {['text', 'money'].includes(field.kind) && <input {...common} />}

      {field.hint && <div className="muted small">{field.hint}</div>}
    </div>
  );
}

export default function ContentForm({ type, record, canPublish, onSaved, onCancel }) {
  const [values, setValues] = useState(() => initialValues(type, record));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const setValue = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  async function upload(field, file) {
    setUploading(true);
    setError(null);
    try {
      const result = await api.upload(file, field.folder ?? 'misc');
      setValue(field.name, result.url);
    } catch (caught) {
      // Image storage is optional per environment, so say so plainly instead of
      // showing a bare 503.
      setError(
        caught.code === 'STORAGE_DISABLED'
          ? 'Image storage is not configured on this environment. Paste a URL instead.'
          : caught.message,
      );
    } finally {
      setUploading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = buildPayload(type, values);
      const saved = record
        ? await api.content.update(type, record._id, payload)
        : await api.content.create(type, payload);
      onSaved(saved.data);
    } catch (caught) {
      // Field-level messages from the server are far more useful than a generic
      // "validation failed".
      const details = caught.details;
      setError(
        Array.isArray(details) && details.length > 0
          ? details.map((issue) => `${issue.field}: ${issue.message}`).join(' · ')
          : caught.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <Banner onDismiss={() => setError(null)}>{error}</Banner>

      {record && (
        <p className="muted small" style={{ margin: 0 }}>
          Slug <span className="mono">{record.slug}</span> — kept stable so existing links keep
          working.
        </p>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {FIELDS[type].map((field) => (
          <Field
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={setValue}
            onUpload={upload}
            uploading={uploading}
          />
        ))}
      </div>

      <div className="row">
        <button className="shrink primary" type="submit" disabled={busy || uploading}>
          {busy ? 'Saving...' : record ? 'Save changes' : 'Create'}
        </button>
        <button className="shrink" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        {!canPublish && (
          <span className="muted small">
            Your role can edit content but not delete it.
          </span>
        )}
      </div>
    </form>
  );
}
