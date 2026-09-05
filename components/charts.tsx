/**
 * Lightweight, dependency-free SVG charts (server components).
 * Drawn by hand so there's no chart library → no transitive deps, no CSP
 * issues, and full styling control over the dashboard.
 */

export const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#f56565",
  HIGH: "#ed8936",
  MEDIUM: "#ecc94b",
  LOW: "#48bb78",
};

/* ------------------------------------------------------------------ */
/* Smooth area/line chart (risk trend by entry index)                 */
/* ------------------------------------------------------------------ */
export function AreaChart({
  data,
  width = 640,
  height = 180,
}: {
  data: { index: number; score: number; severity: string }[];
  width?: number;
  height?: number;
}) {
  const pad = 8;
  const maxIdx = Math.max(1, ...data.map((d) => d.index));
  const maxScore = 1;
  const pts = data.map((d) => {
    const x = pad + ((d.index - 1) / Math.max(1, maxIdx - 1)) * (width - pad * 2);
    const y = height - pad - (d.score / maxScore) * (height - pad * 2);
    return { x, y, ...d };
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1]?.x ?? pad},${height - pad} L${pad},${height - pad} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fd1c5" stopOpacity="0.38" />
          <stop offset="1" stopColor="#4fd1c5" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4fd1c5" />
          <stop offset="1" stopColor="#4a9fd8" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      {[0.25, 0.5, 0.75].map((f) => {
        const y = height - pad - f * (height - pad * 2);
        return <line key={f} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#1f2a36" strokeDasharray="2 4" strokeWidth="1" />;
      })}
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke="url(#lineStroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* severity dots */}
      {pts.map((p) => (
        <circle key={p.index} cx={p.x} cy={p.y} r="3.2" fill={SEV_COLOR[p.severity] ?? "#4fd1c5"} />
      ))}
      {/* last value marker */}
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="5" fill="#4fd1c5" stroke="#0b0f14" strokeWidth="2" />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Donut chart (severity distribution)                                */
/* ------------------------------------------------------------------ */
export function Donut({
  data,
  size = 150,
  thickness = 20,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} aria-hidden>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f2a36" strokeWidth={thickness} />
      {data.map((d) => {
        const frac = d.value / total;
        const len = frac * circ;
        const el = (
          <circle
            key={d.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={d.value > 0 ? 1 : 0}
          />
        );
        offset += len;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="30" fontWeight="700" fill="#e6edf3">
        {total}
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill="#66757f" letterSpacing="0.06em">
        SIGNALS
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal bar list (action breakdown)                             */
/* ------------------------------------------------------------------ */
export function BarList({
  data,
  color = "#4fd1c5",
}: {
  data: { label: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="barlist">
      {data.map((d) => (
        <div key={d.label} className="barlist-row">
          <div className="barlist-label">{d.label}</div>
          <div className="barlist-track">
            <div className="barlist-fill" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
          </div>
          <div className="barlist-count">{d.count}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mini vertical bars (recent activity timeline)                      */
/* ------------------------------------------------------------------ */
export function MiniBars({
  data,
  height = 120,
}: {
  data: { label: string; count: number; risky: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const barW = 34;
  const gap = 20;
  const totalW = data.length * barW + (data.length - 1) * gap + 20;
  return (
    <svg viewBox={`0 0 ${totalW} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet" aria-hidden>
      {data.map((d, i) => {
        const x = 10 + i * (barW + gap);
        const h = (d.count / max) * (height - 40);
        const y = height - 22 - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={h} rx="5" fill="#2a3745" />
            {d.risky > 0 &&
              (() => {
                const rh = (d.risky / max) * (height - 40);
                return <rect x={x} y={height - 22 - rh} width={barW} height={rh} rx="5" fill="#f56565" opacity="0.85" />;
              })()}
            <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="#66757f">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
