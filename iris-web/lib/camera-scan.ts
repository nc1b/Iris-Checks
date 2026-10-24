import { analyse, type Analysis, type Protocol, type Sample } from "@/lib/analysis";
import type { ScanMetrics } from "@/lib/dashboard-types";
import { IRIS_DIAMETER_MM } from "@/lib/reference";
import { MIN_VALID_FRACTION } from "@/lib/scan-rating";

/**
 * The camera scan, one eye at a time (right, then left), close up.
 *
 * For each eye: cover the other eye, bring the phone close until the iris is big in the
 * frame, hold still, and the screen flashes once. Iris records that eye's pupil before,
 * during and after the flash, and takes flash photos of its pupil.
 *
 * - Diabetes check: the reflex of both eyes, averaged.
 * - Glaucoma check: each eye lit on its own, so their reactions can be compared
 *   (left vs right balance), plus the difference in resting pupil size.
 * - Cataract check: haze in each pupil's flash photos.
 *
 * Everything runs on the phone; only the resulting numbers are saved.
 */

export type PersonEye = "left" | "right";
export type ImageSide = "left" | "right";

export const EYE_ORDER: PersonEye[] = ["right", "left"];
export const OTHER_EYE: Record<PersonEye, PersonEye> = { right: "left", left: "right" };

/**
 * In an unmirrored camera frame the person's right eye is on the image's left.
 * lib/pupil.ts LANDMARKS and lib/analysis.ts samples are keyed by image side.
 */
export const IMAGE_SIDE: Record<PersonEye, ImageSide> = { right: "left", left: "right" };

/** One flash per eye: 2 s resting, 1 s flash, 3 s recovery. */
export const EYE_PROTOCOL: Protocol = {
  id: "standard",
  name: "One eye",
  duration: 6,
  stimuli: [{ onset: 2.0, offset: 3.0, color: "white" }],
};

/**
 * Close-up rules. The iris must be at least `minIrisPx` in radius in the camera frame,
 * which is about 15 cm from a typical front camera. At arm's length it's only ~11 px and
 * the pupil edge is too blurry to measure, which is why far-away scans came back unclear.
 */
export const CLOSE_UP = {
  minIrisPx: 26,
  maxIrisPx: 95,
  /** Pupil must be this much darker than the iris (0–255) to measure it. */
  minContrast: 14,
  /** Share of the rays that must agree on the pupil edge (lib/pupil.ts keeps only agreeing rays). */
  minCoverage: 0.45,
  /** The other eye must look visible this many frames in a row before it counts as uncovered. */
  uncoveredFrames: 6,
  /** Eye centre may move at most this share of the iris radius between frames. */
  maxJitter: 0.12,
  /** Good frames in a row before the flash starts (~0.8 s). */
  holdFrames: 24,
};

/**
 * Eye lighting: brightness (0–255) of the bright parts of the eye close-up (white of the eye,
 * lids), from lib/pupil.ts. A front camera in a dim room sees an almost black eye, so the pupil
 * can't be told apart from the iris. Team-set; `target` is where the screen light aims.
 */
export const LIGHT = { dark: 70, target: 115, bright: 250 };

/**
 * Screen light: a white frame around the camera view that lights the eye from 15 cm away.
 * It rises until the eye is bright enough (up to `max` opacity) and stays the same through the
 * recording, so the flash is the only change in light the pupil reacts to.
 */
export const SCREEN_LIGHT = { max: 0.75, step: 0.015, frame: "9vw" };

/** The pupil is measured on a 192 px square crop of the eye, for sub-pixel precision. */
export const PRECISION_CROP = 192;

/**
 * Lens haze from the pupil in a flash frame (cataract check), 0 = clear and dark, 1 = white.
 * A clear lens keeps the pupil dark even under the screen flash; a cloudy lens scatters the
 * light back, so the pupil looks grey or white. The brightest 30% of pupil pixels are left
 * out because the screen's reflection on the cornea sits on the pupil, and from 15 cm the
 * whole screen reflects there, not just a dot.
 * Team-set and provisional: the scale needs calibrating against eye-exam results.
 */
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
  const kept = values.slice(0, Math.max(1, Math.floor(values.length * 0.7)));
  const median = kept[kept.length >> 1];
  return Math.min(1, Math.max(0, (median - HAZE_SCALE.dark) / (HAZE_SCALE.white - HAZE_SCALE.dark)));
}

/**
 * The corneal reflection: the little light the screen makes on the eye. Its centre (in crop
 * pixels) is shown on screen so you can see Iris is locked onto the eye. Returns null when
 * there's no clear highlight inside the iris.
 */
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
  // A real glint is a small spot, not a washed-out patch.
  if (n === 0 || n > irisRadiusPx * irisRadiusPx * 0.5) return null;
  return { x: sx / n, y: sy / n };
}

export type EyeRecording = { samples: Sample[]; haze: number[] };

export type EyeResult = {
  analysis: Analysis;
  /** Usable for the reflex numbers (enough tracking and a flash response). */
  usable: boolean;
  restingMm: number | null;
  haze: number | null;
};

export type CameraScanResult = {
  metrics: ScanMetrics;
  eyes: Record<PersonEye, EyeResult | null>;
  /** Plain-language problems with the recording, if any. */
  warnings: string[];
};

function median(values: number[]) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

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
    // Haze needs a few flash frames, from a recording that actually tracked this pupil.
    haze: rec.haze.length >= 3 && analysis.quality.validFraction >= MIN_VALID_FRACTION ? median(rec.haze) : null,
  };
}

/**
 * Did the camera see enough light? Compares the eye's brightness while resting with its
 * brightness during the flash. Returns null when there's too little to judge.
 */
export function lightCheck(rec: EyeRecording | null): "dark" | "weak-flash" | "ok" | null {
  if (!rec) return null;
  const stim = EYE_PROTOCOL.stimuli[0];
  const rest = median(rec.samples.filter((s) => s.light !== undefined && s.t < stim.onset).map((s) => s.light!));
  // Skip the first moments of the flash while the camera adjusts its exposure.
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
  // Diabetes check: average the reflex of every eye that was tracked well.
  const avg = (key: "restingRatio" | "amplitude" | "latency" | "velocity") => {
    const values = usable.map((e) => e.analysis.metrics[key]).filter((v): v is number => v !== null && Number.isFinite(v));
    return values.length ? mean(values) : null;
  };
  set("restingRatio", avg("restingRatio"), 3);
  set("amplitude", avg("amplitude"), 1);
  set("latency", avg("latency"), 3);
  set("velocity", avg("velocity"), 2);

  // Glaucoma check: each eye was lit on its own, so compare their reactions and sizes.
  if (eyes.left?.usable) set("leftLitAmplitude", eyes.left.analysis.metrics.amplitude, 1);
  if (eyes.right?.usable) set("rightLitAmplitude", eyes.right.analysis.metrics.amplitude, 1);
  if (metrics.leftLitAmplitude !== undefined && metrics.rightLitAmplitude !== undefined) {
    const strong = Math.max(metrics.leftLitAmplitude, metrics.rightLitAmplitude);
    if (strong > 0) metrics.reflexBalance = round(Math.min(metrics.leftLitAmplitude, metrics.rightLitAmplitude) / strong, 3);
  }
  if (eyes.left?.restingMm != null && eyes.right?.restingMm != null) {
    set("sizeDiffMm", Math.abs(eyes.left.restingMm - eyes.right.restingMm), 2);
  }

  // Cataract check.
  set("hazeLeft", eyes.left?.haze, 3);
  set("hazeRight", eyes.right?.haze, 3);

  const fractions = EYE_ORDER.map((e) => eyes[e]?.analysis.quality.validFraction).filter((v): v is number => v !== undefined);
  set("validFraction", fractions.length ? Math.min(...fractions) : null, 2);

  const warnings: string[] = [];
  for (const eye of EYE_ORDER) {
    if (!eyes[eye]) warnings.push(`Your ${eye} eye wasn't scanned.`);
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
  if (metrics.hazeLeft === undefined || metrics.hazeRight === undefined) {
    warnings.push("Iris didn't get clear flash photos of both pupils, so the cataract check may be unclear.");
  }
  return { metrics, eyes, warnings };
}
