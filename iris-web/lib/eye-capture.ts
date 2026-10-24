import { enhanceEyePhoto, type EnhanceReport } from "@/lib/eye-enhance";
import { measureQuality, type QualityReport } from "@/lib/photo-quality";

/**
 * Turns the on-screen framing guide into a crop of the camera's own pixels. The crop is taken
 * from the full-resolution video frame and is only ever scaled down, never up, so the photo the
 * model sees has exactly the detail the camera captured.
 */

/** The framing guide, as shares of the camera view: centred, a bit above the middle. */
export const GUIDE = { width: 0.8, aspect: 0.62, centerY: 0.42 };

/** Longest side sent for analysis. Larger crops are scaled down (never up). */
export const MAX_SIDE = 1536;
export const JPEG_QUALITY = 0.9;

export type Rect = { x: number; y: number; w: number; h: number };

/** The guide box in view (CSS pixel) coordinates. */
export function guideRect(viewW: number, viewH: number): Rect {
  const w = viewW * GUIDE.width;
  const h = Math.min(w * GUIDE.aspect, viewH * 0.8);
  return { x: (viewW - w) / 2, y: viewH * GUIDE.centerY - h / 2, w, h };
}

/**
 * Maps a rectangle in the view to video pixels for a <video> shown with object-fit: cover.
 * `mirrored` is true when the preview is flipped (front camera), so the crop matches what the
 * person saw on screen.
 */
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

/** A view point (e.g. a tap) as a 0–1 point in the video frame, for `pointsOfInterest`. */
export function viewPointToVideo(px: number, py: number, viewW: number, viewH: number, videoW: number, videoH: number, mirrored = false) {
  const r = viewToVideo({ x: px, y: py, w: 0, h: 0 }, viewW, viewH, videoW, videoH, mirrored);
  return { x: Math.min(1, Math.max(0, r.x / videoW)), y: Math.min(1, Math.max(0, r.y / videoH)) };
}

export type CapturedPhoto = {
  dataUrl: string;
  /** The same photo brightened and sharpened on the phone (lib/eye-enhance.ts). */
  enhancedUrl: string;
  enhance: EnhanceReport;
  /** Sharpest of how many video frames (anti-blur burst), 1 for a single frame. */
  burst: number;
  /** Crop size in real camera pixels, before any scaling down. */
  cropW: number;
  cropH: number;
  /** Full camera frame size. */
  frameW: number;
  frameH: number;
  bytes: number;
  quality: QualityReport;
};

/** A full-resolution copy of the guide region of one video frame. */
export type GuideFrame = { canvas: HTMLCanvasElement; cropW: number; cropH: number; frameW: number; frameH: number };

/** Copies the guide region of the current video frame, at camera resolution (never enlarged). */
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
  // The saved photo is never mirrored: it shows the eye as it really is.
  ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH);
  return { canvas, cropW: Math.round(crop.w), cropH: Math.round(crop.h), frameW, frameH };
}

const bytesOf = (dataUrl: string) => Math.round(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);

/** Turns a grabbed frame into the photo that gets reviewed: quality check, JPEG, enhanced copy. */
export function photoFromFrame(frame: GuideFrame, burst = 1): CapturedPhoto {
  const { canvas } = frame;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const quality = measureQuality(pixels.data, canvas.width, canvas.height, Math.min(frame.cropW, frame.cropH));
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const enhanced = enhanceEyePhoto(canvas);
  const enhancedUrl = enhanced.canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return {
    dataUrl,
    enhancedUrl,
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

/** Grabs the guide region from the current video frame and checks its quality. */
export function captureGuide(video: HTMLVideoElement, viewW: number, viewH: number, mirrored: boolean): CapturedPhoto {
  return photoFromFrame(grabGuide(video, viewW, viewH, mirrored));
}

/**
 * How much the picture moved since the last sample: mean brightness change per pixel (0–255)
 * on the small 256 px copy. Above ~6 the phone or the eye is moving and the photo will smear.
 */
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

/** A quick look at the guide region for the live light and sharpness hints. */
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
