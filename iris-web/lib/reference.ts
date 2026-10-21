/**
 * Public research Iris compares a scan against.
 *
 * The published studies used clinic or custom pupillometers, not phones.
 * Phone values will differ, so the "starter thresholds" below are team-set
 * placeholders to be recalibrated with our own pilot data.
 */

export type Study = {
  id: string;
  short: string;
  title: string;
  journal: string;
  year?: number;
  device: string;
  finding: string;
  url: string;
};

export const STUDIES: Study[] = [
  {
    id: "tan2022",
    short: "Singapore National Eye Centre, 2022",
    title: "Retinal neural dysfunction in diabetes revealed with handheld chromatic pupillometry",
    journal: "Clinical & Experimental Ophthalmology 50(7)",
    year: 2022,
    device: "Custom handheld pupillometer (infrared camera, blue/red LEDs)",
    finding:
      "82 people with type 2 diabetes vs 93 controls. Pupil responses separated diabetes from controls with AUC 0.89 (76% sensitivity, 90% specificity), even in people with no visible diabetic eye damage.",
    url: "https://pubmed.ncbi.nlm.nih.gov/35616273/",
  },
  {
    id: "pilot2010",
    short: "BioMedical Engineering OnLine, 2010",
    title:
      "Using dynamic pupillometry as a simple screening tool to detect autonomic neuropathy in patients with diabetes: a pilot study",
    journal: "BioMedical Engineering OnLine 9:26",
    year: 2010,
    device: "Custom dynamic pupillometer (infrared)",
    finding:
      "Pupil-to-iris ratio in darkness was 0.55 in healthy volunteers, 0.42 in people with diabetes, and 0.35 in people with diabetes and cardiac autonomic neuropathy. Reflex amplitudes were smaller in diabetes.",
    url: "https://link.springer.com/article/10.1186/1475-925X-9-26",
  },
  {
    id: "dove",
    short: "Clinical Ophthalmology (Dove Press)",
    title:
      "Dynamic Pupillometry in Type 2 Diabetes: Pupillary Autonomic Dysfunction and the Severity of Diabetic Retinopathy",
    journal: "Clinical Ophthalmology",
    device: "Dynamic pupillometer",
    finding:
      "The pupillary light reflex was impaired in diabetic retinal neuropathy before retinopathy was clinically visible.",
    url: "https://www.dovepress.com/dynamic-pupillometry-in-type-2-diabetes-pupillary-autonomic-dysfunctio-peer-reviewed-fulltext-article-OPTH",
  },
  {
    id: "smartplr",
    short: "SmartPLR, BMC Ophthalmology 2025",
    title: "SmartPLR: a digital solution for AI-powered smartphone pupillometry",
    journal: "BMC Ophthalmology",
    year: 2025,
    device: "Smartphone only (no infrared, no attachment)",
    finding:
      "Deep-learning phone pupillometry agreed closely with the NPi-300 clinical pupillometer across 336 exams from 158 volunteers. Shows phone-only measurement is feasible.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12613743/",
  },
];

/** Average adult horizontal iris diameter, used to turn ratios into millimetres. */
export const IRIS_DIAMETER_MM = 11.7;

export const PUBLISHED_PUPIL_IRIS_RATIO = {
  healthy: 0.55,
  diabetes: 0.42,
  diabetesWithNeuropathy: 0.35,
  sourceId: "pilot2010",
  note: "Measured in full darkness with an infrared device; a phone in a dim room will read lower.",
};

export type MetricKey = "restingRatio" | "amplitude" | "latency" | "velocity";

export type MetricStatus = "typical" | "borderline" | "atypical" | "unknown";

export type Threshold = {
  key: MetricKey;
  label: string;
  unit: string;
  /** "higher" = bigger values are typical; "lower" = smaller values are typical */
  better: "higher" | "lower";
  typical: number;
  borderline: number;
  explain: string;
};

/**
 * Second result: left vs right eye (team-set, provisional).
 *
 * - Size difference: from the normal scan. Up to about 0.4 mm is common in healthy people;
 *   1 mm or more is worth showing an eye doctor (it can come from nerve or muscle problems).
 * - Reflex balance: needs one flash per eye with the other eye covered. When one optic nerve
 *   carries less light signal (as in glaucoma), the pupils react less when that eye is lit
 *   (a relative afferent pupillary defect). A single flash on both eyes can't show this,
 *   because each pupil responds to the light from both eyes together.
 */
export const EYE_DIFFERENCE = {
  sizeMm: { even: 0.4, check: 1.0 },
  /** Weaker eye's constriction as a fraction of the stronger eye's. */
  reflexBalance: { even: 0.8, check: 0.65 },
  explain:
    "Compares your two eyes. A clear difference in pupil size, or a weaker reaction when one eye is lit, can be a sign of optic-nerve problems such as glaucoma. It's a reason to see an eye doctor, not a diagnosis.",
};

export type EyeDifferenceStatus = "even" | "borderline" | "check" | "unknown";

export function rateSizeDifference(mm: number | null): EyeDifferenceStatus {
  if (mm === null || !Number.isFinite(mm)) return "unknown";
  if (mm < EYE_DIFFERENCE.sizeMm.even) return "even";
  return mm < EYE_DIFFERENCE.sizeMm.check ? "borderline" : "check";
}

export function rateReflexBalance(balance: number | null): EyeDifferenceStatus {
  if (balance === null || !Number.isFinite(balance)) return "unknown";
  if (balance >= EYE_DIFFERENCE.reflexBalance.even) return "even";
  return balance >= EYE_DIFFERENCE.reflexBalance.check ? "borderline" : "check";
}

/** Starter thresholds (team-set, provisional). */
export const THRESHOLDS: Threshold[] = [
  {
    key: "amplitude",
    label: "Constriction amplitude",
    unit: "%",
    better: "higher",
    typical: 18,
    borderline: 12,
    explain: "How much the pupil shrinks after the flash. Studies found smaller reflex amplitudes in diabetes.",
  },
  {
    key: "velocity",
    label: "Max constriction speed",
    unit: "mm/s",
    better: "higher",
    typical: 1.2,
    borderline: 0.8,
    explain: "How fast the pupil shrinks. Nerve damage slows the constriction phase.",
  },
  {
    key: "latency",
    label: "Reaction delay",
    unit: "s",
    better: "lower",
    typical: 0.35,
    borderline: 0.5,
    explain: "Time from flash to the pupil starting to shrink. Phone cameras limit this to about 1/30 s precision.",
  },
  {
    key: "restingRatio",
    label: "Resting pupil-to-iris ratio",
    unit: "",
    better: "higher",
    typical: 0.4,
    borderline: 0.32,
    explain:
      "Pupil size relative to the iris before the flash. People with diabetes had smaller resting pupils (0.42 vs 0.55 in darkness).",
  },
];

export function rateMetric(t: Threshold, value: number | null | undefined): MetricStatus {
  if (value == null || !Number.isFinite(value)) return "unknown";
  if (t.better === "higher") {
    if (value >= t.typical) return "typical";
    if (value >= t.borderline) return "borderline";
    return "atypical";
  }
  if (value <= t.typical) return "typical";
  if (value <= t.borderline) return "borderline";
  return "atypical";
}
