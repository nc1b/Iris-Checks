"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Analysis, Protocol } from "@/lib/analysis";
import { EYE_DIFFERENCE, PUBLISHED_PUPIL_IRIS_RATIO, STUDIES, THRESHOLDS, type MetricStatus } from "@/lib/reference";
import { addToLog, clearLog, logToCsv, readLog, type LogEntry, type Participant } from "@/lib/log";
import { cn } from "@/lib/utils";
import { ResponseChart } from "./response-chart";

const VERDICTS: Record<Analysis["verdict"], { title: string; body: string; tone: string; icon: React.ReactNode }> = {
  typical: {
    title: "Your pupil response looks typical",
    body: "Your pupil reacted to the light in the range we expect. This cannot rule out diabetic retinopathy. An eye professional can assess your retina.",
    tone: "bg-iris-400/15 ring-iris-400/40 text-iris-100",
    icon: <CheckCircle2 className="h-6 w-6 text-iris-300" />,
  },
  check: {
    title: "Mostly typical, with one thing to re-check",
    body: "One measure was outside our starter range. Lighting and movement often cause this. Retake the scan in a darker room before reading anything into it.",
    tone: "bg-amber-400/10 ring-amber-300/40 text-amber-50",
    icon: <Info className="h-6 w-6 text-amber-300" />,
  },
  weaker: {
    title: "Your pupil reacted more weakly or slowly than typical",
    body: "In research studies, weaker and slower pupil reactions were linked to diabetes and early nerve changes. This prototype can't diagnose anything, but it cannot establish whether you have diabetic retinopathy. Ask an eye professional about a retinal assessment.",
    tone: "bg-amber-400/15 ring-amber-300/50 text-amber-50",
    icon: <AlertTriangle className="h-6 w-6 text-amber-300" />,
  },
  retake: {
    title: "We couldn't get a clear reading",
    body: "The pupil wasn't tracked well enough to measure. Try again in a dimmer room, with screen brightness at maximum, holding the phone 20–30 cm from your face.",
    tone: "bg-white/5 ring-white/15 text-iris-50",
    icon: <RotateCcw className="h-6 w-6 text-iris-200" />,
  },
};

const STATUS_STYLE: Record<MetricStatus, string> = {
  typical: "bg-iris-400/20 text-iris-200",
  borderline: "bg-amber-400/15 text-amber-200",
  atypical: "bg-red-400/15 text-red-200",
  unknown: "bg-white/10 text-iris-100/60",
};

function fmt(v: number | null | undefined, digits = 2) {
  return v == null || !Number.isFinite(v) ? "—" : v.toFixed(digits);
}

export function Results({
  analysis,
  protocol,
  participant,
  demo,
  onRetake,
}: {
  analysis: Analysis;
  protocol: Protocol;
  participant: Participant;
  demo: boolean;
  onRetake: () => void;
}) {
  const v = VERDICTS[analysis.verdict];
  const [ai, setAi] = useState<{ text: string; source: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [log, setLog] = useState<LogEntry[]>(() => readLog());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verdict: analysis.verdict,
        metrics: analysis.metrics,
        ratings: analysis.ratings,
        restingPupilMm: analysis.restingPupilMm,
        netPipr: analysis.netPipr,
        quality: analysis.quality,
        protocol: protocol.id,
        age: participant.age,
        diabetes: participant.diabetes,
        demo,
      }),
    })
      .then((r) => r.json())
      .then((j) => !cancelled && setAi({ text: j.text, source: j.source }))
      .catch(() => !cancelled && setAi({ text: "The AI explanation isn't available right now.", source: "error" }))
      .finally(() => !cancelled && setAiLoading(false));
    return () => {
      cancelled = true;
    };
  }, [analysis, protocol.id, participant.age, participant.diabetes, demo]);

  const save = () => {
    const next = addToLog({
      participant,
      protocol: protocol.id,
      demo,
      verdict: analysis.verdict,
      restingRatio: analysis.metrics.restingRatio,
      amplitude: analysis.metrics.amplitude,
      latency: analysis.metrics.latency,
      velocity: analysis.metrics.velocity,
      netPipr: analysis.netPipr,
      validFraction: analysis.quality.validFraction,
      meanContrast: analysis.quality.meanContrast,
    });
    setLog(next);
    setSaved(true);
  };

  const download = () => {
    const blob = new Blob([logToCsv(log)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `iris-research-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ratio = analysis.metrics.restingRatio;
  const scale = (r: number) => `${Math.min(100, Math.max(0, ((r - 0.2) / (0.7 - 0.2)) * 100))}%`;

  return (
    <div className="space-y-6">
      {demo && (
        <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-iris-100/80 ring-1 ring-white/10">
          <strong className="text-iris-100">Demo mode:</strong> these results come from simulated pupil data run through the real analysis. They are not from your eyes.
        </div>
      )}

      <div className={cn("rounded-3xl p-6 ring-1", v.tone)}>
        <div className="flex items-start gap-3">
          {v.icon}
          <div>
            <h2 className="font-instrument-serif text-3xl leading-tight">{v.title}</h2>
            <p className="mt-2 text-sm opacity-85">{v.body}</p>
            {analysis.quality.reasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm opacity-85">
                {analysis.quality.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-iris-300">Your light reflex</h3>
        <div className="mt-3">
          <ResponseChart series={analysis.series} protocol={protocol} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {THRESHOLDS.map((t) => {
          const value = analysis.metrics[t.key];
          const status = analysis.ratings[t.key];
          return (
            <div key={t.key} className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-iris-100/80">{t.label}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", STATUS_STYLE[status])}>{status}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-iris-50">
                {fmt(value, t.key === "restingRatio" ? 2 : t.key === "amplitude" ? 0 : 2)}
                <span className="ml-1 text-sm font-normal text-iris-100/60">{t.unit}</span>
              </div>
              <p className="mt-1 text-xs text-iris-100/60">
                Starter typical: {t.better === "higher" ? "≥" : "≤"} {t.typical}
                {t.unit}. {t.explain}
              </p>
            </div>
          );
        })}
      </section>

      {analysis.perStimulus.length > 1 && (
        <section className="rounded-2xl bg-white/[0.03] p-4 text-sm ring-1 ring-white/10">
          <h3 className="font-semibold text-iris-100">Experimental colour test</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {analysis.perStimulus.map((m) => (
              <div key={m.color} className="rounded-xl bg-white/5 p-3">
                <div className="capitalize text-iris-200">{m.color} light</div>
                <div className="text-iris-100/70">
                  Shrink {fmt(m.amplitude, 0)}% · still constricted after 6 s: {fmt(m.pipr6s, 1)}%
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-iris-100/70">
            Net blue-minus-red after 6 s: <strong className="text-iris-100">{fmt(analysis.netPipr, 1)}%</strong>. The Singapore study found this
            was reduced in diabetes. Phone screens may be too dim for this, and testing that is part of our experiment.
          </p>
        </section>
      )}

      <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-iris-300">Compared with published research</h3>
        <p className="mt-2 text-sm text-iris-100/75">Resting pupil-to-iris ratio (bigger means a larger pupil):</p>
        <div className="relative mt-8 h-2 rounded-full bg-gradient-to-r from-amber-400/60 via-amber-200/40 to-iris-400/70">
          {[
            { r: PUBLISHED_PUPIL_IRIS_RATIO.diabetesWithNeuropathy, label: "Diabetes + neuropathy 0.35" },
            { r: PUBLISHED_PUPIL_IRIS_RATIO.diabetes, label: "Diabetes 0.42" },
            { r: PUBLISHED_PUPIL_IRIS_RATIO.healthy, label: "Healthy 0.55" },
          ].map((m, i) => (
            <div key={m.label} className="absolute -top-1 -translate-x-1/2" style={{ left: scale(m.r) }}>
              <div className="h-4 w-px bg-iris-100/70" />
              <div className={cn("absolute whitespace-nowrap text-[10px] text-iris-100/70 -translate-x-1/2", i % 2 ? "top-5" : "-top-5")}>
                {m.label}
              </div>
            </div>
          ))}
          {ratio != null && Number.isFinite(ratio) && (
            <div className="absolute -top-2 -translate-x-1/2" style={{ left: scale(ratio) }}>
              <div className="h-6 w-6 rounded-full border-2 border-iris-950 bg-iris-100 shadow" title={`You: ${ratio.toFixed(2)}`} />
            </div>
          )}
        </div>
        <p className="mt-10 text-xs text-iris-100/60">
          You: <strong className="text-iris-100">{fmt(ratio)}</strong> (about {fmt(analysis.restingPupilMm, 1)} mm). {PUBLISHED_PUPIL_IRIS_RATIO.note}
        </p>

        {analysis.eyes.sizeStatus !== "unknown" && (
          <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm">
            <p className="font-medium text-iris-100">
              Left vs right:{" "}
              {analysis.eyes.sizeStatus === "even"
                ? "pupils look even"
                : analysis.eyes.sizeStatus === "borderline"
                  ? "small size difference"
                  : "clear size difference"}
            </p>
            <p className="mt-1 text-iris-100/75">
              Left about {fmt(analysis.eyes.leftMm, 1)} mm, right about {fmt(analysis.eyes.rightMm, 1)} mm (difference{" "}
              {fmt(analysis.eyes.sizeDiffMm, 1)} mm). {EYE_DIFFERENCE.explain}
            </p>
          </div>
        )}

        <ul className="mt-5 space-y-3">
          {STUDIES.map((s) => (
            <li key={s.id} className="rounded-2xl bg-white/5 p-3 text-sm">
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-iris-200 hover:text-iris-100">
                {s.short} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <p className="mt-1 text-iris-100/75">{s.finding}</p>
              <p className="mt-1 text-xs text-iris-100/50">Device: {s.device}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-iris-500/15 to-transparent p-5 ring-1 ring-iris-400/25">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-iris-300">
          <Sparkles className="h-4 w-4" /> AI explanation
        </h3>
        {aiLoading ? (
          <div className="mt-3 space-y-2">
            <div className="h-3 w-11/12 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-10/12 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-8/12 animate-pulse rounded bg-white/10" />
          </div>
        ) : (
          <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-iris-50/90">{ai?.text}</div>
        )}
        <p className="mt-3 text-[11px] text-iris-100/50">
          Only the numbers above are sent to the AI, never your camera images.
          {ai?.source === "fallback" && " (AI service not configured, so this is the built-in explanation.)"}
        </p>
      </section>

      <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-iris-300">Research log (team pilot study)</h3>
        <p className="mt-2 text-sm text-iris-100/70">
          Save this result with the participant code, age and diabetes status. The log stays in this browser only and can be exported as a CSV for analysis.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={saved}
            className="inline-flex items-center gap-2 rounded-full bg-iris-300 px-4 py-2 text-sm font-medium text-iris-950 hover:bg-iris-200 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saved ? "Saved" : "Save to log"}
          </button>
          <button
            onClick={download}
            disabled={log.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-iris-100 ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV ({log.length})
          </button>
          {log.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Delete all saved results from this browser?")) {
                  clearLog();
                  setLog([]);
                  setSaved(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-iris-100/70 hover:text-iris-100"
            >
              <Trash2 className="h-4 w-4" /> Clear log
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onRetake}
          className="inline-flex items-center gap-2 rounded-full bg-iris-300 px-5 py-3 text-sm font-medium text-iris-950 hover:bg-iris-200"
        >
          <RotateCcw className="h-4 w-4" /> Scan again
        </button>
        <Link href="/" className="text-sm text-iris-100/70 hover:text-iris-100">
          Back to home
        </Link>
      </div>

      <p className="text-xs text-iris-100/50">
        Iris is a student research prototype. It is not a medical device and does not diagnose diabetic retinopathy or any other condition.
        Thresholds are provisional starter values. If you are worried about your health, talk to a doctor.
      </p>
    </div>
  );
}
