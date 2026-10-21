"use client";

import { idealCurve, REFERENCE_SHAPES, type Protocol } from "@/lib/analysis";

const W = 640;
const H = 260;
const PAD = { l: 52, r: 12, t: 22, b: 40 };

const STIM_FILL: Record<string, string> = {
  white: "rgba(240,253,244,0.12)",
  red: "rgba(248,113,113,0.18)",
  blue: "rgba(96,165,250,0.2)",
};

export function ResponseChart({
  series,
  protocol,
}: {
  series: { t: number; r: number }[];
  protocol: Protocol;
}) {
  const ref = (key: keyof typeof REFERENCE_SHAPES) =>
    Array.from({ length: Math.round(protocol.duration * 20) + 1 }, (_, i) => {
      const t = i / 20;
      return { t, r: idealCurve(t, REFERENCE_SHAPES[key], protocol.stimuli) };
    });
  const typical = ref("typical");
  const slower = ref("diabetesLike");

  const all = [...series, ...typical, ...slower].map((p) => p.r);
  const yMin = Math.max(0, Math.min(...all) - 0.04);
  const yMax = Math.min(1, Math.max(...all) + 0.04);
  const x = (t: number) => PAD.l + (t / protocol.duration) * (W - PAD.l - PAD.r);
  const y = (r: number) => PAD.t + (1 - (r - yMin) / (yMax - yMin || 1)) * (H - PAD.t - PAD.b);

  const path = (pts: { t: number; r: number }[]) => {
    let d = "";
    let prev: { t: number; r: number } | null = null;
    for (const p of pts) {
      const gap = !prev || p.t - prev.t > 0.15;
      d += `${gap ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.r).toFixed(1)} `;
      prev = p;
    }
    return d;
  };

  const yTicks = 4;
  const xTicks = Array.from({ length: Math.floor(protocol.duration) + 1 }, (_, i) => i).filter(
    (t) => protocol.duration <= 8 || t % 2 === 0,
  );

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Pupil response over time">
        {protocol.stimuli.map((s, i) => (
          <g key={i}>
            <rect x={x(s.onset)} y={PAD.t} width={x(s.offset) - x(s.onset)} height={H - PAD.t - PAD.b} fill={STIM_FILL[s.color]} />
            <text x={(x(s.onset) + x(s.offset)) / 2} y={PAD.t - 6} textAnchor="middle" fontSize="14" fill="#bbf7d0" opacity="0.8">
              {s.color} light
            </text>
          </g>
        ))}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const r = yMin + ((yMax - yMin) * i) / yTicks;
          return (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(r)} y2={y(r)} stroke="#bbf7d0" strokeOpacity="0.08" />
              <text x={PAD.l - 6} y={y(r) + 3} textAnchor="end" fontSize="14" fill="#9cc9aa">
                {r.toFixed(2)}
              </text>
            </g>
          );
        })}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={H - PAD.b + 22} textAnchor="middle" fontSize="14" fill="#9cc9aa">
            {t}s
          </text>
        ))}
        <path d={path(slower)} fill="none" stroke="#fbbf24" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="5 4" />
        <path d={path(typical)} fill="none" stroke="#4ade80" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="5 4" />
        <path d={path(series)} fill="none" stroke="#dcfce7" strokeWidth="2.5" strokeLinejoin="round" />
        <text x={14} y={H / 2} fontSize="14" fill="#9cc9aa" transform={`rotate(-90 14 ${H / 2})`} textAnchor="middle">
          pupil ÷ iris
        </text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-iris-100/70">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-iris-100" /> Your pupil
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 border-t-2 border-dashed border-iris-400" /> Typical shape
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 border-t-2 border-dashed border-amber-400" /> Slower shape (diabetes studies)
        </span>
      </figcaption>
      <p className="mt-1 text-[11px] text-iris-100/50">
        Dashed lines are illustrative shapes that follow the direction of published findings. They are not fitted to patient data.
      </p>
    </figure>
  );
}
