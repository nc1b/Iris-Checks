"use client";

import { Camera, Flashlight, FlashlightOff, Loader2, RefreshCw, SwitchCamera, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { captureGuide, GUIDE, sampleGuide, viewPointToVideo, type CapturedPhoto } from "@/lib/eye-capture";
import { QUALITY_LIMITS, type QualityReport } from "@/lib/photo-quality";
import { cn } from "@/lib/utils";

export type Facing = "environment" | "user";

/** What this phone's camera lets a web page control. Many browsers expose none of it. */
type Controls = {
  zoom: { min: number; max: number; step: number } | null;
  focus: boolean;
  torch: boolean;
};

const NO_CONTROLS: Controls = { zoom: null, focus: false, torch: false };
const TORCH_AUTO_OFF_MS = 30_000;

type CapabilitiesPlus = MediaTrackCapabilities & {
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
  focusMode?: string[];
  pointsOfInterest?: unknown;
};

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
  const [live, setLive] = useState<QualityReport | null>(null);
  const [resolution, setResolution] = useState<string>("");
  const [attempt, setAttempt] = useState(0);
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
        setControls({
          zoom: caps.zoom && caps.zoom.max > caps.zoom.min ? { min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step || 0.1 } : null,
          focus: Boolean(caps.pointsOfInterest) || Boolean(caps.focusMode?.some((m) => m === "single-shot" || m === "manual")),
          torch: caps.torch === true,
        });
        setZoom((settings as { zoom?: number }).zoom ?? caps.zoom?.min ?? 1);
        setResolution(settings.width && settings.height ? `${settings.width}×${settings.height}` : "");
        setStream(current);
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

  // Live light and sharpness hints, twice a second.
  useEffect(() => {
    if (!stream) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      const view = viewRef.current;
      if (!video || !view) return;
      sampleCanvas.current ??= document.createElement("canvas");
      setLive(sampleGuide(video, view.clientWidth, view.clientHeight, mirrored, sampleCanvas.current));
    }, 500);
    return () => window.clearInterval(id);
  }, [stream, mirrored]);

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

  /** Restarts the camera (switching sides or retrying) from a clean state. */
  function restart(next: Facing) {
    setStarting(true);
    setError(null);
    setTorchOn(false);
    setLive(null);
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

  function capture() {
    const video = videoRef.current;
    const view = viewRef.current;
    if (!video?.videoWidth || !view) return;
    const photo = captureGuide(video, view.clientWidth, view.clientHeight, mirrored);
    if (torchOn) void setTorch(false);
    onCapture(photo);
  }

  const hint = liveHint(live);

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

        {/* Framing guide: the area outside is dimmed; only the inside is sent. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-colors",
            hint.good ? "border-white" : "border-white/50",
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
          <Chip ok={live ? !live.issues.includes("too_small") : null}>{hint.size}</Chip>
        </div>
        <p className="text-center text-xs text-white/70">{focusNote ?? hint.tip}</p>

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
          <div className="w-16 text-[10px] text-white/50">{resolution}</div>
          <button
            type="button"
            onClick={capture}
            disabled={!stream}
            aria-label="Take photo"
            className="flex size-[72px] items-center justify-center rounded-full border-4 border-white bg-white/20 transition active:scale-95 disabled:opacity-40"
          >
            <Camera className="size-7" />
          </button>
          <div className="flex w-16 justify-end">
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

function Chip({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full px-3 py-1", ok === null ? "bg-white/10 text-white/60" : ok ? "bg-white text-black" : "bg-white/15 text-white")}>{children}</span>
  );
}

function liveHint(q: QualityReport | null) {
  if (!q) return { good: false, light: "Light …", sharp: "Focus …", size: "Size …", tip: "Tap the eye on screen to focus." };
  const light = q.issues.includes("too_dark") ? "Too dark" : q.issues.includes("too_bright") ? "Too bright" : q.issues.includes("glare") ? "Glare" : "Light good";
  const sharp = q.issues.includes("blur") ? "Blurry" : "Sharp";
  const size = q.side < QUALITY_LIMITS.minSide ? "Low detail" : "Detail good";
  const tip = q.issues.includes("too_dark")
    ? "Face a window or bright lamp, with the light in front of the person."
    : q.issues.includes("glare") || q.issues.includes("too_bright")
      ? "Tilt the phone a little or move away from direct light."
      : q.issues.includes("blur")
        ? "Hold still and tap the eye to focus. Too close blurs too."
        : q.issues.includes("too_small")
          ? "This camera gives little detail here. Use the rear camera if you can."
          : "Looks good. Keep the eye wide open, look just past the phone, and take the photo.";
  return { good: q.ok, light, sharp, size, tip };
}
