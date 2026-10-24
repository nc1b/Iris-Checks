"use client";

import { Camera, Flashlight, FlashlightOff, Loader2, RefreshCw, Sun, SunDim, SwitchCamera, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDE, grabGuide, guideRect, motionBetween, photoFromFrame, sampleGuide, viewPointToVideo, viewToVideo, type CapturedPhoto, type GuideFrame } from "@/lib/eye-capture";
import { loadFaceModel, measureEye, type EyeMeasure } from "@/lib/eye-locate";
import { QUALITY_LIMITS, type QualityReport } from "@/lib/photo-quality";
import { cn } from "@/lib/utils";

export type Facing = "environment" | "user";

/** What this phone's camera lets a web page control. Many browsers expose none of it. */
type Controls = {
  zoom: { min: number; max: number; step: number } | null;
  focus: boolean;
  torch: boolean;
  /** Exposure compensation in EV, where the browser allows it (mostly Chrome on Android). */
  exposure: { min: number; max: number; step: number } | null;
};

const NO_CONTROLS: Controls = { zoom: null, focus: false, torch: false, exposure: null };
const TORCH_AUTO_OFF_MS = 30_000;

/** Live processing: how often the guide region is checked, in ms (about 8 times a second). */
const TICK_MS = 120;
/** Mean pixel change between checks above which the picture is moving (smears the photo). */
const MAX_MOTION = 6;
/** Anti-blur: on capture, keep sampling this long and send the sharpest frame from this window. */
const BURST_MS = 700;
const BEST_WINDOW_MS = 1500;
/** Auto photo: this many good, steady checks in a row (about 1.2 s). */
const AUTO_TICKS = 10;
/** Lighting control: wait this long between automatic exposure steps. */
const EXPOSURE_STEP_MS = 900;
/** Live eye finding runs on every other check (about 4 times a second). */
const EYE_EVERY = 2;
/** Forget the live eye if it hasn't been seen for this long. */
const EYE_STALE_MS = 900;

type CapabilitiesPlus = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
  focusMode?: string[];
  pointsOfInterest?: unknown;
  exposureCompensation?: { min: number; max: number; step?: number };
  exposureMode?: string[];
  whiteBalanceMode?: string[];
};

type Live = QualityReport & { motion: number | null; steady: boolean };
type Best = { frame: GuideFrame; score: number; at: number };

export function EyeCamera({
  facing,
  eyeLabel,
  avoidTorch,
  onFacing,
  onCapture,
  onClose,
}: {
  facing: Facing;
  /** e.g. "left eye", shown in the instructions. */
  eyeLabel: string;
  /** True when the person reported light sensitivity or pain: the flashlight stays hidden behind a warning. */
  avoidTorch: boolean;
  onFacing: (f: Facing) => void;
  onCapture: (photo: CapturedPhoto) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sampleCanvas = useRef<HTMLCanvasElement | null>(null);
  const torchTimer = useRef<number | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [controls, setControls] = useState<Controls>(NO_CONTROLS);
  const [zoom, setZoom] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAsk, setTorchAsk] = useState(false);
  const [focusAt, setFocusAt] = useState<{ x: number; y: number; ok: boolean } | null>(null);
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [exposure, setExposure] = useState(0);
  const exposureManual = useRef(false);
  const exposureAt = useRef(0);
  const [auto, setAuto] = useState(true);
  const [autoHold, setAutoHold] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const capturingRef = useRef(false);
  const prevPixels = useRef<Uint8ClampedArray | null>(null);
  const goodTicks = useRef(0);
  const best = useRef<Best | null>(null);
  const framesSeen = useRef<number[]>([]);
  // The eye and pupil found in the live picture, in video pixels.
  const [eye, setEye] = useState<LiveEye | null>(null);
  const eyeRef = useRef<{ m: EyeMeasure; at: number } | null>(null);
  const eyeScratch = useRef<HTMLCanvasElement | null>(null);
  const tickCount = useRef(0);
  const [resolution, setResolution] = useState<string>("");
  const [attempt, setAttempt] = useState(0);
  // Front camera only: the screen around the oval turns white to light the face. It comes on by
  // itself the first time the photo is too dark, and the person can switch it off.
  const [screenLight, setScreenLight] = useState(false);
  const screenLightAuto = useRef(false);
  const mirrored = facing === "user";

  // Start (or restart, on switching) the camera.
  useEffect(() => {
    let cancelled = false;
    let current: MediaStream | null = null;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera. Try Chrome on Android or Safari on iPhone, and make sure the page is on https.");
        setStarting(false);
        return;
      }
      try {
        current = await navigator.mediaDevices.getUserMedia({
          audio: false,
          // Ask for the highest resolution the camera offers; the browser picks the closest.
          video: { facingMode: { ideal: facing }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (cancelled) return current.getTracks().forEach((t) => t.stop());
        const track = current.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as CapabilitiesPlus;
        const settings = track.getSettings();
        const ev = caps.exposureCompensation;
        setControls({
          zoom: caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 } : null,
          focus: Boolean(caps.pointsOfInterest) || Boolean(caps.focusMode?.some((m) => m === "single-shot" || m === "manual")),
          torch: caps.torch === true,
          exposure: ev && ev.max > ev.min ? { min: ev.min, max: ev.max, step: ev.step || 0.1 } : null,
        });
        setExposure((settings as { exposureCompensation?: number }).exposureCompensation ?? 0);
        // Let the camera keep adjusting exposure, focus and colour by itself while framing.
        const keepAdjusting: Record<string, string> = {};
        if (caps.exposureMode?.includes("continuous")) keepAdjusting.exposureMode = "continuous";
        if (caps.focusMode?.includes("continuous")) keepAdjusting.focusMode = "continuous";
        if (caps.whiteBalanceMode?.includes("continuous")) keepAdjusting.whiteBalanceMode = "continuous";
        if (Object.keys(keepAdjusting).length) await track.applyConstraints({ advanced: [keepAdjusting as MediaTrackConstraintSet] }).catch(() => {});
        setZoom((settings as { zoom?: number }).zoom ?? caps.zoom?.min ?? 1);
        setResolution(settings.width && settings.height ? `${settings.width}×${settings.height}` : "");
        setStream(current);
        // Start loading the eye-finding model while the person frames the photo.
        loadFaceModel().catch(() => {});
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError" || name === "SecurityError"
            ? "Camera permission was blocked. Allow camera access for this site in your browser settings (the lock or camera icon next to the address), then try again."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "No camera was found for that side. Try switching cameras."
              : name === "NotReadableError"
                ? "Another app is using the camera. Close it and try again."
                : "The camera couldn't start. Please try again.",
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
      current?.getTracks().forEach((t) => t.stop());
      setStream(null);
    };
  }, [facing, attempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [stream]);

  // Real-time processing, about 8 times a second: light, sharpness and motion of the guide
  // region, the sharpest recent frame (for the anti-blur capture), and the auto photo.
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!stream) return;
    let id = 0;
    const loop = () => {
      tickRef.current();
      id = window.setTimeout(loop, TICK_MS);
    };
    id = window.setTimeout(loop, TICK_MS);
    return () => {
      window.clearTimeout(id);
      prevPixels.current = null;
      best.current = null;
      goodTicks.current = 0;
    };
  }, [stream]);

  async function changeExposure(value: number) {
    setExposure(value);
    try {
      await stream?.getVideoTracks()[0]?.applyConstraints({ advanced: [{ exposureCompensation: value } as MediaTrackConstraintSet] });
    } catch {
      /* not every step is accepted; the camera keeps its own exposure */
    }
  }

  const track = () => stream?.getVideoTracks()[0];


  const setTorch = useCallback(
    async (on: boolean) => {
      const t = stream?.getVideoTracks()[0];
      if (!t) return;
      if (torchTimer.current) window.clearTimeout(torchTimer.current);
      const apply = (value: boolean) => t.applyConstraints({ advanced: [{ torch: value } as MediaTrackConstraintSet] });
      try {
        await apply(on);
        setTorchOn(on);
        // Never leave the light on: it switches itself off after 30 seconds.
        if (on) {
          torchTimer.current = window.setTimeout(() => {
            apply(false).catch(() => {});
            setTorchOn(false);
          }, TORCH_AUTO_OFF_MS);
        }
      } catch {
        setTorchOn(false);
      }
    },
    [stream],
  );

  /** Sends the sharpest frame from the last moment, or the current frame if none was kept. */
  const finishCapture = useCallback(() => {
    const video = videoRef.current;
    const view = viewRef.current;
    capturingRef.current = false;
    setCapturing(false);
    if (!video?.videoWidth || !view) return;
    const now = performance.now();
    const kept = best.current && now - best.current.at < BEST_WINDOW_MS + BURST_MS ? best.current : null;
    const frame = kept?.frame ?? grabGuide(video, view.clientWidth, view.clientHeight, mirrored);
    const burst = framesSeen.current.filter((t) => now - t < BEST_WINDOW_MS + BURST_MS).length || 1;
    best.current = null;
    goodTicks.current = 0;
    setAutoHold(0);
    if (torchOn) void setTorch(false);
    const seen = eyeRef.current && now - eyeRef.current.at < EYE_STALE_MS ? eyeRef.current.m.iris : null;
    onCapture(photoFromFrame(frame, burst, seen));
  }, [mirrored, onCapture, setTorch, torchOn]);

  const capture = useCallback(() => {
    if (capturingRef.current || !videoRef.current?.videoWidth) return;
    capturingRef.current = true;
    setCapturing(true);
    // Keep watching a moment longer so a sharper frame can still win (anti-blur).
    window.setTimeout(finishCapture, BURST_MS);
  }, [finishCapture]);

  useEffect(() => {
    tickRef.current = () => {
      const video = videoRef.current;
      const view = viewRef.current;
      if (!video?.videoWidth || !view) return;
      sampleCanvas.current ??= document.createElement("canvas");
      const report = sampleGuide(video, view.clientWidth, view.clientHeight, mirrored, sampleCanvas.current);
      if (!report) return;
      const now = performance.now();
      const motion = motionBetween(prevPixels.current, report.pixels);
      prevPixels.current = report.pixels;
      const steady = motion !== null && motion < MAX_MOTION;
      const { pixels: _pixels, ...quality } = report;
      void _pixels;
      setLive({ ...quality, motion, steady });

      // Where is the eye, and its pupil? Only an eye inside the guide counts.
      if (++tickCount.current % EYE_EVERY === 0) {
        eyeScratch.current ??= document.createElement("canvas");
        const last = eyeRef.current && now - eyeRef.current.at < EYE_STALE_MS ? eyeRef.current.m.iris : null;
        const m = measureEye(video, last, eyeScratch.current);
        const g = viewToVideo(guideRect(view.clientWidth, view.clientHeight), view.clientWidth, view.clientHeight, video.videoWidth, video.videoHeight, mirrored);
        const inside = m && m.iris.x > g.x && m.iris.x < g.x + g.w && m.iris.y > g.y && m.iris.y < g.y + g.h;
        if (inside) eyeRef.current = { m, at: now };
        else if (eyeRef.current && now - eyeRef.current.at > EYE_STALE_MS) eyeRef.current = null;
        setEye(eyeRef.current ? { m: eyeRef.current.m, videoW: video.videoWidth, videoH: video.videoHeight, viewW: view.clientWidth, viewH: view.clientHeight } : null);
      }
      const eyeSeen = !!eyeRef.current && now - eyeRef.current.at < EYE_STALE_MS;

      // Keep the sharpest steady frame of the last moment, at full resolution.
      framesSeen.current = [...framesSeen.current.filter((t) => now - t < BEST_WINDOW_MS + BURST_MS), now];
      const score = quality.sharpness * (steady ? 1 : 0.5) * (quality.issues.includes("too_dark") || quality.issues.includes("glare") ? 0.6 : 1);
      const kept = best.current;
      if (!kept || now - kept.at > BEST_WINDOW_MS || score > kept.score) {
        best.current = { frame: grabGuide(video, view.clientWidth, view.clientHeight, mirrored), score, at: now };
      }

      // Lighting control: brighter exposure when the eye is too dark, darker when washed out.
      if (controls.exposure && !exposureManual.current && now - exposureAt.current > EXPOSURE_STEP_MS) {
        const { min, max, step } = controls.exposure;
        const delta = quality.issues.includes("too_dark") ? Math.max(step, 0.3) : quality.issues.includes("too_bright") || quality.issues.includes("glare") ? -Math.max(step, 0.3) : 0;
        if (delta) {
          exposureAt.current = now;
          const next = Math.min(max, Math.max(min, exposure + delta));
          if (next !== exposure) void changeExposure(next);
        }
      }
      if (mirrored && quality.issues.includes("too_dark") && !screenLightAuto.current) {
        screenLightAuto.current = true;
        setScreenLight(true);
      }

      // Auto photo once the eye is found and everything is good and steady for a moment.
      goodTicks.current = quality.ok && steady && eyeSeen ? goodTicks.current + 1 : 0;
      setAutoHold(auto ? Math.min(1, goodTicks.current / AUTO_TICKS) : 0);
      if (auto && !capturingRef.current && goodTicks.current >= AUTO_TICKS) capture();
    };
  });

  /** Restarts the camera (switching sides or retrying) from a clean state. */
  function restart(next: Facing) {
    setStarting(true);
    setError(null);
    setTorchOn(false);
    setLive(null);
    setEye(null);
    eyeRef.current = null;
    setScreenLight(false);
    screenLightAuto.current = false;
    if (next === facing) setAttempt((a) => a + 1);
    else onFacing(next);
  }

  useEffect(() => () => {
    if (torchTimer.current) window.clearTimeout(torchTimer.current);
  }, []);

  async function changeZoom(value: number) {
    setZoom(value);
    try {
      await track()?.applyConstraints({ advanced: [{ zoom: value } as MediaTrackConstraintSet] });
    } catch {
      /* the slider only shows when zoom is supported; ignore a rejected step */
    }
  }

  async function tapToFocus(e: React.PointerEvent<HTMLDivElement>) {
    const view = viewRef.current;
    const video = videoRef.current;
    if (!view || !video?.videoWidth) return;
    const box = view.getBoundingClientRect();
    const px = e.clientX - box.left;
    const py = e.clientY - box.top;
    if (!controls.focus) {
      setFocusAt({ x: px, y: py, ok: false });
      setFocusNote("This browser doesn't let websites set the focus point. The camera focuses by itself: hold still for a second, about 10–15 cm away.");
      window.setTimeout(() => setFocusAt(null), 900);
      return;
    }
    const point = viewPointToVideo(px, py, box.width, box.height, video.videoWidth, video.videoHeight, mirrored);
    setFocusAt({ x: px, y: py, ok: true });
    try {
      await track()?.applyConstraints({
        advanced: [{ pointsOfInterest: [point], focusMode: "single-shot" } as unknown as MediaTrackConstraintSet],
      });
      setFocusNote(null);
    } catch {
      try {
        await track()?.applyConstraints({ advanced: [{ focusMode: "single-shot" } as unknown as MediaTrackConstraintSet] });
      } catch {
        setFocusNote("The camera didn't accept a focus point. It will keep focusing by itself.");
      }
    }
    window.setTimeout(() => setFocusAt(null), 900);
  }

  const hint = liveHint(live, { facing, torch: controls.torch && !avoidTorch, screenLight });
  const lightOn = screenLight && mirrored;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div ref={viewRef} className="relative flex-1 overflow-hidden" onPointerUp={tapToFocus} data-testid="camera-view">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={cn("absolute inset-0 size-full object-cover", mirrored && "-scale-x-100")}
        />

        {/* What the phone found: the iris, the pupil and the reflection, drawn on the live picture. */}
        <EyeOverlay eye={eye} mirrored={mirrored} />

        {/* Framing guide: the area outside is dimmed; only the inside is sent. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 transition-[border-color,box-shadow]",
            lightOn ? "shadow-[0_0_0_9999px_rgba(255,255,255,0.95)]" : "shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]",
            hint.good ? "border-white" : "border-white/50",
            lightOn && (hint.good ? "border-black" : "border-black/40"),
          )}
          style={{ width: `${GUIDE.width * 100}%`, aspectRatio: `${1 / GUIDE.aspect}`, top: `${GUIDE.centerY * 100}%` }}
        />

        {focusAt && (
          <span
            aria-hidden
            className={cn("pointer-events-none absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2", focusAt.ok ? "animate-ping border-white" : "border-white/40")}
            style={{ left: focusAt.x, top: focusAt.y }}
          />
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4" onPointerUp={(e) => e.stopPropagation()}>
          <button type="button" onClick={onClose} aria-label="Close camera" className="flex size-10 items-center justify-center rounded-full bg-black/50 backdrop-blur">
            <X className="size-5" />
          </button>
          <div className="rounded-2xl bg-black/50 px-3 py-2 text-center text-xs backdrop-blur">
            <p className="font-medium">Fit the {eyeLabel} inside the oval</p>
            <p className="text-white/70">{facing === "environment" ? "Rear camera · 10–15 cm away" : "Front camera · less detail"}</p>
          </div>
          <button
            type="button"
            onClick={() => restart(facing === "environment" ? "user" : "environment")}
            aria-label={facing === "environment" ? "Switch to front camera" : "Switch to rear camera"}
            className="flex size-10 items-center justify-center rounded-full bg-black/50 backdrop-blur"
          >
            <SwitchCamera className="size-5" />
          </button>
        </div>

        {starting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center" onPointerUp={(e) => e.stopPropagation()}>
            <p role="alert" className="max-w-sm text-sm">
              {error}
            </p>
            <button type="button" onClick={() => restart(facing)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black">
              <RefreshCw className="size-4" /> Try again
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 px-4 pb-6 pt-3" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex flex-wrap justify-center gap-2 text-xs" aria-live="polite">
          <Chip ok={live ? !live.issues.some((i) => i === "too_dark" || i === "too_bright" || i === "glare") : null}>{hint.light}</Chip>
          <Chip ok={live ? !live.issues.includes("blur") : null}>{hint.sharp}</Chip>
          <Chip ok={live ? !!eye : null}>{eye ? (eye.m.pupilMm !== null ? `Pupil ${eye.m.pupilMm.toFixed(1)} mm` : "Eye found") : "Finding eye…"}</Chip>
          <Chip ok={live ? live.steady : null}>{live ? (live.steady ? "Steady" : "Moving") : "Steady …"}</Chip>
          <Chip ok={live ? !live.issues.includes("too_small") : null}>{hint.size}</Chip>
        </div>
        {/* Live sharpness: the bar fills as the picture gets sharper; the tick is the minimum. */}
        <div className="flex items-center gap-3 text-[11px] text-white/70">
          <span className="w-14 shrink-0">Sharpness</span>
          <div className="relative h-1.5 flex-1 rounded-full bg-white/15" aria-label="Live sharpness">
            <div
              className={cn("h-full rounded-full transition-[width]", live && !live.issues.includes("blur") ? "bg-white" : "bg-white/50")}
              style={{ width: `${Math.min(100, ((live?.sharpness ?? 0) / (QUALITY_LIMITS.minSharpness * 3)) * 100)}%` }}
            />
            <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-white/80" style={{ left: `${100 / 3}%` }} />
          </div>
        </div>
        <p className="text-center text-xs text-white/70">
          {capturing
            ? "Hold still, picking the sharpest frame…"
            : autoHold > 0
              ? "Hold still, the photo takes itself…"
              : live && !eye
                ? `Put the ${eyeLabel} in the oval, wide open, so the phone can find the iris and pupil.`
                : (focusNote ?? hint.tip)}
        </p>

        {controls.zoom && (
          <label className="flex items-center gap-3 text-xs">
            <span className="w-14 shrink-0 tabular-nums">Zoom {zoom.toFixed(1)}×</span>
            <input
              type="range"
              min={controls.zoom.min}
              max={controls.zoom.max}
              step={controls.zoom.step}
              value={zoom}
              onChange={(e) => void changeZoom(Number(e.target.value))}
              className="flex-1 accent-white"
              aria-label="Camera zoom"
            />
          </label>
        )}
        {controls.exposure && (
          <label className="flex items-center gap-3 text-xs">
            <span className="w-14 shrink-0 tabular-nums">Light {exposure > 0 ? "+" : ""}{exposure.toFixed(1)}</span>
            <input
              type="range"
              min={controls.exposure.min}
              max={controls.exposure.max}
              step={controls.exposure.step}
              value={exposure}
              onChange={(e) => {
                exposureManual.current = true;
                void changeExposure(Number(e.target.value));
              }}
              className="flex-1 accent-white"
              aria-label="Camera brightness"
            />
          </label>
        )}

        {controls.zoom && zoom > controls.zoom.min + 0.05 && (
          <p className="text-center text-[11px] text-white/60">
            Zoom past your phone&apos;s optical lens is digital: the eye looks bigger but gains no detail. Moving closer (10–15 cm) is better.
          </p>
        )}

        {torchAsk && (
          <div className="rounded-2xl bg-white/10 p-3 text-xs">
            <p className="font-medium">Use the flashlight?</p>
            <p className="mt-1 text-white/80">
              Daylight from a window or a bright room lamp works better and is more comfortable. The flashlight is very bright up close and often adds a reflection
              that hides the eye. If you use it: hold the phone slightly to the side, keep it on only for the photo (it turns off by itself), and don&apos;t use it
              for babies or for anyone with eye pain, light sensitivity, a recent eye injury or light-triggered seizures.
            </p>
            {avoidTorch && <p className="mt-1 font-medium">You said light bothers your eye, so we suggest keeping it off.</p>}
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setTorchAsk(false)} className="flex-1 rounded-xl bg-white px-3 py-2 font-medium text-black">
                Keep it off
              </button>
              <button
                type="button"
                onClick={() => {
                  setTorchAsk(false);
                  void setTorch(true);
                }}
                className="flex-1 rounded-xl border border-white/40 px-3 py-2"
              >
                Turn on briefly
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex w-16 flex-col items-start gap-1 text-[10px] text-white/50">
            <button
              type="button"
              onClick={() => setAuto((a) => !a)}
              aria-pressed={auto}
              className={cn("rounded-full px-2 py-1 text-[11px] font-medium", auto ? "bg-white text-black" : "bg-white/15 text-white")}
            >
              Auto {auto ? "on" : "off"}
            </button>
            <span>{resolution}</span>
          </div>
          <button
            type="button"
            onClick={capture}
            disabled={!stream || capturing}
            aria-label="Take photo"
            className="relative flex size-[72px] items-center justify-center rounded-full border-4 border-white/40 bg-white/20 transition active:scale-95 disabled:opacity-60"
          >
            {/* Fills while the auto photo is about to take itself. */}
            <svg className="absolute inset-[-4px] -rotate-90" viewBox="0 0 72 72" aria-hidden>
              <circle cx="36" cy="36" r="34" fill="none" stroke="white" strokeWidth="4" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - (capturing ? 1 : autoHold))} />
            </svg>
            {capturing ? <Loader2 className="size-7 animate-spin" /> : <Camera className="size-7" />}
          </button>
          <div className="flex w-16 justify-end">
            {mirrored && (
              <button
                type="button"
                onClick={() => setScreenLight((v) => !v)}
                aria-label={screenLight ? "Turn screen light off" : "Light the eye with the screen"}
                aria-pressed={screenLight}
                className={cn("flex size-11 items-center justify-center rounded-full", screenLight ? "bg-white text-black" : "bg-white/15")}
              >
                {screenLight ? <Sun className="size-5" /> : <SunDim className="size-5" />}
              </button>
            )}
            {controls.torch && facing === "environment" && (
              <button
                type="button"
                onClick={() => (torchOn ? void setTorch(false) : setTorchAsk(true))}
                aria-label={torchOn ? "Turn flashlight off" : "Flashlight options"}
                aria-pressed={torchOn}
                className={cn("flex size-11 items-center justify-center rounded-full", torchOn ? "bg-white text-black" : "bg-white/15")}
              >
                {torchOn ? <Flashlight className="size-5" /> : <FlashlightOff className="size-5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Circles on the iris and pupil, and a dot on the reflection, mapped from video to screen pixels. */
/** The live eye, with the video and view sizes it was found at (for drawing it on screen). */
type LiveEye = { m: EyeMeasure; videoW: number; videoH: number; viewW: number; viewH: number };

function EyeOverlay({ eye: live, mirrored }: { eye: LiveEye | null; mirrored: boolean }) {
  if (!live) return null;
  const { m: eye, viewW: vw, viewH: vh, videoW, videoH } = live;
  // The preview fills the view like CSS object-fit: cover (and is mirrored for the front camera).
  const scale = Math.max(vw / videoW, vh / videoH);
  const ox = (vw - videoW * scale) / 2;
  const oy = (vh - videoH * scale) / 2;
  const at = (p: { x: number; y: number }) => {
    const x = p.x * scale + ox;
    return { x: mirrored ? vw - x : x, y: p.y * scale + oy };
  };
  const c = at(eye.iris);
  const r = eye.iris.r * scale;
  const g = eye.glint && at(eye.glint);
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 size-full" viewBox={`0 0 ${vw} ${vh}`}>
      <circle cx={c.x} cy={c.y} r={r} fill="none" stroke="white" strokeWidth={2} strokeOpacity={0.9} />
      {eye.pupilR !== null && <circle cx={c.x} cy={c.y} r={eye.pupilR * scale} fill="none" stroke="#86efac" strokeWidth={2} />}
      {g && <circle cx={g.x} cy={g.y} r={Math.max(3, r * 0.08)} fill="#bae6fd" />}
      <text x={c.x} y={c.y - r - 8} textAnchor="middle" fill="white" fontSize={12} style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.6)", strokeWidth: 3 }}>
        {eye.method === "face-model" ? "Iris · face model" : "Iris"}
      </text>
    </svg>
  );
}

function Chip({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-3 py-1", ok === null ? "bg-white/10 text-white/60" : ok ? "bg-white text-black" : "bg-white/15 text-white")}>{children}</span>
  );
}

function liveHint(q: QualityReport | null, opts: { facing: Facing; torch: boolean; screenLight: boolean }) {
  if (!q) return { good: false, light: "Light …", sharp: "Focus …", size: "Size …", tip: "Tap the eye on screen to focus." };
  const light = q.issues.includes("too_dark") ? "Too dark" : q.issues.includes("too_bright") ? "Too bright" : q.issues.includes("glare") ? "Glare" : "Light good";
  const sharp = q.issues.includes("blur") ? "Blurry" : "Sharp";
  // QualityReport only: motion is shown in its own chip.
  const size = q.side < QUALITY_LIMITS.minSide ? "Low detail" : "Detail good";
  const tip = q.issues.includes("too_dark")
    ? opts.facing === "environment" && opts.torch
      ? "Face a window or bright lamp, or tap the flashlight button for a moment of extra light."
      : opts.facing === "user" && !opts.screenLight
        ? "Tap the sun button to light the eye with the screen, or face a window or bright lamp."
        : "Face a window or bright lamp, with the light in front of the person. Turn screen brightness up."
    : q.issues.includes("glare") || q.issues.includes("too_bright")
      ? "Tilt the phone a little or move away from direct light."
      : q.issues.includes("blur")
        ? "Hold still and tap the eye to focus. Too close blurs too."
        : q.issues.includes("too_small")
          ? "This camera gives little detail here. Use the rear camera if you can."
          : "Looks good. Keep the eye wide open, look just past the phone, and take the photo.";
  return { good: q.ok, light, sharp, size, tip };
}
