import { enhanceEyePhoto, type EnhanceReport } from "@/lib/eye-enhance";
import { eyeSquare, measureEye, type EyeMeasure } from "@/lib/eye-locate";
import { measureQuality, type QualityReport } from "@/lib/photo-quality";

export const GUIDE = { width: 0.8, aspect: 0.62, centerY: 0.42 };

export const MAX_SIDE = 1536;
export const JPEG_QUALITY = 0.9;

export type Rect = { x: number; y: number; w: number; h: number };

export function guideRect(viewW: number, viewH: number): Rect {
  const w = viewW * GUIDE.width;
  const h = Math.min(w * GUIDE.aspect, viewH * 0.8);
  return { x: (viewW - w) / 2, y: viewH * GUIDE.centerY - h / 2, w, h };
}

export function viewToVideo(r: Rect, viewW: number, viewH: number, videoW: number, videoH: number, mirrored = false): Rect {
  const scale = Math.max(viewW / videoW, viewH / videoH);
  const ox = (viewW - videoW * scale) / 2;
  const oy = (viewH - videoH * scale) / 2;
  const left = mirrored ? viewW - (r.x + r.w) : r.x;
  const x = Math.max(0, (left - ox) / scale);
  const y = Math.max(0, (r.y - oy) / scale);
  const w = Math.min(videoW - x, r.w / scale);
  const h = Math.min(videoH - y, r.h / scale);
  return { x, y, w, h };
}

export function viewPointToVideo(px: number, py: number, viewW: number, viewH: number, videoW: number, videoH: number, mirrored = false) {
  const r = viewToVideo({ x: px, y: py, w: 0, h: 0 }, viewW, viewH, videoW, videoH, mirrored);
  return { x: Math.min(1, Math.max(0, r.x / videoW)), y: Math.min(1, Math.max(0, r.y / videoH)) };
}

export type CapturedPhoto = {
  dataUrl: string;
  enhancedUrl: string;
  enhance: EnhanceReport;
  burst: number;
  eye: EyeMeasure | null;
  photoW: number;
  photoH: number;
  eyeCanvas: HTMLCanvasElement | null;
  cropW: number;
  cropH: number;
  frameW: number;
  frameH: number;
  bytes: number;
  quality: QualityReport;
};

export type GuideFrame = { canvas: HTMLCanvasElement; cropW: number; cropH: number; frameW: number; frameH: number; crop: Rect; scale: number };

export function grabGuide(video: HTMLVideoElement, viewW: number, viewH: number, mirrored: boolean, into?: HTMLCanvasElement): GuideFrame {
  const frameW = video.videoWidth;
  const frameH = video.videoHeight;
  const crop = viewToVideo(guideRect(viewW, viewH), viewW, viewH, frameW, frameH, mirrored);
  const scale = Math.min(1, MAX_SIDE / Math.max(crop.w, crop.h));
  const outW = Math.max(1, Math.round(crop.w * scale));
  const outH = Math.max(1, Math.round(crop.h * scale));
  const canvas = into ?? document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
  return { canvas, cropW: Math.round(crop.w), cropH: Math.round(crop.h), frameW, frameH, crop, scale: outW / crop.w };
}

const bytesOf = (dataUrl: string) => Math.round(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

export function photoFromFrame(frame: GuideFrame, burst = 1, eyeHint: { x: number; y: number; r: number } | null = null): CapturedPhoto {
  const { canvas } = frame;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const quality = measureQuality(pixels.data, canvas.width, canvas.height, Math.min(frame.cropW, frame.cropH));
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const enhanced = enhanceEyePhoto(canvas);
  const enhancedUrl = enhanced.canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const near = eyeHint && { x: (eyeHint.x - frame.crop.x) * frame.scale, y: (eyeHint.y - frame.crop.y) * frame.scale, r: eyeHint.r * frame.scale };
  const eye = measureEye(canvas, { near });
  return {
    dataUrl,
    enhancedUrl,
    eye,
    photoW: canvas.width,
    photoH: canvas.height,
    eyeCanvas: eye ? eyeSquare(canvas, eye.iris) : null,
    enhance: enhanced.report,
    burst,
    cropW: frame.cropW,
    cropH: frame.cropH,
    frameW: frame.frameW,
    frameH: frame.frameH,
    bytes: bytesOf(dataUrl),
    quality,
  };
}

export function captureGuide(video: HTMLVideoElement, viewW: number, viewH: number, mirrored: boolean): CapturedPhoto {
  return photoFromFrame(grabGuide(video, viewW, viewH, mirrored));
}

export function motionBetween(a: Uint8ClampedArray | null, b: Uint8ClampedArray): number | null {
  if (!a || a.length !== b.length) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < b.length; i += 16) {
    sum += Math.abs(0.299 * (a[i] - b[i]) + 0.587 * (a[i + 1] - b[i + 1]) + 0.114 * (a[i + 2] - b[i + 2]));
    n++;
  }
  return n ? sum / n : null;
}

export function sampleGuide(
  video: HTMLVideoElement,
  viewW: number,
  viewH: number,
  mirrored: boolean,
  canvas: HTMLCanvasElement,
): (QualityReport & { pixels: Uint8ClampedArray }) | null {
  if (!video.videoWidth) return null;
  const crop = viewToVideo(guideRect(viewW, viewH), viewW, viewH, video.videoWidth, video.videoHeight, mirrored);
  const w = 256;
  const h = Math.max(8, Math.round((crop.h / crop.w) * w));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h).data;
  return { ...measureQuality(pixels, w, h, Math.round(Math.min(crop.w, crop.h))), pixels };
}
