import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { findGlint, measureHaze, PRECISION_CROP } from "@/lib/camera-scan";
import { enhanceEyePhoto } from "@/lib/eye-enhance";
import type { IrisGuess } from "@/lib/eye-search";
import { findEyeCircles, findLimbus, toGrey, type Circle } from "@/lib/limbus";
import { measureQuality } from "@/lib/photo-quality";
import { CROP_SPAN, eyeAspectRatio, LANDMARKS, measurePupil } from "@/lib/pupil";
import { IRIS_DIAMETER_MM } from "@/lib/reference";

/**
 * Where is the eye in a photo or camera frame, and what does its pupil look like?
 *
 * 1. Machine learning first: Google's MediaPipe face landmarker (the same model the pupil scan
 *    uses) gives the iris centre and size, eye corners and eyelids when enough of the face is
 *    in view.
 * 2. Close-ups, where only one eye fills the picture and the face model can't work: the
 *    iris-edge search in lib/limbus.ts (Daugman's method, as in iris-recognition systems).
 * 3. Then the pupil is measured in a close-up of the iris (lib/pupil.ts), along with how dark
 *    the pupil is (a clear lens keeps it black), the redness of the white of the eye beside
 *    the iris, and how sharp the iris is.
 *
 * Everything runs on the phone. The numbers describe the photo; they are not a diagnosis.
 */

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let facePromise: Promise<FaceLandmarker> | null = null;
/** The face model once loaded, for callers that can't wait. */
let faceReady: FaceLandmarker | null = null;

/** Loads the face landmarker once (about 4 MB). Safe to call early to warm it up. */
export function loadFaceModel() {
  facePromise ??= (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
    const make = (delegate: "GPU" | "CPU") =>
      vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate },
        runningMode: "IMAGE",
        numFaces: 1,
      });
    const model = await make("GPU").catch(() => make("CPU"));
    faceReady = model;
    return model;
  })().catch((e) => {
    facePromise = null;
    throw e;
  });
  return facePromise;
}

/** The face model, if it has finished loading; never waits (and starts loading it if needed). */
export function faceModelNow() {
  if (!faceReady) loadFaceModel().catch(() => {});
  return faceReady;
}

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export type EyeFound = {
  method: "face-model" | "iris-search";
  iris: IrisGuess;
  /** Eye corners and eyelid points, from the face model only. */
  corners: [Point, Point] | null;
  /** Eye openness (eyelid gap / eye width), from the face model only. */
  openness: number | null;
};

type Source = HTMLVideoElement | HTMLCanvasElement;
const sizeOf = (s: Source) => (s instanceof HTMLVideoElement ? { w: s.videoWidth, h: s.videoHeight } : { w: s.width, h: s.height });

/** The search runs on a copy of the picture this many pixels wide (fast enough for live video). */
const SEARCH_W = 200;

export type FindOptions = {
  /** Where the eye probably is (source pixels), such as the eye found a moment ago. */
  near?: IrisGuess | null;
  scratch?: HTMLCanvasElement;
  /** Only look inside this part of the source (source pixels), e.g. the framing guide. */
  region?: Box | null;
  /** Try the face model first (slower; off for live video). Default on. */
  faceModel?: boolean;
};

/**
 * Does the face the model found fit inside the picture? Shown only one eye, the face model
 * still answers, inventing a face several times bigger than the photo with its "iris" in the
 * wrong place, which is what made the photo check measure the wrong circle.
 */
function faceFits(lm: { x: number; y: number }[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of lm) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return x0 > -0.08 && y0 > -0.08 && x1 < 1.08 && y1 < 1.08 && x1 - x0 > 0.12;
}

/**
 * Finds the eye in `source`:
 * 1. The face model (machine learning), only when the whole face fits in the picture; its iris
 *    is then sharpened with the iris-edge search.
 * 2. Otherwise the iris-edge search in lib/limbus.ts (Daugman's method): near `near` if given
 *    (fast, for following a moving eye), or the pupil-then-iris search across the picture.
 */
export function findEye(source: Source, opts: FindOptions = {}): EyeFound | null {
  const { w, h } = sizeOf(source);
  if (!w || !h) return null;
  const region = opts.region ?? { x: 0, y: 0, w, h };
  const near = opts.near ?? null;

  // Small greyscale copy of the region for the iris-edge search.
  const canvas = opts.scratch ?? document.createElement("canvas");
  const k = Math.min(1, SEARCH_W / region.w);
  canvas.width = Math.max(1, Math.round(region.w * k));
  canvas.height = Math.max(1, Math.round(region.h * k));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, region.x, region.y, region.w, region.h, 0, 0, canvas.width, canvas.height);
  const g = toGrey(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  const toSmall = (p: IrisGuess) => ({ x: (p.x - region.x) * k, y: (p.y - region.y) * k, r: p.r * k });
  const fromSmall = (c: Circle): IrisGuess => ({ x: region.x + c.x / k, y: region.y + c.y / k, r: c.r / k });
  const around = (p: IrisGuess) => {
    const n = toSmall(p);
    return findLimbus(g, { rMin: n.r * 0.78, rMax: n.r * 1.3, near: n, reach: Math.max(4, n.r * 0.6) });
  };

  // 1. The face model, when the whole face is in view.
  const model = opts.faceModel === false ? null : faceModelNow();
  if (model) {
    try {
      const lm = model.detect(source).faceLandmarks?.[0];
      if (lm && lm.length >= 478 && faceFits(lm)) {
        const eyes = (["left", "right"] as const).map((side) => {
          const L = LANDMARKS[side];
          const c = lm[L.irisCenter];
          const r = L.iris.reduce((s, i) => s + Math.hypot((lm[i].x - c.x) * w, (lm[i].y - c.y) * h), 0) / L.iris.length;
          return {
            iris: { x: c.x * w, y: c.y * h, r },
            corners: [
              { x: lm[L.inner].x * w, y: lm[L.inner].y * h },
              { x: lm[L.outer].x * w, y: lm[L.outer].y * h },
            ] as [Point, Point],
            openness: eyeAspectRatio(lm, L.upper, L.lower, L.inner, L.outer, w / h),
          };
        });
        // The eye nearest the expected spot (or the middle of the region).
        const target = near ?? { x: region.x + region.w / 2, y: region.y + region.h / 2, r: 0 };
        const eye = eyes.sort((a, b) => Math.hypot(a.iris.x - target.x, a.iris.y - target.y) - Math.hypot(b.iris.x - target.x, b.iris.y - target.y))[0];
        // A whole face in view isn't a close-up: a tiny iris means the eye is just too far away.
        if (eye.iris.r < 4) return null;
        const sharper = around(eye.iris);
        return { method: "face-model", ...eye, iris: sharper ? fromSmall(sharper) : eye.iris };
      }
    } catch {
      // A frame the model can't read; fall through to the iris-edge search.
    }
  }

  // 2. The iris-edge search: near the last position first, then across the region.
  const found = (near && around(near)) || findEyeCircles(g, { rMin: canvas.width * 0.05, rMax: canvas.width * 0.3 }).iris;
  return found ? { method: "iris-search", iris: fromSmall(found), corners: null, openness: null } : null;
}

export type EyeMeasure = EyeFound & {
  /** Pupil radius in source pixels, if its edge was found. */
  pupilR: number | null;
  pupilMm: number | null;
  /** 0 = evenly black, 100 = white. A cloudy lens makes the pupil grey. */
  pupilDarkness: number | null;
  /** Pupil vs iris brightness (0–255): how clearly the pupil stands out. */
  contrast: number;
  /** The screen or lamp reflection on the eye, if any. */
  glint: Point | null;
  /** Redness of the white of the eye beside the iris: 0 = neutral white, higher = redder. */
  redness: number | null;
  /** Where the white of the eye was sampled (for the overlay). */
  scleraBoxes: Box[];
  /** Sharpness of the iris area (variance of the Laplacian; above ~25 is sharp). */
  sharpness: number;
};

/**
 * Finds the eye and measures it. In a dark photo the eye is looked for again in a brightened
 * copy; then only its position and size are kept, since colours from a dark photo mislead.
 */
export function measureEye(source: Source, opts: FindOptions = {}): EyeMeasure | null {
  let eye = findEye(source, opts);
  let dark = false;
  if (!eye && source instanceof HTMLCanvasElement) {
    eye = findEye(enhanceEyePhoto(source).canvas, opts);
    dark = !!eye;
  }
  if (!eye) return null;
  const { x: cx, y: cy, r } = eye.iris;

  // Close-up of the iris for the pupil, at a fixed size for sub-pixel precision.
  const crop = document.createElement("canvas");
  crop.width = crop.height = PRECISION_CROP;
  const cctx = crop.getContext("2d", { willReadFrequently: true });
  if (!cctx) return null;
  const half = r * CROP_SPAN;
  cctx.drawImage(source, cx - half, cy - half, half * 2, half * 2, 0, 0, PRECISION_CROP, PRECISION_CROP);
  const pixels = cctx.getImageData(0, 0, PRECISION_CROP, PRECISION_CROP);
  const reading = measurePupil(pixels);
  const toSource = reading ? r / reading.irisPx : 1;
  const irisPx = reading?.irisPx ?? PRECISION_CROP / 2 / CROP_SPAN;
  // A pupil under a tenth of the iris is a misread (a reflection edge), not a pupil.
  const pupilFound = !!reading && Number.isFinite(reading.pupilPx) && reading.pupilPx > irisPx * 0.1;
  // The pupil edge is found by looking for a dark disc. A cloudy lens makes the pupil grey or
  // white, so then the centre of the iris is measured directly instead: if it isn't dark, that
  // is itself the finding.
  // Without a pupil edge, the iris centre may sit a little off the pupil, so try a few spots
  // close to it and keep the darkest: a black pupil there reads clear, a cataract stays grey.
  let haze = pupilFound ? measureHaze(pixels, reading!.pupilPx) : null;
  if (!pupilFound) {
    const shifted = document.createElement("canvas");
    shifted.width = shifted.height = PRECISION_CROP;
    const sctx = shifted.getContext("2d", { willReadFrequently: true });
    for (const dy of [-0.12, 0, 0.12]) {
      for (const dx of [-0.12, 0, 0.12]) {
        if (!sctx) break;
        sctx.clearRect(0, 0, PRECISION_CROP, PRECISION_CROP);
        sctx.drawImage(crop, -dx * irisPx, -dy * irisPx);
        const h = measureHaze(sctx.getImageData(0, 0, PRECISION_CROP, PRECISION_CROP), irisPx * 0.4);
        if (h !== null && (haze === null || h < haze)) haze = h;
      }
    }
  }
  const glint = reading ? findGlint(pixels, reading.irisPx) : null;
  const sharpness = measureQuality(pixels.data, PRECISION_CROP, PRECISION_CROP).sharpness;

  // White of the eye: small boxes left and right of the iris, keeping the brighter half of the
  // pixels so eyelids and lashes don't count.
  const { w, h } = sizeOf(source);
  const boxes: Box[] = [-1, 1].map((side) => ({ x: cx + side * r * 1.75 - r * 0.35, y: cy - r * 0.3, w: r * 0.7, h: r * 0.6 })).filter((b) => b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h);
  let redness: number | null = null;
  if (boxes.length) {
    const s = document.createElement("canvas");
    s.width = s.height = 24;
    const sctx = s.getContext("2d", { willReadFrequently: true });
    const values: { luma: number; red: number }[] = [];
    for (const b of boxes) {
      if (!sctx) break;
      sctx.drawImage(source, b.x, b.y, b.w, b.h, 0, 0, 24, 24);
      const d = sctx.getImageData(0, 0, 24, 24).data;
      for (let i = 0; i < d.length; i += 4) {
        const mean = (d[i] + d[i + 1] + d[i + 2]) / 3;
        values.push({ luma: mean, red: mean > 1 ? (d[i] - (d[i + 1] + d[i + 2]) / 2) / mean : 0 });
      }
    }
    values.sort((a, b) => b.luma - a.luma);
    const bright = values.slice(0, Math.max(1, values.length >> 1));
    // Only meaningful when the white of the eye is actually visible and lit.
    if (bright.length && bright[bright.length - 1].luma > 60) redness = Math.round((bright.reduce((t, v) => t + v.red, 0) / bright.length) * 100) / 100;
  }

  return {
    ...eye,
    pupilR: pupilFound ? reading!.pupilPx * toSource : null,
    pupilMm: pupilFound ? Math.round(((reading!.pupilPx * toSource) / r) * IRIS_DIAMETER_MM * 10) / 10 : null,
    pupilDarkness: haze === null || dark ? null : Math.round(haze * 100),
    contrast: reading?.contrast ?? 0,
    glint: glint && { x: cx + (glint.x - PRECISION_CROP / 2) * toSource, y: cy + (glint.y - PRECISION_CROP / 2) * toSource },
    redness: dark ? null : redness,
    scleraBoxes: boxes,
    sharpness: Math.round(sharpness),
  };
}

/** Plain-language bands for the measurements. Team-set and provisional, not clinical cut-offs. */
export const MEASURE_BANDS = {
  /** Typical adult pupils in room light are about 2–8 mm. */
  pupilMm: { min: 1.5, max: 9 },
  /**
   * Pupil darkness (0–100). Set on test photos: clear pupils read 0–24 (a large ring-light
   * reflection gave 24), cataracts 56 and 87.
   */
  darkness: { clear: 25, hazy: 40 },
  /** Redness index of the white: warm lamp light alone can reach ~0.15. */
  redness: { low: 0.15, high: 0.3 },
};

/** A small square around the eye for the photo match (like the camera scan's eye photo). */
export function eyeSquare(source: Source, iris: IrisGuess, size = 96) {
  const side = iris.r * 5.6; // about 1.1× the eye's corner-to-corner width
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, iris.x - side / 2, iris.y - side / 2, side, side, 0, 0, size, size);
  return canvas;
}
