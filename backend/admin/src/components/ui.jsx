import React from 'react';

export function Banner({ kind = 'error', children, onDismiss }) {
  if (!children) return null;
  return (
    <div className={`banner ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
      {onDismiss && (
        <button type="button" className="link" style={{ marginLeft: 10 }} onClick={onDismiss}>
          dismiss
        </button>
      )}
    </div>
  );
}

export const StatusBadge = ({ value }) => (
  <span className={`badge ${value}`}>{String(value ?? '').replace(/_/g, ' ')}</span>
);

export function Stat({ label, value, note, warn = false }) {
  return (
    <div className={`stat${warn ? ' warn' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

/*
 * A bar chart with no charting library. Dependencies for an internal tool have a
 * real cost (bundle size, upgrade churn, supply-chain surface) and this is 20
 * lines of divs.
 */
export function Bars({ series, labelKey = 'bucket', valueKey = 'count' }) {
  if (!series?.length) return <p className="muted small">No data in this range.</p>;
  const max = Math.max(...series.map((point) => point[valueKey]), 1);

  return (
    <>
      <div className="bars">
        {series.map((point) => (
          <div
            key={point[labelKey]}
            style={{ height: `${Math.max(2, (point[valueKey] / max) * 100)}%` }}
            title={`${point[labelKey]}: ${point[valueKey]}`}
          />
        ))}
      </div>
      <div className="muted small" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span>{series[0][labelKey]}</span>
        <span>{series.at(-1)[labelKey]}</span>
      </div>
    </>
  );
}

export function Pager({ meta, onPage }) {
  if (!meta) return null;
  return (
    <div className="pager">
      <span className="muted">
        {meta.total === 0
          ? 'No results'
          : `Page ${meta.page} of ${meta.pages} · ${meta.total} total`}
      </span>
      <button type="button" disabled={!meta.hasPrev} onClick={() => onPage(meta.page - 1)}>
        Previous
      </button>
      <button type="button" disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)}>
        Next
      </button>
    </div>
  );
}

export function Drawer({ title, subtitle, onClose, children }) {
  // Escape closes it: this drawer is opened and dismissed dozens of times a day.
  React.useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="drawer-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-label={title}>
        <div className="page-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="shrink" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const formatDay = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';
