import { findGlint, PRECISION_CROP } from "./camera-scan";
import { findIris, type GreyFrame, type IrisFound, type IrisGuess } from "./eye-search";
import { fitEye, type Circle } from "./pupil-fit";

export type FrameSource = {
  width: number;
  height: number;
  grey(): GreyFrame | null;
  crop(cx: number, cy: number, half: number, size: number): ImageData | null;
};

export type FaceEye = {
  eyeWidth: number;
  ear: number;
};

export type EyeReading = {
  eyeWidth: number;
  cx: number;
  cy: number;
  irisR: number;
  irisFitted: boolean;
  pupilR: number;
  contrast: number;
  coverage: number;
  light: number;
  ear: number;
  haze: number | null;
  polarity: 1 | -1 | 0;
  crop: ImageData;
  cropIris: Circle;
  cropPupil: Circle | null;
  pupilCropPx: number;
  glint: { x: number; y: number } | null;
};

export const SCAN_CROP_SPAN = 1.5;

export function readEye(src: FrameSource, iris: IrisGuess, face: FaceEye | null, withGlint = true, sizeTolerance?: number): EyeReading | null {
  const { x: cx, y: cy, r: irisR } = iris;
  if (!Number.isFinite(irisR) || irisR < 3) return null;
  const half = irisR * SCAN_CROP_SPAN;
  const crop = src.crop(cx, cy, half, PRECISION_CROP);
  if (!crop) return null;
  const k = (half * 2) / PRECISION_CROP;
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

export const LOCK_MS = 1500;
const ROUGH_LOCK_MS = 400;
const RECORDING_SIZE_TOLERANCE = 0.12;

type Lock = IrisFound & { at: number; fitted: boolean };

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
      model: IrisGuess | null;
      face: FaceEye | null;
      ring: { guess: IrisGuess; reach: number; radii: number[] };
      ts: number;
      recording: boolean;
    },
  ): EyeReading | null {
    const lock = this.lock;
    const fresh = lock && ts - lock.at < (lock.fitted ? LOCK_MS : ROUGH_LOCK_MS) ? lock : null;
    const faceFor = (c: IrisGuess) => (model && Math.hypot(model.x - c.x, model.y - c.y) < c.r * 0.8 ? face : null);
    const hold = recording && fresh ? fresh.r : null;
    const tolerance = hold ? RECORDING_SIZE_TOLERANCE : undefined;
    const keep = (reading: EyeReading, score: number) => {
      this.lock = { x: reading.cx, y: reading.cy, r: hold ? hold * 0.8 + reading.irisR * 0.2 : reading.irisR, score, at: ts, fitted: true };
      return reading;
    };

    let atLock: EyeReading | null = null;
    if (fresh?.fitted) {
      atLock = readEye(src, fresh, faceFor(fresh), !recording, tolerance ?? 0.2);
      if (atLock?.irisFitted) return keep(atLock, fresh.score);
    }

    const grey = src.grey();
    const searches: { guess: IrisGuess; reach: number; radii?: number[] }[] = [];
    if (model && model.r >= 3) searches.push({ guess: model, reach: model.r * 1.5 });
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
      if (fresh?.fitted && Math.hypot(c.x - fresh.x, c.y - fresh.y) > fresh.r * 0.35) continue;
      const where = hold ? { x: c.x, y: c.y, r: hold } : c;
      const reading = readEye(src, where, faceFor(where), !recording, tolerance);
      if (reading?.irisFitted) return keep(reading, c.score);
      if (reading && !rough) rough = { reading, at: { ...where, score: c.score } };
    }

    if (fresh?.fitted) return atLock;
    if (rough) {
      this.lock = { ...rough.at, at: ts, fitted: false };
      return rough.reading;
    }
    return null;
  }
}
