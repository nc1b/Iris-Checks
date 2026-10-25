export type Circle = { x: number; y: number; r: number };

export type EyeFit = {
  iris: Circle | null;
  pupil: Circle | null;
  contrast: number;
  coverage: number;
  light: number;
  haze: number | null;
  polarity: 1 | -1 | 0;
};

const RAYS = 36;
const RAY_DIRS = Array.from({ length: RAYS }, (_, k) => [Math.cos((k * 2 * Math.PI) / RAYS), Math.sin((k * 2 * Math.PI) / RAYS)] as const);
const SIDE_DIRS = (() => {
  const out: (readonly [number, number])[] = [];
  for (const base of [0, Math.PI]) for (let a = -50; a <= 50; a += 10) out.push([Math.cos(base + (a * Math.PI) / 180), Math.sin(base + (a * Math.PI) / 180)]);
  return out;
})();

type Planes = { w: number; h: number; luma: Float32Array; red: Float32Array; white: Float32Array; raw: Float32Array; glare: Uint8Array };

function blur(src: Float32Array, w: number, h: number, tmp: Float32Array) {
  for (let y = 0; y < h; y++) {
    const o = y * w;
    tmp[o] = (src[o] * 2 + src[o + 1]) / 3;
    for (let x = 1; x < w - 1; x++) tmp[o + x] = (src[o + x - 1] + src[o + x] + src[o + x + 1]) / 3;
    tmp[o + w - 1] = (src[o + w - 2] + src[o + w - 1] * 2) / 3;
  }
  for (let x = 0; x < w; x++) {
    src[x] = (tmp[x] * 2 + tmp[x + w]) / 3;
    for (let y = 1; y < h - 1; y++) src[y * w + x] = (tmp[(y - 1) * w + x] + tmp[y * w + x] + tmp[(y + 1) * w + x]) / 3;
    src[(h - 1) * w + x] = (tmp[(h - 2) * w + x] + tmp[(h - 1) * w + x] * 2) / 3;
  }
}

function planes(img: ImageData): Planes {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const luma = new Float32Array(n);
  const red = new Float32Array(n);
  const white = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    luma[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    red[p] = r;
    white[p] = r < g ? (r < b ? r : b) : g < b ? g : b;
  }
  const raw = luma.slice();
  const tmp = new Float32Array(n);
  for (const ch of [luma, red, white]) blur(ch, w, h, tmp);
  return { w, h, luma, red, white, raw, glare: new Uint8Array(n) };
}

const GROW = 3;

function markGlare(P: Planes, threshold: number, area: Circle) {
  const { w, h, raw, glare } = P;
  const row = new Uint8Array(w * h);
  for (let y = Math.max(0, Math.floor(area.y - area.r)); y <= Math.min(h - 1, Math.ceil(area.y + area.r)); y++) {
    for (let x = Math.max(0, Math.floor(area.x - area.r)); x <= Math.min(w - 1, Math.ceil(area.x + area.r)); x++) {
      if (raw[y * w + x] < threshold || (x - area.x) ** 2 + (y - area.y) ** 2 > area.r * area.r) continue;
      for (let xx = Math.max(0, x - GROW); xx <= Math.min(w - 1, x + GROW); xx++) row[y * w + xx] = 1;
    }
  }
  glare.fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!row[y * w + x]) continue;
      for (let yy = Math.max(0, y - GROW); yy <= Math.min(h - 1, y + GROW); yy++) glare[yy * w + x] = 1;
    }
  }
}

function at(P: Planes, ch: Float32Array, x: number, y: number) {
  if (x < 0 || y < 0 || x > P.w - 1.001 || y > P.h - 1.001) return NaN;
  const x0 = x | 0;
  const y0 = y | 0;
  const i = y0 * P.w + x0;
  if (P.glare[i] || P.glare[i + 1] || P.glare[i + P.w] || P.glare[i + P.w + 1]) return NaN;
  const fx = x - x0;
  const fy = y - y0;
  const a = ch[i] + (ch[i + 1] - ch[i]) * fx;
  const b = ch[i + P.w] + (ch[i + P.w + 1] - ch[i + P.w]) * fx;
  return a + (b - a) * fy;
}

function quantile(values: number[], q: number) {
  if (!values.length) return NaN;
  const s = values.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
}

function ringSamples(P: Planes, ch: Float32Array, cx: number, cy: number, r0: number, r1: number, dirs: readonly (readonly [number, number])[], steps = 4) {
  const out: number[] = [];
  for (let k = 0; k < steps; k++) {
    const r = steps === 1 ? r0 : r0 + ((r1 - r0) * k) / (steps - 1);
    for (const [c, s] of dirs) {
      const v = at(P, ch, cx + r * c, cy + r * s);
      if (Number.isFinite(v)) out.push(v);
    }
  }
  return out;
}

export function fitCircle(xs: number[], ys: number[]): (Circle & { inliers: number; rms: number }) | null {
  let idx = xs.map((_, i) => i);
  let c: Circle | null = null;
  for (let round = 0; round < 3; round++) {
    if (idx.length < 5) return null;
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    const n = idx.length;
    let mx = 0, my = 0;
    for (const i of idx) {
      mx += xs[i];
      my += ys[i];
    }
    mx /= n;
    my /= n;
    for (const i of idx) {
      const x = xs[i] - mx;
      const y = ys[i] - my;
      const z = x * x + y * y;
      sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
    }
    const A = [sxx, sxy, sx, sxy, syy, sy, sx, sy, n];
    const b = [-sxz, -syz, -sz];
    const det = A[0] * (A[4] * A[8] - A[5] * A[7]) - A[1] * (A[3] * A[8] - A[5] * A[6]) + A[2] * (A[3] * A[7] - A[4] * A[6]);
    if (Math.abs(det) < 1e-9) return null;
    const solve = (col: number) => {
      const M = A.slice();
      M[col] = b[0];
      M[col + 3] = b[1];
      M[col + 6] = b[2];
      return (M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6])) / det;
    };
    const D = solve(0);
    const E = solve(1);
    const F = solve(2);
    const cx = -D / 2;
    const cy = -E / 2;
    const r2 = cx * cx + cy * cy - F;
    if (!(r2 > 0)) return null;
    c = { x: cx + mx, y: cy + my, r: Math.sqrt(r2) };
    if (round === 2) break;
    const res = idx.map((i) => Math.abs(Math.hypot(xs[i] - c!.x, ys[i] - c!.y) - c!.r));
    const mad = quantile(res, 0.5);
    const limit = Math.max(1.0, 3 * 1.4826 * mad);
    const next = idx.filter((_, k) => res[k] <= limit);
    if (next.length === idx.length) break;
    idx = next;
  }
  if (!c) return null;
  const rms = Math.sqrt(idx.reduce((s, i) => s + (Math.hypot(xs[i] - c!.x, ys[i] - c!.y) - c!.r) ** 2, 0) / idx.length);
  return { ...c, inliers: idx.length, rms };
}

function subPixel(a: number, b: number, c: number) {
  const d = a - 2 * b + c;
  return d < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / d)) : 0;
}

function fitLimbus(P: Planes, guess: Circle): Circle | null {
  const R0 = guess.r;
  const k = Math.max(2, Math.round(R0 * 0.04));
  const xs: number[] = [];
  const ys: number[] = [];
  let left = 0;
  let right = 0;
  const rowStep = Math.max(1, R0 / 20);
  for (let dy = -0.5 * R0; dy <= 0.5 * R0; dy += rowStep) {
    const y = Math.round(guess.y + dy);
    if (y < 0 || y >= P.h) continue;
    const o = y * P.w;
    for (const side of [-1, 1]) {
      const near = Math.round(guess.x + side * 0.6 * R0);
      const far = Math.round(guess.x + side * 1.4 * R0);
      const lo = Math.max(k, Math.min(near, far));
      const hi = Math.min(P.w - 1 - k, Math.max(near, far));
      let best = 0;
      let bx = -1;
      const strength = (x: number) => {
        const out = o + x + side * k;
        const inn = o + x - side * k;
        if (P.glare[inn]) return 0;
        return Math.max(P.luma[out] - P.luma[inn], P.white[out] - P.white[inn]);
      };
      for (let x = lo; x <= hi; x++) {
        const s = strength(x);
        if (s > best) {
          best = s;
          bx = x;
        }
      }
      if (bx < 0 || best < 10) continue;
      xs.push(bx + subPixel(strength(bx - 1), best, strength(bx + 1)));
      ys.push(y);
      if (side < 0) left++;
      else right++;
    }
  }
  if (left < 3 || right < 3) return null;
  const c = fitCircle(xs, ys);
  if (!c || c.inliers < 8) return null;
  if (c.r < R0 * 0.7 || c.r > R0 * 1.35 || Math.hypot(c.x - guess.x, c.y - guess.y) > R0 * 0.4) return null;
  const level = (ch: Float32Array, side: number, k0: number, k1: number) => {
    const v: number[] = [];
    for (let i = 0; i < 3; i++) {
      const k = k0 + ((k1 - k0) * i) / 2;
      for (const [co, si] of SIDE_DIRS) {
        if (Math.abs(si) > 0.5 || Math.sign(co) !== side) continue;
        const x = Math.round(c.x + c.r * k * co);
        const y = Math.round(c.y + c.r * k * si);
        if (x >= 0 && y >= 0 && x < P.w && y < P.h && !P.glare[y * P.w + x]) v.push(ch[y * P.w + x]);
      }
    }
    return quantile(v, 0.5);
  };
  for (const side of [-1, 1]) {
    const darker = Math.max(level(P.luma, side, 1.12, 1.3) - level(P.luma, side, 0.6, 0.85), level(P.white, side, 1.12, 1.3) - level(P.white, side, 0.6, 0.85));
    if (!(darker >= 15)) return null;
  }
  return { x: c.x, y: c.y, r: c.r };
}

export function fitEye(img: ImageData, guess: Circle, sizeTolerance = 0.35): EyeFit {
  const P = planes(img);
  const n = P.w * P.h;
  const hist = new Uint32Array(256);
  for (let p = 0; p < n; p += 3) hist[Math.min(255, P.luma[p] | 0)]++;
  let acc = 0;
  let light = 255;
  const total = Math.ceil(n / 3);
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * 0.9) {
      light = v;
      break;
    }
  }
  const empty: EyeFit = { iris: null, pupil: null, contrast: 0, coverage: 0, light, haze: null, polarity: 0 };

  const tissue0 = quantile(ringSamples(P, P.luma, guess.x, guess.y, guess.r * 0.55, guess.r * 0.85, SIDE_DIRS), 0.5);
  if (!Number.isFinite(tissue0)) return empty;
  if (tissue0 < 200) markGlare(P, Math.min(240, tissue0 + Math.max(35, 0.4 * (255 - tissue0))), { x: guess.x, y: guess.y, r: guess.r * 1.05 });

  const fitted = fitLimbus(P, guess);
  const iris = fitted && Math.abs(fitted.r / guess.r - 1) <= sizeTolerance ? fitted : null;
  const I = iris ?? guess;
  const IR = I.r;

  const centreDirs = RAY_DIRS.filter((_, k) => k % 2 === 0);
  const levels = (ch: Float32Array) => {
    const tissue = quantile(ringSamples(P, ch, I.x, I.y, IR * 0.55, IR * 0.85, SIDE_DIRS), 0.5);
    const centre = quantile(ringSamples(P, ch, I.x, I.y, 0, IR * 0.3, centreDirs, 5), 0.2);
    return { tissue, centre, contrast: tissue - centre };
  };
  const byLuma = levels(P.luma);
  const byRed = levels(P.red);
  const useRed = byLuma.contrast > 0 && byRed.contrast > byLuma.contrast * 1.15;
  const ch = useRed ? P.red : P.luma;
  const lv = useRed ? byRed : byLuma;
  const polarity: 1 | -1 | 0 = lv.contrast >= 6 ? 1 : lv.contrast <= -10 ? -1 : 0;

  const haze = iris ? measureHazeFit(P, iris, null) : null;
  if (polarity === 0 || !Number.isFinite(lv.contrast)) return { ...empty, iris, haze, polarity };

  const mid = (lv.tissue + lv.centre) / 2;
  let sx = 0;
  let sy = 0;
  let sw = 0;
  const reach = IR * 0.6;
  for (let y = Math.max(0, Math.floor(I.y - reach)); y <= Math.min(P.h - 1, Math.ceil(I.y + reach)); y += 2) {
    for (let x = Math.max(0, Math.floor(I.x - reach)); x <= Math.min(P.w - 1, Math.ceil(I.x + reach)); x += 2) {
      const i = y * P.w + x;
      if (P.glare[i] || (x - I.x) ** 2 + (y - I.y) ** 2 > reach * reach) continue;
      const wgt = Math.max(0, polarity * (mid - ch[i]));
      sx += x * wgt;
      sy += y * wgt;
      sw += wgt;
    }
  }
  let origin = sw > 0 ? { x: sx / sw, y: sy / sw } : { x: I.x, y: I.y };
  if (Math.hypot(origin.x - I.x, origin.y - I.y) > IR * 0.3) origin = { x: I.x, y: I.y };

  const insideLimit = lv.centre + 0.7 * (lv.tissue - lv.centre);
  const darkLimit = lv.centre + 0.3 * (lv.tissue - lv.centre);
  const beyond = Math.max(6, Math.round(IR * 0.15));
  const minStep = Math.max(3, Math.abs(lv.contrast) * 0.25);
  const rMin = Math.max(2, IR * 0.08);
  const rMax = IR * 0.85;
  const len = Math.ceil(rMax) + Math.max(12, Math.round(IR * 0.15) + 2);
  const profile = new Float32Array(len + 1);
  const edge = (r: number) => {
    if (!Number.isFinite(profile[r - 1]) && !Number.isFinite(profile[r])) return 0;
    if (!Number.isFinite(profile[r + 1]) && !Number.isFinite(profile[r])) return 0;
    let inS = 0;
    let inN = 0;
    for (let q = r - 1; q >= 0 && inN < 3 && q >= r - 6; q--) {
      if (Number.isFinite(profile[q])) {
        inS += profile[q];
        inN++;
      }
    }
    let outS = 0;
    let outN = 0;
    let farS = 0;
    let farN = 0;
    for (let q = r + 1; q <= len && q <= r + beyond; q++) {
      const v = profile[q];
      if (!Number.isFinite(v)) continue;
      if (q >= r + 2 && polarity * (darkLimit - v) > 0) return 0;
      if (outN < 3 && q <= r + 6) {
        outS += v;
        outN++;
      }
      if (farN < 6) {
        farS += v;
        farN++;
      }
    }
    if (inN < 2 || outN < 2 || farN < 4) return 0;
    const inside = inS / inN;
    if (polarity * (insideLimit - inside) <= 0 || polarity * (farS / farN - mid) <= 0) return 0;
    return polarity * (outS / outN - inside);
  };
  let pupil: (Circle & { inliers: number }) | null = null;
  for (let pass = 0; pass < 2; pass++) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [dx, dy] of RAY_DIRS) {
      for (let r = 0; r <= len; r++) profile[r] = at(P, ch, origin.x + dx * r, origin.y + dy * r);
      let best = 0;
      let br = -1;
      for (let r = Math.ceil(rMin); r <= rMax; r++) {
        const e = edge(r);
        if (e > best) {
          best = e;
          br = r;
        }
      }
      if (br < 0 || best < minStep) continue;
      const r = br + subPixel(edge(br - 1), best, edge(br + 1));
      xs.push(origin.x + dx * r);
      ys.push(origin.y + dy * r);
    }
    const c = xs.length >= 10 ? fitCircle(xs, ys) : null;
    if (!c || c.inliers < 10 || c.r < IR * 0.1 || c.r > IR * 0.85 || Math.hypot(c.x - I.x, c.y - I.y) > IR * 0.35) {
      pupil = null;
      break;
    }
    pupil = c;
    origin = { x: c.x, y: c.y };
  }
  if (!pupil) return { ...empty, iris, haze, polarity };

  const inside = quantile(ringSamples(P, ch, pupil.x, pupil.y, pupil.r * 0.4, pupil.r * 0.85, RAY_DIRS, 3), polarity > 0 ? 0.25 : 0.75);
  const around = quantile(ringSamples(P, ch, pupil.x, pupil.y, pupil.r * 1.2, pupil.r * 1.5, centreDirs, 2), 0.5);
  const contrast = Number.isFinite(inside) && Number.isFinite(around) ? polarity * (around - inside) : Math.abs(lv.contrast);
  if (contrast < Math.max(6, Math.abs(lv.contrast) * 0.35)) return { ...empty, iris, haze, polarity };
  return {
    iris,
    pupil: { x: pupil.x, y: pupil.y, r: pupil.r },
    contrast,
    coverage: pupil.inliers / RAYS,
    light,
    haze: iris ? measureHazeFit(P, iris, pupil) : null,
    polarity,
  };
}

function measureHazeFit(P: Planes, iris: Circle, pupil: Circle | null): number | null {
  const sclera: number[] = [];
  for (const k of [1.12, 1.2, 1.3]) {
    for (const [c, s] of SIDE_DIRS) {
      if (Math.abs(s) > 0.5) continue;
      const x = Math.round(iris.x + iris.r * k * c);
      const y = Math.round(iris.y + iris.r * k * s);
      if (x < 0 || y < 0 || x >= P.w || y >= P.h) continue;
      const v = P.luma[y * P.w + x];
      if (v < 250) sclera.push(v);
    }
  }
  if (sclera.length < 8) return null;
  const white = quantile(sclera, 0.6);
  if (!(white >= 60)) return null;
  const c = pupil ?? { x: iris.x, y: iris.y, r: iris.r * 0.2 };
  const r = Math.min(c.r * 0.6, iris.r * 0.15);
  const middle = ringSamples(P, P.luma, c.x, c.y, 0, r, RAY_DIRS, 4);
  if (middle.length < 12) return null;
  return Math.min(1, Math.max(0, quantile(middle, 0.3) / white));
}
