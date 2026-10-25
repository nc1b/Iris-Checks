import { analyse, type Sample } from "@/lib/analysis";
import {
  combineEyes,
  EYE_ORDER,
  EYE_PROTOCOL,
  frameChecks,
  IMAGE_SIDE,
  LineUpHold,
  nextScreenLight,
  recordFrame,
  Steadiness,
  recordedIrisPx,
  type EyeRecording,
  type PersonEye,
  type RecordingState,
} from "@/lib/camera-scan";
import type { ScanMetrics } from "@/lib/dashboard-types";
import { EyeTracker, type EyeReading } from "@/lib/eye-tracker";
import { IRIS_DIAMETER_MM } from "@/lib/reference";
import { rateScan } from "@/lib/scan-rating";
import {
  EyeCamera,
  IRIS_COLOURS,
  IRIS_RADIUS_MM,
  mulberry32,
  pupilDiameter,
  stimulusFactor,
  type Conditions,
  type Eye,
  type IrisColour,
  type Person,
} from "./eye-sim";

/**
 * One simulated camera scan, run through the app's own code (lib/eye-tracker, lib/camera-scan,
 * lib/analysis, lib/scan-rating) the way components/scanner/camera-scan.tsx runs it: line up each
 * eye until the hold completes, a 3 s countdown, then the recording with the flash.
 */

/** The phone screen (CSS px) and camera frame used for the on-screen ring geometry. */
export const SCREEN = { w: 390, h: 844 };
const RING = { x: 0.5, y: 0.22, radius: 0.18 };
const IRIS_IN_RING = 0.4;
/** Pixels per mm when the iris fills the ring as asked (about 15 cm from the camera). */
export const PPM_REF = 11;
/** Give up lining up an eye after this long (s): the person would be stuck. */
const ALIGN_MAX = 10;

export function ringGeometry(vw: number, vh: number) {
  const scale = Math.max(SCREEN.w / vw, SCREEN.h / vh);
  const ringR = (SCREEN.w * RING.radius) / scale;
  const x = vw / 2 - (SCREEN.w * RING.x - SCREEN.w / 2) / scale;
  const y = vh / 2 + (SCREEN.h * RING.y - SCREEN.h / 2) / scale;
  return { x, y, ringR, search: { guess: { x, y, r: ringR * IRIS_IN_RING }, reach: ringR, radii: [0.5, 0.7, 0.9, 1.1, 1.4, 1.8] } };
}

// ---------- Random people and rooms ----------

const pick = <T,>(rng: () => number, items: [T, number][]) => {
  let x = rng() * items.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of items) if ((x -= w) <= 0) return v;
  return items[items.length - 1][0];
};
const uniform = (rng: () => number, a: number, b: number) => a + (b - a) * rng();
const normal = (rng: () => number, mean: number, sd: number) => {
  const u = Math.max(1e-9, rng());
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export type Truth = { diabetesLike: boolean; rapdEye: Eye | null; cataractEyes: Eye[] };

export function randomPerson(rng: () => number, seed: number, force?: Partial<{ colour: IrisColour; diabetesLike: boolean; rapd: boolean; cataract: boolean }>) {
  const colour = force?.colour ?? pick<IrisColour>(rng, [["dark-brown", 35], ["brown", 30], ["hazel", 12], ["green", 8], ["blue", 15]]);
  const diabetesLike = force?.diabetesLike ?? rng() < 0.25;
  const rapd = force?.rapd ?? rng() < 0.2;
  const cataract = force?.cataract ?? rng() < 0.25;
  const vary = (c: [number, number, number], k: number) => c.map((v) => clamp(v * (1 + normal(rng, 0, k)), 0, 255)) as [number, number, number];
  const skinTone = rng();
  const skin = [120 + 110 * skinTone, 80 + 95 * skinTone, 60 + 85 * skinTone].map((v) => v * uniform(rng, 0.9, 1.05)) as [number, number, number];
  const baseAmp = diabetesLike ? clamp(normal(rng, 0.16, 0.04), 0.06, 0.3) : clamp(normal(rng, 0.27, 0.05), 0.15, 0.4);
  const amp = { right: baseAmp * uniform(rng, 0.95, 1.05), left: baseAmp * uniform(rng, 0.95, 1.05) };
  const rapdEye: Eye | null = rapd ? (rng() < 0.5 ? "right" : "left") : null;
  if (rapdEye) amp[rapdEye] *= uniform(rng, 0.35, 0.68);
  const haze = { right: uniform(rng, 0, 0.05), left: uniform(rng, 0, 0.05) };
  const cataractEyes: Eye[] = cataract ? (rng() < 0.5 ? ["right", "left"] : [rng() < 0.5 ? "right" : "left"]) : [];
  for (const e of cataractEyes) haze[e] = uniform(rng, 0.3, 0.85);
  const person: Person = {
    colour,
    iris: vary(IRIS_COLOURS[colour], 0.08),
    skin,
    sclera: vary([212, 204, 196], 0.04),
    texture: uniform(rng, 0.12, 0.42),
    restMm: diabetesLike ? clamp(normal(rng, 3.9, 0.5), 2.6, 5.5) : clamp(normal(rng, 4.7, 0.6), 3.0, 6.6),
    amp,
    latency: diabetesLike ? clamp(normal(rng, 0.31, 0.04), 0.2, 0.45) : clamp(normal(rng, 0.24, 0.03), 0.17, 0.33),
    tauC: diabetesLike ? uniform(rng, 0.33, 0.5) : uniform(rng, 0.22, 0.34),
    tauR: uniform(rng, 0.7, 1.4),
    haze,
    pupilOffset: [normal(rng, 0, 0.2), normal(rng, 0.1, 0.15)],
    lidUpper: uniform(rng, 4.2, 6.4),
    lidLower: uniform(rng, 5.0, 6.8),
    windowGlint: rng() < 0.5 ? [uniform(rng, -3.5, 3.5), uniform(rng, -3.5, 1)] : null,
    seed,
  };
  const truth: Truth = { diabetesLike, rapdEye, cataractEyes };
  return { person, truth };
}

export function randomConditions(rng: () => number, force?: Partial<Conditions>): Conditions {
  const c: Conditions = {
    frameW: 1080,
    frameH: 1920,
    fps: pick(rng, [[30, 75], [24, 15], [15, 10]]),
    pxPerMm: uniform(rng, 7.5, 14),
    noise: uniform(rng, 1.5, 6),
    blurMm: rng() < 0.6 ? uniform(rng, 0.05, 0.2) : uniform(rng, 0.2, 0.5),
    ambient: uniform(rng, 0.25, 1.4),
    flashGain: uniform(rng, 0.7, 3.2),
    aeTau: uniform(rng, 0.15, 0.6),
    tremorPx: uniform(rng, 0.5, 4),
    driftPx: uniform(rng, 0, 8),
    blinks: uniform(rng, 0, 0.8),
    flashBlink: 0.12,
  };
  return { ...c, ...force };
}

// ---------- Running a scan ----------

export type EyeRun = {
  alignSeconds: number | null;
  /** While lining up: share of frames failing each check. */
  alignFails: Record<"found" | "centered" | "distance" | "open" | "sharp" | "steady", number>;
  /** Share of recording frames with a pupil measurement. */
  tracked: number;
  screen: number;
  ppm: number;
  stimulus: number;
  /** The pupil's contrast against the iris between flashes (median, 0–255). */
  contrast: number;
};

export type ScanRun = {
  seed: number;
  person: Pick<Person, "colour" | "restMm" | "latency"> & { amp: Record<Eye, number>; haze: Record<Eye, number> };
  cond: Conditions;
  truth: Truth;
  eyes: Record<PersonEye, EyeRun>;
  phone: { metrics: ScanMetrics; status: ReturnType<typeof rateScan> };
  ideal: { metrics: ScanMetrics; status: ReturnType<typeof rateScan> };
};

/** Blink closure (0–1) at time t for blinks starting at `times`. */
function blinkAt(t: number, times: number[]) {
  let b = 0;
  for (const s of times) {
    const x = t - s;
    if (x < 0 || x > 0.27) continue;
    b = Math.max(b, x < 0.08 ? x / 0.08 : x < 0.14 ? 1 : 1 - (x - 0.14) / 0.13);
  }
  return b;
}

export type FrameHook = (info: { eye: PersonEye; phase: "align" | "recording"; t: number; cam: EyeCamera; reading: EyeReading | null }) => void;

export function runScan(seed: number, opts: { person?: Person; truth?: Truth; cond?: Conditions; hook?: FrameHook } = {}): ScanRun {
  const rng = mulberry32(seed);
  const made = opts.person && opts.truth ? { person: opts.person, truth: opts.truth } : randomPerson(rng, seed);
  const { person, truth } = made;
  const cond = opts.cond ?? randomConditions(rng);
  const ring = ringGeometry(cond.frameW, cond.frameH);
  const tracker = new EyeTracker();
  const recordings: Record<PersonEye, EyeRecording | null> = { right: null, left: null };
  const ideal: Record<PersonEye, Sample[]> = { right: [], left: [] };
  const eyes = {} as Record<PersonEye, EyeRun>;
  const cam = new EyeCamera(person, cond);
  let screen = 0;
  let firstIris: number | null = null;
  const stim = EYE_PROTOCOL.stimuli[0];

  for (const eye of EYE_ORDER) {
    tracker.reset();
    // Where this person holds the phone for this eye: distance (px per mm) and the eye's spot.
    // How close this person first holds the phone; they move when the app says closer or back.
    let ppm = cond.pxPerMm * uniform(rng, 0.88, 1.12);
    let toldDir: "far" | "close" | null = null;
    let toldSince = 0;
    const off = Math.sqrt(rng()) * ring.ringR * 0.45;
    const ang = rng() * Math.PI * 2;
    const home = { x: ring.x + off * Math.cos(ang), y: ring.y + off * Math.sin(ang) };
    const phase = [rng() * 6.3, rng() * 6.3, rng() * 6.3, rng() * 6.3];
    // The screen's light falls off with distance squared.
    const lightOf = (s: number, flash: boolean) => cond.ambient + (flash ? cond.flashGain : 0.55 * s) * (ppm / PPM_REF) ** 2;
    let gain = clamp(1 / lightOf(0, false), 0.2, 1.8);
    const place = (t: number, approach: number) => {
      const tremor = cond.tremorPx * (Math.sin(2 * Math.PI * 9.3 * t + phase[0]) + 0.6 * Math.sin(2 * Math.PI * 11.7 * t + phase[1]));
      const drift = cond.driftPx * Math.sin(2 * Math.PI * 0.13 * t + phase[2]);
      const swing = (1 - approach) * ring.ringR * 0.8;
      return {
        cx: home.x + tremor + drift + swing,
        cy: home.y + tremor * 0.7 + drift * 0.5 - swing * 0.3,
        ppm: ppm * (0.62 + 0.38 * approach) * (1 + 0.015 * Math.sin(2 * Math.PI * 0.21 * t + phase[3])),
      };
    };
    const dt = () => (1 / cond.fps) * uniform(rng, 0.85, 1.15);
    const exposure = (light: number, step: number) => {
      const target = clamp(1 / light, 0.2, 1.8);
      gain += (target - gain) * (1 - Math.exp(-step / cond.aeTau));
    };

    // Line up: the eye comes into the ring over the first second; hold until 24 good frames.
    let t = 0;
    let frame = seed * 100000 + (eye === "right" ? 0 : 50000);
    const hold = new LineUpHold();
    const steadiness = new Steadiness();
    let locked: number | null = null;
    const alignBlinks = Array.from({ length: 3 }, () => uniform(rng, 0.5, ALIGN_MAX));
    const fails = { found: 0, centered: 0, distance: 0, open: 0, sharp: 0, steady: 0 };
    let alignFrames = 0;
    while (t < ALIGN_MAX) {
      const step = dt();
      t += step;
      const light = lightOf(screen, false);
      exposure(light, step);
      const pos = place(t, Math.min(1, t / 1.0));
      cam.setState({ t, frame: frame++, ...pos, pupilMm: pupilDiameter(person, 0, t, 99, 100), blink: blinkAt(t, alignBlinks), light, gain, flash: false, frameLight: screen, haze: person.haze[eye] });
      const reading = tracker.track(cam, { model: null, face: null, ring: ring.search, ts: t * 1000, recording: false });
      opts.hook?.({ eye, phase: "align", t, cam, reading });
      const second = eye !== EYE_ORDER[0];
      const checks = { ...frameChecks(reading, second ? firstIris : null), steady: steadiness.update(t, reading) };
      screen = nextScreenLight(screen, reading?.light ?? null, second);
      // Told to move: after half a second's reaction, about 20% closer or further per second.
      const dir = checks.distance === "far" || checks.distance === "close" ? checks.distance : null;
      if (dir !== toldDir) {
        toldDir = dir;
        toldSince = t;
      }
      if (toldDir && t - toldSince > 0.5) ppm *= 1 + (toldDir === "far" ? 0.2 : -0.2) * step;
      const centered = !!reading && Math.hypot(reading.cx - ring.x, reading.cy - ring.y) <= ring.ringR;
      hold.update(t, { found: !!reading, centered, ...checks, covered: true });
      if (t > 1.2) {
        alignFrames++;
        if (!reading) fails.found++;
        if (!centered) fails.centered++;
        if (checks.distance !== "ok") fails.distance++;
        if (!checks.open) fails.open++;
        if (!checks.sharp) fails.sharp++;
        if (!checks.steady) fails.steady++;
      }
      if (hold.done) {
        locked = t;
        break;
      }
    }

    // Countdown: 3 s, still tracking (as the app does) so the lock is fresh for the recording.
    const t0 = t + 3;
    while (t < t0) {
      const step = dt();
      t += step;
      const light = lightOf(screen, false);
      exposure(light, step);
      const pos = place(t, 1);
      cam.setState({ t, frame: frame++, ...pos, pupilMm: pupilDiameter(person, 0, t, 99, 100), blink: 0, light, gain, flash: false, frameLight: screen, haze: person.haze[eye] });
      tracker.track(cam, { model: null, face: null, ring: ring.search, ts: t * 1000, recording: true });
    }

    // Recording.
    const restLight = lightOf(screen, false);
    const stimulus = stimulusFactor(cond.flashGain * (ppm / PPM_REF) ** 2, restLight);
    const amp = person.amp[eye] * stimulus;
    const blinks = Array.from({ length: Math.round(cond.blinks * 2 * rng()) }, () => uniform(rng, 0.3, EYE_PROTOCOL.duration - 0.3));
    if (rng() < cond.flashBlink) blinks.push(stim.onset + uniform(rng, 0.1, 0.25));
    const state: RecordingState = { start: 0, eye, rec: { samples: [], haze: [] } };
    let rt = 0;
    let measured = 0;
    while (rt < EYE_PROTOCOL.duration) {
      const step = dt();
      rt += step;
      const flash = rt >= stim.onset && rt < stim.offset;
      const light = lightOf(screen, flash);
      exposure(light, step);
      const pos = place(t0 + rt, 1);
      const pupilMm = pupilDiameter(person, amp, rt, stim.onset, stim.offset);
      const blink = blinkAt(rt, blinks);
      cam.setState({ t: rt, frame: frame++, ...pos, pupilMm, blink, light, gain, flash, frameLight: screen, haze: person.haze[eye] });
      const reading = tracker.track(cam, { model: null, face: null, ring: ring.search, ts: (t0 + rt) * 1000, recording: true });
      opts.hook?.({ eye, phase: "recording", t: rt, cam, reading });
      recordFrame(state, rt, reading, IMAGE_SIDE[eye]);
      if (reading && Number.isFinite(reading.pupilR)) measured++;
      // A perfect pupillometer at the same moments.
      const side = IMAGE_SIDE[eye];
      ideal[eye].push({ t: rt, open: blink < 0.5, [side]: { pupilPx: (pupilMm / 2) * pos.ppm, irisPx: IRIS_RADIUS_MM * pos.ppm, contrast: 100 } });
    }
    state.rec.screen = screen;
    recordings[eye] = state.rec;
    if (eye === EYE_ORDER[0]) firstIris = recordedIrisPx(state.rec, IMAGE_SIDE[eye]);
    for (const k of Object.keys(fails) as (keyof typeof fails)[]) fails[k] = Math.round((fails[k] / Math.max(1, alignFrames)) * 100) / 100;
    const between = state.rec.samples.filter((p) => p.t < stim.onset || p.t > stim.offset + 0.5).map((p) => p[IMAGE_SIDE[eye]]?.contrast ?? NaN).filter(Number.isFinite).sort((a, b) => a - b);
    eyes[eye] = { contrast: between.length ? between[between.length >> 1] : 0, alignSeconds: locked, alignFails: fails, tracked: state.rec.samples.length ? measured / state.rec.samples.length : 0, screen, ppm, stimulus };
  }

  const phoneResult = combineEyes(recordings);
  const idealMetrics = idealMetricsOf(ideal, person);
  return {
    seed,
    person: { colour: person.colour, restMm: person.restMm, latency: person.latency, amp: person.amp, haze: person.haze },
    cond,
    truth,
    eyes,
    phone: { metrics: phoneResult.metrics, status: rateScan(phoneResult.metrics) },
    ideal: { metrics: idealMetrics, status: rateScan(idealMetrics) },
  };
}

/** The numbers a perfect pupillometer would give for the same pupils, through the same analysis. */
function idealMetricsOf(ideal: Record<PersonEye, Sample[]>, person: Person): ScanMetrics {
  const m: ScanMetrics = {};
  const per = EYE_ORDER.map((e) => ({ e, a: analyse(ideal[e], EYE_PROTOCOL) }));
  const mean = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null && Number.isFinite(x));
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
  };
  m.restingRatio = mean(per.map((p) => p.a.metrics.restingRatio));
  m.amplitude = mean(per.map((p) => p.a.metrics.amplitude));
  m.latency = mean(per.map((p) => p.a.metrics.latency));
  m.velocity = mean(per.map((p) => p.a.metrics.velocity));
  const amp = Object.fromEntries(per.map((p) => [p.e, p.a.metrics.amplitude])) as Record<PersonEye, number | null>;
  if (amp.left !== null && amp.right !== null) {
    m.leftLitAmplitude = amp.left;
    m.rightLitAmplitude = amp.right;
    m.reflexBalance = Math.min(amp.left, amp.right) / Math.max(amp.left, amp.right);
  }
  const rest = Object.fromEntries(per.map((p) => [p.e, p.a.metrics.restingRatio])) as Record<PersonEye, number | null>;
  if (rest.left !== null && rest.right !== null) m.sizeDiffMm = Math.abs(rest.left - rest.right) * IRIS_DIAMETER_MM;
  // Haze on the app's scale: how grey the pupil would look with no reflections and no noise.
  m.hazeLeft = hazeScale(person.haze.left);
  m.hazeRight = hazeScale(person.haze.right);
  m.validFraction = 1;
  return m;
}

/** Lens haze (0–1) on the app's haze scale: the pupil's grey as a share of the white of the eye. */
export function hazeScale(h: number) {
  const pupil = 6.4 + (180.6 - 6.4) * h; // brightness of the pupil colour, see eye-sim PUPIL and HAZE
  return clamp(pupil / 205, 0, 1);
}
