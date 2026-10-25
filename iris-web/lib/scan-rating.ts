import type { CheckStatus, ScanMetrics } from "@/lib/dashboard-types";
import { PHOTO_THRESHOLDS } from "@/lib/eye-photo";
import { THRESHOLDS, rateMetric, rateReflexBalance, rateSizeDifference, type EyeDifferenceStatus } from "@/lib/reference";

export const HAZE = { typical: 0.12, borderline: 0.2 };

export const MIN_VALID_FRACTION = 0.5;

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
  if (rateMetric(THRESHOLDS[0], m.amplitude) === "unknown" || ratings.filter((r) => r === "unknown").length >= 2) return "unclear";
  const atypical = ratings.filter((r) => r === "atypical").length;
  const borderline = ratings.filter((r) => r === "borderline").length;
  if (atypical >= 2 || (atypical === 1 && borderline >= 2)) return "see_doctor";
  if (atypical === 1 || borderline >= 2) return "borderline";
  return "typical";
}

export function rateGlaucoma(m: ScanMetrics): CheckStatus {
  const balance = fromEyeStatus(rateReflexBalance(m.reflexBalance ?? null));
  if (implausible(m)) return "unclear";
  const sizeTrusted = m.validFraction === undefined || m.validFraction >= MIN_VALID_FRACTION;
  const size = fromEyeStatus(rateSizeDifference(sizeTrusted ? (m.sizeDiffMm ?? null) : null));
  if (balance === "unclear" && size === "unclear") return "unclear";
  if (balance === "unclear") return size === "typical" ? "unclear" : size;
  if (size === "unclear") return balance;
  return worse(balance, size);
}

export function rateCataract(m: ScanMetrics): CheckStatus {
  const values = [m.hazeLeft, m.hazeRight].filter((v): v is number => v !== undefined && Number.isFinite(v));
  const haze: CheckStatus | null = values.length
    ? Math.max(...values) < HAZE.typical
      ? "typical"
      : Math.max(...values) < HAZE.borderline
        ? "borderline"
        : "see_doctor"
    : null;
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

export function cleanMetrics(input: unknown): ScanMetrics {
  const out: ScanMetrics = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, [min, max]] of Object.entries(METRIC_RANGES) as [keyof ScanMetrics, [number, number]][]) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max) out[key] = Math.round(v * 10000) / 10000;
  }
  if (out.leftLitAmplitude !== undefined && out.rightLitAmplitude !== undefined) {
    const strong = Math.max(out.leftLitAmplitude, out.rightLitAmplitude);
    if (strong > 0) out.reflexBalance = Math.round((Math.min(out.leftLitAmplitude, out.rightLitAmplitude) / strong) * 10000) / 10000;
    else delete out.reflexBalance;
  }
  return out;
}
