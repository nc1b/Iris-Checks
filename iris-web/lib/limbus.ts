/**
 * Finds the iris by its edge: the circle where the dark iris meets the bright white of the eye.
 *
 * This is Daugman's integro-differential operator, the standard way iris-recognition systems
 * find the iris: for each candidate centre, average the brightness around circles of growing
 * radius and look for the radius where it jumps up the most. Only the left and right arcs are
 * used, because eyelids cover the top and bottom of the iris.
 *
 * In a light (blue or grey) eye the pupil's edge can be a bigger jump than the iris edge, so a
 * found circle is checked for a larger circle around it with brighter white outside: if there
 * is one, the first circle was the pupil and the larger one is the iris.
 *
 * Pure functions on a greyscale array, so it runs (and is tested) without a browser.
 */

/** `data` is brightness; `white` is whiteness (see toGrey). */
export type Grey = { w: number; h: number; data: Float32Array; white: Float32Array };
export type Circle = { x: number; y: number; r: number; score: number };

/**
 * Two smoothed copies of RGBA pixels: brightness, and "whiteness" (the darkest of red, green and
 * blue). The white of the eye is bright in all three colours, while skin and a brown iris have
 * little blue, so whiteness separates the iris from the white of the eye even next to bright
 * skin. A blue iris next to a red, inflamed white differs in brightness instead, so both are used.
 */
export function toGrey(rgba: Uint8ClampedArray, w: number, h: number): Grey {
  const luma = new Float32Array(w * h);
  const white = new Float32Array(w * h);
  for (let p = 0, i = 0; p < luma.length; p++, i += 4) {
    luma[p] = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    white[p] = Math.min(rgba[i], rgba[i + 1], rgba[i + 2]);
  }
  return { w, h, data: smooth2(luma, w, h), white: smooth2(white, w, h) };
}

/** 3×3 box blur, twice. */
function smooth2(src: Float32Array, w: number, h: number) {
  let g = src;
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float32Array(g.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let n = 0;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
            s += g[yy * w + xx];
            n++;
          }
        }
        out[y * w + x] = s / n;
      }
    }
    g = out;
  }
  return g;
}

/** Left and right arcs, ±40° around horizontal. */
const ANGLES = (() => {
  const out: [number, number][] = [];
  for (const base of [0, 180]) for (let a = -40; a <= 40; a += 8) out.push([Math.cos(((base + a) * Math.PI) / 180), Math.sin(((base + a) * Math.PI) / 180)]);
  return out;
})();

function bilinear(g: Grey, d: Float32Array, x: number, y: number) {
  if (x < 0 || y < 0 || x > g.w - 1 || y > g.h - 1) return NaN;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(g.w - 1, x0 + 1);
  const y1 = Math.min(g.h - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const a = d[y0 * g.w + x0] * (1 - fx) + d[y0 * g.w + x1] * fx;
  const b = d[y1 * g.w + x0] * (1 - fx) + d[y1 * g.w + x1] * fx;
  return a * (1 - fy) + b * fy;
}

/** Mean brightness (or whiteness) on the side arcs of a circle; NaN if most of it is off the picture. */
function arcMean(g: Grey, cx: number, cy: number, r: number, d = g.data) {
  let s = 0;
  let n = 0;
  for (const [c, si] of ANGLES) {
    const v = bilinear(g, d, cx + r * c, cy + r * si);
    if (Number.isFinite(v)) {
      s += v;
      n++;
    }
  }
  return n >= ANGLES.length * 0.6 ? s / n : NaN;
}

/** The radius in [rMin, rMax] with the biggest dark-to-bright jump, for one centre. */
function bestRadius(g: Grey, cx: number, cy: number, rMin: number, rMax: number, growth = 1.04) {
  const radii: number[] = [];
  for (let r = rMin * 0.85; r <= rMax * 1.15; r *= growth) radii.push(r);
  const luma = radii.map((r) => arcMean(g, cx, cy, r));
  const white = radii.map((r) => arcMean(g, cx, cy, r, g.white));
  let best: { r: number; score: number } | null = null;
  // Compare about 8% inside with 8% outside (two steps of 4%), in brightness and whiteness.
  for (let k = 2; k < radii.length - 2; k++) {
    if (radii[k] < rMin || radii[k] > rMax) continue;
    const step = Math.max(luma[k + 2] - luma[k - 2], white[k + 2] - white[k - 2]);
    if (Number.isFinite(step) && (!best || step > best.score)) best = { r: radii[k], score: step };
  }
  return best;
}

export type LimbusOptions = {
  rMin: number;
  rMax: number;
  /** Search near this point (within `reach`); otherwise across the middle of the picture. */
  near?: { x: number; y: number } | null;
  reach?: number;
  /** Smallest jump (0–255) that counts as an iris edge. */
  minScore?: number;
};

function search(g: Grey, { rMin, rMax, near, reach }: LimbusOptions): Circle | null {
  const x0 = near ? near.x - (reach ?? rMax) : g.w * 0.12;
  const x1 = near ? near.x + (reach ?? rMax) : g.w * 0.88;
  const y0 = near ? near.y - (reach ?? rMax) : g.h * 0.12;
  const y1 = near ? near.y + (reach ?? rMax) : g.h * 0.88;
  const step = Math.max(1.5, rMin / 3);
  let best: Circle | null = null;
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const b = bestRadius(g, x, y, rMin, rMax);
      // Without a hint, centres near the middle are a little more likely (the eye is framed there).
      const prior = near ? 1 : 1 - 0.25 * Math.min(1, Math.hypot((x - g.w / 2) / g.w, (y - g.h / 2) / g.h) * 2);
      if (b && (!best || b.score * prior > best.score)) best = { x, y, r: b.r, score: b.score * prior };
    }
  }
  if (!best) return null;
  // Refine around the best centre at pixel steps and finer radii.
  let fine: Circle = best;
  for (let y = best.y - step; y <= best.y + step; y += 1) {
    for (let x = best.x - step; x <= best.x + step; x += 1) {
      const b = bestRadius(g, x, y, best.r * 0.88, best.r * 1.12, 1.015);
      if (b && b.score > fine.score) fine = { x, y, r: b.r, score: b.score };
    }
  }
  return fine;
}

/** Finds the iris edge. Returns null when nothing looks enough like one. */
export function findLimbus(g: Grey, opts: LimbusOptions): Circle | null {
  const first = search(g, opts);
  if (!first || first.score < (opts.minScore ?? 10)) return null;
  // Was that the pupil of a light eye? Look for a larger circle around it with brighter
  // surroundings (the white of the eye) and a clear jump of its own.
  if (first.r * 1.5 <= opts.rMax * 1.2) {
    const outer = search(g, { rMin: first.r * 1.5, rMax: Math.min(opts.rMax * 1.2, first.r * 3.6), near: first, reach: first.r * 0.3 });
    if (outer && outer.score >= first.score * 0.35) {
      // If the first circle was a pupil, the ring between the two circles is iris: about as
      // bright just outside the first circle as just inside the second, and clearly darker
      // than the white outside the second. Around a whole eye opening, it isn't.
      const outsideFirst = arcMean(g, first.x, first.y, first.r * 1.15);
      const insideOuter = arcMean(g, outer.x, outer.y, outer.r * 0.85);
      const outsideOuter = arcMean(g, outer.x, outer.y, outer.r * 1.15);
      if (Math.abs(insideOuter - outsideFirst) < 25 && outsideOuter > insideOuter + 15 && outsideOuter > outsideFirst + 8) return outer;
    }
  }
  return first;
}

/** All the way around (a pupil isn't covered by eyelids). */
const FULL = (() => {
  const out: [number, number][] = [];
  for (let a = 0; a < 360; a += 15) out.push([Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]);
  return out;
})();

/**
 * The pupil: the circle with the darkest inside and the biggest jump to brighter around it.
 * Reflections of lights (the brightest pixels) are skipped. Returns null when the pupil isn't
 * clearly darker than its surroundings, as with a grey or white (cataract) pupil.
 */
export function findPupil(g: Grey, { rMin, rMax, near, reach }: LimbusOptions): Circle | null {
  const sorted = Array.from(g.data).sort((a, b) => a - b);
  const dark = sorted[Math.floor(sorted.length * 0.12)] + 18;
  const glare = Math.max(170, sorted[Math.floor(sorted.length * 0.97)]);
  const ringMean = (cx: number, cy: number, r: number) => {
    let s = 0;
    let n = 0;
    for (const [c, si] of FULL) {
      const v = bilinear(g, g.data, cx + r * c, cy + r * si);
      if (Number.isFinite(v) && v < glare) {
        s += v;
        n++;
      }
    }
    return n >= FULL.length * 0.5 ? s / n : NaN;
  };
  const x0 = near ? near.x - (reach ?? rMax * 2) : g.w * 0.15;
  const x1 = near ? near.x + (reach ?? rMax * 2) : g.w * 0.85;
  const y0 = near ? near.y - (reach ?? rMax * 2) : g.h * 0.15;
  const y1 = near ? near.y + (reach ?? rMax * 2) : g.h * 0.85;
  const step = Math.max(1.5, rMin / 2);
  let best: Circle | null = null;
  const at = (x: number, y: number, lo: number, hi: number, growth: number) => {
    let top: Circle | null = null;
    const radii: number[] = [];
    for (let r = lo * 0.85; r <= hi * 1.15; r *= growth) radii.push(r);
    const prof = radii.map((r) => ringMean(x, y, r));
    for (let k = 2; k < radii.length - 2; k++) {
      if (radii[k] < lo || radii[k] > hi || !(prof[k - 2] < dark)) continue;
      const s = prof[k + 2] - prof[k - 2];
      if (Number.isFinite(s) && (!top || s > top.score)) top = { x, y, r: radii[k], score: s };
    }
    return top;
  };
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const c = at(x, y, rMin, rMax, 1.06);
      if (c && (!best || c.score > best.score)) best = c;
    }
  }
  if (!best) return null;
  let fine = best;
  for (let y = best.y - step; y <= best.y + step; y += 1) {
    for (let x = best.x - step; x <= best.x + step; x += 1) {
      const c = at(x, y, best.r * 0.85, best.r * 1.15, 1.02);
      if (c && c.score > fine.score) fine = c;
    }
  }
  return fine.score >= 15 ? fine : null;
}

/** Half-size copy (2×2 averages) for a fast first pass. */
export function halve(g: Grey): Grey {
  const w = Math.floor(g.w / 2);
  const h = Math.floor(g.h / 2);
  const shrink = (src: Float32Array) => {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = 2 * y * g.w + 2 * x;
        out[y * w + x] = (src[i] + src[i + 1] + src[i + g.w] + src[i + g.w + 1]) / 4;
      }
    }
    return out;
  };
  return { w, h, data: shrink(g.data), white: shrink(g.white) };
}

const scaleCircle = (c: Circle | null, k: number): Circle | null => c && { x: c.x * k, y: c.y * k, r: c.r * k, score: c.score };

/**
 * The iris and pupil, the way iris-recognition systems do it: first the darkest round spot,
 * then a larger circle around it with a jump to brighter. Which one is the iris?
 * - In a brown eye the whole iris is dark, so the dark spot is the iris; just outside it is the
 *   white of the eye, the whitest thing there, and the larger circle is only the eye's outline.
 * - In a light eye the dark spot is the pupil; just outside it is coloured iris, and the larger
 *   circle has the white of the eye outside it.
 * If no dark spot stands out (a grey or white cataract pupil), the iris edge is searched alone.
 * `rMin`/`rMax` are for the iris. Runs a first pass at half size, then refines.
 */
export function findEyeCircles(g: Grey, opts: LimbusOptions): { iris: Circle | null; pupil: Circle | null } {
  const small = halve(g);
  const half = (o: LimbusOptions): LimbusOptions => ({ ...o, rMin: o.rMin / 2, rMax: o.rMax / 2, near: o.near && { x: o.near.x / 2, y: o.near.y / 2 }, reach: o.reach && o.reach / 2 });
  // Darkest round spot: could be a pupil (light eye) or the whole iris (brown eye).
  const coarseDark = findPupil(small, half({ ...opts, rMin: Math.max(1.5, opts.rMin * 0.2), rMax: opts.rMax }));
  const dark = coarseDark && refinePupil(g, scaleCircle(coarseDark, 2)!);
  if (dark) {
    const outer = findLimbus(g, { rMin: dark.r * 1.4, rMax: Math.min(dark.r * 4.5, opts.rMax * 1.2), near: dark, reach: dark.r * 0.3, minScore: opts.minScore });
    if (outer && outer.r <= opts.rMax * 1.2) {
      const nearDark = band(g, dark);
      const nearOuter = band(g, outer);
      // A light eye: outside the larger circle is the white of the eye (bright and colourless,
      // unlike skin), and between the circles is coloured iris, or a grey iris clearly (35%)
      // darker than that white. A wide-open brown eye has white on both sides of the iris and
      // further out too, so "a little darker" isn't enough.
      // Compared with each other, not absolutely: warm room light tints the white of the eye too.
      const whiteOutside = nearOuter.sat < 0.28;
      const irisBetween = nearDark.sat >= nearOuter.sat + 0.1 || nearOuter.luma > nearDark.luma * 1.35;
      if (whiteOutside && irisBetween) return { iris: outer, pupil: dark };
    }
    if (dark.r >= opts.rMin * 0.8 && dark.r <= opts.rMax) return { iris: dark, pupil: null };
  }
  return { iris: scaleCircle(findLimbus(small, half(opts)), 2), pupil: null };
}

/**
 * The band just outside a circle (side arcs, 112–130% of its radius): how colourful its most
 * colourless quarter is (0 = grey or white), and how bright its brighter quarter is. The white
 * of the eye is bright and colourless; eyelids covering part of the band don't change these.
 */
function band(g: Grey, c: Circle) {
  const sats: number[] = [];
  const lumas: number[] = [];
  for (const k of [1.12, 1.21, 1.3]) {
    for (const [co, si] of ANGLES) {
      const l = bilinear(g, g.data, c.x + c.r * k * co, c.y + c.r * k * si);
      const w = bilinear(g, g.white, c.x + c.r * k * co, c.y + c.r * k * si);
      if (!Number.isFinite(l) || l < 1) continue;
      lumas.push(l);
      sats.push(Math.max(0, 1 - w / l));
    }
  }
  if (sats.length < 6) return { sat: 1, luma: 0 };
  sats.sort((a, b) => a - b);
  lumas.sort((a, b) => a - b);
  return { sat: sats[Math.floor(sats.length * 0.25)], luma: lumas[Math.floor(lumas.length * 0.75)] };
}

/** Sharpens a pupil (or dark iris) circle found at half size, at full size. */
function refinePupil(g: Grey, c: Circle): Circle | null {
  return findPupil(g, { rMin: c.r * 0.85, rMax: c.r * 1.15, near: c, reach: 2 });
}
