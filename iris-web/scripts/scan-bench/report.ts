import type { CheckStatus } from "@/lib/dashboard-types";
import type { ScanRun } from "./session";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const median = (xs: number[]) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};
const p90 = (xs: number[]) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length * 0.9)] : NaN;
};
const flagged = (s: CheckStatus) => s === "borderline" || s === "see_doctor";

/** The bench's printed report: line-up, measurement errors against a perfect pupillometer, and how often each check gets it right. */
export function report(runs: ScanRun[], seconds: number) {
  const lines: string[] = [];
  const eyes = runs.flatMap((r) => [r.eyes.right, r.eyes.left]);
  const locked = eyes.filter((e) => e.alignSeconds !== null);
  lines.push(
    `${runs.length} simulated scans (${eyes.length} eyes) in ${seconds.toFixed(0)} s`,
  );
  lines.push("");
  lines.push("Lining up");
  lines.push(
    `  eyes that locked on within 10 s: ${pct(locked.length / eyes.length)}; time to lock: median ${median(locked.map((e) => e.alignSeconds!)).toFixed(1)} s, 90th percentile ${p90(locked.map((e) => e.alignSeconds!)).toFixed(1)} s`,
  );
  lines.push(
    `  recording frames with a pupil measurement: median ${pct(median(eyes.map((e) => e.tracked)))}; eyes under 50%: ${pct(eyes.filter((e) => e.tracked < 0.5).length / eyes.length)}`,
  );
  lines.push("");

  lines.push(
    "Measurement error, phone − perfect pupillometer (scans where both have the number)",
  );
  const err = (
    key:
      | "restingRatio"
      | "amplitude"
      | "latency"
      | "velocity"
      | "sizeDiffMm"
      | "reflexBalance",
    unit: string,
    digits: number,
  ) => {
    const d = runs
      .map((r) => (r.phone.metrics[key] ?? NaN) - (r.ideal.metrics[key] ?? NaN))
      .filter(Number.isFinite);
    const abs = d.map(Math.abs);
    lines.push(
      `  ${key.padEnd(14)} n=${String(d.length).padStart(4)}  median |error| ${median(abs).toFixed(digits)}${unit}  90th pct ${p90(abs).toFixed(digits)}${unit}  bias ${median(d).toFixed(digits)}${unit}`,
    );
  };
  err("restingRatio", "", 3);
  err("amplitude", " pts", 1);
  err("latency", " s", 3);
  err("velocity", " mm/s", 2);
  err("sizeDiffMm", " mm", 2);
  err("reflexBalance", "", 3);
  lines.push("");

  lines.push("Checks");
  // Diabetes: does the phone give the same answer as a perfect pupillometer would?
  const dia = runs.filter((r) => r.ideal.status.diabetes_status !== "unclear");
  const diaClear = dia.filter(
    (r) => r.phone.status.diabetes_status !== "unclear",
  );
  lines.push(
    `  Diabetes (pupil reflex): unclear ${pct(1 - diaClear.length / Math.max(1, dia.length))}; when answered, same as a perfect pupillometer ${pct(diaClear.filter((r) => r.phone.status.diabetes_status === r.ideal.status.diabetes_status).length / Math.max(1, diaClear.length))}, same flag/no-flag ${pct(diaClear.filter((r) => flagged(r.phone.status.diabetes_status) === flagged(r.ideal.status.diabetes_status)).length / Math.max(1, diaClear.length))}`,
  );
  // Glaucoma: one eye's reflex clearly weaker (relative afferent defect).
  const rapd = runs.filter((r) => r.truth.rapdEye);
  const noRapd = runs.filter((r) => !r.truth.rapdEye);
  const ans = (rs: ScanRun[], key: "glaucoma_status" | "cataract_status") =>
    rs.filter((r) => r.phone.status[key] !== "unclear");
  lines.push(
    `  Glaucoma (left vs right): one eye weaker → flagged ${pct(ans(rapd, "glaucoma_status").filter((r) => flagged(r.phone.status.glaucoma_status)).length / Math.max(1, ans(rapd, "glaucoma_status").length))} (unclear ${pct(1 - ans(rapd, "glaucoma_status").length / Math.max(1, rapd.length))}); even eyes → wrongly flagged ${pct(ans(noRapd, "glaucoma_status").filter((r) => flagged(r.phone.status.glaucoma_status)).length / Math.max(1, ans(noRapd, "glaucoma_status").length))} (unclear ${pct(1 - ans(noRapd, "glaucoma_status").length / Math.max(1, noRapd.length))})`,
  );
  const cat = runs.filter((r) => r.truth.cataractEyes.length);
  const noCat = runs.filter((r) => !r.truth.cataractEyes.length);
  lines.push(
    `  Cataract (haze): cloudy lens → flagged ${pct(ans(cat, "cataract_status").filter((r) => flagged(r.phone.status.cataract_status)).length / Math.max(1, ans(cat, "cataract_status").length))} (unclear ${pct(1 - ans(cat, "cataract_status").length / Math.max(1, cat.length))}); clear lenses → wrongly flagged ${pct(ans(noCat, "cataract_status").filter((r) => flagged(r.phone.status.cataract_status)).length / Math.max(1, ans(noCat, "cataract_status").length))} (unclear ${pct(1 - ans(noCat, "cataract_status").length / Math.max(1, noCat.length))})`,
  );
  lines.push("");

  lines.push(
    "By group: eyes locked / tracked frames / amplitude error / diabetes unclear / glaucoma wrong flags",
  );
  const group = (label: string, rs: ScanRun[]) => {
    if (!rs.length) return;
    const es = rs.flatMap((r) => [r.eyes.right, r.eyes.left]);
    const ampErr = rs
      .map((r) =>
        Math.abs(
          (r.phone.metrics.amplitude ?? NaN) -
            (r.ideal.metrics.amplitude ?? NaN),
        ),
      )
      .filter(Number.isFinite);
    const even = rs.filter(
      (r) => !r.truth.rapdEye && r.phone.status.glaucoma_status !== "unclear",
    );
    lines.push(
      `  ${label.padEnd(26)} n=${String(rs.length).padStart(4)}  ${pct(es.filter((e) => e.alignSeconds !== null).length / es.length).padStart(4)}  ${pct(median(es.map((e) => e.tracked))).padStart(4)}  ${median(ampErr).toFixed(1).padStart(5)} pts  ${pct(rs.filter((r) => r.phone.status.diabetes_status === "unclear").length / rs.length).padStart(4)}  ${pct(even.filter((r) => flagged(r.phone.status.glaucoma_status)).length / Math.max(1, even.length)).padStart(4)}`,
    );
  };
  for (const c of ["dark-brown", "brown", "hazel", "green", "blue"])
    group(
      `iris ${c}`,
      runs.filter((r) => r.person.colour === c),
    );
  group("cataract in an eye", cat);
  group(
    "noise high (>4)",
    runs.filter((r) => r.cond.noise > 4),
  );
  group(
    "blurry (>0.3 mm)",
    runs.filter((r) => r.cond.blurMm > 0.3),
  );
  group(
    "dim room (<0.5)",
    runs.filter((r) => r.cond.ambient < 0.5),
  );
  group(
    "bright room (>1.1)",
    runs.filter((r) => r.cond.ambient > 1.1),
  );
  group(
    "weak flash (<1.2)",
    runs.filter((r) => r.cond.flashGain < 1.2),
  );
  group(
    "15 frames per second",
    runs.filter((r) => r.cond.fps === 15),
  );
  group(
    "shaky (tremor >3 px)",
    runs.filter((r) => r.cond.tremorPx > 3),
  );
  return lines.join("\n");
}
