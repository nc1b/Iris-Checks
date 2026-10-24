"use client";

import { useAuth } from "@clerk/nextjs";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { ArrowLeft, Camera, Check, CircleDashed, Hand, Loader2, RotateCcw, Save, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHECK_VIEWS, StatusBadge } from "@/components/dashboard/status";
import type { Sample, StimulusColor } from "@/lib/analysis";
import {
  CLOSE_UP,
  combineEyes,
  EYE_ORDER,
  EYE_PROTOCOL,
  findGlint,
  IMAGE_SIDE,
  LIGHT,
  measureHaze,
  OTHER_EYE,
  PRECISION_CROP,
  SCREEN_LIGHT,
  type CameraScanResult,
  type EyeRecording,
  type ImageSide,
  type PersonEye,
} from "@/lib/camera-scan";
import { SCAN_STEPS } from "@/lib/checks";
import {
  captureEyePhoto,
  embedEyePhoto,
  loadEyeEmbedder,
  type PhotoCondition,
  type PhotoMatchResponse,
} from "@/lib/eye-photo";
import type { Scan, ScanMetrics } from "@/lib/dashboard-types";
import { CROP_SPAN, eyeAspectRatio, LANDMARKS, measurePupil } from "@/lib/pupil";
import { IRIS_DIAMETER_MM } from "@/lib/reference";
import { rateScan } from "@/lib/scan-rating";
import { findIris, greyFrame, type IrisFound, type IrisGuess } from "@/lib/eye-search";
import { cn } from "@/lib/utils";
import { PhotoMatch, type PhotoState } from "./photo-match";

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const OPEN_EAR = 0.18; // eye aspect ratio above this = eye open
const FAR_IRIS_PX = 11; // iris radius at arm's length, where the closeness meter starts
const MANUAL_START_MS = 6000; // offer a manual start if cover detection doesn't settle
const TRACK_WINDOW = 30; // frames used for the live tracking percentage
// The target ring on screen: centre as a share of screen width/height, radius as a share of
// width. Keeping the eye here keeps it fully in view and close to the camera lens.
// High enough to stay clear of the instructions panel, and close to the front camera.
const RING = { x: 0.5, y: 0.22, radius: 0.18 };
/** An eye that fills the ring has an iris about this share of the ring's radius. */
const IRIS_IN_RING = 0.4;
/** Keep following the last lock this long when the eye briefly can't be found (blinks). */
const LOCK_MS = 1500;

type Phase = "intro" | "loading" | "align" | "countdown" | "recording" | "results";

type Align = {
  found: boolean;
  /** Eye centre inside the on-screen target ring. */
  centered: boolean;
  distance: "far" | "close" | "ok" | null;
  closeness: number;
  open: boolean;
  sharp: boolean;
  covered: boolean;
  steady: boolean;
  pupilMm: number | null;
  tracking: number;
  hold: number;
  /** How the camera sees the eye's lighting. */
  light: "dark" | "ok" | "bright" | null;
  /** Screen light around the camera view, 0–1. */
  screen: number;
};

const EMPTY_ALIGN: Align = {
  found: false,
  centered: false,
  distance: null,
  closeness: 0,
  open: false,
  sharp: false,
  covered: false,
  steady: false,
  pupilMm: null,
  tracking: 0,
  hold: 0,
  light: null,
  screen: 0,
};

type EyeReading = {
  /** Corner-to-corner width of the eye, in video pixels. */
  eyeWidth: number;
  cx: number;
  cy: number;
  irisR: number;
  pupilR: number;
  contrast: number;
  coverage: number;
  /** Iris brightness (0–255): how well lit the eye is. */
  light: number;
  ear: number;
  crop: ImageData;
  pupilCropPx: number;
  glint: { x: number; y: number } | null;
};

const STIM_BG: Record<StimulusColor, string> = { white: "#ffffff", red: "#ff0000", blue: "#0000ff" };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function CameraScan() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("intro");
  const [eye, setEye] = useState<PersonEye>("right");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [align, setAlign] = useState<Align>(EMPTY_ALIGN);
  const [manualStart, setManualStart] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [flash, setFlash] = useState<StimulusColor | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CameraScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [voice, setVoice] = useState(true);
  const [photo, setPhoto] = useState<PhotoState>({ status: "none" });

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cropRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  const eyeRef = useRef<PersonEye>("right");
  const goodFramesRef = useRef(0);
  const prevCenterRef = useRef<{ x: number; y: number } | null>(null);
  const trackRef = useRef<boolean[]>([]);
  const pupilMmRef = useRef<number | null>(null);
  // Where the iris was last found, so it can be followed without the face model.
  const lockRef = useRef<(IrisFound & { at: number }) | null>(null);
  const greyRef = useRef<HTMLCanvasElement | null>(null);
  // Frames in a row the other eye has looked visible (one stray frame shouldn't reset the hold).
  const otherSeenRef = useRef(0);
  // ?debug=1: show the magnified iris close-up the pupil is measured on, with what was found.
  // (Read once on the client; it only changes what's drawn once the camera is open.)
  const [debug] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"));
  const debugRef = useRef<HTMLCanvasElement>(null);
  // Screen light level (0–1). Set while lining up, then held steady through the recording.
  const screenRef = useRef(0);
  const [screen, setScreen] = useState(0);
  const frameCountRef = useRef(0);
  const recordingRef = useRef<{ start: number; eye: PersonEye; rec: EyeRecording; restPupilCropPx: number | null } | null>(null);
  const recordingsRef = useRef<Record<PersonEye, EyeRecording | null>>({ right: null, left: null });
  const frameRef = useRef<() => void>(() => {});
  const timersRef = useRef<number[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const voiceRef = useRef(true);
  // The sharpest close-up of each eye from the line-up, for the photo match.
  const eyePhotosRef = useRef<Record<PersonEye, { canvas: HTMLCanvasElement; score: number; at: number } | null>>({ right: null, left: null });

  // Sign-in is needed to save results, same as the dashboard.
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    eyeRef.current = eye;
  }, [eye]);
  useEffect(() => {
    voiceRef.current = voice;
    if (!voice) window.speechSynthesis?.cancel();
  }, [voice]);

  const say = useCallback((text: string) => {
    if (!voiceRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const stopCamera = useCallback(() => {
    if (loopRef.current !== null) cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    clearTimers();
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    if (typeof document !== "undefined" && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, [clearTimers]);

  useEffect(
    () => () => {
      stopCamera();
      window.speechSynthesis?.cancel();
    },
    [stopCamera],
  );

  // ---------- Measuring one eye in one frame ----------

  /** Measures the pupil in a close-up of the iris at (cx, cy, irisR). `lm` adds blink detection when the face model agrees. */
  const readEye = useCallback((iris: IrisGuess, lm: { x: number; y: number }[] | null, side: ImageSide, vw: number, vh: number, withGlint = true): EyeReading | null => {
    const video = videoRef.current;
    if (!video) return null;
    const L = LANDMARKS[side];
    const { x: cx, y: cy, r: irisR } = iris;
    if (!Number.isFinite(irisR) || irisR < 3) return null;
    if (!cropRef.current) {
      cropRef.current = document.createElement("canvas");
      cropRef.current.width = PRECISION_CROP;
      cropRef.current.height = PRECISION_CROP;
    }
    const ctx = cropRef.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const half = irisR * CROP_SPAN;
    ctx.drawImage(video, cx - half, cy - half, half * 2, half * 2, 0, 0, PRECISION_CROP, PRECISION_CROP);
    const crop = ctx.getImageData(0, 0, PRECISION_CROP, PRECISION_CROP);
    const reading = measurePupil(crop);
    if (!reading) return null;
    const scale = irisR / reading.irisPx; // crop px → video px
    const glint = withGlint ? findGlint(crop, reading.irisPx) : null;
    // Without the face model: an eye is about 2.6 iris diameters wide, and a pupil that can be
    // measured means the eye is open.
    const eyeWidth = lm ? Math.hypot((lm[L.inner].x - lm[L.outer].x) * vw, (lm[L.inner].y - lm[L.outer].y) * vh) : irisR * 5.2;
    const pupilSeen = Number.isFinite(reading.pupilPx) && reading.contrast >= CLOSE_UP.minContrast;
    return {
      eyeWidth,
      cx,
      cy,
      irisR,
      pupilR: reading.pupilPx * scale,
      contrast: reading.contrast,
      coverage: reading.coverage,
      light: reading.irisLevel,
      ear: lm ? eyeAspectRatio(lm, L.upper, L.lower, L.inner, L.outer, vw / vh) : pupilSeen ? 0.3 : 0,
      crop,
      pupilCropPx: reading.pupilPx,
      glint: glint && { x: cx + (glint.x - PRECISION_CROP / 2) * scale, y: cy + (glint.y - PRECISION_CROP / 2) * scale },
    };
  }, []);

  /** The face model's iris for one side, in video pixels. */
  const landmarkIris = (lm: { x: number; y: number }[], side: ImageSide, vw: number, vh: number): IrisGuess => {
    const L = LANDMARKS[side];
    const c = lm[L.irisCenter];
    const r = L.iris.reduce((s, i) => s + Math.hypot((lm[i].x - c.x) * vw, (lm[i].y - c.y) * vh), 0) / L.iris.length;
    return { x: c.x * vw, y: c.y * vh, r };
  };

  /**
   * Finds the target eye's iris: near the face model's guess, near the last lock, or, with
   * neither, inside the on-screen ring. Close up the face model often misses the face or puts
   * the eye beside the real one, so its guess is only a starting point.
   */
  const locateEye = useCallback(
    (lm: { x: number; y: number }[] | null, side: ImageSide, vw: number, vh: number, ts: number, recording: boolean): EyeReading | null => {
      const video = videoRef.current;
      if (!video) return null;
      greyRef.current ??= document.createElement("canvas");
      const grey = greyFrame(video, greyRef.current);
      const model = lm ? landmarkIris(lm, side, vw, vh) : null;
      const last = lockRef.current && ts - lockRef.current.at < LOCK_MS ? lockRef.current : null;
      const searches: { guess: IrisGuess; reach: number; radii?: number[] }[] = [];
      if (model && model.r >= 3) searches.push({ guess: model, reach: model.r * 1.5 });
      if (last) searches.push({ guess: last, reach: last.r * (recording ? 0.6 : 1.2) });
      if (!searches.length) {
        const view = overlayRef.current;
        const sw = view?.clientWidth || vw;
        const sh = view?.clientHeight || vh;
        const scale = Math.max(sw / vw, sh / vh);
        const ringR = (sw * RING.radius) / scale;
        searches.push({
          guess: { x: vw / 2 - (sw * RING.x - sw / 2) / scale, y: vh / 2 + (sh * RING.y - sh / 2) / scale, r: ringR * IRIS_IN_RING },
          reach: ringR,
          radii: [0.5, 0.7, 0.9, 1.1, 1.4, 1.8],
        });
      }
      let found: IrisFound | null = null;
      if (grey) {
        for (const s of searches) {
          const f = findIris(grey, s.guess, s.reach, s.radii);
          if (f && (!found || f.score > found.score)) found = f;
        }
      }
      if (!found && model && model.r >= 3) found = { ...model, score: 0 };
      if (!found) return null;
      lockRef.current = { ...found, at: ts };
      // Use the face model for blinks only when it points at the same eye.
      const agrees = !!model && Math.hypot(model.x - found.x, model.y - found.y) < found.r * 0.8;
      return readEye(found, agrees ? lm : null, side, vw, vh, !recording);
    },
    [readEye],
  );

  // Rings on the iris and pupil, a crosshair on the centre, and a dot on the screen's reflection.
  const drawOverlay = useCallback((target: EyeReading | null, other: EyeReading | null, locked: boolean, vw: number, vh: number) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, vw, vh);
    const line = Math.max(2, vw / 420);
    if (other) {
      ctx.setLineDash([line * 3, line * 3]);
      ctx.lineWidth = line;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(other.cx, other.cy, other.irisR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (!target) return;
    const { cx, cy, irisR, pupilR } = target;
    ctx.lineWidth = line * 1.4;
    ctx.strokeStyle = locked ? "rgba(134,239,172,0.95)" : "rgba(255,255,255,0.9)";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = irisR * 0.3;
    ctx.beginPath();
    ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (Number.isFinite(pupilR)) {
      ctx.lineWidth = line;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
      ctx.stroke();
    }
    const tick = irisR * 0.18;
    ctx.lineWidth = line * 0.8;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(cx + dx * (irisR + tick * 0.4), cy + dy * (irisR + tick * 0.4));
      ctx.lineTo(cx + dx * (irisR + tick * 1.6), cy + dy * (irisR + tick * 1.6));
    }
    ctx.stroke();
    if (target.glint) {
      const g = ctx.createRadialGradient(target.glint.x, target.glint.y, 0, target.glint.x, target.glint.y, irisR * 0.18);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.4, "rgba(186,230,253,0.9)");
      g.addColorStop(1, "rgba(186,230,253,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(target.glint.x, target.glint.y, irisR * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  // ---------- Flow ----------

  const enterAlign = useCallback(
    (next: PersonEye) => {
      clearTimers();
      goodFramesRef.current = 0;
      prevCenterRef.current = null;
      lockRef.current = null;
      otherSeenRef.current = 0;
      trackRef.current = [];
      pupilMmRef.current = null;
      setAlign(EMPTY_ALIGN);
      setManualStart(false);
      setEye(next);
      eyeRef.current = next;
      phaseRef.current = "align";
      setPhase("align");
      say(`Cover your ${OTHER_EYE[next]} eye with your hand, and bring the phone close to your ${next} eye.`);
      timersRef.current.push(window.setTimeout(() => setManualStart(true), MANUAL_START_MS));
    },
    [clearTimers, say],
  );

  // Fingerprint each eye's close-up on the phone and compare it with the Iris photo database.
  const runPhotoMatch = useCallback(async () => {
    const photos = eyePhotosRef.current;
    const eyes = EYE_ORDER.filter((e) => photos[e]);
    if (eyes.length === 0) {
      setPhoto({ status: "none" });
      return;
    }
    setPhoto({ status: "loading" });
    try {
      // Never leave the results waiting forever (Save is paused while this runs).
      const json = await withTimeout(
        (async () => {
          const body: Partial<Record<PersonEye, number[]>> = {};
          for (const e of eyes) body[e] = await embedEyePhoto(photos[e]!.canvas);
          // If the sign-in token is slow, ask anyway; the server answers "Please sign in" if needed.
          const token = await withTimeout(getToken(), 10_000, "Signing in took too long.").catch(() => null);
          const res = await fetch("/api/photo-match", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ eyes: body }),
          });
          const data = (await res.json().catch(() => ({}))) as PhotoMatchResponse & { error?: string };
          if (!res.ok) throw new Error(data.error || "The photo match didn't finish.");
          return data;
        })(),
        45_000,
        "The photo match took too long. Your other results are still fine to save.",
      );
      setPhoto({ status: "done", data: json });
    } catch (e) {
      console.error("photo match failed", e);
      setPhoto({ status: "error", error: e instanceof Error ? e.message : "The photo match didn't finish." });
    }
  }, [getToken]);

  const finishEye = useCallback(() => {
    const current = recordingRef.current;
    recordingRef.current = null;
    setFlash(null);
    if (!current) return;
    recordingsRef.current[current.eye] = current.rec;
    const next = EYE_ORDER[EYE_ORDER.indexOf(current.eye) + 1];
    if (next) {
      enterAlign(next);
      return;
    }
    stopCamera();
    setResult(combineEyes(recordingsRef.current));
    void runPhotoMatch();
    phaseRef.current = "results";
    setPhase("results");
    say("Scan complete.");
  }, [enterAlign, runPhotoMatch, say, stopCamera]);

  const startCountdown = useCallback(() => {
    if (phaseRef.current !== "align") return;
    clearTimers();
    phaseRef.current = "countdown";
    setPhase("countdown");
    setCountdown(3);
    document.documentElement.requestFullscreen?.().catch(() => {});
    say("Hold still. Look at the dot.");
    [2, 1].forEach((n, i) => timersRef.current.push(window.setTimeout(() => setCountdown(n), (i + 1) * 1000)));
    timersRef.current.push(
      window.setTimeout(() => {
        recordingRef.current = { start: performance.now(), eye: eyeRef.current, rec: { samples: [], haze: [] }, restPupilCropPx: null };
        setProgress(0);
        phaseRef.current = "recording";
        setPhase("recording");
      }, 3000),
    );
  }, [clearTimers, say]);

  const frame = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || !streamRef.current) return;

    if (video.readyState >= 2 && video.videoWidth > 0) {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      let ts = performance.now();
      if (ts <= lastTsRef.current) ts = lastTsRef.current + 1;
      lastTsRef.current = ts;
      const lm = landmarker.detectForVideo(video, ts).faceLandmarks?.[0];
      const current = phaseRef.current;
      const targetEye = recordingRef.current?.eye ?? eyeRef.current;
      const targetSide = IMAGE_SIDE[targetEye];
      const has = !!lm && lm.length >= 478;
      // During a recording, skip the glint search to keep the frame rate up.
      const target = current === "recording" || current === "align" ? locateEye(has ? lm : null, targetSide, vw, vh, ts, current === "recording") : null;

      const rec = recordingRef.current;
      if (current === "recording" && rec) {
        const t = (ts - rec.start) / 1000;
        const stim = EYE_PROTOCOL.stimuli.find((s) => t >= s.onset && t < s.offset);
        setFlash(stim ? stim.color : null);
        setProgress(Math.min(1, t / EYE_PROTOCOL.duration));
        const open = (target?.ear ?? 0) > OPEN_EAR;
        const sample: Sample = { t, open };
        if (target && Number.isFinite(target.pupilR)) sample[targetSide] = { pupilPx: target.pupilR, irisPx: target.irisR, contrast: target.contrast };
        if (target && open) sample.light = target.light;
        rec.rec.samples.push(sample);
        // Resting pupil size (crop pixels), for the haze check when the flash hides the pupil edge.
        if (!stim && target && Number.isFinite(target.pupilCropPx) && target.contrast >= CLOSE_UP.minContrast) {
          rec.restPupilCropPx = rec.restPupilCropPx === null ? target.pupilCropPx : rec.restPupilCropPx * 0.8 + target.pupilCropPx * 0.2;
        }
        // Flash photos for the cataract check, once the camera has adjusted to the flash. The pupil
        // only shrinks under the flash, so 60% of its resting size stays inside it.
        if (stim && t >= stim.onset + 0.35 && target && open) {
          const radius = Number.isFinite(target.pupilCropPx) ? target.pupilCropPx : rec.restPupilCropPx !== null ? rec.restPupilCropPx * 0.6 : NaN;
          const haze = measureHaze(target.crop, radius);
          if (haze !== null) rec.rec.haze.push(haze);
        }
        if (t >= EYE_PROTOCOL.duration) finishEye();
      } else if (current === "align") {
        const otherSide = IMAGE_SIDE[OTHER_EYE[targetEye]];
        const other = has ? readEye(landmarkIris(lm, otherSide, vw, vh), lm, otherSide, vw, vh, false) : null;
        const prev = prevCenterRef.current;
        const jitter = target && prev ? Math.hypot(target.cx - prev.x, target.cy - prev.y) / target.irisR : 1;
        prevCenterRef.current = target ? { x: target.cx, y: target.cy } : null;

        const sharp = !!target && Number.isFinite(target.pupilR) && target.contrast >= CLOSE_UP.minContrast && target.coverage >= CLOSE_UP.minCoverage;
        // The other eye counts as visible only if it really looks like an open eye with a pupil.
        const otherVisible = !!other && other.ear >= 0.15 && Number.isFinite(other.pupilR) && other.contrast >= CLOSE_UP.minContrast && other.coverage >= CLOSE_UP.minCoverage;
        otherSeenRef.current = otherVisible ? otherSeenRef.current + 1 : 0;
        trackRef.current.push(sharp);
        if (trackRef.current.length > TRACK_WINDOW) trackRef.current.shift();
        if (sharp && target) {
          const mm = (target.pupilR / target.irisR) * IRIS_DIAMETER_MM;
          pupilMmRef.current = pupilMmRef.current === null ? mm : pupilMmRef.current * 0.8 + mm * 0.2;
        }

        // Light the eye with the screen when the camera sees it too dark, and back off when it's bright.
        // With no eye found at all the room may simply be too dark, so the light comes up too.
        const lightLevel = target?.light ?? null;
        const s0 = screenRef.current;
        if (lightLevel === null || lightLevel < LIGHT.target) screenRef.current = Math.min(SCREEN_LIGHT.max, s0 + SCREEN_LIGHT.step);
        else if (lightLevel > LIGHT.target * 1.8) screenRef.current = Math.max(0, s0 - SCREEN_LIGHT.step);

        const irisR = target?.irisR ?? 0;
        const next: Align = {
          found: !!target,
          centered: !!target && inRing(target, vw, vh, overlayRef.current),
          distance: !target ? null : irisR < CLOSE_UP.minIrisPx ? "far" : irisR > CLOSE_UP.maxIrisPx ? "close" : "ok",
          closeness: Math.min(1, Math.max(0, (irisR - FAR_IRIS_PX) / (CLOSE_UP.minIrisPx - FAR_IRIS_PX))),
          open: (target?.ear ?? 0) > OPEN_EAR,
          sharp,
          // The other eye must be hidden: behind a hand, closed, or out of frame.
          covered: otherSeenRef.current < CLOSE_UP.uncoveredFrames,
          steady: jitter <= CLOSE_UP.maxJitter,
          pupilMm: pupilMmRef.current,
          tracking: trackRef.current.filter(Boolean).length / Math.max(1, trackRef.current.length),
          hold: 0,
          light: lightLevel === null ? null : lightLevel < LIGHT.dark ? "dark" : lightLevel > LIGHT.bright ? "bright" : "ok",
          screen: screenRef.current,
        };
        const good = next.found && next.centered && next.distance === "ok" && next.open && next.sharp && next.steady && next.covered;
        // Keep the sharpest framed close-up of this eye (checked at most 5 times a second).
        if (target && next.centered && next.distance === "ok" && next.open && next.sharp && next.steady) {
          const score = target.contrast * target.coverage;
          const kept = eyePhotosRef.current[targetEye];
          if ((!kept || score > kept.score) && ts - (kept?.at ?? 0) > 200) {
            const canvas = captureEyePhoto(video, target.cx, target.cy, target.eyeWidth * 1.1);
            if (canvas) eyePhotosRef.current[targetEye] = { canvas, score, at: ts };
          }
        }
        goodFramesRef.current = good ? goodFramesRef.current + 1 : Math.max(0, goodFramesRef.current - 3);
        next.hold = Math.min(1, goodFramesRef.current / CLOSE_UP.holdFrames);
        drawOverlay(target, other, good, vw, vh);
        if (debug && frameCountRef.current % 2 === 0) drawDebug(debugRef.current, target);
        // Refresh the panel every few frames so the numbers are readable.
        if (++frameCountRef.current % 3 === 0 || good !== (align.hold > 0)) {
          setAlign(next);
          setScreen(screenRef.current);
        }
        if (goodFramesRef.current >= CLOSE_UP.holdFrames) startCountdown();
      }
    }
    loopRef.current = requestAnimationFrame(() => frameRef.current());
  }, [align.hold, debug, drawOverlay, finishEye, locateEye, readEye, startCountdown]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  const openCamera = useCallback(async () => {
    setError(null);
    setPhase("loading");
    recordingsRef.current = { right: null, left: null };
    eyePhotosRef.current = { right: null, left: null };
    screenRef.current = 0;
    setScreen(0);
    setPhoto({ status: "none" });
    setResult(null);
    setSaveError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const streamPromise = navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      if (!landmarkerRef.current) {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        const make = (delegate: "GPU" | "CPU") =>
          vision.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numFaces: 1 });
        landmarkerRef.current = await make("GPU").catch(() => make("CPU"));
      }
      const stream = await streamPromise;
      await sharpenCamera(stream.getVideoTracks()[0]);
      // Start downloading the photo-match model now so it's ready when the scan ends.
      loadEyeEmbedder().catch(() => {});
      streamRef.current = stream;
      // The <video> mounts with the align screen; the effect below attaches the stream to it.
      enterAlign("right");
    } catch (e) {
      const name = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      console.error("camera scan failed to start", e);
      stopCamera();
      setPhase("intro");
      setError(
        /NotAllowed|Permission|Security/i.test(name)
          ? "Camera access was blocked. Allow the camera for this site in your browser settings, then try again."
          : /unsupported/i.test(name)
            ? "This browser can't open the camera. Use Chrome or Safari on your phone."
            : /NotFound|Overconstrained/i.test(name)
              ? "Iris couldn't find a front camera on this device."
              : "The scanner couldn't start. Check your internet connection and try again.",
      );
    }
  }, [enterAlign, stopCamera]);

  // Attach the camera to the <video> once it's on the page, then start the frame loop.
  useEffect(() => {
    if (phase !== "align") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;
    video.srcObject = stream;
    video.play().then(
      () => {
        navigator.wakeLock?.request("screen").then((l) => (wakeLockRef.current = l), () => {});
        if (loopRef.current === null) loopRef.current = requestAnimationFrame(() => frameRef.current());
      },
      (e) => {
        console.error("camera preview failed", e);
        stopCamera();
        setPhase("intro");
        setError("The camera preview couldn't start. Try again.");
      },
    );
  }, [phase, stopCamera]);

  const cancel = () => {
    stopCamera();
    recordingRef.current = null;
    setFlash(null);
    setPhase("intro");
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ source: "camera", metrics: { ...result.metrics, ...photoMetrics(photo) } }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<Scan> & { error?: string };
      if (!res.ok) throw new Error(json.error || "The scan couldn't be saved.");
      router.push("/dashboard");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "The scan couldn't be saved.");
      setSaving(false);
    }
  };

  // ---------- Render ----------

  const cameraOn = phase === "align" || phase === "countdown" || phase === "recording";
  const other = OTHER_EYE[eye];
  const allButCover = align.found && align.centered && align.distance === "ok" && align.open && align.sharp && align.steady;

  return (
    <div className="min-h-[100dvh] bg-background">
      {phase === "intro" || phase === "loading" ? (
        <Intro consent={consent} onConsent={setConsent} onStart={openCamera} loading={phase === "loading"} error={error} />
      ) : null}

      {phase === "results" && result ? (
        <Results result={result} photo={photo} saving={saving || photo.status === "loading"} saveError={saveError} onSave={save} onRetake={openCamera} />
      ) : null}

      {cameraOn && (
        // Above the site's floating chat button (z-40), including during the flashes.
        <div className="fixed inset-0 z-[60] bg-black text-white">
          <div className="absolute inset-0 -scale-x-100">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          </div>
          {debug && <canvas ref={debugRef} width={PRECISION_CROP} height={PRECISION_CROP + 28} className="absolute left-3 top-16 z-[70] w-40 rounded-lg border border-white/40" />}
          {/* Screen light: a white frame that lights the eye when the camera needs more light. */}
          <ScreenLight level={screen} />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/90 to-transparent" />

          <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <button type="button" onClick={cancel} aria-label="Stop the scan" className="flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <X className="size-5" />
            </button>
            <EyeSteps eye={eye} />
            <button
              type="button"
              onClick={() => setVoice((v) => !v)}
              aria-label={voice ? "Turn voice guidance off" : "Turn voice guidance on"}
              className="flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"
            >
              {voice ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </button>
          </header>

          {phase === "align" && (
            // The target ring: put the eye here. Sized as a share of the screen width, like RING.
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors",
                align.hold > 0 ? "border-emerald-300" : align.centered ? "border-white" : "border-dashed border-white/50",
              )}
              style={{ top: `${RING.y * 100}%`, width: `${RING.radius * 200}vw` }}
            />
          )}

          {phase === "align" && (
            <BottomSheet
              eyebrow={`${cap(eye)} eye · ${EYE_ORDER.indexOf(eye) + 1} of 2`}
              title={align.distance === "ok" ? `Hold still on your ${eye} eye` : `Get close to your ${eye} eye`}
              body={`Cover your ${other} eye with your hand. Bring the phone about 15 cm (6 in) from your ${eye} eye, until it fills the ring.`}
              icon={<Hand className="size-5" />}
            >
              <div>
                <div className="flex justify-between text-[11px] text-white/60">
                  <span>{align.distance === "close" ? "Too close, move back a little" : "Closer"}</span>
                  <span>Close enough</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className={cn("h-full rounded-full transition-all", align.distance === "ok" ? "bg-emerald-300" : "bg-white/70")} style={{ width: `${align.closeness * 100}%` }} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Chip ok={align.found && align.centered} label={align.found ? `${cap(eye)} eye in the ring` : `Looking for your ${eye} eye`} />
                <Chip ok={align.distance === "ok"} label={align.distance === "close" ? "Move back a little" : "Close enough"} />
                <Chip ok={align.sharp} label={pupilLabel(align)} />
                <Chip ok={align.open} label="Eye open" />
                <Chip ok={align.covered} label={`${cap(other)} eye covered`} />
                <Chip ok={align.steady} label="Steady" />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs tabular-nums ring-1 ring-white/10">
                <span className="text-white/60">Pupil</span>
                <span className="font-semibold">{align.pupilMm === null ? "–" : `${align.pupilMm.toFixed(2)} mm`}</span>
                <span className="text-white/60">Tracking</span>
                <span className="font-semibold">{Math.round(align.tracking * 100)}%</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10" aria-label="Holding steady">
                <div className="h-full bg-emerald-300 transition-[width]" style={{ width: `${align.hold * 100}%` }} />
              </div>
              <p className="mt-2 text-center text-xs text-white/60">
                {align.hold > 0 ? "Locked on. Hold still, the flash starts by itself." : "The flash starts by itself once everything is green."}
              </p>
              {manualStart && allButCover && !align.covered && (
                <button type="button" onClick={startCountdown} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/30 text-sm font-medium">
                  My {other} eye is covered, start
                </button>
              )}
            </BottomSheet>
          )}

          {(phase === "countdown" || phase === "recording") && (
            <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: flash ? STIM_BG[flash] : "#000" }}>
              {/* The same screen light as while lining up, so the only change in light is the flash. */}
              {!flash && <ScreenLight level={screen} />}
              {/* Keep the eye near the camera: the dot sits at the top of the screen. */}
              <div className={cn("mt-[10vh] size-3 rounded-full transition-colors", flash ? "bg-black/70" : "bg-white/80")} />
              {phase === "countdown" ? (
                <div className="mb-auto mt-auto text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/60">{cap(eye)} eye</p>
                  <p className="mt-2 text-8xl font-semibold tabular-nums">{countdown}</p>
                  <p className="mt-4 text-sm text-white/70">Look at the dot. Keep your {other} eye covered. Try not to blink.</p>
                </div>
              ) : (
                !flash && (
                  <div className="mb-16 mt-auto w-48">
                    <div className="h-1 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full bg-white/70" style={{ width: `${progress * 100}%` }} />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Debug view: the iris close-up the pupil is measured on, with the iris (white) and pupil (green) found. */
function drawDebug(canvas: HTMLCanvasElement | null, target: { crop: ImageData; pupilCropPx: number; contrast: number; coverage: number; light: number } | null) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!target) return;
  ctx.putImageData(target.crop, 0, 0);
  const c = PRECISION_CROP / 2;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(c, c, c / CROP_SPAN, 0, Math.PI * 2);
  ctx.stroke();
  if (Number.isFinite(target.pupilCropPx)) {
    ctx.strokeStyle = "#86efac";
    ctx.beginPath();
    ctx.arc(c, c, target.pupilCropPx, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  const ratio = Number.isFinite(target.pupilCropPx) ? (target.pupilCropPx / (c / CROP_SPAN)).toFixed(2) : "–";
  ctx.fillText(`p/i ${ratio}  con ${target.contrast.toFixed(0)}  cov ${target.coverage.toFixed(2)}  lt ${target.light.toFixed(0)}`, 4, PRECISION_CROP + 18);
}

/**
 * Is the eye inside the on-screen ring? The preview is mirrored and fills the screen like
 * CSS object-fit: cover, so map the eye from camera pixels to screen pixels first.
 */
function inRing(eye: { cx: number; cy: number }, vw: number, vh: number, view: HTMLElement | null) {
  const sw = view?.clientWidth || vw;
  const sh = view?.clientHeight || vh;
  const scale = Math.max(sw / vw, sh / vh);
  const x = sw / 2 + (vw / 2 - eye.cx) * scale; // mirrored
  const y = sh / 2 + (eye.cy - vh / 2) * scale;
  return Math.hypot(x - sw * RING.x, y - sh * RING.y) <= sw * RING.radius;
}

/** Ask for sharp, steady close-up video: continuous focus, and a little zoom where the phone allows it. */
async function sharpenCamera(track: MediaStreamTrack | undefined) {
  if (!track?.getCapabilities) return;
  const caps = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[]; zoom?: { min: number; max: number } };
  const advanced: Record<string, unknown> = {};
  if (caps.focusMode?.includes("continuous")) advanced.focusMode = "continuous";
  if (caps.zoom && caps.zoom.max >= 1.5) advanced.zoom = Math.min(2, caps.zoom.max);
  if (!Object.keys(advanced).length) return;
  try {
    await track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] });
  } catch {
    // Not supported on this phone; the defaults still work.
  }
}

/** The white frame around the screen that lights the eye. */
function ScreenLight({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ boxShadow: `inset 0 0 0 ${SCREEN_LIGHT.frame} rgba(255,255,255,${level.toFixed(3)})` }}
    />
  );
}

/** The pupil chip: says what's wrong with the light before blaming the focus. */
function pupilLabel(align: Align) {
  if (align.sharp) return "Pupil sharp";
  if (align.light === "bright") return "Too bright, dim the room";
  if (align.light === "dark" || (align.light === null && align.screen > 0))
    return align.screen >= SCREEN_LIGHT.max ? "Too dark, add soft light" : "Lighting your eye…";
  return align.found ? "Hold still, finding pupil" : "Pupil not found yet";
}

function EyeSteps({ eye }: { eye: PersonEye }) {
  const index = EYE_ORDER.indexOf(eye);
  return (
    <div className="flex items-center gap-2 text-[11px] font-medium" aria-label={`${cap(eye)} eye, ${index + 1} of 2`}>
      {EYE_ORDER.map((e, i) => (
        <span key={e} className={cn("rounded-full px-2.5 py-1 transition-colors", i === index ? "bg-white text-black" : i < index ? "bg-white/30" : "bg-white/10 text-white/60")}>
          {i < index ? "✓ " : ""}
          {cap(e)} eye
        </span>
      ))}
    </div>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-xs ring-1 transition-colors", ok ? "bg-white/15 ring-white/40" : "bg-white/5 text-white/60 ring-white/10")}>
      {ok ? <Check className="size-4" /> : <CircleDashed className="size-4" />}
      {label}
    </div>
  );
}

function BottomSheet({ eyebrow, title, body, icon, children }: { eyebrow: string; title: string; body: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-3 bottom-3 rounded-3xl border border-white/10 bg-black/60 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      <p className="text-[11px] font-medium uppercase tracking-widest text-white/60">{eyebrow}</p>
      <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold">
        {icon}
        {title}
      </h2>
      <p className="mt-1 text-sm text-white/70">{body}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Intro({
  consent,
  onConsent,
  onStart,
  loading,
  error,
}: {
  consent: boolean;
  onConsent: (v: boolean) => void;
  onStart: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <main className="mx-auto max-w-xl px-5 pb-16 pt-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <h1 className="mt-6 flex items-center gap-3 text-3xl font-bold tracking-tight">
        Pupil reflex test <span className="rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Experimental</span>
      </h1>
      <p className="mt-2 text-muted-foreground">About 30 seconds, one eye at a time. Your screen flashes once for each eye, then you get your three results.</p>
      <p className="mt-3 rounded-2xl border p-3 text-sm text-muted-foreground">
        Measuring the pupil with an ordinary phone camera is unreliable, especially with dark eyes, so many results come back &quot;unclear&quot;. For a
        description of how the eye looks, use the{" "}
        <Link href="/dashboard/eye-check" className="font-medium text-foreground underline underline-offset-4">
          eye photo check
        </Link>{" "}
        instead.
      </p>

      <ol className="mt-6 space-y-3">
        {SCAN_STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl border bg-card p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">{i + 1}</span>
            <div>
              <p className="font-medium">{s.title}</p>
              <p className="text-sm text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-2xl border p-4 text-sm">
        <p className="font-medium">Before you start</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Turn your screen brightness all the way up and use a softly lit room, not a dark one. If the camera needs more light, the screen lights your eye.</li>
          <li>Take off glasses. Contact lenses are fine.</li>
          <li>You&apos;ll hold the phone close, about 15 cm (6 in) from one eye, while your hand covers the other.</li>
          <li>Rest your elbow on a table so the phone stays steady.</li>
        </ul>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 size-4 accent-foreground" />
        <span className="text-muted-foreground">
          I understand Iris is a student research prototype, not a medical test. The screen flashes bright light twice, close to my eyes, so I won&apos;t use
          it if flashing lights affect me. Video stays on my phone; only the numbers are saved.
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-foreground/40 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!consent || loading}
        onClick={onStart}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        {loading ? "Loading the eye tracker…" : "Open camera"}
      </button>
    </main>
  );
}

function Results({
  result,
  photo,
  saving,
  saveError,
  onSave,
  onRetake,
}: {
  result: CameraScanResult;
  photo: PhotoState;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onRetake: () => void;
}) {
  const metrics = { ...result.metrics, ...photoMetrics(photo) };
  const statuses = rateScan(metrics);
  const scanLike = { ...statuses } as Pick<Scan, "diabetes_status" | "glaucoma_status" | "cataract_status">;
  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Your three results</h1>
      <p className="mt-2 text-muted-foreground">From this camera scan. Save it to see how your checks change over time.</p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {CHECK_VIEWS.map((c) => {
          const status = c.statusOf(scanLike as Scan);
          return (
          <article key={c.id} className="flex flex-col rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
                <c.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-tight">{c.name}</h2>
                <p className="truncate text-[11px] text-muted-foreground">{c.signal}</p>
              </div>
            </div>
            <div className="mt-3">
              <StatusBadge status={status} />
            </div>
            <dl className="mt-4 space-y-1 border-t pt-3 text-xs">
              {c.details(metrics).map((d) => (
                <div key={d.label} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{d.label}</dt>
                  {/* Numbers from an unclear recording would only mislead. */}
                  <dd className="font-medium tabular-nums">{status === "unclear" ? "–" : d.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-auto pt-3 text-[11px] text-muted-foreground">If flagged: {c.nextStep}</p>
          </article>
          );
        })}
      </div>

      <PhotoMatch photo={photo} />

      {result.warnings.length > 0 && (
        <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm">
          <p className="font-medium">About this recording</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <p role="alert" className="mt-4 rounded-2xl border border-foreground/40 px-4 py-3 text-sm">
          {saveError}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground sm:flex-1 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save to my dashboard
        </button>
        <button type="button" onClick={onRetake} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border sm:flex-1 text-sm font-medium hover:bg-accent">
          <RotateCcw className="size-4" /> Scan again
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Iris is a student research prototype, not a medical device. It can&apos;t diagnose or rule out diabetes, glaucoma or cataracts, and its
        cut-offs are provisional. Only the numbers are saved, never images.
      </p>
    </main>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(id);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(id);
        reject(e);
      },
    );
  });
}

const PHOTO_METRIC: Record<PhotoCondition, keyof ScanMetrics> = {
  cataract: "photoCataract",
  conjunctivitis: "photoConjunctivitis",
  uveitis: "photoUveitis",
  eyelid: "photoEyelid",
};

/** Highest score across the eyes that could be compared, for each condition. */
function photoMetrics(photo: PhotoState): ScanMetrics {
  if (photo.status !== "done") return {};
  const eyes = Object.values(photo.data.eyes).filter((e) => e?.usable);
  if (eyes.length === 0) return {};
  const out: ScanMetrics = {};
  for (const c of Object.keys(PHOTO_METRIC) as PhotoCondition[]) {
    out[PHOTO_METRIC[c]] = Math.round(Math.max(...eyes.map((e) => e!.probs[c])) * 1000) / 1000;
  }
  return out;
}
