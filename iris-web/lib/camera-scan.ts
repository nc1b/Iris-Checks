import { analyse, PROTOCOLS, type Analysis, type Protocol, type Sample } from "@/lib/analysis";
import type { ScanMetrics } from "@/lib/dashboard-types";
import { MIN_VALID_FRACTION } from "@/lib/scan-rating";

/**
 * The camera scan: three flashes in about 30 seconds.
 *
 *   1. Both eyes, one white flash: pupil reflex (diabetes check), resting size of each eye
 *      (glaucoma check) and the flash photo of each pupil (cataract check).
 *   2. Right eye covered, flash: how much the left pupil shrinks when only the left eye is lit.
 *   3. Left eye covered, flash: the same for the right eye.
 *
 * Steps 2 and 3 give the left/right reflex balance (glaucoma check). Everything runs on the
 * phone; only the resulting numbers are saved.
 */

export type Stage = "both" | "leftLit" | "rightLit";

export const STAGE_PROTOCOL: Record<Stage, Protocol> = {
  both: PROTOCOLS.standard,
  leftLit: { id: "standard", name: "Left eye lit", duration: 5.5, stimuli: [{ onset: 1.5, offset: 2.5, color: "white" }] },
  rightLit: { id: "standard", name: "Right eye lit", duration: 5.5, stimuli: [{ onset: 1.5, offset: 2.5, color: "white" }] },
};

export type PersonEye = "left" | "right";
export type ImageSide = "left" | "right";

/**
 * In an unmirrored camera frame the person's right eye is on the image's left.
 * lib/pupil.ts LANDMARKS and lib/analysis.ts samples are keyed by image side.
 */
export const IMAGE_SIDE: Record<PersonEye, ImageSide> = { right: "left", left: "right" };
export const PERSON_EYE: Record<ImageSide, PersonEye> = { left: "right", right: "left" };

/** Which eye must be covered, and which is measured, in each one-eye stage. */
export const ONE_EYE_STAGES = {
  leftLit: { lit: "left", covered: "right" },
  rightLit: { lit: "right", covered: "left" },
} as const satisfies Record<Exclude<Stage, "both">, { lit: PersonEye; covered: PersonEye }>;

/**
 * Lens haze from the pupil in a flash frame (cataract check), 0 = clear and dark, 1 = white.
 * A clear lens keeps the pupil dark even under the screen flash; a cloudy lens scatters
 * the light back, so the pupil looks grey or white. The brightest 15% of pupil pixels are
 * left out because the screen's reflection on the cornea sits on the pupil.
 * Team-set and provisional: the scale needs calibrating against eye-exam results.
 */
export const HAZE_SCALE = { dark: 20, white: 180 };

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
      const i = (y * width + x) * 4;
      values.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
  }
  if (values.length < 12) return null;
  values.sort((a, b) => a - b);
  const kept = values.slice(0, Math.max(1, Math.floor(values.length * 0.85)));
  const median = kept[kept.length >> 1];
  return Math.min(1, Math.max(0, (median - HAZE_SCALE.dark) / (HAZE_SCALE.white - HAZE_SCALE.dark)));
}

export type HazeReading = { eye: PersonEye; haze: number };

export type CameraScanResult = {
  metrics: ScanMetrics;
  both: Analysis;
  leftLit: Analysis | null;
  rightLit: Analysis | null;
  /** Plain-language problems with the recording, if any. */
  warnings: string[];
};

function medianOf(values: number[]) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** The flash response of the lit eye, if the recording was good enough to trust. */
function litAmplitude(a: Analysis | null) {
  if (!a || a.quality.validFraction < 0.4 || !a.perStimulus[0]) return undefined;
  return a.metrics.amplitude ?? undefined;
}

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;
const defined = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? undefined : n);

export function combineScan(recordings: {
  both: Sample[];
  haze: HazeReading[];
  leftLit: Sample[] | null;
  rightLit: Sample[] | null;
}): CameraScanResult {
  const both = analyse(recordings.both, STAGE_PROTOCOL.both);
  const leftLit = recordings.leftLit ? analyse(recordings.leftLit, STAGE_PROTOCOL.leftLit) : null;
  const rightLit = recordings.rightLit ? analyse(recordings.rightLit, STAGE_PROTOCOL.rightLit) : null;

  // Haze needs a few flash frames per eye to be trusted.
  const hazeFor = (eye: PersonEye) => {
    const values = recordings.haze.filter((h) => h.eye === eye).map((h) => h.haze);
    return values.length >= 3 ? medianOf(values) : null;
  };

  const metrics: ScanMetrics = {};
  const set = (key: keyof ScanMetrics, value: number | null | undefined, digits: number) => {
    const v = defined(value);
    if (v !== undefined) metrics[key] = round(v, digits);
  };

  const reflexOk = both.perStimulus.length > 0;
  set("restingRatio", reflexOk ? both.metrics.restingRatio : null, 3);
  set("amplitude", reflexOk ? both.metrics.amplitude : null, 1);
  set("latency", reflexOk ? both.metrics.latency : null, 3);
  set("velocity", reflexOk ? both.metrics.velocity : null, 2);
  // Only compare resting sizes when the recording was good enough to trust them.
  set("sizeDiffMm", both.quality.validFraction >= MIN_VALID_FRACTION ? both.eyes.sizeDiffMm : null, 2);
  set("validFraction", both.quality.validFraction, 2);
  set("hazeLeft", hazeFor("left"), 3);
  set("hazeRight", hazeFor("right"), 3);
  set("leftLitAmplitude", litAmplitude(leftLit), 1);
  set("rightLitAmplitude", litAmplitude(rightLit), 1);
  if (metrics.leftLitAmplitude !== undefined && metrics.rightLitAmplitude !== undefined) {
    const strong = Math.max(metrics.leftLitAmplitude, metrics.rightLitAmplitude);
    if (strong > 0) metrics.reflexBalance = round(Math.min(metrics.leftLitAmplitude, metrics.rightLitAmplitude) / strong, 3);
  }

  const warnings = [...both.quality.reasons];
  if (metrics.hazeLeft === undefined || metrics.hazeRight === undefined) {
    warnings.push("Iris couldn't get a clear flash photo of both pupils, so the cataract check may be unclear.");
  }
  if (metrics.reflexBalance === undefined) {
    warnings.push("The one-eye flashes weren't clear enough to compare your left and right eye.");
  }
  return { metrics, both, leftLit, rightLit, warnings: [...new Set(warnings)] };
}
