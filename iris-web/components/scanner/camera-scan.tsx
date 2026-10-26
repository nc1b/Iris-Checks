"use client";

import { useAuth } from "@clerk/nextjs";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { ArrowLeft, Camera, Check, CircleDashed, Hand, Loader2, RotateCcw, Save, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CHECK_VIEWS, StatusBadge } from "@/components/dashboard/status";
import type { StimulusColor } from "@/lib/analysis";
import {
  CLOSE_UP,
  combineEyes,
  EYE_ORDER,
  EYE_PROTOCOL,
  FLASH_DARK_TOP,
  frameChecks,
  IMAGE_SIDE,
  LIGHT,
  LineUpHold,
  MATCH_DISTANCE,
  nextScreenLight,
  OTHER_EYE,
  PRECISION_CROP,
  recordedIrisPx,
  recordFrame,
  SCREEN_LIGHT,
  Steadiness,
  type CameraScanResult,
  type EyeRecording,
  type ImageSide,
  type PersonEye,
  type RecordingState,
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
import { eyeAspectRatio, LANDMARKS } from "@/lib/pupil";
import { IRIS_DIAMETER_MM } from "@/lib/reference";
import { rateScan } from "@/lib/scan-rating";
import { greyFrame, type IrisGuess } from "@/lib/eye-search";
import { EyeTracker, readEye, type EyeReading, type FaceEye, type FrameSource } from "@/lib/eye-tracker";
import { cn } from "@/lib/utils";
import { PhotoMatch, type PhotoState } from "./photo-match";

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const FAR_IRIS_PX = 11;
const MANUAL_START_MS = 6000;
const TRACK_WINDOW = 30;
const RING = { x: 0.5, y: 0.22, radius: 0.18 };
const IRIS_IN_RING = 0.4;

type Phase = "intro" | "loading" | "align" | "countdown" | "recording" | "results";

type Align = {
  found: boolean;
  centered: boolean;
  distance: "far" | "close" | "ok" | null;
  matching: boolean;
  pupilUnseen: boolean;
  closeness: number;
  open: boolean;
  sharp: boolean;
  covered: boolean;
  steady: boolean;
  pupilMm: number | null;
  tracking: number;
  hold: number;
  light: "dark" | "ok" | "bright" | null;
  screen: number;
};

const EMPTY_ALIGN: Align = {
  found: false,
  centered: false,
  distance: null,
  matching: false,
  pupilUnseen: false,
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
  const holdRef = useRef(new LineUpHold());
  const steadyRef = useRef(new Steadiness());
  const trackRef = useRef<boolean[]>([]);
  const pupilMmRef = useRef<number | null>(null);
  const trackerRef = useRef(new EyeTracker());
  const greyRef = useRef<HTMLCanvasElement | null>(null);
  const otherSeenRef = useRef(0);
  const [debug] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"));
  const debugRef = useRef<HTMLCanvasElement>(null);
  const screenRef = useRef(0);
  const firstEyeRef = useRef<{ irisR: number } | null>(null);
  const [screen, setScreen] = useState(0);
  const frameCountRef = useRef(0);
  const recordingRef = useRef<RecordingState | null>(null);
  const recordingsRef = useRef<Record<PersonEye, EyeRecording | null>>({ right: null, left: null });
  const frameRef = useRef<() => void>(() => {});
  const timersRef = useRef<number[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const voiceRef = useRef(true);
  const eyePhotosRef = useRef<Record<PersonEye, { canvas: HTMLCanvasElement; score: number; at: number } | null>>({ right: null, left: null });

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

  const frameSource = useCallback((video: HTMLVideoElement): FrameSource => {
    cropRef.current ??= document.createElement("canvas");
    greyRef.current ??= document.createElement("canvas");
    const crop = cropRef.current;
    const grey = greyRef.current;
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      grey: () => greyFrame(video, grey),
      crop: (cx, cy, half, size) => {
        if (crop.width !== size || crop.height !== size) {
          crop.width = size;
          crop.height = size;
        }
        const ctx = crop.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(video, cx - half, cy - half, half * 2, half * 2, 0, 0, size, size);
        return ctx.getImageData(0, 0, size, size);
      },
    };
  }, []);

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

  const enterAlign = useCallback(
    (next: PersonEye) => {
      clearTimers();
      holdRef.current.reset();
      steadyRef.current.reset();
      trackerRef.current.reset();
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

  const runPhotoMatch = useCallback(async () => {
    const photos = eyePhotosRef.current;
    const eyes = EYE_ORDER.filter((e) => photos[e]);
    if (eyes.length === 0) {
      setPhoto({ status: "none" });
      return;
    }
    setPhoto({ status: "loading" });
    try {
      const json = await withTimeout(
        (async () => {
          const body: Partial<Record<PersonEye, number[]>> = {};
          for (const e of eyes) body[e] = await embedEyePhoto(photos[e]!.canvas);
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
    current.rec.screen = screenRef.current;
    recordingsRef.current[current.eye] = current.rec;
    const size = recordedIrisPx(current.rec, IMAGE_SIDE[current.eye]);
    if (current.eye === EYE_ORDER[0]) firstEyeRef.current = size === null ? null : { irisR: size };
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
        recordingRef.current = { start: performance.now(), eye: eyeRef.current, rec: { samples: [], haze: [] } };
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
      const src = frameSource(video);
      const target =
        current === "recording" || current === "align" || current === "countdown"
          ? trackerRef.current.track(src, {
              model: has ? landmarkIris(lm, targetSide, vw, vh) : null,
              face: has ? faceEye(lm, targetSide, vw, vh) : null,
              ring: ringSearch(vw, vh, overlayRef.current),
              ts,
              recording: current !== "align",
            })
          : null;

      const rec = recordingRef.current;
      if (current === "recording" && rec) {
        const t = (ts - rec.start) / 1000;
        const stim = EYE_PROTOCOL.stimuli.find((s) => t >= s.onset && t < s.offset);
        setFlash(stim ? stim.color : null);
        setProgress(Math.min(1, t / EYE_PROTOCOL.duration));
        recordFrame(rec, t, target, targetSide);
        if (t >= EYE_PROTOCOL.duration) finishEye();
      } else if (current === "align") {
        const otherSide = IMAGE_SIDE[OTHER_EYE[targetEye]];
        const other = has ? readEye(src, landmarkIris(lm, otherSide, vw, vh), faceEye(lm, otherSide, vw, vh), false) : null;
        const second = targetEye !== EYE_ORDER[0];
        const match = second ? (firstEyeRef.current?.irisR ?? null) : null;
        const checks = frameChecks(target, match);
        const steady = steadyRef.current.update(ts / 1000, target);
        const { sharp } = checks;
        const otherVisible = !!other && other.ear >= 0.15 && Number.isFinite(other.pupilR) && other.contrast >= CLOSE_UP.minContrast && other.coverage >= CLOSE_UP.minCoverage;
        otherSeenRef.current = otherVisible ? otherSeenRef.current + 1 : 0;
        trackRef.current.push(sharp);
        if (trackRef.current.length > TRACK_WINDOW) trackRef.current.shift();
        if (sharp && target) {
          const mm = (target.pupilR / target.irisR) * IRIS_DIAMETER_MM;
          pupilMmRef.current = pupilMmRef.current === null ? mm : pupilMmRef.current * 0.8 + mm * 0.2;
        }

        const lightLevel = target?.light ?? null;
        screenRef.current = nextScreenLight(screenRef.current, lightLevel, second);

        const irisR = target?.irisR ?? 0;
        const nearEnough = match ? match * (1 - MATCH_DISTANCE) : CLOSE_UP.minIrisPx;
        const next: Align = {
          found: !!target,
          centered: !!target && inRing(target, vw, vh, overlayRef.current),
          distance: checks.distance,
          matching: match !== null,
          pupilUnseen: false,
          closeness: Math.min(1, Math.max(0, (irisR - FAR_IRIS_PX) / (nearEnough - FAR_IRIS_PX))),
          open: checks.open,
          sharp,
          covered: otherSeenRef.current < CLOSE_UP.uncoveredFrames,
          steady,
          pupilMm: pupilMmRef.current,
          tracking: trackRef.current.filter(Boolean).length / Math.max(1, trackRef.current.length),
          hold: 0,
          light: lightLevel === null ? null : lightLevel < LIGHT.dark ? "dark" : lightLevel > LIGHT.bright ? "bright" : "ok",
          screen: screenRef.current,
        };
        const good = holdRef.current.update(ts / 1000, next);
        next.pupilUnseen = holdRef.current.pupilUnseen();
        if (target && next.centered && next.distance === "ok" && next.open && (next.sharp || next.pupilUnseen) && next.steady) {
          const score = next.sharp ? target.contrast * target.coverage : 1;
          const kept = eyePhotosRef.current[targetEye];
          if ((!kept || score > kept.score) && ts - (kept?.at ?? 0) > 200) {
            const canvas = captureEyePhoto(video, target.cx, target.cy, target.eyeWidth * 1.1);
            if (canvas) eyePhotosRef.current[targetEye] = { canvas, score, at: ts };
          }
        }
        next.hold = Math.min(1, holdRef.current.frames / CLOSE_UP.holdFrames);
        drawOverlay(target, other, good, vw, vh);
        if (debug && frameCountRef.current % 2 === 0) drawDebug(debugRef.current, target);
        if (++frameCountRef.current % 3 === 0 || good !== (align.hold > 0)) {
          setAlign(next);
          setScreen(screenRef.current);
        }
        if (holdRef.current.done) startCountdown();
      }
    }
    loopRef.current = requestAnimationFrame(() => frameRef.current());
  }, [align.hold, debug, drawOverlay, finishEye, frameSource, startCountdown]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  const openCamera = useCallback(async () => {
    setError(null);
    setPhase("loading");
    recordingsRef.current = { right: null, left: null };
    eyePhotosRef.current = { right: null, left: null };
    firstEyeRef.current = null;
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
      loadEyeEmbedder().catch(() => {});
      streamRef.current = stream;
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
        <div className="fixed inset-0 z-[60] bg-black text-white">
          <div className="absolute inset-0 -scale-x-100">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          </div>
          {debug && <canvas ref={debugRef} width={PRECISION_CROP} height={PRECISION_CROP + 28} className="absolute left-3 top-16 z-[70] w-40 rounded-lg border border-white/40" />}
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
              title={align.distance === "ok" ? `Hold still on your ${eye} eye` : align.matching ? `Same distance as your ${other} eye` : `Get close to your ${eye} eye`}
              body={
                align.matching
                  ? `Cover your ${other} eye with your hand. Hold the phone as close to your ${eye} eye as it was to your ${other} eye, so both get the same flash.`
                  : `Cover your ${other} eye with your hand. Bring the phone about 15 cm (6 in) from your ${eye} eye, until it fills the ring.`
              }
              icon={<Hand className="size-5" />}
            >
              <div>
                <div className="flex justify-between text-[11px] text-white/60">
                  <span>{align.distance === "close" ? "Too close, move back a little" : "Closer"}</span>
                  <span>{align.matching ? "Same distance" : "Close enough"}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className={cn("h-full rounded-full transition-all", align.distance === "ok" ? "bg-emerald-300" : "bg-white/70")} style={{ width: `${align.closeness * 100}%` }} />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Chip ok={align.found && align.centered} label={align.found ? `${cap(eye)} eye in the ring` : `Looking for your ${eye} eye`} />
                <Chip ok={align.distance === "ok"} label={align.distance === "close" ? "Move back a little" : align.matching ? (align.distance === "far" ? "A little closer" : "Same distance") : "Close enough"} />
                <Chip ok={align.sharp || align.pupilUnseen} label={pupilLabel(align)} />
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
            <div
              className="fixed inset-0 z-50 flex flex-col items-center"
              style={{ background: flash ? `linear-gradient(#000 ${FLASH_DARK_TOP * 100}%, ${STIM_BG[flash]} ${FLASH_DARK_TOP * 100}%)` : "#000" }}
            >
              {!flash && <ScreenLight level={screen} />}
              <div className="mt-[10vh] size-3 rounded-full bg-white/80" />
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

function drawDebug(canvas: HTMLCanvasElement | null, target: EyeReading | null) {
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!target) return;
  ctx.putImageData(target.crop, 0, 0);
  const ring = (c: { x: number; y: number; r: number }, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();
  };
  ctx.lineWidth = 1.5;
  ring(target.cropIris, target.irisFitted ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)");
  if (target.cropPupil) ring(target.cropPupil, "#86efac");
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  const ratio = target.cropPupil ? (target.cropPupil.r / target.cropIris.r).toFixed(2) : "–";
  const haze = target.haze === null ? "–" : target.haze.toFixed(2);
  ctx.fillText(`p/i ${ratio} con ${target.contrast.toFixed(0)} cov ${target.coverage.toFixed(2)} lt ${target.light.toFixed(0)} hz ${haze}`, 4, PRECISION_CROP + 18);
}

function landmarkIris(lm: { x: number; y: number }[], side: ImageSide, vw: number, vh: number): IrisGuess {
  const L = LANDMARKS[side];
  const c = lm[L.irisCenter];
  const r = L.iris.reduce((s, i) => s + Math.hypot((lm[i].x - c.x) * vw, (lm[i].y - c.y) * vh), 0) / L.iris.length;
  return { x: c.x * vw, y: c.y * vh, r };
}

function faceEye(lm: { x: number; y: number }[], side: ImageSide, vw: number, vh: number): FaceEye {
  const L = LANDMARKS[side];
  return {
    eyeWidth: Math.hypot((lm[L.inner].x - lm[L.outer].x) * vw, (lm[L.inner].y - lm[L.outer].y) * vh),
    ear: eyeAspectRatio(lm, L.upper, L.lower, L.inner, L.outer, vw / vh),
  };
}

function ringSearch(vw: number, vh: number, view: HTMLElement | null) {
  const sw = view?.clientWidth || vw;
  const sh = view?.clientHeight || vh;
  const scale = Math.max(sw / vw, sh / vh);
  const ringR = (sw * RING.radius) / scale;
  return {
    guess: { x: vw / 2 - (sw * RING.x - sw / 2) / scale, y: vh / 2 + (sh * RING.y - sh / 2) / scale, r: ringR * IRIS_IN_RING },
    reach: ringR,
    radii: [0.5, 0.7, 0.9, 1.1, 1.4, 1.8],
  };
}

function inRing(eye: { cx: number; cy: number }, vw: number, vh: number, view: HTMLElement | null) {
  const sw = view?.clientWidth || vw;
  const sh = view?.clientHeight || vh;
  const scale = Math.max(sw / vw, sh / vh);
  const x = sw / 2 + (vw / 2 - eye.cx) * scale;
  const y = sh / 2 + (eye.cy - vh / 2) * scale;
  return Math.hypot(x - sw * RING.x, y - sh * RING.y) <= sw * RING.radius;
}

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
  }
}

function ScreenLight({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ borderStyle: "solid", borderColor: `rgba(255,255,255,${level.toFixed(3)})`, borderWidth: `0 ${SCREEN_LIGHT.frame} ${SCREEN_LIGHT.frame}` }}
    />
  );
}

function pupilLabel(align: Align) {
  if (align.sharp) return "Pupil sharp";
  if (align.pupilUnseen) return "Pupil hard to see, going ahead";
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
        Measuring the pupil with an ordinary phone camera is hard, especially with dark eyes. When Iris can&apos;t measure clearly, it says
        &quot;unclear&quot; rather than guess. For a description of how the eye looks, use the{" "}
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
        Iris is a student research prototype, not a medical device. It can&apos;t diagnose or rule out diabetic retinopathy, glaucoma or cataracts, and its
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
