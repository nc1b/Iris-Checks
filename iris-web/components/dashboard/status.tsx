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

export function statusMeaning(status: CheckStatus, nextStep: string) {
  switch (status) {
    case "typical":
      return "Your numbers were inside the usual range. That doesn't rule anything out, so keep up regular eye exams.";
    case "borderline":
      return "One or more numbers were near the edge of the usual range. Lighting or movement often causes this, so scan again. If it stays borderline, mention it at your next eye exam.";
    case "see_doctor":
      return `Your numbers were outside the usual range. This is not a diagnosis, but it's worth booking ${nextStep.charAt(0).toLowerCase()}${nextStep.slice(1)}.`;
    case "unclear":
      return "The recording wasn't clear enough to judge, so Iris didn't guess. Scan again in soft, even light and hold the phone steady.";
  }
}

export function overallSummary(statuses: CheckStatus[]) {
  const unclear = statuses.filter((s) => s === "unclear").length;
  if (statuses.includes("see_doctor"))
    return { title: "Iris suggests an eye exam", body: "At least one check was outside the usual range. Iris can't diagnose anything, but an eye doctor can check properly." };
  if (statuses.includes("borderline"))
    return { title: "Worth a second look", body: "Nothing was clearly outside the usual range, but something was close. Scan again in soft, even light to confirm." };
  if (unclear === statuses.length)
    return { title: "Let's try that again", body: "Iris couldn't see your pupils clearly enough to judge any check. Scan again in soft light, close and steady." };
  return {
    title: "Nothing stood out",
    body: `${unclear ? "The checks Iris could judge looked typical; scan again for the unclear ones. " : "All three checks looked typical. "}This doesn't rule anything out, so keep up regular eye exams.`,
  };
}

export function usualRange(metric: CheckView["metric"]) {
  const { min, max } = metric.typical;
  return min !== undefined ? `Usual: ${min}${metric.unit} or more` : max !== undefined ? `Usual: under ${max}${metric.unit}` : "";
}

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
