import { AlertTriangle, CircleAlert, CircleCheck, CircleHelp } from "lucide-react";
import type { CheckStatus, Scan, ScanMetrics } from "@/lib/dashboard-types";
import { CHECKS, type Check } from "@/lib/checks";
import { cn } from "@/lib/utils";

const STATUS: Record<CheckStatus, { label: string; icon: typeof CircleCheck; className: string }> = {
  typical: { label: "Looks typical", icon: CircleCheck, className: "border-border text-foreground" },
  borderline: { label: "Borderline", icon: CircleAlert, className: "border-foreground/50 text-foreground" },
  see_doctor: { label: "See a doctor", icon: AlertTriangle, className: "border-foreground bg-foreground text-background" },
  unclear: { label: "Unclear", icon: CircleHelp, className: "border-dashed border-border text-muted-foreground" },
};

export function StatusBadge({ status, compact }: { status: CheckStatus; compact?: boolean }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium", compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs", s.className)}>
      <s.icon className={compact ? "size-3" : "size-3.5"} aria-hidden />
      {s.label}
    </span>
  );
}

export const statusLabel = (s: CheckStatus) => STATUS[s].label;

export type CheckView = Check & {
  statusOf: (scan: Scan) => CheckStatus;
  metric: { label: string; unit: string; value: (m: ScanMetrics) => number | undefined; typical: { min?: number; max?: number }; better: "higher" | "lower" };
  details: (m: ScanMetrics) => { label: string; value: string }[];
};

const fmt = (n: number | undefined, digits = 0, unit = "") => (n === undefined || !Number.isFinite(n) ? "–" : `${n.toFixed(digits)}${unit}`);

export const CHECK_VIEWS: CheckView[] = [
  {
    ...CHECKS[0],
    statusOf: (s) => s.diabetes_status,
    metric: { label: "Pupil constriction", unit: "%", value: (m) => m.amplitude, typical: { min: 18 }, better: "higher" },
    details: (m) => [
      { label: "Constriction", value: fmt(m.amplitude, 1, "%") },
      { label: "Reaction delay", value: fmt(m.latency, 2, " s") },
      { label: "Speed", value: fmt(m.velocity, 1, " mm/s") },
    ],
  },
  {
    ...CHECKS[1],
    statusOf: (s) => s.glaucoma_status,
    metric: { label: "Left–right balance", unit: "%", value: (m) => (m.reflexBalance === undefined ? undefined : m.reflexBalance * 100), typical: { min: 80 }, better: "higher" },
    details: (m) => [
      { label: "Balance", value: fmt(m.reflexBalance === undefined ? undefined : m.reflexBalance * 100, 0, "%") },
      { label: "Size difference", value: fmt(m.sizeDiffMm, 2, " mm") },
      { label: "Left / right lit", value: `${fmt(m.leftLitAmplitude, 0, "%")} / ${fmt(m.rightLitAmplitude, 0, "%")}` },
    ],
  },
  {
    ...CHECKS[2],
    statusOf: (s) => s.cataract_status,
    metric: {
      label: "Lens haze",
      unit: "%",
      value: (m) => (m.hazeLeft === undefined || m.hazeRight === undefined ? undefined : Math.max(m.hazeLeft, m.hazeRight) * 100),
      typical: { max: 20 },
      better: "lower",
    },
    details: (m) => [
      { label: "Haze, left", value: fmt(m.hazeLeft === undefined ? undefined : m.hazeLeft * 100, 0, "%") },
      { label: "Haze, right", value: fmt(m.hazeRight === undefined ? undefined : m.hazeRight * 100, 0, "%") },
      { label: "Capture quality", value: fmt(m.validFraction === undefined ? undefined : m.validFraction * 100, 0, "%") },
    ],
  },
];
