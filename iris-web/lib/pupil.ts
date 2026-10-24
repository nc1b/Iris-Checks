/**
 * Pupil measurement from a small crop centred on the iris.
 *
 * MediaPipe gives us the iris centre and radius. Inside the iris we look for the
 * dark pupil: sample the brightness along horizontal-ish rays from the centre and
 * find where it rises from "pupil dark" to "iris". Rays near vertical are skipped
 * because eyelids cover the top and bottom of the iris.
 */

export const CROP_SIZE = 96;
/** The crop spans this many iris radii from the centre to the edge. */
export const CROP_SPAN = 1.2;

export type PupilReading = {
  /** Pupil radius in crop pixels. */
  pupilPx: number;
  /** Iris radius in crop pixels (fixed by the crop geometry). */
  irisPx: number;
  /** Iris brightness minus pupil brightness (0–255). Low = hard to see the pupil. */
  contrast: number;
  /** Fraction of rays that found an edge. */
  coverage: number;
  /**
   * How well lit the eye area is (0–255): the brightness of its brighter parts (white of the
   * eye, lids). Not the iris itself, which is naturally dark in brown eyes.
   */
  irisLevel: number;
};

function luminance(data: Uint8ClampedArray, i: number) {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

function median(values: number[]) {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

export function measurePupil(img: ImageData): PupilReading | null {
  const { width, height, data } = img;
  const cx = width / 2;
  const cy = height / 2;
  const irisPx = width / 2 / CROP_SPAN;

  // Brightness (luma) and the red channel. Brown irises reflect much more red than green,
  // so in dim light the red channel often shows the dark pupil far more clearly.
  const luma = new Float32Array(width * height);
  const red = new Float32Array(width * height);
  for (let p = 0, i = 0; p < luma.length; p++, i += 4) {
    luma[p] = luminance(data, i);
    red[p] = data[i];
  }

  // Pupil level: darkest part of the central disc. Iris level: the outer ring.
  const levels = (lum: Float32Array) => {
    const core: number[] = [];
    const ring: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const r = Math.hypot(x - cx, y - cy) / irisPx;
        const v = lum[y * width + x];
        if (r < 0.5) core.push(v);
        else if (r > 0.72 && r < 0.92 && Math.abs(y - cy) < irisPx * 0.55) ring.push(v);
      }
    }
    core.sort((a, b) => a - b);
    const pupilLevel = percentile(core, 0.08);
    const irisLevel = median(ring);
    return { pupilLevel, irisLevel, contrast: irisLevel - pupilLevel };
  };
  const byLuma = levels(luma);
  const byRed = levels(red);
  // Prefer the red channel only when it clearly separates pupil and iris better.
  const useRed = Number.isFinite(byRed.contrast) && byRed.contrast > (Number.isFinite(byLuma.contrast) ? byLuma.contrast * 1.15 : 0);
  const lum = useRed ? red : luma;
  const { pupilLevel, irisLevel, contrast } = useRed ? byRed : byLuma;
  const irisLight = percentile([...luma].sort((a, b) => a - b), 0.9) || 0;

  if (!Number.isFinite(contrast) || contrast < 6) {
    return { pupilPx: NaN, irisPx, contrast: Number.isFinite(contrast) ? contrast : 0, coverage: 0, irisLevel: irisLight };
  }

  // Smooth twice (3×3) so sensor noise in a dark iris doesn't look like an edge.
  const smooth = boxBlur(boxBlur(lum, width, height), width, height);
  // Reflections of the screen or a lamp sit on the pupil and iris. Mask them, with a margin,
  // so their blurred edges aren't mistaken for the pupil's edge.
  const glare = new Uint8Array(width * height);
  const bright = irisLevel + Math.max(25, contrast * 0.8);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (lum[y * width + x] <= bright) continue;
      for (let yy = Math.max(0, y - GLARE_MARGIN); yy <= Math.min(height - 1, y + GLARE_MARGIN); yy++) {
        for (let xx = Math.max(0, x - GLARE_MARGIN); xx <= Math.min(width - 1, x + GLARE_MARGIN); xx++) glare[yy * width + xx] = 1;
      }
    }
  }
  const sample = (x: number, y: number) => {
    const xi = Math.min(width - 1, Math.max(0, Math.round(x)));
    const yi = Math.min(height - 1, Math.max(0, Math.round(y)));
    const i = yi * width + xi;
    return glare[i] ? NaN : smooth[i];
  };

  // Along each ray, the pupil edge is where brightness rises the most (dark pupil → iris),
  // not just the first pixel past a threshold, which noise in a dark iris trips straight away.
  const rMin = Math.max(3, irisPx * 0.15);
  const rMax = irisPx * 0.85;
  const minStep = Math.max(2.5, contrast * 0.2);
  const darkInside = pupilLevel + contrast * 0.65;
  const radii: number[] = [];
  let rays = 0;
  // Angles within ±60° of horizontal, on both sides (eyelids cover the top and bottom).
  for (const base of [0, Math.PI]) {
    for (let a = -60; a <= 60; a += 8) {
      rays++;
      const ang = base + (a * Math.PI) / 180;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const profile: number[] = [];
      for (let r = 0; r <= rMax + 4; r++) profile.push(sample(cx + dx * r, cy + dy * r));
      const meanOf = (from: number, to: number) => {
        let s = 0;
        let n = 0;
        for (let k = from; k <= to; k++) {
          if (!Number.isFinite(profile[k])) continue;
          s += profile[k];
          n++;
        }
        return n >= 2 ? s / n : NaN;
      };
      let best = -Infinity;
      let bestR = NaN;
      for (let r = Math.ceil(rMin); r <= rMax; r++) {
        // Look 3 px either side; across a masked reflection, look up to 6 px.
        const inside = Number.isFinite(meanOf(r - 3, r - 1)) ? meanOf(r - 3, r - 1) : meanOf(r - 6, r - 1);
        const outside = Number.isFinite(meanOf(r + 1, r + 3)) ? meanOf(r + 1, r + 3) : meanOf(r + 1, r + 6);
        const step = outside - inside;
        if (Number.isFinite(step) && step > best && inside <= darkInside) {
          best = step;
          bestR = r;
        }
      }
      if (best >= minStep) radii.push(bestR);
    }
  }

  // Keep the rays that agree with the majority (within 20% of the median).
  const mid = median(radii);
  const agreeing = radii.filter((r) => Math.abs(r - mid) <= mid * 0.2);
  const coverage = agreeing.length / rays;
  const pupilPx = median(agreeing);
  // Too few rays agree, or a size no real pupil has (under 15% or over 82% of the iris).
  if (agreeing.length < rays * 0.35 || pupilPx < irisPx * 0.15 || pupilPx > irisPx * 0.82) return { pupilPx: NaN, irisPx, contrast, coverage, irisLevel: irisLight };
  return { pupilPx, irisPx, contrast, coverage, irisLevel: irisLight };
}

/** Pixels around a reflection that are also ignored (its blurred edge). */
const GLARE_MARGIN = 2;

/** 3×3 box blur. */
function boxBlur(src: Float32Array, w: number, h: number) {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      let n = 0;
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
          s += src[yy * w + xx];
          n++;
        }
      }
      out[y * w + x] = s / n;
    }
  }
  return out;
}

/** Eye aspect ratio from MediaPipe face mesh landmarks (blink detection). */
export function eyeAspectRatio(
  lm: { x: number; y: number }[],
  upper: number,
  lower: number,
  inner: number,
  outer: number,
  aspect: number,
) {
  const v = Math.hypot((lm[upper].x - lm[lower].x) * aspect, lm[upper].y - lm[lower].y);
  const h = Math.hypot((lm[inner].x - lm[outer].x) * aspect, lm[inner].y - lm[outer].y);
  return h > 0 ? v / h : 0;
}

/** MediaPipe face mesh indices (478-point model with iris refinement). */
export const LANDMARKS = {
  left: { irisCenter: 468, iris: [469, 470, 471, 472], upper: 159, lower: 145, inner: 133, outer: 33 },
  right: { irisCenter: 473, iris: [474, 475, 476, 477], upper: 386, lower: 374, inner: 362, outer: 263 },
} as const;
