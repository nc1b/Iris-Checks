"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { Camera, CheckCircle2, CircleDashed, Eye, FlaskConical, Lightbulb, Loader2, PlayCircle, Sun } from "lucide-react";
import { analyse, PROTOCOLS, type Analysis, type Protocol, type Sample, type StimulusColor } from "@/lib/analysis";
import { CROP_SIZE, CROP_SPAN, eyeAspectRatio, LANDMARKS, measurePupil } from "@/lib/pupil";
import { simulateSamples } from "@/lib/simulate";
import type { Participant } from "@/lib/log";
import { cn } from "@/lib/utils";
import { Results } from "./results";

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

type Phase = "setup" | "camera" | "countdown" | "testing" | "results";

type Checks = { face: boolean; distance: "ok" | "far" | "close" | null; open: boolean; contrast: boolean };

const STIM_BG: Record<StimulusColor, string> = {
  white: "#ffffff",
  red: "#ff0000",
  blue: "#0000ff",
};

type EyeFrame = {
  cx: number;
  cy: number;
  irisR: number;
  pupilR: number;
  contrast: number;
};

export default function Scanner() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [protocolId, setProtocolId] = useState<Protocol["id"]>("standard");
  const [participant, setParticipant] = useState<Participant>({ code: "", age: null, diabetes: "" });
  const [consent, setConsent] = useState(false);
  const [demo, setDemo] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1",
  );
  const [demoProfile, setDemoProfile] = useState<"typical" | "diabetesLike">("typical");
  const [loadingModel, setLoadingModel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState<Checks>({ face: false, distance: null, open: false, contrast: false });
  const [ready, setReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [stimColor, setStimColor] = useState<StimulusColor | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const cropRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef<number | null>(null);
  const goodFramesRef = useRef(0);
  const testRef = useRef<{ start: number; samples: Sample[]; protocol: Protocol } | null>(null);
  const phaseRef = useRef<Phase>("setup");
  const lastTsRef = useRef(0);
  const frameRef = useRef<() => void>(() => {});

  const protocol = PROTOCOLS[protocolId];

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const stopCamera = useCallback(() => {
    if (loopRef.current !== null) cancelAnimationFrame(loopRef.current);
    loopRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const readEye = useCallback(
    (lm: { x: number; y: number }[], side: "left" | "right", vw: number, vh: number): EyeFrame | null => {
      const video = videoRef.current;
      const L = LANDMARKS[side];
      if (!video) return null;
      const c = lm[L.irisCenter];
      const cx = c.x * vw;
      const cy = c.y * vh;
      const irisR =
        L.iris.reduce((s, i) => s + Math.hypot((lm[i].x - c.x) * vw, (lm[i].y - c.y) * vh), 0) / L.iris.length;
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
      const reading = measurePupil(ctx.getImageData(0, 0, CROP_SIZE, CROP_SIZE));
      if (!reading) return null;
      const scale = irisR / reading.irisPx;
      return { cx, cy, irisR, pupilR: reading.pupilPx * scale, contrast: reading.contrast };
    },
    [],
  );

  const drawOverlay = useCallback((eyes: (EyeFrame | null)[], vw: number, vh: number) => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, vw, vh);
    for (const e of eyes) {
      if (!e) continue;
      ctx.lineWidth = Math.max(1.5, vw / 400);
      ctx.strokeStyle = "rgba(134,239,172,0.95)";
      ctx.beginPath();
      ctx.arc(e.cx, e.cy, e.irisR, 0, Math.PI * 2);
      ctx.stroke();
      if (Number.isFinite(e.pupilR)) {
        ctx.strokeStyle = "rgba(240,253,244,0.95)";
        ctx.beginPath();
        ctx.arc(e.cx, e.cy, e.pupilR, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }, []);

  const finishTest = useCallback(() => {
    const test = testRef.current;
    testRef.current = null;
    setStimColor(null);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    stopCamera();
    if (!test) return;
    setAnalysis(analyse(test.samples, test.protocol));
    setPhase("results");
  }, [stopCamera]);

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
      const result = landmarker.detectForVideo(video, ts);
      const lm = result.faceLandmarks?.[0];

      let eyes: (EyeFrame | null)[] = [null, null];
      let open = false;
      if (lm && lm.length >= 478) {
        const aspect = vw / vh;
        const earL = eyeAspectRatio(lm, LANDMARKS.left.upper, LANDMARKS.left.lower, LANDMARKS.left.inner, LANDMARKS.left.outer, aspect);
        const earR = eyeAspectRatio(lm, LANDMARKS.right.upper, LANDMARKS.right.lower, LANDMARKS.right.inner, LANDMARKS.right.outer, aspect);
        open = earL > 0.18 && earR > 0.18;
        eyes = [readEye(lm, "left", vw, vh), readEye(lm, "right", vw, vh)];
      }
      drawOverlay(eyes, vw, vh);

      const test = testRef.current;
      if (test) {
        const t = (ts - test.start) / 1000;
        const stim = test.protocol.stimuli.find((s) => t >= s.onset && t < s.offset);
        setStimColor(stim ? stim.color : null);
        setProgress(Math.min(1, t / test.protocol.duration));
        const toSample = (e: EyeFrame | null) =>
          e && Number.isFinite(e.pupilR) ? { pupilPx: e.pupilR, irisPx: e.irisR, contrast: e.contrast } : undefined;
        test.samples.push({ t, open, left: toSample(eyes[0]), right: toSample(eyes[1]) });
        if (t >= test.protocol.duration) {
          finishTest();
          return;
        }
      } else if (phaseRef.current === "camera") {
        const irisR = Math.max(eyes[0]?.irisR ?? 0, eyes[1]?.irisR ?? 0);
        const distance: Checks["distance"] = !lm ? null : irisR < 11 ? "far" : irisR > 70 ? "close" : "ok";
        const contrasts = eyes.filter(Boolean).map((e) => e!.contrast);
        const contrast = contrasts.length > 0 && Math.min(...contrasts) >= 12;
        const next: Checks = { face: !!lm, distance, open, contrast };
        const good = next.face && distance === "ok" && open && contrast;
        goodFramesRef.current = good ? goodFramesRef.current + 1 : 0;
        setChecks((prev) =>
          prev.face === next.face && prev.distance === next.distance && prev.open === next.open && prev.contrast === next.contrast
            ? prev
            : next,
        );
        setReady(goodFramesRef.current > 15);
      }
    }
    loopRef.current = requestAnimationFrame(() => frameRef.current());
  }, [drawOverlay, finishTest, readEye]);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  const startCamera = useCallback(async () => {
    setError(null);
    setLoadingModel(true);
    try {
      if (!landmarkerRef.current) {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        const make = (delegate: "GPU" | "CPU") =>
          vision.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numFaces: 1,
          });
        landmarkerRef.current = await make("GPU").catch(() => make("CPU"));
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      setPhase("camera");
      await new Promise((r) => setTimeout(r, 0));
      const video = videoRef.current;
      if (!video) throw new Error("Video element missing");
      video.srcObject = stream;
      await video.play();
      goodFramesRef.current = 0;
      loopRef.current = requestAnimationFrame(() => frameRef.current());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /Permission|NotAllowed/i.test(msg)
          ? "Camera permission was blocked. Allow camera access in your browser settings, or try the demo."
          : `Couldn't start the scanner: ${msg}`,
      );
      stopCamera();
      setPhase("setup");
    } finally {
      setLoadingModel(false);
    }
  }, [stopCamera]);

  const startTest = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    setPhase("countdown");
    setCountdown(3);
    let n = 3;
    const id = setInterval(() => {
      n -= 1;
      setCountdown(n);
      if (n <= 0) {
        clearInterval(id);
        testRef.current = { start: performance.now(), samples: [], protocol };
        setProgress(0);
        setPhase("testing");
      }
    }, 1000);
  }, [protocol]);

  const runDemo = useCallback(() => {
    const samples = simulateSamples(protocol, demoProfile);
    setAnalysis(analyse(samples, protocol));
    setPhase("results");
  }, [protocol, demoProfile]);

  const retake = () => {
    setAnalysis(null);
    setReady(false);
    setPhase("setup");
  };

  if (phase === "results" && analysis) {
    return <Results analysis={analysis} protocol={protocol} participant={participant} demo={demo} onRetake={retake} />;
  }

  const showCamera = phase === "camera" || phase === "countdown" || phase === "testing";

  return (
    <div className="space-y-6">
      {phase === "setup" && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: <Lightbulb className="h-5 w-5" />, text: "Dim the room. Turn your screen brightness all the way up." },
              { icon: <Eye className="h-5 w-5" />, text: "Take off glasses. Keep both eyes open and look at the dot." },
              { icon: <Camera className="h-5 w-5" />, text: "Hold the phone steady, about 20–30 cm from your face." },
              { icon: <Sun className="h-5 w-5" />, text: "The screen will flash once. Try not to blink." },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4 text-sm text-iris-100/85 ring-1 ring-white/10">
                <span className="text-iris-300">{tip.icon}</span>
                {tip.text}
              </div>
            ))}
          </div>

          <div className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-iris-300">About you (optional, for the research log)</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="text-sm text-iris-100/80">
                Participant code
                <input
                  value={participant.code}
                  onChange={(e) => setParticipant({ ...participant, code: e.target.value.slice(0, 12) })}
                  placeholder="e.g. P07"
                  className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-iris-50 ring-1 ring-white/15 outline-none focus:ring-iris-300"
                />
              </label>
              <label className="text-sm text-iris-100/80">
                Age
                <input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={110}
                  value={participant.age ?? ""}
                  onChange={(e) => setParticipant({ ...participant, age: e.target.value ? Number(e.target.value) : null })}
                  className="mt-1 w-full rounded-xl bg-white/5 px-3 py-2 text-iris-50 ring-1 ring-white/15 outline-none focus:ring-iris-300"
                />
              </label>
              <label className="text-sm text-iris-100/80">
                Diabetes?
                <select
                  value={participant.diabetes}
                  onChange={(e) => setParticipant({ ...participant, diabetes: e.target.value as Participant["diabetes"] })}
                  className="mt-1 w-full rounded-xl bg-iris-950 px-3 py-2 text-iris-50 ring-1 ring-white/15 outline-none focus:ring-iris-300"
                >
                  <option value="">Prefer not to say</option>
                  <option value="no">No</option>
                  <option value="type2">Yes, type 2</option>
                  <option value="type1">Yes, type 1</option>
                  <option value="unsure">Not sure</option>
                </select>
              </label>
            </div>

            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-iris-300">Test type</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(Object.values(PROTOCOLS) as Protocol[]).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProtocolId(p.id)}
                  className={cn(
                    "rounded-2xl p-4 text-left text-sm ring-1 transition-colors",
                    protocolId === p.id ? "bg-iris-400/15 ring-iris-300/60" : "bg-white/[0.03] ring-white/10 hover:bg-white/5",
                  )}
                >
                  <div className="flex items-center gap-2 font-medium text-iris-50">
                    {p.id === "chromatic" ? <FlaskConical className="h-4 w-4 text-iris-300" /> : <Sun className="h-4 w-4 text-iris-300" />}
                    {p.name}
                  </div>
                  <p className="mt-1 text-iris-100/65">
                    {p.id === "standard"
                      ? `One white flash. About ${Math.round(p.duration)} seconds.`
                      : `A red flash, then a blue flash, to copy the Singapore device. About ${Math.round(p.duration)} seconds.`}
                  </p>
                </button>
              ))}
            </div>

            <label className="mt-6 flex items-start gap-3 text-sm text-iris-100/80">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-iris-400" />
              I understand Iris is a student research prototype, not a medical test. The screen will flash bright light, so don&apos;t use it if
              flashing lights affect you. Video is processed on this device and never uploaded.
            </label>
          </div>

          {error && <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-100 ring-1 ring-red-400/30">{error}</div>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={!consent || loadingModel}
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-full bg-iris-300 px-5 py-3 text-sm font-medium text-iris-950 hover:bg-iris-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {loadingModel ? "Loading AI model…" : "Open camera"}
            </button>
            <div className="flex items-center gap-2 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
              <select
                value={demoProfile}
                onChange={(e) => setDemoProfile(e.target.value as typeof demoProfile)}
                className="rounded-full bg-transparent px-3 py-2 text-sm text-iris-100 outline-none"
                aria-label="Demo profile"
              >
                <option className="bg-iris-950" value="typical">Demo: typical response</option>
                <option className="bg-iris-950" value="diabetesLike">Demo: slower response</option>
              </select>
              <button
                onClick={() => {
                  setDemo(true);
                  runDemo();
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-iris-100 hover:bg-white/15"
              >
                <PlayCircle className="h-4 w-4" /> Run demo
              </button>
            </div>
          </div>
        </div>
      )}

      {showCamera && (
        <div className="space-y-4">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden rounded-3xl bg-black ring-1 ring-iris-300/20 sm:aspect-video sm:max-w-2xl">
            <div className="absolute inset-0 -scale-x-100">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <div className="h-24 w-56 rounded-[50%] border-2 border-dashed border-iris-300/50" />
            </div>
          </div>

          {phase === "camera" && (
            <>
              <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { ok: checks.face, label: "Face found" },
                  {
                    ok: checks.distance === "ok",
                    label: checks.distance === "far" ? "Move closer" : checks.distance === "close" ? "Move back" : "Distance",
                  },
                  { ok: checks.open, label: "Eyes open" },
                  { ok: checks.contrast, label: checks.contrast ? "Pupils visible" : "Dim the room" },
                ].map((c) => (
                  <div
                    key={c.label}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-xs ring-1",
                      c.ok ? "bg-iris-400/15 text-iris-100 ring-iris-400/40" : "bg-white/5 text-iris-100/70 ring-white/10",
                    )}
                  >
                    {c.ok ? <CheckCircle2 className="h-4 w-4 text-iris-300" /> : <CircleDashed className="h-4 w-4" />}
                    {c.label}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={startTest}
                  disabled={!ready}
                  className="inline-flex items-center gap-2 rounded-full bg-iris-300 px-6 py-3 text-sm font-medium text-iris-950 hover:bg-iris-200 disabled:opacity-50"
                >
                  <Eye className="h-4 w-4" /> {ready ? "Start test" : "Line up your eyes…"}
                </button>
                <button
                  onClick={() => {
                    stopCamera();
                    setPhase("setup");
                  }}
                  className="rounded-full px-4 py-3 text-sm text-iris-100/70 hover:text-iris-100"
                >
                  Cancel
                </button>
              </div>
              <p className="text-center text-xs text-iris-100/50">
                Green circle = iris found by the AI model. White circle = pupil measured by Iris.
              </p>
            </>
          )}
        </div>
      )}

      {(phase === "countdown" || phase === "testing") && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: stimColor ? STIM_BG[stimColor] : "#000" }}
        >
          {phase === "countdown" ? (
            <div className="text-center text-iris-100">
              <div className="font-instrument-serif text-8xl">{countdown}</div>
              <p className="mt-4 text-sm text-iris-100/70">Look at the dot. Keep your eyes open.</p>
            </div>
          ) : (
            <>
              <div className={cn("h-3 w-3 rounded-full", stimColor ? "bg-black/60" : "bg-iris-300/70")} />
              {!stimColor && (
                <div className="absolute bottom-10 w-48">
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-iris-300/60" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
