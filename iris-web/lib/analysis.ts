import { IRIS_DIAMETER_MM, THRESHOLDS, rateMetric, type MetricKey, type MetricStatus } from "./reference";

export type StimulusColor = "white" | "red" | "blue";

export type Stimulus = { onset: number; offset: number; color: StimulusColor };

export type Protocol = {
  id: "standard" | "chromatic";
  name: string;
  duration: number;
  stimuli: Stimulus[];
};

export const PROTOCOLS: Record<Protocol["id"], Protocol> = {
  standard: {
    id: "standard",
    name: "Standard (white flash)",
    duration: 7.5,
    stimuli: [{ onset: 2.0, offset: 3.0, color: "white" }],
  },
  chromatic: {
    id: "chromatic",
    name: "Experimental (red + blue light)",
    duration: 17,
    stimuli: [
      { onset: 2.0, offset: 3.0, color: "red" },
      { onset: 10.0, offset: 11.0, color: "blue" },
    ],
  },
};

export type EyeSample = { pupilPx: number; irisPx: number; contrast: number };

export type Sample = {
  /** Seconds since the test started. */
  t: number;
  left?: EyeSample;
  right?: EyeSample;
  /** Both eyes open (no blink). */
  open: boolean;
};

export type StimulusMetrics = {
  color: StimulusColor;
  baseline: number;
  minimum: number;
  amplitude: number; // %
  latency: number | null; // s
  velocity: number | null; // mm/s
  recovery3s: number | null; // %
  pipr6s: number | null; // % of baseline still constricted 6 s after light off
};

export type Analysis = {
  series: { t: number; r: number }[];
  perStimulus: StimulusMetrics[];
  metrics: Record<MetricKey, number | null>;
  ratings: Record<MetricKey, MetricStatus>;
  restingPupilMm: number | null;
  netPipr: number | null;
  quality: { validFraction: number; meanContrast: number; ok: boolean; reasons: string[] };
  verdict: "typical" | "check" | "weaker" | "retake";
};

const FPS = 30;

function median(values: number[]) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function eyeRatios(samples: Sample[], eye: "left" | "right") {
  const irisMedian = median(samples.map((s) => s[eye]?.irisPx ?? NaN));
  return samples.map((s) => {
    const e = s[eye];
    if (!s.open || !e || !Number.isFinite(e.pupilPx) || !Number.isFinite(irisMedian)) return NaN;
    const r = e.pupilPx / irisMedian;
    return r > 0.08 && r < 0.92 ? r : NaN;
  });
}

function resample(points: { t: number; r: number }[], duration: number) {
  const out: { t: number; r: number }[] = [];
  if (points.length < 2) return out;
  let j = 0;
  for (let k = 0; k <= duration * FPS; k++) {
    const t = k / FPS;
    while (j < points.length - 2 && points[j + 1].t < t) j++;
    const a = points[j];
    const b = points[j + 1];
    if (t < points[0].t || t > points[points.length - 1].t) continue;
    // Don't bridge gaps longer than 0.4 s (blinks, lost tracking).
    if (b.t - a.t > 0.4) continue;
    const f = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
    out.push({ t, r: a.r + f * (b.r - a.r) });
  }
  return out;
}

function smooth(series: { t: number; r: number }[]) {
  const med = series.map((p, i) => {
    const w = series.slice(Math.max(0, i - 2), i + 3).map((q) => q.r);
    return { t: p.t, r: median(w) };
  });
  return med.map((p, i) => {
    const w = med.slice(Math.max(0, i - 1), i + 2);
    return { t: p.t, r: w.reduce((s, q) => s + q.r, 0) / w.length };
  });
}

function valueAt(series: { t: number; r: number }[], t: number) {
  let best: { t: number; r: number } | null = null;
  for (const p of series) {
    if (Math.abs(p.t - t) <= 0.1 && (!best || Math.abs(p.t - t) < Math.abs(best.t - t))) best = p;
  }
  return best ? best.r : null;
}

function analyseStimulus(series: { t: number; r: number }[], s: Stimulus): StimulusMetrics | null {
  const baseline = median(series.filter((p) => p.t >= s.onset - 1.0 && p.t < s.onset).map((p) => p.r));
  const window = series.filter((p) => p.t >= s.onset && p.t <= s.onset + 2.2);
  if (!Number.isFinite(baseline) || window.length < 10) return null;

  let minP = window[0];
  for (const p of window) if (p.r < minP.r) minP = p;
  const amplitude = Math.max(0, ((baseline - minP.r) / baseline) * 100);

  let latency: number | null = null;
  const drop = baseline - minP.r;
  if (drop > 0) {
    const start = window.find((p) => p.r < baseline - 0.1 * drop && p.t <= minP.t);
    if (start) latency = Math.max(0, start.t - s.onset);
  }

  let velocity: number | null = null;
  const constricting = series.filter((p) => p.t >= s.onset && p.t <= minP.t);
  for (let i = 1; i < constricting.length - 1; i++) {
    const dt = constricting[i + 1].t - constricting[i - 1].t;
    if (dt <= 0) continue;
    const v = (-(constricting[i + 1].r - constricting[i - 1].r) / dt) * IRIS_DIAMETER_MM;
    if (velocity === null || v > velocity) velocity = v;
  }
  if (velocity !== null) velocity = Math.max(0, velocity);

  const at3 = valueAt(series, s.offset + 3);
  const recovery3s = at3 !== null && drop > 0 ? Math.min(100, Math.max(0, ((at3 - minP.r) / drop) * 100)) : null;
  const at6 = valueAt(series, s.offset + 6);
  const pipr6s = at6 !== null ? ((baseline - at6) / baseline) * 100 : null;

  return { color: s.color, baseline, minimum: minP.r, amplitude, latency, velocity, recovery3s, pipr6s };
}

export function analyse(samples: Sample[], protocol: Protocol): Analysis {
  const left = eyeRatios(samples, "left");
  const right = eyeRatios(samples, "right");
  const raw: { t: number; r: number }[] = [];
  samples.forEach((s, i) => {
    const vals = [left[i], right[i]].filter(Number.isFinite);
    if (vals.length) raw.push({ t: s.t, r: vals.reduce((a, b) => a + b, 0) / vals.length });
  });

  const series = smooth(resample(raw, protocol.duration));
  const perStimulus = protocol.stimuli
    .map((s) => analyseStimulus(series, s))
    .filter((m): m is StimulusMetrics => m !== null);

  // The first (or only) flash drives the headline metrics.
  const main = perStimulus[0];
  const metrics: Record<MetricKey, number | null> = {
    restingRatio: main ? main.baseline : null,
    amplitude: main ? main.amplitude : null,
    latency: main ? main.latency : null,
    velocity: main ? main.velocity : null,
  };
  const ratings = Object.fromEntries(
    THRESHOLDS.map((t) => [t.key, rateMetric(t, metrics[t.key])]),
  ) as Record<MetricKey, MetricStatus>;

  const red = perStimulus.find((m) => m.color === "red");
  const blue = perStimulus.find((m) => m.color === "blue");
  const netPipr = red && blue && red.pipr6s !== null && blue.pipr6s !== null ? blue.pipr6s - red.pipr6s : null;

  const expected = protocol.duration * 15; // assume at least 15 fps is achievable
  const validFraction = Math.min(1, raw.length / expected);
  const contrasts = samples.flatMap((s) => [s.left?.contrast, s.right?.contrast]).filter((c): c is number => c != null);
  const meanContrast = contrasts.length ? contrasts.reduce((a, b) => a + b, 0) / contrasts.length : 0;

  const reasons: string[] = [];
  if (validFraction < 0.5) reasons.push("The pupil was only tracked in part of the recording (blinks, movement, or poor lighting).");
  if (meanContrast < 15) reasons.push("The pupil was hard to see against the iris. Try a dimmer room and hold the phone closer.");
  if (!main) reasons.push("No clear response to the flash was recorded.");
  const ok = reasons.length === 0;

  const atypical = Object.values(ratings).filter((r) => r === "atypical").length;
  const borderline = Object.values(ratings).filter((r) => r === "borderline").length;
  let verdict: Analysis["verdict"] = "typical";
  if (!ok) verdict = "retake";
  else if (atypical >= 2 || (atypical === 1 && borderline >= 2)) verdict = "weaker";
  else if (atypical === 1 || borderline >= 2) verdict = "check";

  return {
    series,
    perStimulus,
    metrics,
    ratings,
    restingPupilMm: main ? main.baseline * IRIS_DIAMETER_MM : null,
    netPipr,
    quality: { validFraction, meanContrast, ok, reasons },
    verdict,
  };
}

/** Idealised pupil response curve (used for the demo and the reference shapes on the chart). */
export type CurveParams = {
  base: number;
  amp: number; // fraction, e.g. 0.3
  lat: number; // s
  tauC: number; // constriction time constant, s
  tauR: number; // recovery time constant, s
  sustain?: number; // fraction of the constriction still held long after light-off (PIPR)
};

export function idealCurve(t: number, p: CurveParams, stimuli: Stimulus[]) {
  let r = p.base;
  for (const s of stimuli) {
    const start = s.onset + p.lat;
    const end = s.offset + p.lat;
    if (t < start) continue;
    const depthAt = (x: number) => p.base * p.amp * (1 - Math.exp(-(x - start) / p.tauC));
    let d: number;
    if (t < end) d = depthAt(t);
    else {
      const d0 = depthAt(end);
      const held = d0 * (p.sustain ?? 0.15);
      d = held + (d0 - held) * Math.exp(-(t - end) / p.tauR);
    }
    r -= d;
  }
  return r;
}

export const REFERENCE_SHAPES = {
  // Illustrative shapes that follow the direction of published findings
  // (smaller resting pupil, weaker and slower constriction in diabetes). Not fitted data.
  typical: { base: 0.42, amp: 0.28, lat: 0.25, tauC: 0.35, tauR: 0.9, sustain: 0.12 } satisfies CurveParams,
  diabetesLike: { base: 0.31, amp: 0.11, lat: 0.42, tauC: 0.6, tauR: 1.4, sustain: 0.05 } satisfies CurveParams,
};
