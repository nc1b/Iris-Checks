import {
  IRIS_DIAMETER_MM,
  THRESHOLDS,
  rateMetric,
  rateReflexBalance,
  rateSizeDifference,
  type EyeDifferenceStatus,
  type MetricKey,
  type MetricStatus,
} from "./reference";

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
  /** How brightly the eye was lit in the camera frame (iris brightness, 0–255), if measured. */
  light?: number;
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
  /** Second result: resting pupil size of each eye before the first flash. */
  eyes: { leftMm: number | null; rightMm: number | null; sizeDiffMm: number | null; sizeStatus: EyeDifferenceStatus };
};

const FPS = 30;
/** Least pupil-to-iris contrast (0–255) between flashes for a trustworthy pupil size. */
const MIN_REST_CONTRAST = 18;
/** Below this many processed frames per second the reflex can't be timed reliably. */
const MIN_FPS = 8;

function median(values: number[]) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Pupil size as a share of the iris, frame by frame. Each frame is compared with the iris size
 * around that moment (the median of the nearest 15 frames), not one size for the whole
 * recording: a hand-held phone drifts closer and further, which changes both sizes together.
 * Frames without an iris size use the recording's median.
 */
function eyeRatios(samples: Sample[], eye: "left" | "right") {
  const iris = samples.map((s) => s[eye]?.irisPx ?? NaN);
  const irisMedian = median(iris);
  // Frames where the pupil hardly stood out compared with the rest of this recording (the dark
  // frames right after a flash, while the camera's exposure catches up) are left out: there the
  // edge drowns in noise and reads too small, which would exaggerate the reflex.
  const contrastMedian = median(samples.map((s) => (s[eye] && Number.isFinite(s[eye]!.pupilPx) ? s[eye]!.contrast : NaN)));
  return samples.map((s, i) => {
    const e = s[eye];
    if (!s.open || !e || !Number.isFinite(e.pupilPx)) return NaN;
    if (Number.isFinite(contrastMedian) && e.contrast < contrastMedian * 0.45) return NaN;
    const local = median(iris.slice(Math.max(0, i - 7), i + 8));
    const size = Number.isFinite(local) ? local : irisMedian;
    if (!Number.isFinite(size)) return NaN;
    const r = e.pupilPx / size;
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

  // The reaction's delay and speed need its start to have been seen: readings through most of
  // the flash's first half second. In a washed-out flash frame the screen's reflection can hide
  // a shrinking pupil; then the first smaller reading comes late, which would look like a slow
  // reflex. The amplitude is still fine: the smallest size is reached after the flash too.
  const early = series.filter((p) => p.t >= s.onset && p.t <= s.onset + 0.5).length;
  const sawStart = early >= 0.5 * FPS * 0.6;
  let latency: number | null = null;
  const drop = baseline - minP.r;
  if (drop > 0 && sawStart) {
    const start = window.find((p) => p.r < baseline - 0.1 * drop && p.t <= minP.t);
    if (start) latency = Math.max(0, start.t - s.onset);
  }

  // Fastest shrinking: the steepest straight-line fit over 0.2 s windows (7 points at 30 per
  // second). A slope between neighbouring points mostly measures frame-to-frame noise.
  let velocity: number | null = null;
  const constricting = sawStart ? series.filter((p) => p.t >= s.onset && p.t <= minP.t + 0.1) : [];
  for (let i = 3; i < constricting.length - 3; i++) {
    const w = constricting.slice(i - 3, i + 4);
    if (w[w.length - 1].t - w[0].t > 0.3) continue; // a gap
    const mt = w.reduce((a, p) => a + p.t, 0) / w.length;
    const mr = w.reduce((a, p) => a + p.r, 0) / w.length;
    const num = w.reduce((a, p) => a + (p.t - mt) * (p.r - mr), 0);
    const den = w.reduce((a, p) => a + (p.t - mt) ** 2, 0);
    if (den <= 0) continue;
    const v = (-num / den) * IRIS_DIAMETER_MM;
    if (velocity === null || v > velocity) velocity = v;
  }
  if (velocity !== null) velocity = Math.max(0, velocity);

  const at3 = valueAt(series, s.offset + 3);
  const recovery3s = at3 !== null && drop > 0 ? Math.min(100, Math.max(0, ((at3 - minP.r) / drop) * 100)) : null;
  const at6 = valueAt(series, s.offset + 6);
  const pipr6s = at6 !== null ? ((baseline - at6) / baseline) * 100 : null;

  return { color: s.color, baseline, minimum: minP.r, amplitude, latency, velocity, recovery3s, pipr6s };
}

/**
 * Drops single readings far from their neighbours (a lid edge or a reflection taken for the
 * pupil for a frame): more than 3 robust spreads from the median of the 5 readings either side.
 * A real pupil can't jump like that between frames; a real reflex moves the neighbours too.
 */
function dropOutliers(points: { t: number; r: number }[]) {
  return points.filter((p, i) => {
    const near = points.slice(Math.max(0, i - 5), i + 6).filter((q) => Math.abs(q.t - p.t) <= 0.35);
    if (near.length < 5) return true;
    const m = median(near.map((q) => q.r));
    const spread = median(near.map((q) => Math.abs(q.r - m))) * 1.4826;
    return Math.abs(p.r - m) <= 3 * spread + 0.01;
  });
}

export function analyse(samples: Sample[], protocol: Protocol): Analysis {
  const left = eyeRatios(samples, "left");
  const right = eyeRatios(samples, "right");
  const raw: { t: number; r: number }[] = [];
  samples.forEach((s, i) => {
    const vals = [left[i], right[i]].filter(Number.isFinite);
    if (vals.length) raw.push({ t: s.t, r: vals.reduce((a, b) => a + b, 0) / vals.length });
  });

  const series = smooth(resample(dropOutliers(raw), protocol.duration));
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

  // Share of the frames this phone actually processed in which the pupil was measured.
  // (Not frames per second: slower phones process fewer frames but can track every one.)
  const validFraction = samples.length ? Math.min(1, raw.length / samples.length) : 0;
  const fps = samples.length / protocol.duration;
  const contrasts = samples.flatMap((s) => [s.left?.contrast, s.right?.contrast]).filter((c): c is number => c != null);
  const meanContrast = contrasts.length ? contrasts.reduce((a, b) => a + b, 0) / contrasts.length : 0;
  // How clearly the pupil stood out between flashes (during a flash it always stands out more).
  const between = (t: number) => !protocol.stimuli.some((st) => t >= st.onset && t < st.offset + 0.5);
  const restContrast = median(samples.filter((s) => between(s.t)).flatMap((s) => [s.left?.contrast ?? NaN, s.right?.contrast ?? NaN]));

  const reasons: string[] = [];
  if (validFraction < 0.5) reasons.push("The pupil was only tracked in part of the recording (blinks, movement, or poor lighting).");
  if (fps < MIN_FPS) reasons.push("This phone processed too few frames to time the reflex. Close other apps and try again.");
  // Below this the pupil's edge drowns in camera noise and its size can't be trusted (bench:
  // very dark eyes in a dim room read the reflex 25% too big).
  if (!(restContrast >= MIN_REST_CONTRAST))
    reasons.push("The pupil was hard to see against the iris (common with dark eyes). Turn your screen brightness all the way up, use a brighter room (but not sunlight), and hold the phone closer.");
  if (!main) reasons.push("No clear response to the flash was recorded.");
  const ok = reasons.length === 0;

  const atypical = Object.values(ratings).filter((r) => r === "atypical").length;
  const borderline = Object.values(ratings).filter((r) => r === "borderline").length;
  let verdict: Analysis["verdict"] = "typical";
  if (!ok) verdict = "retake";
  else if (atypical >= 2 || (atypical === 1 && borderline >= 2)) verdict = "weaker";
  else if (atypical === 1 || borderline >= 2) verdict = "check";

  // Left vs right resting size, from the second before the first flash.
  const firstOnset = protocol.stimuli[0]?.onset ?? 0;
  const restingMm = (ratios: number[]) => {
    const r = median(samples.map((s, i) => (s.t >= firstOnset - 1.0 && s.t < firstOnset ? ratios[i] : NaN)));
    return Number.isFinite(r) ? r * IRIS_DIAMETER_MM : null;
  };
  const leftMm = restingMm(left);
  const rightMm = restingMm(right);
  const sizeDiffMm = leftMm !== null && rightMm !== null ? Math.abs(leftMm - rightMm) : null;

  return {
    series,
    perStimulus,
    metrics,
    ratings,
    restingPupilMm: main ? main.baseline * IRIS_DIAMETER_MM : null,
    netPipr,
    quality: { validFraction, meanContrast, ok, reasons },
    verdict,
    eyes: { leftMm, rightMm, sizeDiffMm, sizeStatus: ok ? rateSizeDifference(sizeDiffMm) : "unknown" },
  };
}

/**
 * Reflex balance from the eye-by-eye step: one flash with only the left eye uncovered and one
 * with only the right eye uncovered. Each amplitude is the % the pupils shrank for that flash.
 * Returns the weaker eye's response as a fraction of the stronger one (1 = perfectly even).
 */
export function reflexBalance(leftLitAmplitude: number | null, rightLitAmplitude: number | null) {
  if (leftLitAmplitude === null || rightLitAmplitude === null) return { balance: null, weakerEye: null, status: rateReflexBalance(null) };
  const strong = Math.max(leftLitAmplitude, rightLitAmplitude);
  const balance = strong > 0 ? Math.min(leftLitAmplitude, rightLitAmplitude) / strong : null;
  const weakerEye: "left" | "right" | null = leftLitAmplitude === rightLitAmplitude ? null : leftLitAmplitude < rightLitAmplitude ? "left" : "right";
  return { balance, weakerEye, status: rateReflexBalance(balance) };
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
