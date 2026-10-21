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

  const lum = new Float32Array(width * height);
  for (let p = 0, i = 0; p < lum.length; p++, i += 4) lum[p] = luminance(data, i);

  const at = (x: number, y: number) => {
    const xi = Math.min(width - 1, Math.max(0, Math.round(x)));
    const yi = Math.min(height - 1, Math.max(0, Math.round(y)));
    return lum[yi * width + xi];
  };

  // Pupil level: darkest part of the central disc. Iris level: the outer ring.
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
  const contrast = irisLevel - pupilLevel;
  if (!Number.isFinite(contrast) || contrast < 6) {
    return { pupilPx: NaN, irisPx, contrast: Number.isFinite(contrast) ? contrast : 0, coverage: 0 };
  }

  const threshold = pupilLevel + 0.5 * contrast;
  const highlight = Math.max(200, irisLevel + 1.6 * contrast);

  const radii: number[] = [];
  let rays = 0;
  const maxR = irisPx * 0.92;
  // Angles within ±50° of horizontal, on both sides.
  for (const base of [0, Math.PI]) {
    for (let a = -50; a <= 50; a += 10) {
      rays++;
      const ang = base + (a * Math.PI) / 180;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      let run = 0;
      for (let r = 1; r < maxR; r += 0.5) {
        const v = at(cx + dx * r, cy + dy * r);
        // Specular highlights sit on the pupil: treat them as pupil, not as an edge.
        if (v > threshold && v < highlight) {
          run++;
          if (run >= 3) {
            radii.push(r - 1);
            break;
          }
        } else {
          run = 0;
        }
      }
    }
  }

  if (radii.length < rays * 0.4) {
    return { pupilPx: NaN, irisPx, contrast, coverage: radii.length / rays };
  }
  return { pupilPx: median(radii), irisPx, contrast, coverage: radii.length / rays };
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
