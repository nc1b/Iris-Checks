import { findGlint, PRECISION_CROP } from "./camera-scan";
import { findIris, type GreyFrame, type IrisFound, type IrisGuess } from "./eye-search";
import { fitEye, type Circle } from "./pupil-fit";

/**
 * Finding and measuring one eye in one camera frame, for the camera scan.
 *
 * Kept apart from the React screen (components/scanner/camera-scan.tsx) so the same code runs on
 * the phone and in the test bench (scripts/scan-bench), which feeds it simulated camera frames
 * with known pupil sizes.
 */

/** A camera frame, as the tracker needs it. */
export type FrameSource = {
  width: number;
  height: number;
  /** A small greyscale copy with its integral image (lib/eye-search). */
  grey(): GreyFrame | null;
  /** A `size`×`size` copy of the square with centre (cx, cy) and half-width `half`, in frame pixels. */
  crop(cx: number, cy: number, half: number, size: number): ImageData | null;
};

/** What the face model says about this eye, when it found the face and points at the same eye. */
export type FaceEye = {
  /** Corner-to-corner width of the eye, in frame pixels. */
  eyeWidth: number;
  /** Eye aspect ratio (lid gap ÷ eye width): small when the eye is closed. */
  ear: number;
};

export type EyeReading = {
  /** Corner-to-corner width of the eye, in frame pixels. */
  eyeWidth: number;
  /** Iris centre and radius in frame pixels (fitted to its edge when `irisFitted`). */
  cx: number;
  cy: number;
  irisR: number;
  irisFitted: boolean;
  /** Pupil radius in frame pixels (NaN if not measured). */
  pupilR: number;
  contrast: number;
  coverage: number;
  /** How well lit the eye is (0–255). */
  light: number;
  ear: number;
  /** Lens haze: the pupil's middle as a share of the white of the eye (lib/pupil-fit), or null. */
  haze: number | null;
  /** Pupil darker (1) or lighter (-1, cloudy lens) than the iris, 0 if unclear. */
  polarity: 1 | -1 | 0;
  /** The close-up the eye was measured on, and what was found in it (crop pixels). */
  crop: ImageData;
  cropIris: Circle;
  cropPupil: Circle | null;
  /** Pupil radius in crop pixels (NaN if not measured). */
  pupilCropPx: number;
  glint: { x: number; y: number } | null;
};

/** The close-up spans this many (roughly found) iris radii from its centre to its edge. */
export const SCAN_CROP_SPAN = 1.5;

/**
 * Measures the iris and pupil in a close-up around the roughly found iris (x, y, r).
 * `sizeTolerance`: how far the fitted iris may be from `r` (see lib/pupil-fit fitEye).
 */
export function readEye(src: FrameSource, iris: IrisGuess, face: FaceEye | null, withGlint = true, sizeTolerance?: number): EyeReading | null {
  const { x: cx, y: cy, r: irisR } = iris;
  if (!Number.isFinite(irisR) || irisR < 3) return null;
  const half = irisR * SCAN_CROP_SPAN;
  const crop = src.crop(cx, cy, half, PRECISION_CROP);
  if (!crop) return null;
  const k = (half * 2) / PRECISION_CROP; // frame px per crop px
  const mid = PRECISION_CROP / 2;
  const guess = { x: mid, y: mid, r: mid / SCAN_CROP_SPAN };
  const fit = fitEye(crop, guess, sizeTolerance);
  const ci = fit.iris ?? guess;
  const glint = withGlint ? findGlint(crop, ci.r) : null;
  return {
    eyeWidth: face ? face.eyeWidth : irisR * 5.2,
    cx: cx + (ci.x - mid) * k,
    cy: cy + (ci.y - mid) * k,
    irisR: ci.r * k,
    irisFitted: !!fit.iris,
    pupilR: fit.pupil ? fit.pupil.r * k : NaN,
    contrast: fit.contrast,
    coverage: fit.coverage,
    light: fit.light,
    // Without the face model, an eye whose iris edge or pupil can be seen is open.
    ear: face ? face.ear : fit.iris || fit.pupil ? 0.3 : 0,
    haze: fit.haze,
    polarity: fit.polarity,
    crop,
    cropIris: ci,
    cropPupil: fit.pupil,
    pupilCropPx: fit.pupil ? fit.pupil.r : NaN,
    glint: glint && { x: cx + (glint.x - mid) * k, y: cy + (glint.y - mid) * k },
  };
}

/** Keep following an eye whose iris edge was found this long when it briefly can't be (blinks). */
export const LOCK_MS = 1500;
/** A rough lock, never confirmed by the iris edge, is let go much sooner: it may be the wrong spot. */
const ROUGH_LOCK_MS = 400;
/** During a recording the iris may only seem to change size this much (the phone can't move far in 6 s). */
const RECORDING_SIZE_TOLERANCE = 0.12;

type Lock = IrisFound & { at: number; fitted: boolean };

/**
 * Follows the target eye from frame to frame.
 *
 * 1. Where the iris edge was found in a recent frame, it's fitted again right there: the eye
 *    barely moves between frames. Through a blink it keeps looking there for up to 1.5 s rather
 *    than jumping to something else that looks a bit like an eye.
 * 2. Otherwise the frame is searched roughly (lib/eye-search) near the face model's guess, the
 *    last lock and the on-screen ring, and the best few candidates are measured; the first whose
 *    iris edge fits wins. Close up the face model often misses the face or puts the eye beside the
 *    real one, so its guess is only one of the candidates.
 */
export class EyeTracker {
  private lock: Lock | null = null;

  reset() {
    this.lock = null;
  }

  track(
    src: FrameSource,
    {
      model,
      face,
      ring,
      ts,
      recording,
    }: {
      /** The face model's iris for this eye, if it found a face. */
      model: IrisGuess | null;
      /** Blink and eye-size information from the face model, for the same eye. */
      face: FaceEye | null;
      /** Where the on-screen ring asks for the eye: the guess, and how far around it to look. */
      ring: { guess: IrisGuess; reach: number; radii: number[] };
      ts: number;
      recording: boolean;
    },
  ): EyeReading | null {
    const lock = this.lock;
    const fresh = lock && ts - lock.at < (lock.fitted ? LOCK_MS : ROUGH_LOCK_MS) ? lock : null;
    const faceFor = (c: IrisGuess) => (model && Math.hypot(model.x - c.x, model.y - c.y) < c.r * 0.8 ? face : null);
    // During a recording the iris keeps its size: a washed-out flash frame can make the pupil's
    // edge look like the iris's, and one wrong size would throw the next frames off too.
    const hold = recording && fresh ? fresh.r : null;
    const tolerance = hold ? RECORDING_SIZE_TOLERANCE : undefined;
    const keep = (reading: EyeReading, score: number) => {
      this.lock = { x: reading.cx, y: reading.cy, r: hold ? hold * 0.8 + reading.irisR * 0.2 : reading.irisR, score, at: ts, fitted: true };
      return reading;
    };

    // 1. Right where the iris edge just was. (During a recording, skip the glint search to keep
    //    the frame rate up.)
    let atLock: EyeReading | null = null;
    if (fresh?.fitted) {
      atLock = readEye(src, fresh, faceFor(fresh), !recording, tolerance ?? 0.2);
      if (atLock?.irisFitted) return keep(atLock, fresh.score);
    }

    // 2. Search, then measure the best few places found.
    const grey = src.grey();
    const searches: { guess: IrisGuess; reach: number; radii?: number[] }[] = [];
    if (model && model.r >= 3) searches.push({ guess: model, reach: model.r * 1.5 });
    // Near a fitted lock, only sizes close to it: the eye can't change size much in a frame, and
    // in a light (blue, green) eye the dark pupil would otherwise pass for the iris now and then.
    if (fresh) searches.push({ guess: fresh, reach: fresh.r * (recording ? 0.6 : 1.2), radii: fresh.fitted ? [0.9, 0.95, 1, 1.05, 1.1] : undefined });
    if (!fresh?.fitted) searches.push(ring);
    const candidates: IrisFound[] = [];
    if (grey) {
      for (const s of searches) {
        const f = findIris(grey, s.guess, s.reach, s.radii);
        if (f && !candidates.some((c) => Math.hypot(c.x - f.x, c.y - f.y) < c.r * 0.3)) candidates.push(f);
      }
    }
    if (model && model.r >= 3 && !candidates.length) candidates.push({ ...model, score: 0 });
    candidates.sort((a, b) => b.score - a.score);
    let rough: { reading: EyeReading; at: IrisFound } | null = null;
    for (const c of candidates.slice(0, 3)) {
      // Through a blink, nothing far from where the iris just was.
      if (fresh?.fitted && Math.hypot(c.x - fresh.x, c.y - fresh.y) > fresh.r * 0.35) continue;
      const where = hold ? { x: c.x, y: c.y, r: hold } : c;
      const reading = readEye(src, where, faceFor(where), !recording, tolerance);
      if (reading?.irisFitted) return keep(reading, c.score);
      if (reading && !rough) rough = { reading, at: { ...where, score: c.score } };
    }

    // No iris edge anywhere. Right after a fitted lock (a blink, a washed-out flash frame) the
    // eye is still where it was: give that reading (the pupil may still be measurable), without
    // renewing the lock, so an eye that's really gone is let go after LOCK_MS.
    if (fresh?.fitted) return atLock;
    // Otherwise follow the rough spot for a moment.
    if (rough) {
      this.lock = { ...rough.at, at: ts, fitted: false };
      return rough.reading;
    }
    return null;
  }
}
