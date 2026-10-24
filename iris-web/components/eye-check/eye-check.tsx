"use client";

import { useAuth } from "@clerk/nextjs";
import { AlertTriangle, ArrowLeft, Camera, Check, ChevronDown, Info, Loader2, RotateCcw, Smartphone, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CapturedPhoto } from "@/lib/eye-capture";
import type { Category, PhotoAnalysis, QualityProblem } from "@/lib/eye-check-types";
import { CLINICAL_REVIEW, EMPTY_SYMPTOMS, RED_FLAGS, triage, type Symptoms, type Triage, type Urgency } from "@/lib/eye-symptoms";
import { RETAKE, type QualityIssue } from "@/lib/photo-quality";
import { cn } from "@/lib/utils";
import { EyeCamera, type Facing } from "./eye-camera";

type Step = "symptoms" | "camera-choice" | "camera" | "review" | "analysing" | "result";

type CheckResponse = { analysis: PhotoAnalysis; triage: Triage; model: string; latencyMs: number };

const URGENCY_ORDER: Urgency[] = ["routine", "soon", "same_day", "emergency"];
const worse = (a: Urgency, b: Urgency) => (URGENCY_ORDER.indexOf(a) >= URGENCY_ORDER.indexOf(b) ? a : b);

/** What a photo finding means, in plain words. Educational, never a diagnosis. */
const CATEGORY_TEXT: Record<Category, { title: string; body: string; urgency: Urgency }> = {
  no_visible_concern: {
    title: "Nothing of concern was visible",
    body: "The parts of the eye a photo can show looked ordinary. A photo can't check eye pressure, the retina or how well you see, so keep up regular eye exams.",
    urgency: "routine",
  },
  redness: {
    title: "The white of the eye looks red",
    body: "Redness is common and often comes from irritation, dryness, allergies, rubbing or an infection such as pink eye. It usually settles in a few days. Get it checked if it hurts, affects your vision, has thick discharge or lasts more than a few days.",
    urgency: "routine",
  },
  lens_cloudiness: {
    title: "The pupil looks grey or cloudy",
    body: "A pupil that looks milky instead of black can happen when the lens inside the eye becomes cloudy, as with a cataract. Lighting can also cause this look, and only an eye exam can tell. Book a routine eye exam; go sooner if your vision changed suddenly.",
    urgency: "soon",
  },
  eyelid: {
    title: "An eyelid looks swollen, lumpy or droopy",
    body: "Eyelid bumps are often a stye or a blocked oil gland and usually go away with warm compresses. See a doctor if it is very painful, spreads, affects your vision, lasts more than two weeks, or if a lid droops suddenly.",
    urgency: "routine",
  },
  inflammation_signs: {
    title: "Redness around the coloured part of the eye",
    body: "Redness concentrated around the iris, or a hazy-looking pupil with redness, can be a sign of inflammation that needs an eye doctor promptly, especially with pain, light sensitivity or blurry vision.",
    urgency: "same_day",
  },
  inconclusive: {
    title: "The photo can't support a clear answer",
    body: "The photo was good enough to look at, but it doesn't show enough to describe the eye with confidence. That's not a bad result. You can retake it in brighter, even light, or see an eye doctor if you are worried.",
    urgency: "routine",
  },
};

const URGENCY_TEXT: Record<Urgency, { title: string; body: string }> = {
  emergency: { title: "Get emergency care now", body: "Go to the emergency room or call 911." },
  same_day: { title: "See a doctor today", body: "Contact an eye doctor (optometrist or ophthalmologist), urgent care, or your doctor today." },
  soon: { title: "Get it checked in the next few days", body: "Book an appointment with an eye doctor or your doctor." },
  routine: { title: "No urgent signs from your answers", body: "Keep up regular eye exams, and get checked if anything changes or worries you." },
};

/** Model photo problems → the same retake instructions the phone's own checks use. */
const PROBLEM_TO_ISSUE: Partial<Record<QualityProblem, QualityIssue>> = {
  blur: "blur",
  too_dark: "too_dark",
  glare: "glare",
  too_far: "too_small",
  other: "low_contrast",
};
const MODEL_RETAKE: Partial<Record<QualityProblem, { title: string; fix: string }>> = {
  no_eye: { title: "No eye was found in the photo", fix: "Fit one open eye inside the oval, filling most of it, and try again." },
  eye_closed: { title: "The eye looks closed", fix: "Keep the eye wide open and look just past the phone while the photo is taken. A helper makes this easier." },
  cropped: { title: "Part of the eye is cut off", fix: "Centre the whole eye, including both corners, inside the oval." },
};

export function EyeCheck() {
  const { isSignedIn, getToken } = useAuth();
  const [step, setStep] = useState<Step>("symptoms");
  const [symptoms, setSymptoms] = useState<Symptoms>(EMPTY_SYMPTOMS);
  const [facing, setFacing] = useState<Facing>("environment");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const advice = useMemo(() => triage(symptoms), [symptoms]);
  const eyeLabel = symptoms.eye === "left" ? "left eye" : symptoms.eye === "right" ? "right eye" : "eye";

  async function analyse() {
    if (!photo) return;
    setStep("analysing");
    setError(null);
    try {
      const token = await Promise.race([getToken(), new Promise<null>((r) => setTimeout(() => r(null), 10_000))]);
      const res = await fetch("/api/eye-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ image: photo.dataUrl, symptoms }),
        signal: AbortSignal.timeout(90_000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "The photo couldn't be reviewed. Please try again.");
      setResult(json as CheckResponse);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "The review took too long. Please try again.");
      setStep("review");
    }
  }

  function retake() {
    setPhoto(null);
    setResult(null);
    setError(null);
    setStep("camera");
  }

  if (step === "camera") {
    return (
      <EyeCamera
        facing={facing}
        eyeLabel={eyeLabel}
        avoidTorch={symptoms.lightSensitivity || symptoms.pain === "moderate"}
        onFacing={setFacing}
        onClose={() => setStep(photo ? "review" : "camera-choice")}
        onCapture={(p) => {
          setPhoto(p);
          setStep("review");
        }}
      />
    );
  }

  return (
    <main className="mx-auto max-w-xl px-5 pb-16 pt-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Eye photo check</h1>
      <p className="mt-2 text-muted-foreground">
        A few questions, then one close-up photo of the front of the eye. You get a plain description of what the photo shows and what to do next. This is
        education, not a diagnosis.
      </p>

      <Progress step={step} />

      {(advice.urgency === "emergency" || advice.urgency === "same_day") && <UrgentPanel triage={advice} />}

      {step === "symptoms" && (
        <SymptomForm symptoms={symptoms} onChange={setSymptoms} advice={advice} onNext={() => setStep("camera-choice")} />
      )}

      {step === "camera-choice" && (
        <CameraChoice
          eyeLabel={eyeLabel}
          signedIn={isSignedIn !== false}
          onBack={() => setStep("symptoms")}
          onPick={(f) => {
            setFacing(f);
            setStep("camera");
          }}
        />
      )}

      {(step === "review" || step === "analysing") && photo && (
        <Review photo={photo} busy={step === "analysing"} error={error} onRetake={retake} onAnalyse={analyse} facing={facing} />
      )}

      {step === "result" && result && <Result result={result} photo={photo} onRetake={retake} />}

      <CanCannot />

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Iris is a student research prototype, not a medical device. It can&apos;t diagnose or rule out any eye condition. {CLINICAL_REVIEW.note}
      </p>
    </main>
  );
}

function Progress({ step }: { step: Step }) {
  const steps = ["Questions", "Camera", "Photo", "Result"];
  const index = step === "symptoms" ? 0 : step === "camera-choice" ? 1 : step === "result" ? 3 : 2;
  return (
    <ol className="mt-6 flex gap-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex-1">
          <div className={cn("h-1 rounded-full", i <= index ? "bg-foreground" : "bg-muted")} />
          <p className={cn("mt-1 text-[11px]", i === index ? "font-medium" : "text-muted-foreground")} aria-current={i === index ? "step" : undefined}>
            {s}
          </p>
        </li>
      ))}
    </ol>
  );
}

function UrgentPanel({ triage: t }: { triage: Triage }) {
  const text = URGENCY_TEXT[t.urgency];
  return (
    <section role="alert" className="mt-6 rounded-2xl border-2 border-foreground bg-foreground p-4 text-background" data-testid="urgent-panel">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-5 shrink-0" /> {text.title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {t.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm opacity-90">{text.body} You don&apos;t need to finish the photo check first.</p>
      {t.urgency === "emergency" && (
        <a href="tel:911" className="mt-3 inline-flex h-10 items-center rounded-xl bg-background px-4 text-sm font-semibold text-foreground">
          Call 911
        </a>
      )}
    </section>
  );
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors", checked && "border-foreground bg-accent")}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-foreground" />
      <span>{children}</span>
    </label>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn("rounded-xl border px-3 py-2 text-sm transition-colors", value === o.value ? "border-foreground bg-foreground text-background" : "hover:bg-accent")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SymptomForm({
  symptoms: s,
  onChange,
  advice,
  onNext,
}: {
  symptoms: Symptoms;
  onChange: (s: Symptoms) => void;
  advice: Triage;
  onNext: () => void;
}) {
  const set = <K extends keyof Symptoms>(key: K, value: Symptoms[K]) => onChange({ ...s, [key]: value });
  const toggleFlag = (id: string, on: boolean) => set("redFlags", on ? [...s.redFlags, id] : s.redFlags.filter((f) => f !== id));
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">First, is any of this happening?</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tick anything that applies. If you tick one, you&apos;ll see what to do right away.</p>
      <div className="mt-3 space-y-2">
        {RED_FLAGS.map((f) => (
          <Toggle key={f.id} checked={s.redFlags.includes(f.id)} onChange={(v) => toggleFlag(f.id, v)}>
            {f.label}
          </Toggle>
        ))}
      </div>

      <h2 className="mt-8 text-lg font-semibold">About the eye</h2>
      <Choice
        label="Which eye are you checking?"
        value={s.eye}
        onChange={(v) => set("eye", v)}
        options={[
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
          { value: "both", label: "Both (one photo at a time)" },
        ]}
      />
      <Choice
        label="Any eye pain?"
        value={s.pain}
        onChange={(v) => set("pain", v)}
        options={[
          { value: "none", label: "No" },
          { value: "mild", label: "Mild / gritty" },
          { value: "moderate", label: "Moderate or worse" },
        ]}
      />
      <Choice
        label="Any discharge?"
        value={s.discharge}
        onChange={(v) => set("discharge", v)}
        options={[
          { value: "none", label: "No" },
          { value: "watery", label: "Watery" },
          { value: "thick", label: "Thick, yellow or green" },
        ]}
      />
      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Do you notice any of these?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Toggle checked={s.redness} onChange={(v) => set("redness", v)}>
            Redness
          </Toggle>
          <Toggle checked={s.itching} onChange={(v) => set("itching", v)}>
            Itching
          </Toggle>
          <Toggle checked={s.lightSensitivity} onChange={(v) => set("lightSensitivity", v)}>
            Light hurts or bothers the eye
          </Toggle>
          <Toggle checked={s.blurry} onChange={(v) => set("blurry", v)}>
            Blurry vision that doesn&apos;t clear with blinking
          </Toggle>
        </div>
      </fieldset>
      <Choice
        label="How long has this been going on?"
        value={s.duration}
        onChange={(v) => set("duration", v)}
        options={[
          { value: "today", label: "Started today" },
          { value: "1_3_days", label: "1–3 days" },
          { value: "4_14_days", label: "4–14 days" },
          { value: "longer", label: "Longer / no symptoms" },
        ]}
      />
      <Choice
        label="Do you wear contact lenses?"
        value={s.contactLenses}
        onChange={(v) => set("contactLenses", v)}
        options={[
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ]}
      />

      {advice.urgency === "soon" && (
        <div className="mt-6 rounded-2xl border p-4 text-sm" data-testid="soon-panel">
          <p className="font-medium">{URGENCY_TEXT.soon.title}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {advice.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        {advice.urgency === "emergency" ? "Continue to the photo anyway" : "Next: take the photo"}
      </button>
    </section>
  );
}

function CameraChoice({ eyeLabel, signedIn, onBack, onPick }: { eyeLabel: string; signedIn: boolean; onBack: () => void; onPick: (f: Facing) => void }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Choose a camera</h2>
      <button
        type="button"
        onClick={() => onPick("environment")}
        className="mt-3 w-full rounded-2xl border-2 border-foreground p-4 text-left transition-colors hover:bg-accent"
      >
        <p className="flex items-center gap-2 font-semibold">
          <Users className="size-5" /> Rear camera, with a helper
          <span className="ml-auto rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">Recommended</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">The rear camera has more detail and can focus up close, so results are clearer.</p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Ask someone to hold the phone for you.</li>
          <li>Sit facing a window or a bright lamp, so the light falls on your face. Don&apos;t sit with the light behind you.</li>
          <li>Take off glasses. Look straight ahead at a point just past the phone, eye wide open.</li>
          <li>The helper holds the phone level with your {eyeLabel}, about 10–15 cm (4–6 in) away, fits the eye in the oval and taps it to focus.</li>
        </ol>
      </button>
      <button type="button" onClick={() => onPick("user")} className="mt-3 w-full rounded-2xl border p-4 text-left transition-colors hover:bg-accent">
        <p className="flex items-center gap-2 font-semibold">
          <Smartphone className="size-5" /> Front camera, on your own
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Works without a helper, but front cameras usually have less detail and can&apos;t focus as close, so photos are more often blurry or too small and
          results more often inconclusive.
        </p>
      </button>
      <div className="mt-4 rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Lighting</p>
        <p className="mt-1">
          Daylight from a window is best. The flash isn&apos;t used automatically. On phones that support it you can turn the flashlight on briefly yourself,
          but room light is usually clearer and more comfortable.
        </p>
      </div>
      {!signedIn && <p className="mt-4 text-sm">Please sign in to get your result.</p>}
      <button type="button" onClick={onBack} className="mt-4 text-sm text-muted-foreground underline underline-offset-4">
        Back to questions
      </button>
    </section>
  );
}

function issueText(issue: QualityIssue) {
  return RETAKE[issue];
}

function Review({
  photo,
  facing,
  busy,
  error,
  onRetake,
  onAnalyse,
}: {
  photo: CapturedPhoto;
  facing: Facing;
  busy: boolean;
  error: string | null;
  onRetake: () => void;
  onAnalyse: () => void;
}) {
  const q = photo.quality;
  return (
    <section className="mt-6" data-testid="review">
      <h2 className="text-lg font-semibold">{q.ok ? "Photo looks usable" : "Let's retake this photo"}</h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, not a remote image */}
      <img src={photo.dataUrl} alt="The eye photo you took" className="mt-3 w-full rounded-2xl border bg-black object-contain" />
      <p className="mt-2 text-xs text-muted-foreground">
        {photo.cropW}×{photo.cropH} camera pixels from a {photo.frameW}×{photo.frameH} frame · {Math.round(photo.bytes / 1024)} KB. Cropped from the original
        image; nothing is enlarged.
      </p>

      {!q.ok && (
        <ul className="mt-4 space-y-3" data-testid="quality-issues">
          {q.issues.map((i) => (
            <li key={i} className="rounded-2xl border p-4 text-sm">
              <p className="font-medium">{issueText(i).title}</p>
              <p className="mt-1 text-muted-foreground">{issueText(i).fix}</p>
            </li>
          ))}
          {q.issues.includes("too_small") && facing === "user" && (
            <li className="rounded-2xl border p-4 text-sm text-muted-foreground">The front camera often can&apos;t give enough detail. The rear camera with a helper works better.</li>
          )}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-2xl border border-foreground/40 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <p className="mt-4 flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        When you continue, this photo and your answers are sent to an AI image model (Anthropic&apos;s Claude, through the Hack Club AI service) to be described.
        Iris doesn&apos;t save the photo.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onRetake}
          disabled={busy}
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-40",
            q.ok ? "border" : "bg-foreground text-background",
          )}
        >
          <RotateCcw className="size-4" /> Retake
        </button>
        <button
          type="button"
          onClick={onAnalyse}
          disabled={busy}
          className={cn(
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-opacity disabled:opacity-60",
            q.ok ? "bg-foreground text-background" : "border",
          )}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {busy ? "Looking at the photo…" : q.ok ? "Check this photo" : "Check it anyway"}
        </button>
      </div>
    </section>
  );
}

const OBSERVATION_LABELS: Record<keyof PhotoAnalysis["observations"], string> = {
  redness: "Redness of the white",
  lens_cloudiness: "Cloudy-looking pupil",
  eyelid: "Eyelids",
  discharge: "Discharge or crusting",
  yellow_whites: "Yellow tint to the white",
};

const OBSERVATION_VALUES: Record<string, string> = {
  none: "Not seen",
  mild: "Mild",
  marked: "Marked",
  possible: "Possible",
  likely: "Likely",
  normal: "Look normal",
  swelling_or_lump: "Swelling or lump",
  drooping: "Drooping",
  present: "Present",
  cannot_assess: "Can't tell from this photo",
};

function Result({ result, photo, onRetake }: { result: CheckResponse; photo: CapturedPhoto | null; onRetake: () => void }) {
  const a = result.analysis;

  if (!a.quality.usable) {
    const fix = MODEL_RETAKE[a.quality.problem] ?? RETAKE[PROBLEM_TO_ISSUE[a.quality.problem] ?? "low_contrast"];
    return (
      <section className="mt-6" data-testid="result-unusable">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">About the photo, not your eye</p>
        <h2 className="mt-1 text-xl font-semibold">{fix.title}</h2>
        {a.quality.explanation && <p className="mt-2 text-sm text-muted-foreground">{a.quality.explanation}</p>}
        <div className="mt-4 rounded-2xl border p-4 text-sm">
          <p className="font-medium">How to fix it</p>
          <p className="mt-1 text-muted-foreground">{fix.fix}</p>
        </div>
        <TriageCard urgency={result.triage.urgency} reasons={result.triage.reasons} />
        <button
          type="button"
          onClick={onRetake}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-semibold text-background"
        >
          <Camera className="size-4" /> Retake the photo
        </button>
      </section>
    );
  }

  const text = CATEGORY_TEXT[a.category];
  const urgency = worse(result.triage.urgency, text.urgency);
  const reasons = [...result.triage.reasons];
  if (URGENCY_ORDER.indexOf(text.urgency) > URGENCY_ORDER.indexOf(result.triage.urgency)) reasons.push(text.body);

  return (
    <section className="mt-6" data-testid={a.category === "inconclusive" ? "result-inconclusive" : "result-finding"}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">What the photo shows · educational, not a diagnosis</p>
      <h2 className="mt-1 text-xl font-semibold">{text.title}</h2>
      {a.summary && <p className="mt-2 text-sm">{a.summary}</p>}
      <p className="mt-2 text-sm text-muted-foreground">{text.body}</p>
      <p className="mt-2 text-xs text-muted-foreground">How sure: {a.confidence === "high" ? "fairly sure" : a.confidence === "medium" ? "somewhat sure" : "not very sure"}.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL */}
        {photo && <img src={photo.dataUrl} alt="Your eye photo" className="w-full rounded-xl border object-contain" />}
        <dl className="divide-y rounded-2xl border text-sm">
          {(Object.keys(OBSERVATION_LABELS) as (keyof PhotoAnalysis["observations"])[]).map((k) => (
            <div key={k} className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{OBSERVATION_LABELS[k]}</dt>
              <dd className="text-right font-medium">{OBSERVATION_VALUES[a.observations[k]] ?? a.observations[k]}</dd>
            </div>
          ))}
        </dl>
      </div>

      <TriageCard urgency={urgency} reasons={reasons} />

      <button type="button" onClick={onRetake} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-medium">
        <RotateCcw className="size-4" /> Take another photo
      </button>
    </section>
  );
}

function TriageCard({ urgency, reasons }: { urgency: Urgency; reasons: string[] }) {
  const text = URGENCY_TEXT[urgency];
  const strong = urgency === "emergency" || urgency === "same_day";
  return (
    <div className={cn("mt-4 rounded-2xl p-4 text-sm", strong ? "bg-foreground text-background" : "border")} data-testid="triage-card">
      <p className="font-semibold">{text.title}</p>
      {reasons.length > 0 && (
        <ul className={cn("mt-1 list-disc space-y-1 pl-5", !strong && "text-muted-foreground")}>
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <p className={cn("mt-1", !strong && "text-muted-foreground")}>{text.body}</p>
    </div>
  );
}

function CanCannot() {
  return (
    <details className="group mt-8 rounded-2xl border p-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
        What a phone photo can and can&apos;t show
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-medium">Can show</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Redness of the white of the eye</li>
            <li>A grey or milky-looking pupil (possible lens cloudiness)</li>
            <li>Eyelid swelling, lumps or drooping</li>
            <li>Discharge or crusting</li>
            <li>A yellow tint to the white of the eye</li>
          </ul>
        </div>
        <div>
          <p className="font-medium">Can&apos;t show</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Glaucoma or eye pressure</li>
            <li>Diabetic eye disease, or retina and macula problems</li>
            <li>Optic nerve problems</li>
            <li>How well you see</li>
            <li>Early cataracts that don&apos;t change how the pupil looks</li>
          </ul>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Those need an eye exam with special equipment. A normal-looking photo doesn&apos;t mean the eye is healthy.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Urgent-care guidance is based on public advice from{" "}
        {CLINICAL_REVIEW.sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ", "}
            <a href={s.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {s.label}
            </a>
          </span>
        ))}
        . It has not yet been reviewed by a clinician.
      </p>
    </details>
  );
}
