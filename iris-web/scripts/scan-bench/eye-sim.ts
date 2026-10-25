import type { GreyFrame } from "@/lib/eye-search";
import { SEARCH_WIDTH } from "@/lib/eye-search";
import type { FrameSource } from "@/lib/eye-tracker";

/**
 * A simulated phone front camera looking at one eye from about 15 cm, for the scan test bench.
 *
 * The eye is drawn from a model in millimetres: skin, eyebrow, eyelids and lashes, the white of
 * the eye, a textured iris (11.7 mm across) and a pupil whose size follows a light reflex with
 * known amplitude, delay and speed. A cataract adds haze to the pupil. The phone screen reflects
 * on the cornea where a real screen would (a tall band below the pupil's centre: see README).
 * The camera adds auto-exposure that lags behind the flash, sensor noise that grows in the dark,
 * defocus blur, hand tremor and blinks.
 *
 * Every frame is reproducible from its seed and time, so a failing case can be looked at again.
 */

export type Rgb = [number, number, number];
export type Eye = "left" | "right";

/** Iris colours (as the camera sees them in good light, where the white of the eye is ~205). */
export const IRIS_COLOURS = {
  "dark-brown": [50, 33, 25] as Rgb,
  brown: [86, 55, 36] as Rgb,
  hazel: [112, 86, 52] as Rgb,
  green: [92, 108, 74] as Rgb,
  blue: [98, 124, 150] as Rgb,
};
export type IrisColour = keyof typeof IRIS_COLOURS;

export const IRIS_RADIUS_MM = 5.85;

export type Person = {
  colour: IrisColour;
  iris: Rgb;
  skin: Rgb;
  sclera: Rgb;
  /** Iris texture contrast (0–0.5). */
  texture: number;
  /** Pupil diameter before the flash, in the scan's light (mm). */
  restMm: number;
  /** Share of the diameter lost when this eye is lit with the standard flash. Lower in one eye = a relative afferent defect. */
  amp: Record<Eye, number>;
  /** Reflex delay (s), constriction and recovery time constants (s). */
  latency: number;
  tauC: number;
  tauR: number;
  /** Lens haze, 0 = clear, 1 = dense white cataract. */
  haze: Record<Eye, number>;
  /** Pupil centre offset from the iris centre (mm). */
  pupilOffset: [number, number];
  /** Where the eyelid edges cross the iris centre line (mm above / below the centre). */
  lidUpper: number;
  lidLower: number;
  /** A room light reflected on the cornea, relative to the iris centre (mm), or null. */
  windowGlint: [number, number] | null;
  seed: number;
};

export type Conditions = {
  /** Camera frame size (portrait phone). */
  frameW: number;
  frameH: number;
  fps: number;
  /** Frame pixels per mm on the eye (iris radius = 5.85 × this). */
  pxPerMm: number;
  /** Sensor noise (8-bit standard deviation) at normal exposure. */
  noise: number;
  /** Defocus: width of a blurred edge (mm). */
  blurMm: number;
  /** Room light on the eye, relative to normal indoor light. */
  ambient: number;
  /** Light the white screen adds at 15 cm, relative to normal indoor light (screen brightness). */
  flashGain: number;
  /** Auto-exposure time constant (s). */
  aeTau: number;
  /** Hand tremor amplitude and slow drift (frame px). */
  tremorPx: number;
  driftPx: number;
  /** Expected blinks per recording, and the chance of blinking at the flash. */
  blinks: number;
  flashBlink: number;
};

/** What the scene looks like at one moment. */
export type EyeState = {
  t: number;
  frame: number;
  /** Iris centre in frame pixels, and pixels per mm. */
  cx: number;
  cy: number;
  ppm: number;
  pupilMm: number;
  /** 0 = open, 1 = closed. */
  blink: number;
  /** Light on the eye and the camera's exposure gain. */
  light: number;
  gain: number;
  flash: boolean;
  /** The screen's light frame around the camera view (0–1). */
  frameLight: number;
  haze: number;
};

// ---------- Small helpers ----------

function hash(a: number, b: number, c: number) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** About normal (mean 0, sd 1), from three hashes. */
function gauss(a: number, b: number, c: number) {
  return (hash(a, b, c) + hash(a + 7919, b, c) + hash(a, b + 104729, c) - 1.5) * 2;
}

function valueNoise(x: number, y: number, seed: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** 0 below `edge - w`, 1 above `edge + w`, smooth in between. */
function step(edge: number, w: number, x: number) {
  const k = (x - edge + w) / (2 * w);
  if (k <= 0) return 0;
  if (k >= 1) return 1;
  return k * k * (3 - 2 * k);
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- The pupil's light reflex ----------

/**
 * How strongly a flash drives the reflex, relative to the standard flash (twice the room light
 * on the eye). The pupil responds to light roughly logarithmically, so a dim screen or a bright
 * room gives a smaller reaction.
 */
export function stimulusFactor(flashLight: number, restLight: number) {
  const s = Math.log(1 + flashLight / Math.max(0.05, restLight)) / Math.log(3);
  // The reflex saturates: a much stronger flash adds less and less.
  return s <= 1 ? s : 1 + 0.5 * Math.tanh((s - 1) / 0.5);
}

/** Pupil diameter (mm) at time t for one flash [onset, offset], with constriction share `amp`. */
export function pupilDiameter(p: Person, amp: number, t: number, onset: number, offset: number) {
  const t0 = onset + p.latency;
  const t1 = offset + p.latency;
  let c = 0;
  const during = (x: number) => 1 - Math.exp(-Math.pow(Math.max(0, x - t0) / p.tauC, 1.6));
  if (t >= t0 && t < t1) c = during(t);
  else if (t >= t1) {
    const c1 = during(t1);
    c = c1 * (0.15 + 0.85 * Math.exp(-(t - t1) / p.tauR));
  }
  // Hippus: the small, slow wobble every pupil has.
  const wobble = 0.035 * Math.sin(2 * Math.PI * 0.45 * t + p.seed) + 0.02 * Math.sin(2 * Math.PI * 1.3 * t + p.seed * 2);
  return p.restMm * (1 - Math.min(0.6, amp) * c) + wobble;
}

// ---------- The camera ----------

const W_EYE = 14.5; // half-width of the eye opening (mm)
const BROW: Rgb = [40, 30, 24];
const PUPIL: Rgb = [7, 6, 6];
const HAZE: Rgb = [190, 180, 155];
/** The phone screen's reflection on the cornea, relative to the pupil centre (mm, y down). */
export const SCREEN_REFLECTION = { x: 0.88, top: -1.2, bottom: 1.7, frame: 0.14 };

export class EyeCamera implements FrameSource {
  readonly width: number;
  readonly height: number;
  readonly person: Person;
  readonly cond: Conditions;
  state!: EyeState;
  private tex: { p1: number; p2: number; seed: number };
  private region: { x0: number; y0: number; w: number; h: number; r: Float32Array; g: Float32Array; b: Float32Array } | null = null;

  // (Plain fields rather than constructor parameter properties, so Node can run this file as is.)
  constructor(person: Person, cond: Conditions) {
    this.person = person;
    this.cond = cond;
    this.width = cond.frameW;
    this.height = cond.frameH;
    this.tex = { p1: person.seed % 7, p2: (person.seed * 13) % 11, seed: person.seed };
  }

  setState(s: EyeState) {
    this.state = s;
    this.region = null;
  }

  /**
   * Colour at a point on the eye (mm from the iris centre), before exposure and noise, plus the
   * screen and room reflections. `soft` widens edges (blur, or a larger pixel).
   */
  private shade(u: number, v: number, soft: number, out: Float32Array) {
    const p = this.person;
    const s = this.state;
    const blur = Math.max(soft, this.cond.blurMm * 0.5);
    let r = p.skin[0] * (1 - 0.006 * v);
    let g = p.skin[1] * (1 - 0.006 * v);
    let b = p.skin[2] * (1 - 0.006 * v);
    // Eyebrow.
    if (v > -16 && v < -9.5 && u > -18 && u < 16) {
      const a = 0.75 * step(-15, 0.8, v) * (1 - step(-10.5, 0.8, v));
      r += (BROW[0] - r) * a;
      g += (BROW[1] - g) * a;
      b += (BROW[2] - b) * a;
    }
    let spec = 0;
    const k = 1 - (u / W_EYE) ** 2;
    if (k > 0) {
      const shape = Math.pow(k, 0.7);
      const close = s.blink;
      const up = -(p.lidUpper * (1 - close) - p.lidLower * 0.92 * close) * shape;
      const lo = p.lidLower * shape;
      // Lashes along the upper lid.
      if (v < up && v > up - 1.1) {
        const a = 0.7 * (1 - (up - v) / 1.1);
        r *= 1 - a;
        g *= 1 - a;
        b *= 1 - a;
      }
      const open = step(up, blur + 0.06, v) * (1 - step(lo, blur + 0.06, v));
      if (open > 0) {
        const rho = Math.hypot(u, v);
        const corner = 1 - 0.3 * (u / W_EYE) ** 2;
        let er = p.sclera[0] * corner;
        let eg = p.sclera[1] * corner;
        let eb = p.sclera[2] * corner;
        const inIris = 1 - step(IRIS_RADIUS_MM, blur + 0.05, rho);
        if (inIris > 0) {
          const th = Math.atan2(v, u);
          const T = p.texture / (1 + (this.cond.blurMm / 0.18) ** 2);
          const collar = 1.75 * (p.restMm / 2);
          let tex =
            1 +
            T * (0.5 * Math.sin(19 * th + 2.1 * rho + this.tex.p1) + 0.35 * Math.sin(37 * th - 1.3 * rho + this.tex.p2) + 0.9 * (valueNoise(rho * 1.8, (th + Math.PI) * 9, this.tex.seed) - 0.5));
          tex += T * 0.6 * Math.exp(-(((rho - collar) / 0.35) ** 2));
          tex *= 1 - 0.5 * step(5.25, 0.5, rho);
          let ir = p.iris[0] * tex;
          let ig = p.iris[1] * tex;
          let ib = p.iris[2] * tex;
          const du = u - p.pupilOffset[0];
          const dv = v - p.pupilOffset[1];
          const inPupil = 1 - step(s.pupilMm / 2, blur + 0.04, Math.hypot(du, dv));
          if (inPupil > 0) {
            const h = s.haze;
            const pr = PUPIL[0] + (HAZE[0] - PUPIL[0]) * h;
            const pg = PUPIL[1] + (HAZE[1] - PUPIL[1]) * h;
            const pb = PUPIL[2] + (HAZE[2] - PUPIL[2]) * h;
            ir += (pr - ir) * inPupil;
            ig += (pg - ig) * inPupil;
            ib += (pb - ib) * inPupil;
          }
          er += (ir - er) * inIris;
          eg += (ig - eg) * inIris;
          eb += (ib - eb) * inIris;
        }
        // The upper lid shades the top of the eyeball.
        const shadow = 1 - 0.3 * Math.exp(-(v - up) / 0.9);
        er *= shadow;
        eg *= shadow;
        eb *= shadow;
        r += (er - r) * open;
        g += (eg - g) * open;
        b += (eb - b) * open;
        // Reflections on the cornea.
        if (rho < 6.2) {
          const du = u - p.pupilOffset[0];
          const dv = v - p.pupilOffset[1];
          const R = SCREEN_REFLECTION;
          const e = blur + 0.03;
          const box = (x: number, top: number, bottom: number) => (1 - step(x, e, Math.abs(du))) * step(top, e, dv) * (1 - step(bottom, e, dv));
          if (s.flash) spec += 330 * box(R.x, R.top, R.bottom);
          else if (s.frameLight > 0) {
            const ring = Math.max(0, box(R.x, R.top, R.bottom) - box(R.x - R.frame, R.top + R.frame * 0.5, R.bottom - R.frame));
            spec += 320 * Math.min(1, s.frameLight * 1.6) * ring;
          }
          if (p.windowGlint) {
            const d = Math.hypot(u - p.windowGlint[0], (v - p.windowGlint[1]) * 1.3);
            spec += 260 * Math.min(1, this.cond.ambient) * (1 - step(0.32, e, d));
          }
          spec *= open;
        }
      }
    }
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = spec;
  }

  /** Renders frame pixels [x0, x0+w) × [y0, y0+h) with noise, into the region cache. */
  private renderRegion(x0: number, y0: number, w: number, h: number) {
    const s = this.state;
    const n = w * h;
    const R = new Float32Array(n);
    const G = new Float32Array(n);
    const B = new Float32Array(n);
    const px = new Float32Array(4);
    const soft = 0.5 / s.ppm;
    const k = s.light * s.gain;
    const sigma = this.cond.noise * Math.sqrt(s.gain);
    const specGain = Math.min(1.4, s.gain);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const fx = x0 + x;
        const fy = y0 + y;
        this.shade((fx - s.cx) / s.ppm, (fy - s.cy) / s.ppm, soft, px);
        const nz = sigma * gauss(fx, fy, s.frame);
        const i = y * w + x;
        R[i] = Math.min(255, Math.max(0, px[0] * k + px[3] * specGain + nz));
        G[i] = Math.min(255, Math.max(0, px[1] * k + px[3] * specGain + nz * 0.9));
        B[i] = Math.min(255, Math.max(0, px[2] * k + px[3] * specGain + nz * 1.1));
      }
    }
    this.region = { x0, y0, w, h, r: R, g: G, b: B };
  }

  /** The small greyscale copy the eye search runs on (like lib/eye-search greyFrame). */
  grey(): GreyFrame {
    const s = this.state;
    const scale = SEARCH_WIDTH / this.width;
    const w = SEARCH_WIDTH;
    const h = Math.max(1, Math.round(this.height * scale));
    const sum = new Float64Array((w + 1) * (h + 1));
    const px = new Float32Array(4);
    const pix = 1 / scale; // frame pixels per grey pixel
    const soft = (0.5 * pix) / s.ppm;
    const k = s.light * s.gain;
    const sigma = (this.cond.noise * Math.sqrt(s.gain)) / pix;
    const specGain = Math.min(1.4, s.gain);
    const skinLuma = 0.299 * this.person.skin[0] + 0.587 * this.person.skin[1] + 0.114 * this.person.skin[2];
    for (let y = 0; y < h; y++) {
      let row = 0;
      const vMm = ((y + 0.5) * pix - s.cy) / s.ppm;
      for (let x = 0; x < w; x++) {
        const fx = (x + 0.5) * pix;
        const u = (fx - s.cx) / s.ppm;
        // Far from the eye and eyebrow there is only skin: skip the full model.
        if (Math.abs(u) > 19 || vMm < -17 || vMm > 9) {
          px[0] = skinLuma * (1 - 0.006 * vMm);
          px[1] = px[0];
          px[2] = px[0];
          px[3] = 0;
        } else this.shade(u, vMm, soft, px);
        const luma = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2];
        const v = Math.min(255, Math.max(0, luma * k + px[3] * specGain + sigma * gauss(x, y, s.frame + 77777)));
        row += v;
        sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
      }
    }
    return { w, h, scale, sum };
  }

  /** Like drawing the video into a size×size canvas: bilinear samples of the frame pixels. */
  crop(cx: number, cy: number, half: number, size: number): ImageData {
    const x0 = Math.floor(cx - half) - 1;
    const y0 = Math.floor(cy - half) - 1;
    const w = Math.ceil(half * 2) + 3;
    const h = w;
    const reg = this.region;
    if (!reg || reg.x0 > x0 || reg.y0 > y0 || reg.x0 + reg.w < x0 + w || reg.y0 + reg.h < y0 + h) this.renderRegion(x0, y0, w, h);
    const { r, g, b, x0: rx, y0: ry, w: rw, h: rh } = this.region!;
    const data = new Uint8ClampedArray(size * size * 4);
    const step = (half * 2) / size;
    for (let j = 0; j < size; j++) {
      const sy = cy - half + (j + 0.5) * step - 0.5 - ry;
      const yi = Math.min(rh - 2, Math.max(0, Math.floor(sy)));
      const fy = Math.min(1, Math.max(0, sy - yi));
      for (let i = 0; i < size; i++) {
        const sx = cx - half + (i + 0.5) * step - 0.5 - rx;
        const xi = Math.min(rw - 2, Math.max(0, Math.floor(sx)));
        const fx = Math.min(1, Math.max(0, sx - xi));
        const a = yi * rw + xi;
        const lerp = (ch: Float32Array) => {
          const top = ch[a] + (ch[a + 1] - ch[a]) * fx;
          const bot = ch[a + rw] + (ch[a + rw + 1] - ch[a + rw]) * fx;
          return top + (bot - top) * fy;
        };
        const o = (j * size + i) * 4;
        data[o] = lerp(r);
        data[o + 1] = lerp(g);
        data[o + 2] = lerp(b);
        data[o + 3] = 255;
      }
    }
    return { width: size, height: size, data, colorSpace: "srgb" } as ImageData;
  }
}
