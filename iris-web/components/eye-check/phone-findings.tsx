"use client";

import { useEffect, useRef } from "react";
import type { CapturedPhoto } from "@/lib/eye-capture";
import type { PhotoAnalysis } from "@/lib/eye-check-types";
import { MEASURE_BANDS, type EyeMeasure } from "@/lib/eye-locate";
import { PHOTO_THRESHOLDS } from "@/lib/eye-photo";
import type { PhotoState } from "@/components/scanner/photo-match";
import { cn } from "@/lib/utils";

/**
 * What the phone itself found in the eye photo (lib/eye-locate.ts), and the per-condition
 * summaries that combine it with the AI review and the photo match.
 */

/** The photo with the iris, pupil, reflection and the sampled white of the eye drawn on it. */
export function AnnotatedPhoto({ photo, className }: { photo: CapturedPhoto; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const eye = photo.eye;
      if (!eye) return;
      const line = Math.max(2, canvas.width / 300);
      const { x, y, r } = eye.iris;
      ctx.lineWidth = line;
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      if (eye.pupilR !== null) {
        ctx.strokeStyle = "#86efac";
        ctx.beginPath();
        ctx.arc(x, y, eye.pupilR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([line * 2, line * 2]);
      ctx.strokeStyle = "rgba(253,224,71,0.9)";
      for (const b of eye.scleraBoxes) ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.setLineDash([]);
      if (eye.glint) {
        ctx.fillStyle = "#bae6fd";
        ctx.beginPath();
        ctx.arc(eye.glint.x, eye.glint.y, Math.max(3, r * 0.07), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    img.src = photo.dataUrl;
  }, [photo]);
  return <canvas ref={ref} role="img" aria-label="Your eye photo, with the iris and pupil the phone found marked on it" className={cn("w-full rounded-2xl border bg-black", className)} />;
}

const darknessWord = (d: number) => (d <= MEASURE_BANDS.darkness.clear ? "Clear and dark" : d <= MEASURE_BANDS.darkness.hazy ? "Slightly grey" : "Grey or light");
const rednessWord = (r: number) => (r < MEASURE_BANDS.redness.low ? "Low" : r < MEASURE_BANDS.redness.high ? "Some" : "Marked");

/** The phone's own measurements, in plain words. */
export function PhoneFindings({ eye }: { eye: EyeMeasure | null }) {
  if (!eye) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed p-4 text-sm" data-testid="phone-findings">
        <p className="font-medium">The phone couldn&apos;t find an iris in this photo</p>
        <p className="mt-1 text-muted-foreground">Fill the oval with one open eye, in even light, so the iris and pupil are clearly visible.</p>
      </div>
    );
  }
  const rows: { label: string; value: string; note?: string }[] = [
    {
      label: "Eye found by",
      value: eye.method === "face-model" ? "Face model (machine learning)" : "Iris search (close-up)",
    },
    {
      label: "Pupil size",
      value: eye.pupilMm === null ? "Edge not found" : `${eye.pupilMm.toFixed(1)} mm`,
      note:
        eye.pupilMm === null
          ? eye.pupilDarkness !== null && eye.pupilDarkness > MEASURE_BANDS.darkness.hazy
            ? "The pupil looks lighter than usual, so its edge couldn't be traced. See pupil colour."
            : "The pupil didn't stand out from the iris (common with dark eyes in dim light)."
          : eye.pupilMm < MEASURE_BANDS.pupilMm.min || eye.pupilMm > MEASURE_BANDS.pupilMm.max
            ? "Outside the usual 2–8 mm, so this reading may be off."
            : "Estimated from the iris, which is about 11.7 mm across in most adults.",
    },
    {
      label: "Pupil colour",
      value: eye.pupilDarkness === null ? "Can't measure" : `${darknessWord(eye.pupilDarkness)} (${eye.pupilDarkness}/100)`,
      note: "A clear lens keeps the pupil black. A grey pupil can mean a cloudy lens (cataract), or just light reflecting.",
    },
    {
      label: "Redness of the white",
      value: eye.redness === null ? "White not visible" : `${rednessWord(eye.redness)} (${Math.round(eye.redness * 100)})`,
      note: "Measured in the yellow boxes. Warm lamp light can make the white look redder.",
    },
    ...(eye.openness !== null ? [{ label: "Eye openness", value: eye.openness > 0.25 ? "Wide open" : eye.openness > 0.15 ? "Partly open" : "Mostly closed" }] : []),
    { label: "Iris sharpness", value: eye.sharpness >= 25 ? "Sharp" : "Soft", note: eye.sharpness >= 25 ? undefined : "A softer photo makes the pupil edge less precise." },
  ];
  return (
    <div className="mt-4 rounded-2xl border p-4 text-sm" data-testid="phone-findings">
      <p className="font-medium">Measured on your phone</p>
      <p className="mt-1 text-xs text-muted-foreground">
        White ring: iris. Green ring: pupil. Blue dot: light reflection. These numbers describe the photo, not a diagnosis.
      </p>
      <dl className="mt-3 divide-y">
        {rows.map((r) => (
          <div key={r.label} className="py-2">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd className="text-right font-medium">{r.value}</dd>
            </div>
            {r.note && <p className="mt-0.5 text-xs text-muted-foreground">{r.note}</p>}
          </div>
        ))}
      </dl>
    </div>
  );
}

export type MatchState = PhotoState;

type Signal = { source: string; finding: "yes" | "maybe" | "no" | "unknown"; detail: string };
type Verdict = { title: string; body: string; level: "signs" | "possible" | "none" | "unknown" };

/**
 * Cataract: three independent looks at the pupil. The AI review of the photo, the photo match
 * (a model trained on labelled eye photos: 92% of cataracts caught, 95% of others cleared, on
 * internet photos), and the phone's own measure of how grey the pupil is.
 */
export function cataractSignals(analysis: PhotoAnalysis, match: MatchState, eye: EyeMeasure | null): { signals: Signal[]; verdict: Verdict } {
  const lens = analysis.quality.usable ? analysis.observations.lens_cloudiness : "cannot_assess";
  const ai: Signal = {
    source: "AI review",
    finding: lens === "likely" ? "yes" : lens === "possible" ? "maybe" : lens === "none" ? "no" : "unknown",
    detail: lens === "likely" ? "Pupil looks grey or white" : lens === "possible" ? "Pupil looks faintly hazy" : lens === "none" ? "Pupil looks clear" : "Couldn't judge the pupil",
  };
  const m = match.status === "done" ? Object.values(match.data.eyes).find(Boolean) : undefined;
  const t = PHOTO_THRESHOLDS.cataract;
  const model: Signal =
    match.status === "loading"
      ? { source: "Photo match", finding: "unknown", detail: "Still comparing…" }
      : !m
        ? { source: "Photo match", finding: "unknown", detail: match.status === "error" ? "Didn't finish" : "No eye close-up to compare" }
        : !m.usable
          ? { source: "Photo match", finding: "unknown", detail: "Photo unlike the database photos" }
          : {
              source: "Photo match",
              finding: m.probs.cataract >= t * 1.6 ? "yes" : m.probs.cataract >= t ? "maybe" : "no",
              detail: `${Math.round(m.probs.cataract * 100)}% cataract-like (flag line ${Math.round(t * 100)}%)`,
            };
  const d = eye?.pupilDarkness ?? null;
  const phone: Signal =
    d === null
      ? { source: "Phone measurement", finding: "unknown", detail: "Pupil not measured" }
      : {
          source: "Phone measurement",
          finding: d > MEASURE_BANDS.darkness.hazy ? "yes" : d > MEASURE_BANDS.darkness.clear ? "maybe" : "no",
          detail: `Pupil ${darknessWord(d).toLowerCase()} (${d}/100)`,
        };
  const signals = [ai, model, phone];
  const yes = signals.filter((s) => s.finding === "yes").length;
  const maybe = signals.filter((s) => s.finding === "maybe").length;
  const no = signals.filter((s) => s.finding === "no").length;
  const verdict: Verdict =
    ai.finding === "yes" || yes >= 2 || (yes >= 1 && maybe >= 1)
      ? { level: "signs", title: "Signs of a cloudy lens", body: "More than one check saw a grey or cloudy pupil, which can be a cataract. Book an eye exam in the next few weeks, sooner if your vision changed suddenly." }
      : // A phone "maybe" alone doesn't outweigh the AI review seeing a clear, black pupil.
        yes >= 1 || (maybe >= 1 && ai.finding !== "no")
        ? { level: "possible", title: "Possible cloudiness", body: "One check saw something. Lighting and reflections can cause this too. Retake the photo in even light, and mention it at your next eye exam." }
        : no >= 1
          ? { level: "none", title: "No sign of a cloudy lens", body: "The pupil looked clear. Early cataracts don't always show in a photo, so keep up regular eye exams." }
          : { level: "unknown", title: "Can't tell from this photo", body: "Too few checks could see the pupil clearly. Retake it closer, in even light." };
  return { signals, verdict };
}

const FINDING_TEXT: Record<Signal["finding"], string> = { yes: "Seen", maybe: "Maybe", no: "Not seen", unknown: "Unclear" };

export function ConditionCard({ name, verdict, signals, children }: { name: string; verdict: Verdict; signals?: Signal[]; children?: React.ReactNode }) {
  return (
    <section className={cn("mt-4 rounded-2xl border p-4 text-sm", verdict.level === "signs" && "border-2 border-foreground")} data-testid={`condition-${name.toLowerCase()}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{name}</p>
      <h3 className="mt-1 font-semibold">{verdict.title}</h3>
      <p className="mt-1 text-muted-foreground">{verdict.body}</p>
      {signals && (
        <dl className="mt-3 divide-y rounded-xl border">
          {signals.map((s) => (
            <div key={s.source} className="flex items-start justify-between gap-3 px-3 py-2">
              <dt>
                <span className="font-medium">{s.source}</span>
                <span className="block text-xs text-muted-foreground">{s.detail}</span>
              </dt>
              <dd className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", s.finding === "yes" && "border-foreground bg-foreground text-background", s.finding === "unknown" && "border-dashed text-muted-foreground")}>
                {FINDING_TEXT[s.finding]}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </section>
  );
}

/** Glaucoma: what a photo can show (a sudden pressure attack), and where the slow kind is checked. */
export function glaucomaVerdict(analysis: PhotoAnalysis): Verdict {
  const o = analysis.observations;
  // A pressure attack always comes with a red eye, so a usable photo with no redness rules it out
  // even when the model didn't answer that question directly.
  const ac = !analysis.quality.usable ? "cannot_assess" : o.angle_closure === "cannot_assess" && o.redness === "none" ? "none" : o.angle_closure;
  if (ac === "possible")
    return {
      level: "signs",
      title: "Possible signs of a sudden pressure attack",
      body: "Redness around the iris, a hazy front of the eye and an oddly shaped pupil together can mean acute angle-closure glaucoma. Get emergency care now, especially with pain, headache, nausea or halos around lights.",
    };
  if (ac === "none")
    return {
      level: "none",
      title: "No signs of a sudden pressure attack",
      body: "The photo doesn't show the emergency kind of glaucoma. The common, slow kind can't be seen in a photo at all: it needs the pupil reflex test below and an eye exam that measures eye pressure.",
    };
  return {
    level: "unknown",
    title: "Can't tell from this photo",
    body: "The photo didn't show the front of the eye clearly enough to look for a sudden pressure attack. The common, slow kind of glaucoma needs the pupil reflex test and an eye exam.",
  };
}
