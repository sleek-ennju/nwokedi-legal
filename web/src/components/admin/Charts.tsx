/**
 * Small, honest charts: lines only (length and position read fastest), drawn as
 * plain SVG on the server. No library, no animation loop, hover shows the day.
 */

type Point = { day: string; value: number; label?: string };

const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function TrendChart({ points, height = 168, ariaLabel }: { points: Point[]; height?: number; ariaLabel: string }) {
  const W = 640;
  const H = height;
  const pad = { t: 10, r: 4, b: 4, l: 4 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = Math.max(1, points.length - 1);
  const x = (i: number) => pad.l + (i / n) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(points.length - 1).toFixed(1)},${H - pad.b}L${x(0).toFixed(1)},${H - pad.b}Z`;
  const last = points.at(-1);
  const step = (W - pad.l - pad.r) / Math.max(1, points.length);

  return (
    <svg className="a-trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id="a-trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#16253d" stopOpacity="0.14" />
          <stop offset="1" stopColor="#16253d" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} className="a-trend__grid" />
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="a-trend__base" />
      <path d={area} fill="url(#a-trend-fill)" />
      <path d={line} className="a-trend__line" vectorEffect="non-scaling-stroke" />
      {last && last.value > 0 && <circle cx={x(points.length - 1)} cy={y(last.value)} r="3.5" className="a-trend__dot" vectorEffect="non-scaling-stroke" />}
      {points.map((p, i) => (
        <rect key={p.day} x={x(i) - step / 2} y={0} width={step} height={H - pad.b} className="a-trend__hit">
          <title>{`${fmtDay(p.day)}: ${p.label ?? p.value}`}</title>
        </rect>
      ))}
    </svg>
  );
}

/** Axis labels as text, so a stretched chart never squashes them. */
export function TrendAxis({ from, to }: { from: string; to: string }) {
  return (
    <div className="a-trend-axis" aria-hidden="true">
      <span>{fmtDay(from)}</span>
      <span>{fmtDay(to)}</span>
    </div>
  );
}

export function Sparkline({ values, ariaLabel }: { values: number[]; ariaLabel: string }) {
  const W = 120;
  const H = 32;
  const max = Math.max(1, ...values);
  const n = Math.max(1, values.length - 1);
  const d = values.map((v, i) => `${i ? "L" : "M"}${((i / n) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`).join("");
  return (
    <svg className="a-spark-line" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
      <path d={d} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
