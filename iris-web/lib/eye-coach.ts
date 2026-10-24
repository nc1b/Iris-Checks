import type { QualityReport } from "@/lib/photo-quality";

/**
 * Live coaching for the eye photo: one instruction at a time (back up, come closer, centre the
 * eye, hold still, more light), worked out from where the phone found the eye and how big and
 * sharp it is. Photos taken outside these limits are the ones the AI review calls unclear: an
 * iris only a few dozen pixels across has no visible pupil detail, and a phone held too close
 * can't focus.
 */

export type CoachInput = {
  facing: "environment" | "user";
  quality: QualityReport | null;
  steady: boolean;
  /** The eye found in the live picture (video pixels), if any. */
  eye: { x: number; y: number; r: number; openness: number | null } | null;
  /** The framing guide in video pixels. */
  guide: { x: number; y: number; w: number; h: number } | null;
};

export type CoachKey =
  | "starting"
  | "too_dark"
  | "glare"
  | "find_eye"
  | "find_eye_blurry"
  | "back_up"
  | "closer"
  | "center"
  | "focus"
  | "open_wider"
  | "hold_still"
  | "ready";

export type Coach = {
  key: CoachKey;
  /** The instruction, short enough to read at a glance. */
  text: string;
  /** Everything is right: the photo can be taken. */
  ready: boolean;
  /** Where the eye's size sits between too far (0) and too close (1), with the good band. */
  distance: { value: number; okFrom: number; okTo: number } | null;
  /** The eye isn't in the middle of the oval. */
  offCenter: boolean;
};

/**
 * Iris diameter as a share of the guide's width. The guide is sized for one eye corner to
 * corner, and an eye is about 2.6 iris diameters wide, so a well-framed iris is about 0.3.
 */
export const COACH = {
  frac: { environment: { min: 0.2, max: 0.45 }, user: { min: 0.15, max: 0.45 } },
  /** Iris diameter in real camera pixels needed to see the pupil's detail. */
  minIrisPx: { environment: 90, user: 60 },
  /** Eye centre may sit this far from the guide's centre (share of the guide's width / height). */
  center: { x: 0.16, y: 0.22 },
  /** Below this the eyelids cover too much of the iris (face model only). */
  minOpenness: 0.2,
  /** Meter scale: iris share from 0.05 (far) to 0.6 (close). */
  meter: { from: 0.05, to: 0.6 },
};

const meter = (frac: number) => Math.min(1, Math.max(0, (frac - COACH.meter.from) / (COACH.meter.to - COACH.meter.from)));

export function coach({ facing, quality, steady, eye, guide }: CoachInput): Coach {
  const none = { distance: null, offCenter: false, ready: false };
  if (!quality || !guide) return { key: "starting", text: "Starting the camera…", ...none };
  const issues = quality.issues;
  if (issues.includes("too_dark")) {
    return {
      key: "too_dark",
      text: facing === "user" ? "Too dark. Face a window or lamp, or turn on the screen light." : "Too dark. Face a window or bright lamp.",
      ...none,
    };
  }
  if (issues.includes("glare") || issues.includes("too_bright")) return { key: "glare", text: "Too much glare. Tilt the phone a little, or move out of direct light.", ...none };

  const blurry = issues.includes("blur");
  if (!eye) {
    return blurry
      ? { key: "find_eye_blurry", text: "Back up a little so the camera can focus on your eye.", ...none }
      : { key: "find_eye", text: "Move closer and fit one open eye inside the oval.", ...none };
  }

  const band = COACH.frac[facing];
  const frac = (eye.r * 2) / guide.w;
  const distance = { value: meter(frac), okFrom: meter(band.min), okTo: meter(band.max) };
  const dx = (eye.x - (guide.x + guide.w / 2)) / guide.w;
  const dy = (eye.y - (guide.y + guide.h / 2)) / guide.h;
  const offCenter = Math.abs(dx) > COACH.center.x || Math.abs(dy) > COACH.center.y;
  const base = { distance, offCenter, ready: false };

  if (frac > band.max) return { key: "back_up", text: "Back up a little. The eye is too close to focus.", ...base };
  if (frac < band.min) return { key: "closer", text: "Move a little closer.", ...base };
  if (eye.r * 2 < COACH.minIrisPx[facing]) return { key: "closer", text: "Move a little closer. This camera needs the eye bigger to see the pupil.", ...base };
  if (offCenter) return { key: "center", text: "Centre your eye in the oval. Follow the arrow.", ...base };
  if (blurry) return { key: "focus", text: frac > (band.min + band.max) / 2 ? "Blurry. Back up slightly and hold still." : "Blurry. Hold still and tap the eye to focus.", ...base };
  if (eye.openness !== null && eye.openness < COACH.minOpenness) return { key: "open_wider", text: "Open your eye wider and look just past the phone.", ...base };
  if (!steady) return { key: "hold_still", text: "Hold still…", ...base };
  return { key: "ready", text: "Perfect. Hold still.", ...base, ready: true };
}
