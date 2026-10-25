import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { findGlint, measureHaze, PRECISION_CROP } from "@/lib/camera-scan";
import { enhanceEyePhoto } from "@/lib/eye-enhance";
import type { IrisGuess } from "@/lib/eye-search";
import { SCAN_CROP_SPAN } from "@/lib/eye-tracker";
import { findEyeCircles, findLimbus, toGrey, type Circle } from "@/lib/limbus";
import { measureQuality } from "@/lib/photo-quality";
import { CROP_SPAN, eyeAspectRatio, LANDMARKS, measurePupil } from "@/lib/pupil";
import { fitEye } from "@/lib/pupil-fit";
import { IRIS_DIAMETER_MM } from "@/lib/reference";

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let facePromise: Promise<FaceLandmarker> | null = null;
let faceReady: FaceLandmarker | null = null;

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

export function faceModelNow() {
  if (!faceReady) loadFaceModel().catch(() => {});
  return faceReady;
}

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export type EyeFound = {
  method: "face-model" | "iris-search";
  iris: IrisGuess;
  corners: [Point, Point] | null;
  openness: number | null;
};

type Source = HTMLVideoElement | HTMLCanvasElement;
const sizeOf = (s: Source) => (s instanceof HTMLVideoElement ? { w: s.videoWidth, h: s.videoHeight } : { w: s.width, h: s.height });

const SEARCH_W = 200;

export type FindOptions = {
  near?: IrisGuess | null;
  scratch?: HTMLCanvasElement;
  region?: Box | null;
  faceModel?: boolean;
};

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

export function findEye(source: Source, opts: FindOptions = {}): EyeFound | null {
  const { w, h } = sizeOf(source);
  if (!w || !h) return null;
  const region = opts.region ?? { x: 0, y: 0, w, h };
  const near = opts.near ?? null;

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
        const target = near ?? { x: region.x + region.w / 2, y: region.y + region.h / 2, r: 0 };
        const eye = eyes.sort((a, b) => Math.hypot(a.iris.x - target.x, a.iris.y - target.y) - Math.hypot(b.iris.x - target.x, b.iris.y - target.y))[0];
        if (eye.iris.r < 4) return null;
        const sharper = around(eye.iris);
        return { method: "face-model", ...eye, iris: sharper ? fromSmall(sharper) : eye.iris };
      }
    } catch {
    }
  }

  const found = (near && around(near)) || findEyeCircles(g, { rMin: canvas.width * 0.05, rMax: canvas.width * 0.3 }).iris;
  return found ? { method: "iris-search", iris: fromSmall(found), corners: null, openness: null } : null;
}

export type EyeMeasure = EyeFound & {
  pupilR: number | null;
  pupilMm: number | null;
  pupilDarkness: number | null;
  contrast: number;
  glint: Point | null;
  redness: number | null;
  scleraBoxes: Box[];
  sharpness: number;
};

export function measureEye(source: Source, opts: FindOptions = {}): EyeMeasure | null {
  let eye = findEye(source, opts);
  let dark = false;
  if (!eye && source instanceof HTMLCanvasElement) {
    eye = findEye(enhanceEyePhoto(source).canvas, opts);
    dark = !!eye;
  }
  if (!eye) return null;
  const { x: cx, y: cy, r } = eye.iris;

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
  const pupilFound = !!reading && Number.isFinite(reading.pupilPx) && reading.pupilPx > irisPx * 0.1;
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
  let fittedPupilR: number | null = null;
  if (!pupilFound) {
    const wide = document.createElement("canvas");
    wide.width = wide.height = PRECISION_CROP;
    const wctx = wide.getContext("2d", { willReadFrequently: true });
    const wideHalf = r * SCAN_CROP_SPAN;
    if (wctx) {
      wctx.drawImage(source, cx - wideHalf, cy - wideHalf, wideHalf * 2, wideHalf * 2, 0, 0, PRECISION_CROP, PRECISION_CROP);
      const mid = PRECISION_CROP / 2;
      const fit = fitEye(wctx.getImageData(0, 0, PRECISION_CROP, PRECISION_CROP), { x: mid, y: mid, r: mid / SCAN_CROP_SPAN });
      if (fit.pupil && fit.polarity === 1 && fit.coverage >= 0.5) fittedPupilR = fit.pupil.r * ((wideHalf * 2) / PRECISION_CROP);
    }
  }
  const glint = reading ? findGlint(pixels, reading.irisPx) : null;
  const sharpness = measureQuality(pixels.data, PRECISION_CROP, PRECISION_CROP).sharpness;

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
    if (bright.length && bright[bright.length - 1].luma > 60) redness = Math.round((bright.reduce((t, v) => t + v.red, 0) / bright.length) * 100) / 100;
  }

  return {
    ...eye,
    pupilR: pupilFound ? reading!.pupilPx * toSource : fittedPupilR,
    pupilMm: pupilFound
      ? Math.round(((reading!.pupilPx * toSource) / r) * IRIS_DIAMETER_MM * 10) / 10
      : fittedPupilR !== null
        ? Math.round((fittedPupilR / r) * IRIS_DIAMETER_MM * 10) / 10
        : null,
    pupilDarkness: haze === null || dark ? null : Math.round(haze * 100),
    contrast: reading?.contrast ?? 0,
    glint: glint && { x: cx + (glint.x - PRECISION_CROP / 2) * toSource, y: cy + (glint.y - PRECISION_CROP / 2) * toSource },
    redness: dark ? null : redness,
    scleraBoxes: boxes,
    sharpness: Math.round(sharpness),
  };
}

export const MEASURE_BANDS = {
  pupilMm: { min: 1.5, max: 9 },
  darkness: { clear: 25, hazy: 40 },
  redness: { low: 0.15, high: 0.3 },
};

export function eyeSquare(source: Source, iris: IrisGuess, size = 96) {
  const side = iris.r * 5.6;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, iris.x - side / 2, iris.y - side / 2, side, side, 0, 0, size, size);
  return canvas;
}
