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

/*
 * A line chart, again without a charting library — an inline SVG polyline is
 * enough for a traffic graph and costs nothing to load. Two series share one
 * vertical scale on purpose when they are the same unit (requests and errors),
 * because a second axis would make a handful of errors look like a wall.
 */
export function LineChart({ points, series, height = 140 }) {
  if (!points?.length) return <p className="muted small">No data in this range.</p>;

  const max = Math.max(1, ...points.flatMap((point) => series.map((line) => point[line.key] ?? 0)));
  const step = points.length > 1 ? 100 / (points.length - 1) : 0;

  const pathFor = (key) =>
    points
      .map((point, index) => {
        const x = (index * step).toFixed(2);
        const y = (100 - ((point[key] ?? 0) / max) * 100).toFixed(2);
        return `${index === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');

  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block' }}
        role="img"
        aria-label={series.map((line) => line.label).join(' and ')}
      >
        {[25, 50, 75].map((line) => (
          <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="currentColor" strokeWidth="0.2" opacity="0.15" />
        ))}
        {series.map((line) => (
          <path
            key={line.key}
            d={pathFor(line.key)}
            fill="none"
            stroke={line.color}
            strokeWidth="0.8"
            /* Without this the stroke is squashed horizontally along with the
             * viewBox and the line looks like it changes weight as it slopes. */
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="chart-legend">
        {series.map((line) => (
          <span key={line.key}>
            <i style={{ background: line.color }} />
            {line.label}
          </span>
        ))}
        <span className="muted" style={{ marginLeft: 'auto' }}>peak {max}</span>
      </div>
    </>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <em>{tab.count}</em>}
        </button>
      ))}
    </div>
  );
}

export const RANGES = [
  { key: '1h', label: 'Last hour' },
  { key: '6h', label: 'Last 6 hours' },
  { key: '24h', label: 'Last 24 hours' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
];

export function RangePicker({ value, onChange }) {
  return (
    <label className="shrink">
      <span className="muted small">Range</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {RANGES.map((range) => (
          <option key={range.key} value={range.key}>
            {range.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const SeverityBadge = ({ value }) => (
  <span className={`badge sev-${value}`}>{value}</span>
);

/*
 * Durations read as durations. A dashboard that prints "1847ms" makes the
 * reader do the division; "1.8s" does not, and the threshold where it matters
 * is exactly where the unit changes.
 */
export const formatMs = (ms) => {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`;
};

export const formatCount = (value) =>
  value === null || value === undefined ? '—' : Number(value).toLocaleString('en-IN');

/* Relative time, because "3 minutes ago" answers "is this happening now?" and
 * a timestamp does not. Falls back to the date once that stops being the
 * question anyone is asking. */
export const formatAgo = (value) => {
  if (!value) return '—';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  if (seconds < 90) return 'a minute ago';
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes ago`;
  if (seconds < 7200) return 'an hour ago';
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} hours ago`;
  if (seconds < 172_800) return 'yesterday';
  if (seconds < 604_800) return `${Math.round(seconds / 86_400)} days ago`;
  return formatDay(value);
};

export const roleLabel = (role) => String(role ?? '').replace(/_/g, ' ');

export function Empty({ children }) {
  return <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>{children}</p>;
}

export function Spinner({ children = 'Loading…' }) {
  return <p className="muted small" style={{ padding: '16px 0' }}>{children}</p>;
}
