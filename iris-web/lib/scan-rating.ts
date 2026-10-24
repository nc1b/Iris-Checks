import type { CheckStatus, ScanMetrics } from "@/lib/dashboard-types";
import { PHOTO_THRESHOLDS } from "@/lib/eye-photo";
import { THRESHOLDS, rateMetric, rateReflexBalance, rateSizeDifference, type EyeDifferenceStatus } from "@/lib/reference";

/**
 * Turns a scan's numbers into the three check results. Shared by the camera scan (to show
 * results right away), the server (which re-rates every saved scan from its numbers, so a
 * browser can't save made-up results) and the demo scan. All cut-offs are team-set and
 * provisional; see lib/reference.ts.
 */

/** Haze score in the flash photo: 0 = clear dark pupil, 1 = fully white. Team-set, provisional. */
export const HAZE = { typical: 0.2, borderline: 0.35 };

/** Below this share of usable frames, the recording is too patchy to rate. */
export const MIN_VALID_FRACTION = 0.5;

/**
 * Light-reflex constriction above this is not physiological for a phone flash (healthy eyes
 * reach roughly 20–35%), so it means the tracker lost the pupil edge, not a real result. A real
 * phone scan in the database read 56.8% and was wrongly flagged before this guard.
 */
export const MAX_PLAUSIBLE_AMPLITUDE = 45;

const implausible = (m: ScanMetrics) => m.amplitude !== undefined && m.amplitude > MAX_PLAUSIBLE_AMPLITUDE;

const ORDER: CheckStatus[] = ["typical", "unclear", "borderline", "see_doctor"];
const worse = (a: CheckStatus, b: CheckStatus): CheckStatus => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

function fromEyeStatus(s: EyeDifferenceStatus): CheckStatus {
  return s === "check" ? "see_doctor" : s === "borderline" ? "borderline" : s === "even" ? "typical" : "unclear";
}

export function rateDiabetes(m: ScanMetrics): CheckStatus {
  if (m.validFraction !== undefined && m.validFraction < MIN_VALID_FRACTION) return "unclear";
  if (implausible(m)) return "unclear";
  const values: Record<string, number | undefined> = { restingRatio: m.restingRatio, amplitude: m.amplitude, latency: m.latency, velocity: m.velocity };
  const ratings = THRESHOLDS.map((t) => rateMetric(t, values[t.key]));
  // Constriction is the core measurement; without it, or with most numbers missing, don't guess.
  if (rateMetric(THRESHOLDS[0], m.amplitude) === "unknown" || ratings.filter((r) => r === "unknown").length >= 2) return "unclear";
  const atypical = ratings.filter((r) => r === "atypical").length;
  const borderline = ratings.filter((r) => r === "borderline").length;
  if (atypical >= 2 || (atypical === 1 && borderline >= 2)) return "see_doctor";
  if (atypical === 1 || borderline >= 2) return "borderline";
  return "typical";
}

export function rateGlaucoma(m: ScanMetrics): CheckStatus {
  const balance = fromEyeStatus(rateReflexBalance(m.reflexBalance ?? null));
  // Resting sizes come from the both-eyes recording; a patchy one can't be trusted to compare eyes.
  if (implausible(m)) return "unclear";
  const sizeTrusted = m.validFraction === undefined || m.validFraction >= MIN_VALID_FRACTION;
  const size = fromEyeStatus(rateSizeDifference(sizeTrusted ? (m.sizeDiffMm ?? null) : null));
  if (balance === "unclear" && size === "unclear") return "unclear";
  // A clear left/right difference counts even if the other measure is missing.
  if (balance === "unclear") return size === "typical" ? "unclear" : size;
  if (size === "unclear") return balance;
  return worse(balance, size);
}

export function rateCataract(m: ScanMetrics): CheckStatus {
  // Haze is only meaningful if the pupil was really tracked. A real scan with 0% tracking
  // measured "haze" on skin beside the eye, read it as a clear lens and said "typical".
  const tracked = m.validFraction === undefined || m.validFraction >= MIN_VALID_FRACTION;
  const values = (tracked ? [m.hazeLeft, m.hazeRight] : []).filter((v): v is number => v !== undefined && Number.isFinite(v));
  const haze: CheckStatus | null = values.length
    ? Math.max(...values) < HAZE.typical
      ? "typical"
      : Math.max(...values) < HAZE.borderline
        ? "borderline"
        : "see_doctor"
    : null;
  // Photo match against the Iris database of eye photos: a match alone is "borderline";
  // together with a hazy flash photo it becomes "see a doctor". A score just under the flag
  // line (a real scan read 27% against 29%) is too close to call, so it says nothing.
  const t = PHOTO_THRESHOLDS.cataract;
  const photo: CheckStatus | null =
    m.photoCataract === undefined || (m.photoCataract < t && m.photoCataract >= t * 0.6) ? null : m.photoCataract >= t ? "borderline" : "typical";
  if (!haze && !photo) return "unclear";
  if (haze && photo && haze !== "typical" && photo === "borderline") return "see_doctor";
  return worse(haze ?? "typical", photo ?? "typical");
}

export function rateScan(m: ScanMetrics) {
  return {
    diabetes_status: rateDiabetes(m),
    glaucoma_status: rateGlaucoma(m),
    cataract_status: rateCataract(m),
  };
}

/** Allowed ranges for each saved number. Anything outside is dropped before rating and saving. */
const METRIC_RANGES: Record<keyof ScanMetrics, [number, number]> = {
  restingRatio: [0.05, 0.95],
  amplitude: [0, 100],
  latency: [0, 2],
  velocity: [0, 20],
  sizeDiffMm: [0, 8],
  leftLitAmplitude: [0, 100],
  rightLitAmplitude: [0, 100],
  reflexBalance: [0, 1],
  hazeLeft: [0, 1],
  hazeRight: [0, 1],
  validFraction: [0, 1],
  photoCataract: [0, 1],
  photoConjunctivitis: [0, 1],
  photoUveitis: [0, 1],
  photoEyelid: [0, 1],
};

/** Keeps only known, finite, in-range numbers from untrusted input (e.g. a request body). */
export function cleanMetrics(input: unknown): ScanMetrics {
  const out: ScanMetrics = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, [min, max]] of Object.entries(METRIC_RANGES) as [keyof ScanMetrics, [number, number]][]) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max) out[key] = Math.round(v * 10000) / 10000;
  }
  // Balance is always recomputed from the two per-eye amplitudes when both are present.
  if (out.leftLitAmplitude !== undefined && out.rightLitAmplitude !== undefined) {
    const strong = Math.max(out.leftLitAmplitude, out.rightLitAmplitude);
    if (strong > 0) out.reflexBalance = Math.round((Math.min(out.leftLitAmplitude, out.rightLitAmplitude) / strong) * 10000) / 10000;
    else delete out.reflexBalance;
  }
  return out;
}
