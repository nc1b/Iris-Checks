import "server-only";
import type { Scan, ScanMetrics } from "@/lib/dashboard-types";
import { rateScan } from "@/lib/scan-rating";

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

export function makeDemoScan(note?: string): Omit<Scan, "id" | "created_at"> {
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

  return {
    source: "demo",
    ...rateScan(metrics),
    metrics,
    note: note?.trim().slice(0, 500) || null,
  };
}
