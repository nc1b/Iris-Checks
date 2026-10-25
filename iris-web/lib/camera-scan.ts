import { analyse, type Analysis, type Protocol, type Sample } from "@/lib/analysis";
import type { ScanMetrics } from "@/lib/dashboard-types";
import type { EyeReading } from "@/lib/eye-tracker";
import { IRIS_DIAMETER_MM } from "@/lib/reference";
import { HAZE, MIN_VALID_FRACTION } from "@/lib/scan-rating";

/**
 * The camera scan, one eye at a time (right, then left), close up.
 *
 * For each eye: cover the other eye, bring the phone close until the iris is big in the
 * frame, hold still, and the screen flashes once. Iris records that eye's pupil before,
 * during and after the flash.
 *
 * - Diabetes check: the reflex of both eyes, averaged.
 * - Glaucoma check: each eye lit on its own, so their reactions can be compared
 *   (left vs right balance), plus the difference in resting pupil size.
 * - Cataract check: how grey each pupil looks next to the white of the eye (lib/pupil-fit).
 *
 * scripts/scan-bench runs this code on simulated camera frames to measure how well it works.
 *
 * Everything runs on the phone; only the resulting numbers are saved.
 */

export type PersonEye = "left" | "right";
export type ImageSide = "left" | "right";

export const EYE_ORDER: PersonEye[] = ["right", "left"];
export const OTHER_EYE: Record<PersonEye, PersonEye> = { right: "left", left: "right" };

/**
 * In an unmirrored camera frame the person's right eye is on the image's left.
 * lib/pupil.ts LANDMARKS and lib/analysis.ts samples are keyed by image side.
 */
export const IMAGE_SIDE: Record<PersonEye, ImageSide> = { right: "left", left: "right" };

/** One flash per eye: 2 s resting, 1 s flash, 3 s recovery. */
export const EYE_PROTOCOL: Protocol = {
  id: "standard",
  name: "One eye",
  duration: 6,
  stimuli: [{ onset: 2.0, offset: 3.0, color: "white" }],
};

/**
 * Close-up rules. The iris must be at least `minIrisPx` in radius in the camera frame,
 * which is about 15 cm from a typical front camera. At arm's length it's only ~11 px and
 * the pupil edge is too blurry to measure, which is why far-away scans came back unclear.
 */
export const CLOSE_UP = {
  minIrisPx: 26,
  maxIrisPx: 95,
  /** Pupil must be this much darker than the iris (0–255) to measure it. */
  minContrast: 14,
  /** Share of the rays that must agree on the pupil edge (lib/pupil.ts keeps only agreeing rays). */
  minCoverage: 0.45,
  /** The other eye must look visible this many frames in a row before it counts as uncovered. */
  uncoveredFrames: 6,
  /** Holding still (see Steadiness): most the eye may jump between two frames, and drift in 0.2 s, as a share of the iris radius. */
  maxJump: 0.3,
  maxDrift: 0.15,
  /** Good frames in a row before the flash starts (~0.8 s). */
  holdFrames: 24,
  /**
   * When everything else is right but the pupil can't be made out for this long (s), start
   * anyway: a cloudy lens can make the pupil as light as the iris, and that person should still
   * get the cataract check rather than be stuck here.
   */
  pupilWaitSeconds: 2.5,
};

/**
 * Eye lighting: brightness (0–255) of the bright parts of the eye close-up (white of the eye,
 * lids), from lib/pupil.ts. A front camera in a dim room sees an almost black eye, so the pupil
 * can't be told apart from the iris. Team-set; `target` is where the screen light aims.
 */
export const LIGHT = { dark: 70, target: 115, bright: 250 };

/**
 * Screen light: a white frame along the sides and bottom of the screen that lights the eye from
 * 15 cm away. It rises until the eye is bright enough (up to `max` opacity) and stays the same
 * through the recording, so the flash is the only change in light the pupil reacts to.
 *
 * Nothing lights up next to the camera (the top of the screen), here or in the flash: light
 * from right beside the lens shines back out of the pupil red (the "red-eye" of flash photos),
 * which hides the dark pupil and looks like a cloudy lens.
 */
export const SCREEN_LIGHT = { max: 0.75, step: 0.015, frame: "9vw" };

/** The top of the screen, by the camera, stays black during the flash (share of the height). */
export const FLASH_DARK_TOP = 0.13;

/** The pupil is measured on a 192 px square crop of the eye, for sub-pixel precision. */
export const PRECISION_CROP = 192;

/**
 * Lens haze from the pupil in a flash frame (cataract check), 0 = clear and dark, 1 = white.
 * A clear lens keeps the pupil dark even under the screen flash; a cloudy lens scatters the
 * light back, so the pupil looks grey or white. Reflections on the cornea (from 15 cm the
 * whole screen reflects there, not just a dot) are left out, and the darker quarter of the
 * pupil is used, so a big reflection doesn't make a clear pupil look grey.
 * Team-set and provisional: the scale needs calibrating against eye-exam results.
 */
export const HAZE_SCALE = { dark: 20, white: 180 };

function luma(data: Uint8ClampedArray, i: number) {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

export function measureHaze(img: ImageData, pupilRadiusPx: number): number | null {
  const { width, height, data } = img;
  if (!Number.isFinite(pupilRadiusPx) || pupilRadiusPx < 2) return null;
  const cx = width / 2;
  const cy = height / 2;
  const r = pupilRadiusPx * 0.7;
  const values: number[] = [];
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 0 || y < 0 || x >= width || y >= height || Math.hypot(x - cx, y - cy) > r) continue;
      values.push(luma(data, (y * width + x) * 4));
    }
  }
  if (values.length < 12) return null;
  values.sort((a, b) => a - b);
  // Reflections are bright pixels that stand out from the rest of the pupil: drop them. (A
  // cloudy lens makes the whole pupil grey, so its pixels don't stand out from each other.)
  const mid = values[values.length >> 1];
  const spread = values.map((v) => Math.abs(v - mid)).sort((a, b) => a - b)[values.length >> 1] || 1;
  const kept = values.filter((v) => v <= mid + 3 * spread || v < 120);
  // Then the darker part of what's left: a clear pupil is black there even next to a big
  // window reflection, while a cataract keeps even its darkest part grey.
  const level = kept[Math.floor(kept.length * 0.25)];
  return Math.min(1, Math.max(0, (level - HAZE_SCALE.dark) / (HAZE_SCALE.white - HAZE_SCALE.dark)));
}

/**
 * The corneal reflection: the little light the screen makes on the eye. Its centre (in crop
 * pixels) is shown on screen so you can see Iris is locked onto the eye. Returns null when
 * there's no clear highlight inside the iris.
 */
export function findGlint(img: ImageData, irisRadiusPx: number): { x: number; y: number } | null {
  const { width, height, data } = img;
  const cx = width / 2;
  const cy = height / 2;
  let max = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x - cx, y - cy) > irisRadiusPx * 0.9) continue;
      const v = luma(data, (y * width + x) * 4);
      if (v > max) max = v;
    }
  }
  if (max < 200) return null;
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.hypot(x - cx, y - cy) > irisRadiusPx * 0.9) continue;
      if (luma(data, (y * width + x) * 4) >= max - 12) {
        sx += x;
        sy += y;
        n++;
      }
    }
  }
  // A real glint is a small spot, not a washed-out patch.
  if (n === 0 || n > irisRadiusPx * irisRadiusPx * 0.5) return null;
  return { x: sx / n, y: sy / n };
}

export type EyeRecording = {
  samples: Sample[];
  /** Haze readings from the frames between flashes (lib/pupil-fit). */
  haze: number[];
  /** The screen light (0–1) this eye was recorded with. */
  screen?: number;
};

/** Pupil readings with less contrast than this (0–255) aren't recorded. */
const MIN_SAMPLE_CONTRAST = 8;

/** Eye aspect ratio above this = eye open. */
export const OPEN_EAR = 0.18;

/**
 * The screen light for the next frame while lining up: up a step when the camera sees the eye too
 * dark (or can't find it, as in a dark room), down a step when it's very bright.
 *
 * For the second eye it stays where the first eye left it (`hold`), so both eyes get the same
 * light before their flash and their reactions can be compared; it only goes up if the eye is
 * too dark to measure at all.
 */
export function nextScreenLight(level: number, light: number | null, hold = false) {
  if (hold) return light === null || light < LIGHT.dark ? Math.min(SCREEN_LIGHT.max, level + SCREEN_LIGHT.step) : level;
  if (light === null || light < LIGHT.target) return Math.min(SCREEN_LIGHT.max, level + SCREEN_LIGHT.step);
  if (light > LIGHT.target * 1.8) return Math.max(0, level - SCREEN_LIGHT.step);
  return level;
}

/**
 * The second eye is held at the first eye's distance: its iris within this share of the first
 * eye's size. The flash's light falls off with distance squared, so a closer phone gives one eye
 * a stronger flash and a bigger reaction, which would look like a difference between the eyes.
 */
export const MATCH_DISTANCE = 0.1;

/**
 * The lining-up checks that only need this frame. `match` is the first eye's iris radius when
 * lining up the second eye.
 */
export function frameChecks(target: EyeReading | null, match: number | null = null) {
  const min = match ? Math.max(CLOSE_UP.minIrisPx, match * (1 - MATCH_DISTANCE)) : CLOSE_UP.minIrisPx;
  const max = match ? Math.min(CLOSE_UP.maxIrisPx, match * (1 + MATCH_DISTANCE)) : CLOSE_UP.maxIrisPx;
  return {
    sharp: !!target && Number.isFinite(target.pupilR) && target.contrast >= CLOSE_UP.minContrast && target.coverage >= CLOSE_UP.minCoverage,
    distance: !target ? null : target.irisR < min ? ("far" as const) : target.irisR > max ? ("close" as const) : ("ok" as const),
    open: (target?.ear ?? 0) > OPEN_EAR,
  };
}

/**
 * Is the eye holding still? A hand-held phone shakes the eye a few pixels back and forth many
 * times a second (tremor), which doesn't matter: the eye is followed in every frame. What matters
 * is that the phone isn't still being moved into place. So the eye's average position over the
 * last 0.2 s is compared with the 0.2 s before (averages cancel the shaking out), and a single
 * big jump between two frames also counts as moving.
 */
export class Steadiness {
  private history: { t: number; x: number; y: number }[] = [];

  reset() {
    this.history = [];
  }

  /** `t` in seconds. */
  update(t: number, target: EyeReading | null) {
    if (!target) {
      this.history = [];
      return false;
    }
    const h = this.history;
    h.push({ t, x: target.cx, y: target.cy });
    while (h.length > 1 && t - h[0].t > 0.4) h.shift();
    const older = h.filter((p) => t - p.t > 0.2);
    const newer = h.filter((p) => t - p.t <= 0.2);
    if (older.length < 2 || newer.length < 2) return false;
    const avg = (ps: { x: number; y: number }[]) => ({ x: ps.reduce((a, p) => a + p.x, 0) / ps.length, y: ps.reduce((a, p) => a + p.y, 0) / ps.length });
    const a = avg(older);
    const b = avg(newer);
    const prev = h[h.length - 2];
    const jump = Math.hypot(target.cx - prev.x, target.cy - prev.y) / target.irisR;
    const drift = Math.hypot(b.x - a.x, b.y - a.y) / target.irisR;
    return jump <= CLOSE_UP.maxJump && drift <= CLOSE_UP.maxDrift;
  }
}

/** The eye's size in the camera during a recording: the median fitted iris radius (frame px). */
export function recordedIrisPx(rec: EyeRecording, side: ImageSide) {
  return median(rec.samples.map((s) => s[side]?.irisPx ?? NaN));
}

/**
 * The lining-up hold: counts good frames until the flash can start. A frame is good when the eye
 * is found, in the ring, at the right distance, open, steady and (the other eye) covered, and
 * the pupil is sharp, or has been impossible to see for CLOSE_UP.pupilWaitSeconds.
 */
export class LineUpHold {
  frames = 0;
  /** Seconds lined up with the pupil not made out (a frame or two of moving doesn't start it over). */
  private unseen = 0;
  private last: number | null = null;

  reset() {
    this.frames = 0;
    this.unseen = 0;
    this.last = null;
  }

  /** `t` in seconds. Returns whether this frame counted as good. */
  update(t: number, f: { found: boolean; centered: boolean; distance: "far" | "close" | "ok" | null; open: boolean; sharp: boolean; steady: boolean; covered: boolean }) {
    const dt = this.last === null ? 0 : Math.min(0.2, t - this.last);
    this.last = t;
    const ready = f.found && f.centered && f.distance === "ok" && f.open && f.steady && f.covered;
    // (A pupil found now and then doesn't start the wait over: a cloudy one gets mistaken for
    // one in odd frames. When it really is sharp, those frames count as good anyway.)
    if (ready && !f.sharp) this.unseen += dt;
    else if (!ready) this.unseen = Math.max(0, this.unseen - dt * 0.5);
    const unseen = this.pupilUnseen();
    const good = ready && (f.sharp || unseen);
    // A frame that isn't good takes back three good ones, so the hold needs a steady stretch; when
    // going ahead without the pupil, only one, since that eye is harder to hold perfectly anyway.
    this.frames = good ? this.frames + 1 : Math.max(0, this.frames - (unseen ? 1 : 3));
    return good;
  }

  /** Lined up but the pupil couldn't be made out for long enough: starting without it. */
  pupilUnseen() {
    return this.unseen >= CLOSE_UP.pupilWaitSeconds;
  }

  get done() {
    return this.frames >= CLOSE_UP.holdFrames;
  }
}

/** One eye's recording while it runs. */
export type RecordingState = { start: number; eye: PersonEye; rec: EyeRecording };

/**
 * Adds one camera frame, `t` seconds into the recording, to `state`: the pupil sample, and a
 * haze reading for the cataract check.
 */
export function recordFrame(state: RecordingState, t: number, target: EyeReading | null, side: ImageSide) {
  const stim = EYE_PROTOCOL.stimuli.find((s) => t >= s.onset && t < s.offset);
  const open = (target?.ear ?? 0) > OPEN_EAR;
  const sample: Sample = { t, open };
  // The iris size only counts when it was fitted to its edge (the rough search is ±10%).
  // A pupil found with almost no contrast (a washed-out frame) is more likely wrong than right.
  if (target && Number.isFinite(target.pupilR) && target.contrast >= MIN_SAMPLE_CONTRAST)
    sample[side] = { pupilPx: target.pupilR, irisPx: target.irisFitted ? target.irisR : NaN, contrast: target.contrast };
  if (target && open) sample.light = target.light;
  state.rec.samples.push(sample);
  // Haze from the frames between flashes: during a flash the screen's reflection covers the
  // middle of the pupil (see lib/pupil-fit).
  if (!stim && target && open && target.haze !== null) state.rec.haze.push(target.haze);
}

export type EyeResult = {
  analysis: Analysis;
  /** Usable for the reflex numbers (enough tracking and a flash response). */
  usable: boolean;
  restingMm: number | null;
  haze: number | null;
};

export type CameraScanResult = {
  metrics: ScanMetrics;
  eyes: Record<PersonEye, EyeResult | null>;
  /** Plain-language problems with the recording, if any. */
  warnings: string[];
};

function median(values: number[]) {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (s.length === 0) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Frames with a haze reading needed for an eye's haze (about a second). */
const MIN_HAZE_FRAMES = 20;

const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function analyseEye(rec: EyeRecording | null): EyeResult | null {
  if (!rec || rec.samples.length === 0) return null;
  const analysis = analyse(rec.samples, EYE_PROTOCOL);
  const usable = analysis.quality.ok && analysis.quality.validFraction >= MIN_VALID_FRACTION && analysis.perStimulus.length > 0;
  return {
    analysis,
    usable,
    restingMm: usable && analysis.metrics.restingRatio !== null ? analysis.metrics.restingRatio * IRIS_DIAMETER_MM : null,
    // Haze needs enough frames where the iris edge was found (lib/pupil-fit only measures haze
    // then). It doesn't need the pupil tracked: a cloudy pupil often can't be.
    haze: rec.haze.length >= MIN_HAZE_FRAMES ? median(rec.haze) : null,
  };
}

/**
 * Did the camera see enough light? Compares the eye's brightness while resting with its
 * brightness during the flash. Returns null when there's too little to judge.
 */
export function lightCheck(rec: EyeRecording | null): "dark" | "weak-flash" | "ok" | null {
  if (!rec) return null;
  const stim = EYE_PROTOCOL.stimuli[0];
  const rest = median(rec.samples.filter((s) => s.light !== undefined && s.t < stim.onset).map((s) => s.light!));
  // Skip the first moments of the flash while the camera adjusts its exposure.
  const lit = median(rec.samples.filter((s) => s.light !== undefined && s.t >= stim.onset + 0.1 && s.t < stim.offset).map((s) => s.light!));
  if (rest === null || lit === null) return null;
  if (rest < LIGHT.dark && lit < LIGHT.dark) return "dark";
  if (lit < rest * 1.1 && lit < LIGHT.target) return "weak-flash";
  return "ok";
}

export function combineEyes(recordings: Record<PersonEye, EyeRecording | null>): CameraScanResult {
  const eyes = { right: analyseEye(recordings.right), left: analyseEye(recordings.left) };
  const usable = EYE_ORDER.map((e) => eyes[e]).filter((e): e is EyeResult => !!e?.usable);

  const metrics: ScanMetrics = {};
  const set = (key: keyof ScanMetrics, value: number | null | undefined, digits: number) => {
    if (value !== null && value !== undefined && Number.isFinite(value)) metrics[key] = round(value, digits);
  };
  // Diabetes check: average the reflex of every eye that was tracked well.
  const avg = (key: "restingRatio" | "amplitude" | "latency" | "velocity") => {
    const values = usable.map((e) => e.analysis.metrics[key]).filter((v): v is number => v !== null && Number.isFinite(v));
    return values.length ? mean(values) : null;
  };
  set("restingRatio", avg("restingRatio"), 3);
  set("amplitude", avg("amplitude"), 1);
  set("latency", avg("latency"), 3);
  set("velocity", avg("velocity"), 2);

  // Glaucoma check: each eye was lit on its own, so compare their reactions and sizes.
  if (eyes.left?.usable) set("leftLitAmplitude", eyes.left.analysis.metrics.amplitude, 1);
  if (eyes.right?.usable) set("rightLitAmplitude", eyes.right.analysis.metrics.amplitude, 1);
  // Only when both eyes got the same light before their flash (the second eye's screen light is
  // held at the first eye's level unless that eye was too dark to see).
  const sameLight = Math.abs((recordings.left?.screen ?? 0) - (recordings.right?.screen ?? 0)) <= 0.1;
  if (!sameLight) {
    delete metrics.leftLitAmplitude;
    delete metrics.rightLitAmplitude;
  }
  if (metrics.leftLitAmplitude !== undefined && metrics.rightLitAmplitude !== undefined) {
    const strong = Math.max(metrics.leftLitAmplitude, metrics.rightLitAmplitude);
    if (strong > 0) metrics.reflexBalance = round(Math.min(metrics.leftLitAmplitude, metrics.rightLitAmplitude) / strong, 3);
  }
  if (eyes.left?.restingMm != null && eyes.right?.restingMm != null) {
    set("sizeDiffMm", Math.abs(eyes.left.restingMm - eyes.right.restingMm), 2);
  }

  // Cataract check.
  set("hazeLeft", eyes.left?.haze, 3);
  set("hazeRight", eyes.right?.haze, 3);

  const fractions = EYE_ORDER.map((e) => eyes[e]?.analysis.quality.validFraction).filter((v): v is number => v !== undefined);
  set("validFraction", fractions.length ? Math.min(...fractions) : null, 2);

  const warnings: string[] = [];
  for (const eye of EYE_ORDER) {
    if (!eyes[eye]) warnings.push(`Your ${eye} eye wasn't scanned.`);
    else if (!eyes[eye]!.usable && (eyes[eye]!.haze ?? 0) >= HAZE.typical)
      // A grey pupil can't be told from the iris, so its reflex can't be timed; the haze is the finding.
      warnings.push(`Your ${eye} pupil looked grey rather than black, so its reaction to the flash couldn't be measured. That greyness is what the cataract check looks for.`);
    else if (!eyes[eye]!.usable) {
      const reasons = eyes[eye]!.analysis.quality.reasons;
      warnings.push(
        `Your ${eye} eye: ${reasons[0] ?? "Iris couldn't track the pupil clearly through the flash."} Hold the phone close and steady, in a dimmer room, and try not to blink.`,
      );
    }
  }
  for (const eye of EYE_ORDER) {
    const light = lightCheck(recordings[eye]);
    if (light === "dark") warnings.push(`Your ${eye} eye was too dark for the camera. Turn your screen brightness all the way up and use a softly lit room, not a dark one.`);
    else if (light === "weak-flash")
      warnings.push(`The flash barely lit your ${eye} eye. Turn screen brightness all the way up, and turn off battery saver and auto-brightness, which can dim the screen.`);
  }
  if (!sameLight) warnings.push("Your two eyes needed different screen light, so their reactions weren't compared. Scan again in steadier, even light.");
  if (metrics.hazeLeft === undefined || metrics.hazeRight === undefined) {
    warnings.push("Iris didn't get a clear view of both pupils, so the cataract check may be unclear.");
  }
  return { metrics, eyes, warnings };
}
