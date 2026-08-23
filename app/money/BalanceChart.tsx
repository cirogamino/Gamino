/**
 * Multi-vendor balance trend.
 *
 * Vendors are denominated in different units — dollars, credits, characters —
 * so raw balances share no axis. Every series is therefore indexed to 100 at
 * the left edge of the window and plotted as "percent of where it started".
 * That keeps one axis (never two scales on one chart), makes vendors directly
 * comparable, and is what makes a spike legible: everything tracks a gentle
 * slope down together until one line dives.
 */

import { useId, useState } from "react";
import { MAX_SERIES } from "./vendors";

/**
 * Series colors come from CSS variables rather than literals so light and
 * dark each get their own steps from the same ramps — a dark chart is a
 * selected palette, never an automatic flip of the light one.
 */
const SERIES_VARS = Array.from(
  { length: MAX_SERIES },
  (_, i) => `var(--series-${i + 1})`,
);

export interface ChartSeries {
  vendorId: string;
  name: string;
  points: { ts: string; balance: number }[];
}

interface Props {
  series: ChartSeries[];
}

const W = 900;
const H = 320;
const PAD = { top: 16, right: 116, bottom: 28, left: 44 };

interface Prepared {
  vendorId: string;
  name: string;
  color: string;
  pts: { x: number; y: number; t: number; indexed: number; raw: number }[];
}

export function BalanceChart({ series }: Props) {
  const clipId = useId();
  const [hoverX, setHoverX] = useState<number | null>(null);

  const usable = series.filter((s) => s.points.length >= 2).slice(0, MAX_SERIES);

  if (usable.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-lg border border-[var(--chart-border)] text-sm text-[var(--ink-muted)]">
        Record a balance for at least two points in time and the trend appears
        here.
      </div>
    );
  }

  // Shared time domain so all series line up on one x-axis.
  const allTs = usable.flatMap((s) => s.points.map((p) => Date.parse(p.ts)));
  const tMin = Math.min(...allTs);
  const tMax = Math.max(...allTs);
  const tSpan = tMax - tMin || 1;

  const prepared: Prepared[] = usable.map((s, i) => {
    const base = s.points[0].balance || 1;
    return {
      vendorId: s.vendorId,
      name: s.name,
      color: SERIES_VARS[i % SERIES_VARS.length],
      pts: s.points.map((p) => {
        const t = Date.parse(p.ts);
        return {
          t,
          raw: p.balance,
          indexed: (p.balance / base) * 100,
          x: 0,
          y: 0,
        };
      }),
    };
  });

  const allIndexed = prepared.flatMap((s) => s.pts.map((p) => p.indexed));
  const yMax = Math.max(110, Math.ceil(Math.max(...allIndexed) / 10) * 10);
  const yMin = Math.min(0, Math.floor(Math.min(...allIndexed) / 10) * 10);
  const ySpan = yMax - yMin || 1;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  for (const s of prepared) {
    for (const p of s.pts) {
      p.x = PAD.left + ((p.t - tMin) / tSpan) * plotW;
      p.y = PAD.top + plotH - ((p.indexed - yMin) / ySpan) * plotH;
    }
  }

  const yTicks = [yMin, yMin + ySpan / 2, yMax];

  // Nearest sample to the cursor, per series, for the crosshair readout.
  const hoverT =
    hoverX === null ? null : tMin + ((hoverX - PAD.left) / plotW) * tSpan;
  const readout =
    hoverT === null
      ? []
      : prepared.map((s) => {
          const nearest = s.pts.reduce((best, p) =>
            Math.abs(p.t - hoverT) < Math.abs(best.t - hoverT) ? p : best,
          );
          return { name: s.name, color: s.color, point: nearest };
        });

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Balance trend by vendor, indexed to 100 at the start of the window"
        onMouseLeave={() => setHoverX(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * W;
          setHoverX(x >= PAD.left && x <= PAD.left + plotW ? x : null);
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Recessive grid — hairlines, never competing with the data. */}
        {yTicks.map((v) => {
          const y = PAD.top + plotH - ((v - yMin) / ySpan) * plotH;
          return (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y}
                y2={y}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="var(--ink-muted)"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        {/* 100 = where each vendor started. Crossing below it is spend. */}
        {yMin < 100 && yMax > 100 && (
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={PAD.top + plotH - ((100 - yMin) / ySpan) * plotH}
            y2={PAD.top + plotH - ((100 - yMin) / ySpan) * plotH}
            stroke="var(--chart-axis)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {hoverX !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={PAD.top}
            y2={PAD.top + plotH}
            stroke="var(--chart-axis)"
            strokeWidth={1}
          />
        )}

        <g clipPath={`url(#${clipId})`}>
          {prepared.map((s) => (
            <polyline
              key={s.vendorId}
              points={s.pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Direct labels at the line ends. These are the relief the palette
            validator requires for the sub-3:1 hues in light mode — identity
            never rests on color alone. */}
        {prepared.map((s) => {
          const last = s.pts.at(-1)!;
          return (
            <text
              key={s.vendorId}
              x={PAD.left + plotW + 8}
              y={last.y + 4}
              fontSize={11}
              fill="var(--ink-secondary)"
            >
              {s.name}
            </text>
          );
        })}

        {readout.map((r) => (
          <circle
            key={r.name}
            cx={r.point.x}
            cy={r.point.y}
            r={4}
            fill={r.color}
            stroke="var(--chart-surface)"
            strokeWidth={2}
          />
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={PAD.top + plotH}
          y2={PAD.top + plotH}
          stroke="var(--chart-axis)"
          strokeWidth={1}
        />
        <text x={PAD.left} y={H - 8} fontSize={11} fill="var(--ink-muted)">
          {new Date(tMin).toLocaleDateString()}
        </text>
        <text
          x={PAD.left + plotW}
          y={H - 8}
          textAnchor="end"
          fontSize={11}
          fill="var(--ink-muted)"
        >
          {new Date(tMax).toLocaleDateString()}
        </text>
      </svg>

      {hoverT !== null && readout.length > 0 && (
        <div className="mt-2 rounded-lg border border-[var(--chart-border)] bg-[var(--chart-surface)] p-3 text-xs">
          <div className="mb-1 text-[var(--ink-muted)]">
            {new Date(hoverT).toLocaleString()}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {readout.map((r) => (
              <div key={r.name} className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: r.color }}
                  aria-hidden
                />
                <span className="truncate text-[var(--ink-secondary)]">
                  {r.name}
                </span>
                <span
                  className="ml-auto text-[var(--ink-primary)]"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {Math.round(r.point.indexed)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend is always present for two or more series. */}
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-secondary)]">
        {prepared.map((s) => (
          <span key={s.vendorId} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
              aria-hidden
            />
            {s.name}
          </span>
        ))}
        <span className="text-[var(--ink-muted)]">
          · indexed to 100 at window start
        </span>
      </figcaption>
    </figure>
  );
}

/** Single-series sparkline for a vendor card. One series needs no legend —
 *  the card title names it. */
export function Sparkline({
  points,
  status,
}: {
  points: { ts: string; balance: number }[];
  status: string;
}) {
  if (points.length < 2) {
    return <div className="h-8 text-xs text-[var(--ink-muted)]">No history</div>;
  }

  const w = 160;
  const h = 32;
  const ts = points.map((p) => Date.parse(p.ts));
  const vals = points.map((p) => p.balance);
  const tMin = Math.min(...ts);
  const tSpan = Math.max(...ts) - tMin || 1;
  const vMin = Math.min(...vals);
  const vSpan = Math.max(...vals) - vMin || 1;

  const d = points
    .map((p, i) => {
      const x = ((ts[i] - tMin) / tSpan) * (w - 2) + 1;
      const y = h - 1 - ((p.balance - vMin) / vSpan) * (h - 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const stroke =
    status === "critical"
      ? "var(--status-critical)"
      : status === "low"
        ? "var(--status-warning)"
        : "var(--ink-secondary)";

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-8 w-full"
      aria-hidden
    >
      <polyline
        points={d}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        // Keeps the 2px weight even once the viewBox is stretched to fill.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
