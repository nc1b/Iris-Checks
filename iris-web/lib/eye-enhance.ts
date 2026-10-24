/**
 * Enhances an eye photo on the phone so the AI can see structure (the pupil edge, lens haze)
 * in a dim or soft photo. Classic image processing only, never a generative "AI upscaler":
 * those invent detail, and an invented grey patch on a pupil would look like a cataract.
 *
 * 1. Light: stretch the brightness between the 1st and 99th percentile, with a gamma lift for
 *    dark photos. Applied to brightness only, so the colours keep their balance (redness and a
 *    yellow tint still read the same).
 * 2. Detail: a gentle unsharp mask that skips flat areas, so it sharpens edges without boosting
 *    sensor noise.
 *
 * The original photo is always kept and sent too; the AI judges colour from the original.
 */

export type EnhanceReport = { gain: number; gamma: number; sharpen: number };

export const ENHANCE = {
  /** Never brighten more than this many times, to avoid amplifying noise. */
  maxGain: 2.6,
  /** Target average brightness (0–255) for the gamma lift. */
  targetMean: 118,
  sharpenAmount: 0.6,
  /** Edges weaker than this (0–255) are left alone (noise). */
  sharpenThreshold: 4,
};

const lumaOf = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Enhances `source` in place-safe fashion and returns a new canvas plus what was applied. */
export function enhanceEyePhoto(source: HTMLCanvasElement): { canvas: HTMLCanvasElement; report: EnhanceReport } {
  const { width: w, height: h } = source;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const report = enhancePixels(img.data, w, h);
  ctx.putImageData(img, 0, 0);
  return { canvas, report };
}

/** The pixel work, separate from the canvas so it can be tested on plain arrays. */
export function enhancePixels(d: Uint8ClampedArray, w: number, h: number): EnhanceReport {
  const n = w * h;
  const luma = new Float32Array(n);
  const hist = new Uint32Array(256);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const v = lumaOf(d, i);
    luma[p] = v;
    hist[Math.min(255, Math.round(v))]++;
  }
  const level = (q: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= q * n) return v;
    }
    return 255;
  };
  const lo = level(0.01);
  const hi = Math.max(lo + 32, level(0.99));
  const gain = Math.min(ENHANCE.maxGain, 255 / (hi - lo));
  // Mean after the stretch, for the gamma lift.
  let mean = 0;
  for (let p = 0; p < n; p++) mean += Math.min(1, Math.max(0, ((luma[p] - lo) * gain) / 255));
  mean /= n;
  const gamma = mean > 0.02 && mean < ENHANCE.targetMean / 255 ? Math.max(0.55, Math.log(ENHANCE.targetMean / 255) / Math.log(mean)) : 1;

  // New brightness for each pixel.
  const out = new Float32Array(n);
  for (let p = 0; p < n; p++) out[p] = 255 * Math.pow(Math.min(1, Math.max(0, ((luma[p] - lo) * gain) / 255)), gamma);

  // Unsharp mask on brightness: 3×3 box blur, then add back the difference on real edges.
  const sharpened = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        sharpened[p] = out[p];
        continue;
      }
      const blur = (out[p - w - 1] + out[p - w] + out[p - w + 1] + out[p - 1] + out[p] + out[p + 1] + out[p + w - 1] + out[p + w] + out[p + w + 1]) / 9;
      const diff = out[p] - blur;
      sharpened[p] = Math.abs(diff) > ENHANCE.sharpenThreshold ? out[p] + ENHANCE.sharpenAmount * diff : out[p];
    }
  }

  // Scale each pixel's colour by its brightness change, keeping hue and saturation.
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const before = Math.max(1, luma[p]);
    // Capped so near-black pixels don't turn into coloured noise.
    const k = Math.min(4, Math.max(0, sharpened[p]) / before);
    d[i] = Math.min(255, d[i] * k);
    d[i + 1] = Math.min(255, d[i + 1] * k);
    d[i + 2] = Math.min(255, d[i + 2] * k);
  }
  return { gain: Math.round(gain * 100) / 100, gamma: Math.round(gamma * 100) / 100, sharpen: ENHANCE.sharpenAmount };
}
