import { CLINICAL_REVIEW, EMPTY_SYMPTOMS, symptomContext, triage, type Symptoms } from "@/lib/eye-symptoms";
import { analysePhoto, combineAnalyses, stripUnsupported } from "@/lib/server/eye-photo-ai";
import { getSessionUserId } from "@/lib/server/session";

export const maxDuration = 300;

const list = (value: string) =>
  value
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

const PANEL = list(process.env.IRIS_EYE_MODELS ?? "anthropic/claude-opus-5.5");
const FALLBACK = list(process.env.IRIS_EYE_FALLBACK_MODELS ?? "anthropic/claude-sonnet-5.5,anthropic/claude-haiku-5.5");

const MAX_DATA_URL = 3_600_000;
const PANEL_TIMEOUT_MS = 170_000;
const FALLBACK_TIMEOUT_MS = 60_000;
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function cleanSymptoms(raw: unknown): Symptoms {
  const s = { ...EMPTY_SYMPTOMS, ...(typeof raw === "object" && raw ? raw : {}) } as Record<string, unknown>;
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | "" => (allowed as readonly unknown[]).includes(v) ? (v as T) : "";
  return {
    redFlags: Array.isArray(s.redFlags) ? s.redFlags.filter((f): f is string => typeof f === "string").slice(0, 20) : [],
    eye: oneOf(s.eye, ["left", "right", "both"] as const),
    pain: oneOf(s.pain, ["none", "mild", "moderate"] as const),
    redness: s.redness === true,
    discharge: oneOf(s.discharge, ["none", "watery", "thick"] as const),
    itching: s.itching === true,
    lightSensitivity: s.lightSensitivity === true,
    blurry: s.blurry === true,
    duration: oneOf(s.duration, ["today", "1_3_days", "4_14_days", "longer"] as const),
    contactLenses: oneOf(s.contactLenses, ["yes", "no"] as const),
  };
}

export async function POST(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { image?: unknown; enhanced?: unknown; symptoms?: unknown };
  const image = typeof body.image === "string" ? body.image : "";
  if (!DATA_URL.test(image)) {
    return Response.json({ error: "Send one JPEG, PNG or WebP photo." }, { status: 400 });
  }
  if (image.length > MAX_DATA_URL) return Response.json({ error: "That photo is too large. Please retake it." }, { status: 413 });
  const enhanced = typeof body.enhanced === "string" && DATA_URL.test(body.enhanced) && body.enhanced.length <= MAX_DATA_URL ? body.enhanced : undefined;

  const symptoms = cleanSymptoms(body.symptoms);
  const advice = triage(symptoms);

  const context = symptomContext(symptoms);
  const started = Date.now();
  const panel = await Promise.all(PANEL.map((model) => analysePhoto(model, image, { context, enhancedDataUrl: enhanced, reasoning: "high", timeoutMs: PANEL_TIMEOUT_MS }).then((call) => ({ model, call }))));
  let answered = panel.filter((p) => p.call.analysis);
  const errors = panel.filter((p) => !p.call.analysis).map((p) => `${p.model}: ${p.call.error ?? "unreadable reply"}`);
  for (const model of FALLBACK) {
    if (answered.length) break;
    const call = await analysePhoto(model, image, { context, enhancedDataUrl: enhanced, reasoning: "low", timeoutMs: FALLBACK_TIMEOUT_MS });
    if (call.analysis) answered = [{ model, call }];
    else errors.push(`${model}: ${call.error ?? "unreadable reply"}`);
  }
  if (errors.length) console.error("eye-check: some models failed", errors.join("; "));

  if (answered.length) {
    const analysis = combineAnalyses(answered.map((p) => p.call.analysis!));
    const model = answered.map((p) => p.model).join(" + ");
    const latencyMs = Date.now() - started;
    analysis.summary = stripUnsupported(analysis.summary);
    analysis.quality.explanation = stripUnsupported(analysis.quality.explanation);
    if (analysis.category === "angle_closure_signs" && analysis.observations.angle_closure !== "possible") analysis.category = "inconclusive";
    if (analysis.quality.usable && analysis.observations.angle_closure === "possible") analysis.category = "angle_closure_signs";
    return Response.json({ analysis, triage: advice, model, latencyMs, clinicalReview: CLINICAL_REVIEW });
  }
  return Response.json(
    { error: "The photo couldn't be reviewed right now. Please try again in a minute.", triage: advice },
    { status: 502 },
  );
}
