import { analyse, type Analysis, type Protocol, type Sample } from "@/lib/analysis";
import type { ScanMetrics } from "@/lib/dashboard-types";
import type { EyeReading } from "@/lib/eye-tracker";
import { IRIS_DIAMETER_MM } from "@/lib/reference";
import { HAZE, MIN_VALID_FRACTION } from "@/lib/scan-rating";

export type PersonEye = "left" | "right";
export type ImageSide = "left" | "right";

export const EYE_ORDER: PersonEye[] = ["right", "left"];
export const OTHER_EYE: Record<PersonEye, PersonEye> = { right: "left", left: "right" };

export const IMAGE_SIDE: Record<PersonEye, ImageSide> = { right: "left", left: "right" };

export const EYE_PROTOCOL: Protocol = {
  id: "standard",
  name: "One eye",
  duration: 6,
  stimuli: [{ onset: 2.0, offset: 3.0, color: "white" }],
};

export const CLOSE_UP = {
  minIrisPx: 26,
  maxIrisPx: 95,
  minContrast: 14,
  minCoverage: 0.45,
  uncoveredFrames: 6,
  maxJump: 0.3,
  maxDrift: 0.15,
  holdFrames: 24,
  pupilWaitSeconds: 2.5,
};

export const LIGHT = { dark: 70, target: 115, bright: 250 };

export const SCREEN_LIGHT = { max: 0.75, step: 0.015, frame: "9vw" };

export const FLASH_DARK_TOP = 0.13;

export const PRECISION_CROP = 192;

export const HAZE_SCALE = { dark: 20, white: 180 };

function luma(data: Uint8ClampedArray, i: number) {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

export function measureHaze(img: ImageData, pupilRadiusPx: number): number | null {
  const { width, height, data } = img;
  if (!Number.isFinite(pupilRadiusPx) || pupilRadiusPx < 2) return null;
  const cx = width / 2;
  const cy = height / 2;
  const r = pupilRadiusPx * 0.7;
  const values: number[] = [];
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 0 || y < 0 || x >= width || y >= height || Math.hypot(x - cx, y - cy) > r) continue;
      values.push(luma(data, (y * width + x) * 4));
    }
  }
  if (values.length < 12) return null;
  values.sort((a, b) => a - b);
  const mid = values[values.length >> 1];
  const spread = values.map((v) => Math.abs(v - mid)).sort((a, b) => a - b)[values.length >> 1] || 1;
  const kept = values.filter((v) => v <= mid + 3 * spread || v < 120);
  const level = kept[Math.floor(kept.length * 0.25)];
  return Math.min(1, Math.max(0, (level - HAZE_SCALE.dark) / (HAZE_SCALE.white - HAZE_SCALE.dark)));
}

export function findGlint(img: ImageData, irisRadiusPx: number): { x: number; y: number } | null {
  const { width, height, data } = img;
  const cx = width / 2;
  const cy = height / 2;
  let max = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x - cx, y - cy) > irisRadiusPx * 0.9) continue;
      const v = luma(data, (y * width + x) * 4);
      if (v > max) max = v;
    }
  }
  if (max < 200) return null;
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x - cx, y - cy) > irisRadiusPx * 0.9) continue;
      if (luma(data, (y * width + x) * 4) >= max - 12) {
        sx += x;
        sy += y;
        n++;
      }
    }
  }
  if (n === 0 || n > irisRadiusPx * irisRadiusPx * 0.5) return null;
  return { x: sx / n, y: sy / n };
}

export type EyeRecording = {
  samples: Sample[];
  haze: number[];
  screen?: number;
};

const MIN_SAMPLE_CONTRAST = 8;

export const OPEN_EAR = 0.18;

export function nextScreenLight(level: number, light: number | null, hold = false) {
  if (hold) return light === null || light < LIGHT.dark ? Math.min(SCREEN_LIGHT.max, level + SCREEN_LIGHT.step) : level;
  if (light === null || light < LIGHT.target) return Math.min(SCREEN_LIGHT.max, level + SCREEN_LIGHT.step);
  if (light > LIGHT.target * 1.8) return Math.max(0, level - SCREEN_LIGHT.step);
  return level;
}

export const MATCH_DISTANCE = 0.1;

export function frameChecks(target: EyeReading | null, match: number | null = null) {
  const min = match ? Math.max(CLOSE_UP.minIrisPx, match * (1 - MATCH_DISTANCE)) : CLOSE_UP.minIrisPx;
  const max = match ? Math.min(CLOSE_UP.maxIrisPx, match * (1 + MATCH_DISTANCE)) : CLOSE_UP.maxIrisPx;
  return {
    sharp: !!target && Number.isFinite(target.pupilR) && target.contrast >= CLOSE_UP.minContrast && target.coverage >= CLOSE_UP.minCoverage,
    distance: !target ? null : target.irisR < min ? ("far" as const) : target.irisR > max ? ("close" as const) : ("ok" as const),
    open: (target?.ear ?? 0) > OPEN_EAR,
  };
}

export class Steadiness {
  private history: { t: number; x: number; y: number }[] = [];

  reset() {
    this.history = [];
  }

  update(t: number, target: EyeReading | null) {
    if (!target) {
      this.history = [];
      return false;
    }
    const h = this.history;
    h.push({ t, x: target.cx, y: target.cy });
    while (h.length > 1 && t - h[0].t > 0.4) h.shift();
    const older = h.filter((p) => t - p.t > 0.2);
    const newer = h.filter((p) => t - p.t <= 0.2);
    if (older.length < 2 || newer.length < 2) return false;
    const avg = (ps: { x: number; y: number }[]) => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length });
    const a = avg(older);
    const b = avg(newer);
    const prev = h[h.length - 2];
    const jump = Math.hypot(target.cx - prev.x, target.cy - prev.y) / target.irisR;
    const drift = Math.hypot(b.x - a.x, b.y - a.y) / target.irisR;
    return jump <= CLOSE_UP.maxJump && drift <= CLOSE_UP.maxDrift;
  }
}

export function recordedIrisPx(rec: EyeRecording, side: ImageSide) {
  return median(rec.samples.map((s) => s[side]?.irisPx ?? NaN));
}

export class LineUpHold {
  frames = 0;
  private unseen = 0;
  private last: number | null = null;

  reset() {
    this.frames = 0;
    this.unseen = 0;
    this.last = null;
  }

  update(t: number, f: { found: boolean; centered: boolean; distance: "far" | "close" | "ok" | null; open: boolean; sharp: boolean; steady: boolean; covered: boolean }) {
    const dt = this.last === null ? 0 : Math.min(0.2, t - this.last);
    this.last = t;
    const ready = f.found && f.centered && f.distance === "ok" && f.open && f.steady && f.covered;
    if (ready && !f.sharp) this.unseen += dt;
    else if (!ready) this.unseen = Math.max(0, this.unseen - dt * 0.5);
    const unseen = this.pupilUnseen();
    const good = ready && (f.sharp || unseen);
    this.frames = good ? this.frames + 1 : Math.max(0, this.frames - (unseen ? 1 : 3));
    return good;
  }

  pupilUnseen() {
    return this.unseen >= CLOSE_UP.pupilWaitSeconds;
  }

  get done() {
    return this.frames >= CLOSE_UP.holdFrames;
  }
}

export type RecordingState = { start: number; eye: PersonEye; rec: EyeRecording };

export function recordFrame(state: RecordingState, t: number, target: EyeReading | null, side: ImageSide) {
  const stim = EYE_PROTOCOL.stimuli.find((s) => t >= s.onset && t < s.offset);
  const open = (target?.ear ?? 0) > OPEN_EAR;
  const sample: Sample = { t, open };
  if (target && Number.isFinite(target.pupilR) && target.contrast >= MIN_SAMPLE_CONTRAST)
    sample[side] = { pupilPx: target.pupilR, irisPx: target.irisFitted ? target.irisR : NaN, contrast: target.contrast };
  if (target && open) sample.light = target.light;
  state.rec.samples.push(sample);
  if (!stim && target && open && target.haze !== null) state.rec.haze.push(target.haze);
}

export type EyeResult = {
  analysis: Analysis;
  usable: boolean;
  restingMm: number | null;
  haze: number | null;
};

export type CameraScanResult = {
  metrics: ScanMetrics;
  eyes: Record<PersonEye, EyeResult | null>;
  warnings: string[];
};

function median(values: number[]) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const MIN_HAZE_FRAMES = 20;

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function analyseEye(rec: EyeRecording | null): EyeResult | null {
  if (!rec || rec.samples.length === 0) return null;
  const analysis = analyse(rec.samples, EYE_PROTOCOL);
  const usable = analysis.quality.ok && analysis.quality.validFraction >= MIN_VALID_FRACTION && analysis.perStimulus.length > 0;
  return {
    analysis,
    usable,
    restingMm: usable && analysis.metrics.restingRatio !== null ? analysis.metrics.restingRatio * IRIS_DIAMETER_MM : null,
    haze: rec.haze.length >= MIN_HAZE_FRAMES ? median(rec.haze) : null,
  };
}

export function lightCheck(rec: EyeRecording | null): "dark" | "weak-flash" | "ok" | null {
  if (!rec) return null;
  const stim = EYE_PROTOCOL.stimuli[0];
  const rest = median(rec.samples.filter((s) => s.light !== undefined && s.t < stim.onset).map((s) => s.light!));
  const lit = median(rec.samples.filter((s) => s.light !== undefined && s.t >= stim.onset + 0.1 && s.t < stim.offset).map((s) => s.light!));
  if (rest === null || lit === null) return null;
  if (rest < LIGHT.dark && lit < LIGHT.dark) return "dark";
  if (lit < rest * 1.1 && lit < LIGHT.target) return "weak-flash";
  return "ok";
}

export function combineEyes(recordings: Record<PersonEye, EyeRecording | null>): CameraScanResult {
  const eyes = { right: analyseEye(recordings.right), left: analyseEye(recordings.left) };
  const usable = EYE_ORDER.map((e) => eyes[e]).filter((e): e is EyeResult => !!e?.usable);

  const metrics: ScanMetrics = {};
  const set = (key: keyof ScanMetrics, value: number | null | undefined, digits: number) => {
    if (value !== null && value !== undefined && Number.isFinite(value)) metrics[key] = round(value, digits);
  };
  const avg = (key: "restingRatio" | "amplitude" | "latency" | "velocity") => {
    const values = usable.map((e) => e.analysis.metrics[key]).filter((v): v is number => v !== null && Number.isFinite(v));
    return values.length ? mean(values) : null;
  };
  set("restingRatio", avg("restingRatio"), 3);
  set("amplitude", avg("amplitude"), 1);
  set("latency", avg("latency"), 3);
  set("velocity", avg("velocity"), 2);

  if (eyes.left?.usable) set("leftLitAmplitude", eyes.left.analysis.metrics.amplitude, 1);
  if (eyes.right?.usable) set("rightLitAmplitude", eyes.right.analysis.metrics.amplitude, 1);
  const sameLight = Math.abs((recordings.left?.screen ?? 0) - (recordings.right?.screen ?? 0)) <= 0.1;
  if (!sameLight) {
    delete metrics.leftLitAmplitude;
    delete metrics.rightLitAmplitude;
  }
  if (metrics.leftLitAmplitude !== undefined && metrics.rightLitAmplitude !== undefined) {
    const strong = Math.max(metrics.leftLitAmplitude, metrics.rightLitAmplitude);
    if (strong > 0) metrics.reflexBalance = round(Math.min(metrics.leftLitAmplitude, metrics.rightLitAmplitude) / strong, 3);
  }
  if (eyes.left?.restingMm != null && eyes.right?.restingMm != null) {
    set("sizeDiffMm", Math.abs(eyes.left.restingMm - eyes.right.restingMm), 2);
  }

  set("hazeLeft", eyes.left?.haze, 3);
  set("hazeRight", eyes.right?.haze, 3);

  const fractions = EYE_ORDER.map((e) => eyes[e]?.analysis.quality.validFraction).filter((v): v is number => v !== undefined);
  set("validFraction", fractions.length ? Math.min(...fractions) : null, 2);

  const warnings: string[] = [];
  for (const eye of EYE_ORDER) {
    if (!eyes[eye]) warnings.push(`Your ${eye} eye wasn't scanned.`);
    else if (!eyes[eye]!.usable && (eyes[eye]!.haze ?? 0) >= HAZE.typical)
      warnings.push(`Your ${eye} pupil looked grey rather than black, so its reaction to the flash couldn't be measured. That greyness is what the cataract check looks for.`);
    else if (!eyes[eye]!.usable) {
      const reasons = eyes[eye]!.analysis.quality.reasons;
      warnings.push(
        `Your ${eye} eye: ${reasons[0] ?? "Iris couldn't track the pupil clearly through the flash."} Hold the phone close and steady, in a dimmer room, and try not to blink.`,
      );
    }
  }
  for (const eye of EYE_ORDER) {
    const light = lightCheck(recordings[eye]);
    if (light === "dark") warnings.push(`Your ${eye} eye was too dark for the camera. Turn your screen brightness all the way up and use a softly lit room, not a dark one.`);
    else if (light === "weak-flash")
      warnings.push(`The flash barely lit your ${eye} eye. Turn screen brightness all the way up, and turn off battery saver and auto-brightness, which can dim the screen.`);
  }
  if (!sameLight) warnings.push("Your two eyes needed different screen light, so their reactions weren't compared. Scan again in steadier, even light.");
  if (metrics.hazeLeft === undefined || metrics.hazeRight === undefined) {
    warnings.push("Iris didn't get a clear view of both pupils, so the cataract check may be unclear.");
  }
  return { metrics, eyes, warnings };
}
