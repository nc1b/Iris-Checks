export const CROP_SIZE = 96;
export const CROP_SPAN = 1.2;

export type PupilReading = {
  pupilPx: number;
  irisPx: number;
  contrast: number;
  coverage: number;
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

  const luma = new Float32Array(width * height);
  const red = new Float32Array(width * height);
  for (let p = 0, i = 0; p < luma.length; p++, i += 4) {
    luma[p] = luminance(data, i);
    red[p] = data[i];
  }

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
  const useRed = Number.isFinite(byRed.contrast) && byRed.contrast > (Number.isFinite(byLuma.contrast) ? byLuma.contrast * 1.15 : 0);
  const lum = useRed ? red : luma;
  const { pupilLevel, irisLevel, contrast } = useRed ? byRed : byLuma;
  const irisLight = percentile([...luma].sort((a, b) => a - b), 0.9) || 0;

  if (!Number.isFinite(contrast) || contrast < 6) {
    return { pupilPx: NaN, irisPx, contrast: Number.isFinite(contrast) ? contrast : 0, coverage: 0, irisLevel: irisLight };
  }

  const smooth = boxBlur(boxBlur(lum, width, height), width, height);
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

  const rMin = Math.max(3, irisPx * 0.15);
  const rMax = irisPx * 0.85;
  const minStep = Math.max(2.5, contrast * 0.2);
  const darkInside = pupilLevel + contrast * 0.65;
  const radii: number[] = [];
  let rays = 0;
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

  const mid = median(radii);
  const agreeing = radii.filter((r) => Math.abs(r - mid) <= mid * 0.2);
  const coverage = agreeing.length / rays;
  const pupilPx = median(agreeing);
  if (agreeing.length < rays * 0.35 || pupilPx < irisPx * 0.15 || pupilPx > irisPx * 0.82) return { pupilPx: NaN, irisPx, contrast, coverage, irisLevel: irisLight };
  return { pupilPx, irisPx, contrast, coverage, irisLevel: irisLight };
}

const GLARE_MARGIN = 2;

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

export const LANDMARKS = {
  left: { irisCenter: 468, iris: [469, 470, 471, 472], upper: 159, lower: 145, inner: 133, outer: 33 },
  right: { irisCenter: 473, iris: [474, 475, 476, 477], upper: 386, lower: 374, inner: 362, outer: 263 },
} as const;
