"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Small, dependency-free SVG charts for the dashboard. One series per chart, drawn in the
 * text color (the site is black and white), with a shaded "typical range" band, a 2px line,
 * 8px markers with a surface-colored ring, a hairline grid, and a crosshair tooltip that
 * also works with the arrow keys. Every value is also listed in the scan history table.
 */

export type Point = { t: string; v: number };

const dateFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function niceDomain(values: number[], band: { min?: number; max?: number }, unitMax = 100): [number, number] {
  const all = [...values, ...(band.min !== undefined ? [band.min] : []), ...(band.max !== undefined ? [band.max] : [])];
  if (all.length === 0) return [0, unitMax];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const pad = Math.max(2, (hi - lo) * 0.2);
  lo = Math.max(0, Math.floor((lo - pad) / 5) * 5);
  hi = Math.min(unitMax, Math.ceil((hi + pad) / 5) * 5);
  if (hi - lo < 10) hi = Math.min(unitMax, lo + 10);
  return [lo, hi];
}

export function TrendChart({
  points,
  unit,
  label,
  band,
  height = 220,
}: {
  points: Point[];
  unit: string;
  label: string;
  band: { min?: number; max?: number };
  height?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = { top: 14, right: 52, bottom: 26, left: 36 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const [lo, hi] = useMemo(() => niceDomain(points.map((p) => p.v), band), [points, band]);
  const x = (i: number) => m.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => m.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);

  if (points.length < 2) {
    return (
      <div ref={wrapRef} className="flex items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground" style={{ height }}>
        Run at least two scans to see a trend.
      </div>
    );
  }

  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const bandTop = y(Math.min(hi, band.max ?? hi));
  const bandBottom = y(Math.max(lo, band.min ?? lo));
  const last = points[points.length - 1];

  const pick = (clientX: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = clientX - r.left;
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
    setActive(best);
  };

  const a = active !== null ? points[active] : null;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        width={width}
        height={height}
        role="img"
        tabIndex={0}
        aria-label={`${label} over your last ${points.length} scans. Latest ${last.v.toFixed(0)}${unit}. Use the arrow keys to read each scan.`}
        className="block overflow-visible rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onPointerMove={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive(points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? points.length - 1) - 1));
          if (e.key === "ArrowRight") setActive((i) => Math.min(points.length - 1, (i ?? 0) + 1));
        }}
      >
        {/* typical range */}
        <rect x={m.left} y={bandTop} width={innerW} height={Math.max(0, bandBottom - bandTop)} className="fill-foreground/[0.05]" />
        <text x={m.left + 6} y={bandTop + 13} className="fill-muted-foreground text-[10px]">
          Typical range
        </text>

        {/* grid + y ticks */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.left} x2={m.left + innerW} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
            <text x={m.left - 8} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">
              {Math.round(t)}
            </text>
          </g>
        ))}

        {/* x labels: first and last */}
        <text x={x(0)} y={height - 6} className="fill-muted-foreground text-[10px]">
          {dateFmt.format(new Date(points[0].t))}
        </text>
        <text x={x(points.length - 1)} y={height - 6} textAnchor="end" className="fill-muted-foreground text-[10px]">
          {dateFmt.format(new Date(last.t))}
        </text>

        {/* crosshair */}
        {a && <line x1={x(active!)} x2={x(active!)} y1={m.top} y2={m.top + innerH} className="stroke-foreground/30" strokeWidth={1} />}

        {/* line + markers */}
        <path d={path} fill="none" className="stroke-foreground" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle
            key={p.t + i}
            cx={x(i)}
            cy={y(p.v)}
            r={active === i ? 6 : i === points.length - 1 ? 5 : 4}
            className="fill-foreground stroke-background transition-[r] duration-150"
            strokeWidth={2}
          />
        ))}

        {/* end label (the one direct label) */}
        <text x={x(points.length - 1) + 10} y={y(last.v) + 4} className="fill-foreground text-xs font-semibold tabular-nums">
          {last.v.toFixed(0)}
          {unit}
        </text>
      </svg>

      {a && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
          style={{ left: x(active!), top: y(a.v) - 10 }}
        >
          <p className="text-sm font-semibold tabular-nums">
            {a.v.toFixed(1)}
            {unit}
          </p>
          <p className="whitespace-nowrap text-[11px] text-muted-foreground">{timeFmt.format(new Date(a.t))}</p>
        </div>
      )}
    </div>
  );
}

/** Tiny trend line for a result card (values are in the table and the trend chart too). */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className={cn("h-8", className)} />;
  const w = 112;
  const h = 32;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const px = (i: number) => 3 + (i / (values.length - 1)) * (w - 6);
  const py = (v: number) => 4 + (1 - (v - lo) / span) * (h - 8);
  const d = values.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className={className}>
      <path d={d} fill="none" className="stroke-muted-foreground" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(values.length - 1)} cy={py(values[values.length - 1])} r={3.5} className="fill-foreground stroke-background" strokeWidth={2} />
    </svg>
  );
}
