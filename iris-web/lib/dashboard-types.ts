/** Shapes shared by the dashboard API (app/api/me, app/api/scans) and the dashboard UI. */

export type CheckStatus = "typical" | "borderline" | "see_doctor" | "unclear";
export type Answer = "yes" | "no" | "unsure";
export type AgeRange = "13-17" | "18-39" | "40-59" | "60+";

export type Profile = {
  first_name: string | null;
  age_range: AgeRange | null;
  diabetes: Answer | null;
  glaucoma: Answer | null;
  cataract: Answer | null;
  research_consent: boolean;
  research_consent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ScanMetrics = {
  /** Diabetes check (pupil light reflex) */
  restingRatio?: number;
  amplitude?: number; // %
  latency?: number; // s
  velocity?: number; // mm/s
  /** Glaucoma check (left vs right) */
  sizeDiffMm?: number;
  leftLitAmplitude?: number; // %
  rightLitAmplitude?: number; // %
  reflexBalance?: number; // 0-1, weaker eye / stronger eye
  /** Cataract check (lens haze: the pupil's grey as a share of the white of the eye) */
  hazeLeft?: number; // 0-1
  hazeRight?: number; // 0-1
  /** Capture quality */
  validFraction?: number; // 0-1
  /** Photo match: highest score across both eyes for each condition (0-1), vs the Iris photo database */
  photoCataract?: number;
  photoConjunctivitis?: number;
  photoUveitis?: number;
  photoEyelid?: number;
};

export type Scan = {
  id: string;
  created_at: string;
  source: "demo" | "camera";
  diabetes_status: CheckStatus;
  glaucoma_status: CheckStatus;
  cataract_status: CheckStatus;
  metrics: ScanMetrics;
  note: string | null;
};

export type Dashboard = {
  profile: Profile;
  scans: Scan[];
  total_scans: number;
};

export const AGE_RANGES: AgeRange[] = ["13-17", "18-39", "40-59", "60+"];
export const ANSWERS: Answer[] = ["yes", "no", "unsure"];
