import type { Analysis, Protocol } from "./analysis";

/**
 * Research log for the team's pilot study. Stored only in this browser
 * (localStorage) and exported as CSV on demand. No photos or video are stored.
 */

export type Participant = {
  code: string; // anonymous code, e.g. P07
  age: number | null;
  diabetes: "type1" | "type2" | "no" | "unsure" | "";
};

export type LogEntry = {
  id: string;
  date: string;
  participant: Participant;
  protocol: Protocol["id"];
  demo: boolean;
  verdict: Analysis["verdict"];
  restingRatio: number | null;
  amplitude: number | null;
  latency: number | null;
  velocity: number | null;
  netPipr: number | null;
  validFraction: number;
  meanContrast: number;
};

const KEY = "iris.research-log.v1";

export function readLog(): LogEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LogEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToLog(entry: Omit<LogEntry, "id" | "date">): LogEntry[] {
  const log = readLog();
  const full: LogEntry = { ...entry, id: crypto.randomUUID(), date: new Date().toISOString() };
  const next = [...log, full];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode): keep it in memory only.
  }
  return next;
}

export function clearLog() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function logToCsv(log: LogEntry[]) {
  const cols = [
    "date",
    "participant",
    "age",
    "diabetes",
    "protocol",
    "demo",
    "verdict",
    "resting_pupil_iris_ratio",
    "constriction_amplitude_pct",
    "latency_s",
    "max_velocity_mm_s",
    "net_pipr_pct",
    "valid_fraction",
    "mean_contrast",
  ];
  const fmt = (v: number | null) => (v == null || !Number.isFinite(v) ? "" : v.toFixed(4));
  const rows = log.map((e) =>
    [
      e.date,
      e.participant.code,
      e.participant.age ?? "",
      e.participant.diabetes,
      e.protocol,
      e.demo ? "yes" : "no",
      e.verdict,
      fmt(e.restingRatio),
      fmt(e.amplitude),
      fmt(e.latency),
      fmt(e.velocity),
      fmt(e.netPipr),
      fmt(e.validFraction),
      fmt(e.meanContrast),
    ].join(","),
  );
  return [cols.join(","), ...rows].join("\n");
}
