/**
 * Finds the iris in a camera frame without a face model.
 *
 * MediaPipe's face mesh needs most of the face in view. Close up (about 15 cm), only one eye
 * fills the frame, so it often loses the face or guesses an eye position next to the real one.
 * This search looks for what an iris is in any photo: a dark disc with brighter white of the eye
 * and skin around it. It runs on a small greyscale copy of the frame with an integral image,
 * so each candidate costs a few additions, and it only searches near where the eye should be
 * (the face model's guess, the last lock, or the on-screen ring).
 */

export type IrisGuess = { x: number; y: number; r: number };
export type IrisFound = IrisGuess & { score: number };

/** Width of the greyscale copy the search runs on. */
export const SEARCH_WIDTH = 320;
/** Surround minus iris brightness (0–255) needed to call it an iris. */
export const MIN_IRIS_SCORE = 18;

export type GreyFrame = { w: number; h: number; scale: number; sum: Float64Array };

/** A small greyscale copy of the video frame with its integral image (for fast box sums). */
export function greyFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): GreyFrame | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const scale = SEARCH_WIDTH / vw;
  const w = SEARCH_WIDTH;
  const h = Math.max(1, Math.round(vh * scale));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  return integrate(ctx.getImageData(0, 0, w, h).data, w, h, scale);
}

/** Integral image of the brightness, (w+1)×(h+1). */
export function integrate(data: Uint8ClampedArray, w: number, h: number, scale = 1): GreyFrame {
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      row += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
    }
  }
  return { w, h, scale, sum };
}

/** Mean brightness of the box with centre (x, y) and half-size a, clipped to the frame. */
function boxMean(f: GreyFrame, x: number, y: number, a: number) {
  const x0 = Math.max(0, Math.round(x - a));
  const y0 = Math.max(0, Math.round(y - a));
  const x1 = Math.min(f.w, Math.round(x + a));
  const y1 = Math.min(f.h, Math.round(y + a));
  if (x1 <= x0 || y1 <= y0) return { sum: 0, n: 0 };
  const W = f.w + 1;
  const s = f.sum[y1 * W + x1] - f.sum[y0 * W + x1] - f.sum[y1 * W + x0] + f.sum[y0 * W + x0];
  return { sum: s, n: (x1 - x0) * (y1 - y0) };
}

/**
 * How iris-like the disc (x, y, r) is: how much brighter the white of the eye on both sides is
 * than the inside of the disc. Both sides must be bright, which rules out an eyebrow or lashes
 * (dark to the left and right too) and a pupil inside a light iris (iris to the sides, not
 * white). Boxes stand in for circles: the inner box fits inside the iris.
 */
function irisScore(f: GreyFrame, x: number, y: number, r: number) {
  const inner = boxMean(f, x, y, r * 0.7);
  const left = boxMean(f, x - r * 1.35, y, r * 0.22);
  const right = boxMean(f, x + r * 1.35, y, r * 0.22);
  if (inner.n === 0 || left.n === 0 || right.n === 0) return -Infinity;
  return Math.min(left.sum / left.n, right.sum / right.n) - inner.sum / inner.n;
}

/**
 * Searches around `guess` (video pixels) for the most iris-like disc, within `reach` video
 * pixels of the guess and radii `radii` times the guessed radius. Returns null if nothing
 * looks enough like an iris.
 */
export function findIris(f: GreyFrame, guess: IrisGuess, reach: number, radii = [0.8, 0.9, 1, 1.12, 1.25]): IrisFound | null {
  const s = f.scale;
  const gx = guess.x * s;
  const gy = guess.y * s;
  const r0 = Math.max(3, guess.r * s);
  const R = Math.max(r0 * 0.5, reach * s);
  let best: IrisFound | null = null;
  for (const k of radii) {
    const r = r0 * k;
    if (r < 3) continue;
    const step = Math.max(1, r / 5);
    for (let y = gy - R; y <= gy + R; y += step) {
      for (let x = gx - R; x <= gx + R; x += step) {
        // The whole iris must be in the frame.
        if (x - r * 1.6 < 0 || y - r < 0 || x + r * 1.6 > f.w || y + r > f.h) continue;
        // A pupil inside a light iris can look as disc-like as the iris itself: when they
        // score alike, the larger disc (the iris) wins.
        const score = irisScore(f, x, y, r) * Math.pow(k, 0.25);
        if (!best || score > best.score) best = { x, y, r, score };
      }
    }
  }
  if (!best || best.score < MIN_IRIS_SCORE) return null;
  return { x: best.x / s, y: best.y / s, r: best.r / s, score: best.score };
}
