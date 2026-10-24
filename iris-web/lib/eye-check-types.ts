/** Shapes shared by the eye photo check (components/eye-check) and its API (app/api/eye-check). */

export type QualityProblem = "none" | "no_eye" | "blur" | "too_dark" | "glare" | "too_far" | "eye_closed" | "cropped" | "other";

export type Category =
  | "no_visible_concern"
  | "redness"
  | "lens_cloudiness"
  | "eyelid"
  | "inflammation_signs"
  | "inconclusive";

export type Finding<T extends string> = T | "cannot_assess";

/** What the image model reports about one photo. Only things a phone photo can show. */
export type PhotoAnalysis = {
  quality: { usable: boolean; problem: QualityProblem; explanation: string };
  observations: {
    redness: Finding<"none" | "mild" | "marked">;
    lens_cloudiness: Finding<"none" | "possible" | "likely">;
    eyelid: Finding<"normal" | "swelling_or_lump" | "drooping">;
    discharge: Finding<"none" | "present">;
    yellow_whites: Finding<"none" | "possible">;
  };
  category: Category;
  confidence: "low" | "medium" | "high";
  summary: string;
};

export const QUALITY_PROBLEMS: QualityProblem[] = ["none", "no_eye", "blur", "too_dark", "glare", "too_far", "eye_closed", "cropped", "other"];
export const CATEGORIES: Category[] = ["no_visible_concern", "redness", "lens_cloudiness", "eyelid", "inflammation_signs", "inconclusive"];
