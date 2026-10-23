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
  combineScan,
  IMAGE_SIDE,
  measureHaze,
  ONE_EYE_STAGES,
  PERSON_EYE,
  STAGE_PROTOCOL,
  type CameraScanResult,
  type HazeReading,
  type ImageSide,
  type Stage,
} from "@/lib/camera-scan";
import { SCAN_STEPS } from "@/lib/checks";
import type { Scan } from "@/lib/dashboard-types";
import { CROP_SIZE, CROP_SPAN, eyeAspectRatio, LANDMARKS, measurePupil } from "@/lib/pupil";
import { rateScan } from "@/lib/scan-rating";
import { cn } from "@/lib/utils";

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const OPEN_EAR = 0.18; // eye aspect ratio above this = eye open
const MIN_CONTRAST = 12; // pupil vs iris brightness needed to measure the pupil
const READY_FRAMES = 15; // ~0.5 s of good line-up before Start unlocks
const COVER_FRAMES = 20; // ~0.7 s of one eye covered before the flash starts by itself
const MANUAL_START_MS = 5000; // offer a manual start if cover detection doesn't settle

type Phase = "intro" | "loading" | "lineup" | "cover" | "countdown" | "recording" | "results";
type Checks = { face: boolean; distance: "ok" | "far" | "close" | null; open: boolean; pupils: boolean };
type CoverState = { covered: boolean; lit: boolean };

type EyeReading = {
  cx: number;
  cy: number;
  irisR: number;
  pupilR: number;
  contrast: number;
  ear: number;
  crop: ImageData;
  pupilCropPx: number;
};

const STIM_BG: Record<StimulusColor, string> = { white: "#ffffff", red: "#ff0000", blue: "#0000ff" };

const STAGE_TEXT: Record<Stage, { step: string; title: string; body: string }> = {
  both: { step: "Flash 1 of 3", title: "Both eyes", body: "Look at the dot and keep both eyes open." },
  leftLit: { step: "Flash 2 of 3", title: "Cover your right eye", body: "Cover your right eye with your palm. Keep your left eye open on the dot." },
  rightLit: { step: "Flash 3 of 3", title: "Cover your left eye", body: "Now cover your left eye. Keep your right eye open on the dot." },
};

const nameOf = { left: "left", right: "right" } as const;

export function CameraScan() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("intro");
  const [stage, setStage] = useState<Stage>("both");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Checks>({ face: false, distance: null, open: false, pupils: false });
  const [ready, setReady] = useState(false);
  const [cover, setCover] = useState<CoverState>({ covered: false, lit: false });
  const [manualStart, setManualStart] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [flash, setFlash] = useState<StimulusColor | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CameraScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [voice, setVoice] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cropRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const phaseRef = useRef<Phase>("intro");
  const stageRef = useRef<Stage>("both");
  const goodFramesRef = useRef(0);
  const coverFramesRef = useRef(0);
  const recordingRef = useRef<{ start: number; samples: Sample[]; stage: Stage } | null>(null);
  const hazeRef = useRef<HazeReading[]>([]);
  const recordingsRef = useRef<{ both: Sample[] | null; leftLit: Sample[] | null; rightLit: Sample[] | null }>({ both: null, leftLit: null, rightLit: null });
  const frameRef = useRef<() => void>(() => {});
  const timersRef = useRef<number[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const voiceRef = useRef(true);

  // Sign-in is needed to save results, same as the dashboard.
  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
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

  const readEye = useCallback((lm: { x: number; y: number }[], side: ImageSide, vw: number, vh: number): EyeReading | null => {
    const video = videoRef.current;
    if (!video) return null;
    const L = LANDMARKS[side];
    const c = lm[L.irisCenter];
    const cx = c.x * vw;
    const cy = c.y * vh;
    const irisR = L.iris.reduce((s, i) => s + Math.hypot((lm[i].x - c.x) * vw, (lm[i].y - c.y) * vh), 0) / L.iris.length;
    if (!Number.isFinite(irisR) || irisR < 3) return null;
    if (!cropRef.current) {
      cropRef.current = document.createElement("canvas");
      cropRef.current.width = CROP_SIZE;
      cropRef.current.height = CROP_SIZE;
    }
    const ctx = cropRef.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const half = irisR * CROP_SPAN;
    ctx.drawImage(video, cx - half, cy - half, half * 2, half * 2, 0, 0, CROP_SIZE, CROP_SIZE);
    const crop = ctx.getImageData(0, 0, CROP_SIZE, CROP_SIZE);
    const reading = measurePupil(crop);
    if (!reading) return null;
    const ear = eyeAspectRatio(lm, L.upper, L.lower, L.inner, L.outer, vw / vh);
    return {
      cx,
      cy,
      irisR,
      pupilR: reading.pupilPx * (irisR / reading.irisPx),
      contrast: reading.contrast,
      ear,
      crop,
      pupilCropPx: reading.pupilPx,
    };
  }, []);

  const measurable = (e: EyeReading | null) => !!e && e.ear > OPEN_EAR && e.contrast >= MIN_CONTRAST && Number.isFinite(e.pupilR);

  const drawOverlay = useCallback((eyes: (EyeReading | null)[], vw: number, vh: number) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, vw, vh);
    ctx.lineWidth = Math.max(2, vw / 360);
    for (const e of eyes) {
      if (!e) continue;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(e.cx, e.cy, e.irisR, 0, Math.PI * 2);
      ctx.stroke();
      if (Number.isFinite(e.pupilR)) {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.arc(e.cx, e.cy, e.pupilR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // ---------- Flow ----------

  const finishScan = useCallback(() => {
    stopCamera();
    const recs = recordingsRef.current;
    if (!recs.both) return;
    setResult(combineScan({ both: recs.both, haze: hazeRef.current, leftLit: recs.leftLit, rightLit: recs.rightLit }));
    setPhase("results");
    say("Scan complete.");
  }, [say, stopCamera]);

  const enterCover = useCallback(
    (next: Exclude<Stage, "both">) => {
      coverFramesRef.current = 0;
      setCover({ covered: false, lit: false });
      setManualStart(false);
      setStage(next);
      setPhase("cover");
      say(STAGE_TEXT[next].body);
      timersRef.current.push(window.setTimeout(() => setManualStart(true), MANUAL_START_MS));
    },
    [say],
  );

  const finishStage = useCallback(() => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    setFlash(null);
    if (!rec) return;
    recordingsRef.current[rec.stage] = rec.samples;
    if (rec.stage === "both") enterCover("leftLit");
    else if (rec.stage === "leftLit") enterCover("rightLit");
    else finishScan();
  }, [enterCover, finishScan]);

  const startCountdown = useCallback(() => {
    if (phaseRef.current === "countdown" || phaseRef.current === "recording") return;
    clearTimers();
    phaseRef.current = "countdown";
    setPhase("countdown");
    setCountdown(3);
    if (stageRef.current === "both") {
      document.documentElement.requestFullscreen?.().catch(() => {});
      say("Look at the dot. Try not to blink.");
    }
    [2, 1].forEach((n, i) => timersRef.current.push(window.setTimeout(() => setCountdown(n), (i + 1) * 1000)));
    timersRef.current.push(
      window.setTimeout(() => {
        recordingRef.current = { start: performance.now(), samples: [], stage: stageRef.current };
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
      const eyes: Record<ImageSide, EyeReading | null> = {
        left: lm && lm.length >= 478 ? readEye(lm, "left", vw, vh) : null,
        right: lm && lm.length >= 478 ? readEye(lm, "right", vw, vh) : null,
      };
      const current = phaseRef.current;
      if (current !== "recording" && current !== "countdown") drawOverlay([eyes.left, eyes.right], vw, vh);

      const rec = recordingRef.current;
      if (current === "recording" && rec) {
        const protocol = STAGE_PROTOCOL[rec.stage];
        const t = (ts - rec.start) / 1000;
        const stim = protocol.stimuli.find((s) => t >= s.onset && t < s.offset);
        setFlash(stim ? stim.color : null);
        setProgress(Math.min(1, t / protocol.duration));
        const toSample = (e: EyeReading | null) =>
          e && Number.isFinite(e.pupilR) ? { pupilPx: e.pupilR, irisPx: e.irisR, contrast: e.contrast } : undefined;

        if (rec.stage === "both") {
          rec.samples.push({
            t,
            open: (eyes.left?.ear ?? 0) > OPEN_EAR && (eyes.right?.ear ?? 0) > OPEN_EAR,
            left: toSample(eyes.left),
            right: toSample(eyes.right),
          });
          // Flash photos for the cataract check, once the camera has adjusted to the flash.
          if (stim && t >= stim.onset + 0.35) {
            for (const side of ["left", "right"] as const) {
              const e = eyes[side];
              if (!e || e.ear <= OPEN_EAR) continue;
              const haze = measureHaze(e.crop, e.pupilCropPx);
              if (haze !== null) hazeRef.current.push({ eye: PERSON_EYE[side], haze });
            }
          }
        } else {
          // Only the uncovered eye is measured; the covered one is behind a hand.
          const litSide = IMAGE_SIDE[ONE_EYE_STAGES[rec.stage].lit];
          const lit = eyes[litSide];
          rec.samples.push({ t, open: (lit?.ear ?? 0) > OPEN_EAR, [litSide]: toSample(lit) });
        }
        if (t >= protocol.duration) {
          finishStage();
          loopRef.current = requestAnimationFrame(() => frameRef.current());
          return;
        }
      } else if (current === "lineup") {
        const irisR = Math.max(eyes.left?.irisR ?? 0, eyes.right?.irisR ?? 0);
        const next: Checks = {
          face: !!lm,
          distance: !lm ? null : irisR < 11 ? "far" : irisR > 70 ? "close" : "ok",
          open: (eyes.left?.ear ?? 0) > OPEN_EAR && (eyes.right?.ear ?? 0) > OPEN_EAR,
          pupils: Math.min(eyes.left?.contrast ?? 0, eyes.right?.contrast ?? 0) >= MIN_CONTRAST,
        };
        const good = next.face && next.distance === "ok" && next.open && next.pupils;
        goodFramesRef.current = good ? goodFramesRef.current + 1 : 0;
        setChecks((p) => (p.face === next.face && p.distance === next.distance && p.open === next.open && p.pupils === next.pupils ? p : next));
        setReady(goodFramesRef.current > READY_FRAMES);
      } else if (current === "cover" && stageRef.current !== "both") {
        const { lit, covered } = ONE_EYE_STAGES[stageRef.current as Exclude<Stage, "both">];
        const litEye = eyes[IMAGE_SIDE[lit]];
        const coveredEye = eyes[IMAGE_SIDE[covered]];
        const next: CoverState = { lit: measurable(litEye), covered: !!lm && !measurable(coveredEye) };
        coverFramesRef.current = next.lit && next.covered ? coverFramesRef.current + 1 : 0;
        setCover((p) => (p.lit === next.lit && p.covered === next.covered ? p : next));
        if (coverFramesRef.current > COVER_FRAMES) startCountdown();
      }
    }
    loopRef.current = requestAnimationFrame(() => frameRef.current());
  }, [drawOverlay, finishStage, readEye, startCountdown]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  const openCamera = useCallback(async () => {
    setError(null);
    setPhase("loading");
    recordingsRef.current = { both: null, leftLit: null, rightLit: null };
    hazeRef.current = [];
    setResult(null);
    setSaveError(null);
    setStage("both");
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
      streamRef.current = await streamPromise;
      goodFramesRef.current = 0;
      setReady(false);
      // The <video> mounts with the line-up screen; the effect below attaches the stream to it.
      setPhase("lineup");
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
  }, [stopCamera]);

  // Attach the camera to the <video> once it's on the page, then start the frame loop.
  useEffect(() => {
    if (phase !== "lineup") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;
    video.srcObject = stream;
    video.play().then(
      () => {
        navigator.wakeLock?.request("screen").then((l) => (wakeLockRef.current = l), () => {});
        say("Hold the phone at eye level, about a hand's length away.");
        if (loopRef.current === null) loopRef.current = requestAnimationFrame(() => frameRef.current());
      },
      (e) => {
        console.error("camera preview failed", e);
        stopCamera();
        setPhase("intro");
        setError("The camera preview couldn't start. Try again.");
      },
    );
  }, [phase, say, stopCamera]);

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
        body: JSON.stringify({ source: "camera", metrics: result.metrics }),
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

  const cameraOn = phase === "lineup" || phase === "cover" || phase === "countdown" || phase === "recording";

  return (
    <div className="min-h-[100dvh] bg-background">
      {phase === "intro" || phase === "loading" ? (
        <Intro consent={consent} onConsent={setConsent} onStart={openCamera} loading={phase === "loading"} error={error} />
      ) : null}

      {phase === "results" && result ? <Results result={result} saving={saving} saveError={saveError} onSave={save} onRetake={openCamera} /> : null}

      {cameraOn && (
        <div className="fixed inset-0 z-[60] bg-black text-white">
          <div className="absolute inset-0 -scale-x-100">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/90 to-transparent" />

          <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <button type="button" onClick={cancel} aria-label="Stop the scan" className="flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur">
              <X className="size-5" />
            </button>
            <StageDots phase={phase} stage={stage} />
            <button
              type="button"
              onClick={() => setVoice((v) => !v)}
              aria-label={voice ? "Turn voice guidance off" : "Turn voice guidance on"}
              className="flex size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"
            >
              {voice ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
            </button>
          </header>

          {phase === "lineup" && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-[22%] flex justify-center">
                <div className={cn("h-28 w-64 rounded-[50%] border-2 border-dashed transition-colors", ready ? "border-white" : "border-white/40")} />
              </div>
              <BottomSheet eyebrow="Line up" title={ready ? "Ready" : "Line up your eyes"} body="Phone at eye level, about a hand's length away, in a dim room.">
                <div className="grid grid-cols-2 gap-2">
                  <Chip ok={checks.face} label="Face found" />
                  <Chip ok={checks.distance === "ok"} label={checks.distance === "far" ? "Move closer" : checks.distance === "close" ? "Move back" : "Distance"} />
                  <Chip ok={checks.open} label="Eyes open" />
                  <Chip ok={checks.pupils} label={checks.pupils ? "Pupils visible" : "Dim the room"} />
                </div>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={startCountdown}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-semibold text-black transition-opacity disabled:opacity-40"
                >
                  {ready ? "Start scan" : "Waiting for a clear view…"}
                </button>
              </BottomSheet>
            </>
          )}

          {phase === "cover" && stage !== "both" && (
            <BottomSheet eyebrow={STAGE_TEXT[stage].step} title={STAGE_TEXT[stage].title} body={STAGE_TEXT[stage].body} icon={<Hand className="size-5" />}>
              <div className="grid grid-cols-2 gap-2">
                <Chip ok={cover.covered} label={`${capitalize(nameOf[ONE_EYE_STAGES[stage].covered])} eye covered`} />
                <Chip ok={cover.lit} label={`${capitalize(nameOf[ONE_EYE_STAGES[stage].lit])} eye visible`} />
              </div>
              <p className="mt-3 text-center text-xs text-white/60">The flash starts by itself once Iris sees one eye covered.</p>
              {manualStart && (
                <button type="button" onClick={startCountdown} className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/30 text-sm font-medium">
                  I&apos;m covering it, start
                </button>
              )}
            </BottomSheet>
          )}

          {(phase === "countdown" || phase === "recording") && (
            <div className="fixed inset-0 z-50 flex flex-col items-center" style={{ background: flash ? STIM_BG[flash] : "#000" }}>
              {/* Keep the eyes near the camera: the dot sits at the top of the screen. */}
              <div className={cn("mt-[12vh] size-3 rounded-full transition-colors", flash ? "bg-black/70" : "bg-white/80")} />
              {phase === "countdown" ? (
                <div className="mt-auto mb-auto text-center">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/60">{STAGE_TEXT[stage].step}</p>
                  <p className="mt-2 text-8xl font-semibold tabular-nums">{countdown}</p>
                  <p className="mt-4 text-sm text-white/70">Look at the dot. Try not to blink.</p>
                </div>
              ) : (
                !flash && (
                  <div className="mt-auto mb-16 w-48">
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function StageDots({ phase, stage }: { phase: Phase; stage: Stage }) {
  const index = phase === "lineup" ? 0 : stage === "both" ? 1 : stage === "leftLit" ? 2 : 3;
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-white" : i < index ? "w-1.5 bg-white" : "w-1.5 bg-white/35")} />
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
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Camera scan</h1>
      <p className="mt-2 text-muted-foreground">About 30 seconds. Three flashes from your screen, then your three results.</p>

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
          <li>Use a dim room and turn your screen brightness all the way up.</li>
          <li>Take off glasses. Contact lenses are fine.</li>
          <li>Hold the phone steady at eye level. A stand or a friend helps.</li>
        </ul>
      </div>

      <label className="mt-6 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 size-4 accent-foreground" />
        <span className="text-muted-foreground">
          I understand Iris is a student research prototype, not a medical test. The screen flashes bright light three times, so I won&apos;t use
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
  saving,
  saveError,
  onSave,
  onRetake,
}: {
  result: CameraScanResult;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onRetake: () => void;
}) {
  const statuses = rateScan(result.metrics);
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
              {c.details(result.metrics).map((d) => (
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
