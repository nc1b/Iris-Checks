import "server-only";
import type { CheckStatus, Scan, ScanMetrics } from "@/lib/dashboard-types";
import { THRESHOLDS, rateMetric, rateReflexBalance, rateSizeDifference, type EyeDifferenceStatus } from "@/lib/reference";

/**
 * A simulated scan for the prototype dashboard (the camera scan isn't live yet).
 * Numbers are drawn around typical values from the literature, with an occasional
 * weaker or uneven response, and rated with the same provisional thresholds the
 * scanner uses. Always saved with source "demo".
 */

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

// Haze score in the flash photo: 0 = clear pupil, 1 = fully white. Team-set, provisional.
const HAZE = { typical: 0.2, borderline: 0.35 };

function diabetesStatus(m: ScanMetrics): CheckStatus {
  const values: Record<string, number | undefined> = { restingRatio: m.restingRatio, amplitude: m.amplitude, latency: m.latency, velocity: m.velocity };
  const ratings = THRESHOLDS.map((t) => rateMetric(t, values[t.key]));
  const atypical = ratings.filter((r) => r === "atypical").length;
  const borderline = ratings.filter((r) => r === "borderline").length;
  if (atypical >= 2 || (atypical === 1 && borderline >= 2)) return "see_doctor";
  if (atypical === 1 || borderline >= 2) return "borderline";
  return "typical";
}

function fromEyeStatus(s: EyeDifferenceStatus): CheckStatus {
  return s === "check" ? "see_doctor" : s === "borderline" ? "borderline" : s === "even" ? "typical" : "unclear";
}

const worse = (a: CheckStatus, b: CheckStatus): CheckStatus => {
  const order: CheckStatus[] = ["typical", "unclear", "borderline", "see_doctor"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
};

export function makeDemoScan(note?: string): Omit<Scan, "id" | "created_at"> {
  // Most demo scans look typical; some are weaker or uneven so the dashboard shows every state.
  const weaker = Math.random() < 0.2;
  const uneven = Math.random() < 0.15;
  const hazy = Math.random() < 0.15;

  const strongEye = rand(24, 34);
  const metrics: ScanMetrics = {
    restingRatio: round(weaker ? rand(0.3, 0.38) : rand(0.4, 0.5)),
    amplitude: round(weaker ? rand(10, 17) : rand(20, 32), 1),
    latency: round(weaker ? rand(0.36, 0.52) : rand(0.22, 0.33)),
    velocity: round(weaker ? rand(0.7, 1.15) : rand(1.3, 2.6)),
    sizeDiffMm: round(uneven ? rand(0.5, 1.1) : rand(0, 0.35)),
    leftLitAmplitude: round(strongEye, 1),
    rightLitAmplitude: round(strongEye * (uneven ? rand(0.55, 0.78) : rand(0.85, 1)), 1),
    hazeLeft: round(hazy ? rand(0.22, 0.45) : rand(0.03, 0.15)),
    hazeRight: round(hazy ? rand(0.1, 0.3) : rand(0.03, 0.15)),
    validFraction: round(rand(0.82, 0.99)),
  };
  metrics.reflexBalance = round(
    Math.min(metrics.leftLitAmplitude!, metrics.rightLitAmplitude!) / Math.max(metrics.leftLitAmplitude!, metrics.rightLitAmplitude!),
  );

  const haze = Math.max(metrics.hazeLeft!, metrics.hazeRight!);
  return {
    source: "demo",
    diabetes_status: diabetesStatus(metrics),
    glaucoma_status: worse(fromEyeStatus(rateReflexBalance(metrics.reflexBalance!)), fromEyeStatus(rateSizeDifference(metrics.sizeDiffMm!))),
    cataract_status: haze < HAZE.typical ? "typical" : haze < HAZE.borderline ? "borderline" : "see_doctor",
    metrics,
    note: note?.trim().slice(0, 500) || null,
  };
}
