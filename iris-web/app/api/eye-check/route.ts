import { CLINICAL_REVIEW, EMPTY_SYMPTOMS, symptomContext, triage, type Symptoms } from "@/lib/eye-symptoms";
import { analysePhoto, combineAnalyses, stripUnsupported } from "@/lib/server/eye-photo-ai";
import { getSessionUserId } from "@/lib/server/session";

/**
 * POST { image: "data:image/jpeg;base64,…", symptoms } → what an image model can see in one
 * phone photo of the front of an eye, plus advice from the symptom answers.
 *
 * The photo is sent to the AI provider for this one request and is not stored by Iris.
 * Models are tried in order; the default order comes from the comparison in
 * scripts/eye-photos/MODEL-EVAL.md and can be changed with IRIS_EYE_MODELS.
 */

// The models think carefully before answering, so allow up to 5 minutes in total.
export const maxDuration = 300;

const list = (value: string) =>
  value
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);

/**
 * The panel: image models asked at the same time, with careful (high) reasoning, their answers
 * combined cautiously (see combineAnalyses). If none answers, the fallback models are tried one
 * by one with low reasoning.
 *
 * Claude Opus 5.5 reviews the photo: in scripts/eye-photos/MODEL-EVAL.md it never gave a wrong
 * category and said so when unsure. Sonnet 5.5 and Haiku 5.5 are the cheaper backups, so the check
 * still answers if Opus fails or the Hack Club AI key's spending limit is reached (402).
 * Set IRIS_EYE_MODELS / IRIS_EYE_FALLBACK_MODELS to change them.
 */
const PANEL = list(process.env.IRIS_EYE_MODELS ?? "anthropic/claude-opus-5.5");
const FALLBACK = list(process.env.IRIS_EYE_FALLBACK_MODELS ?? "anthropic/claude-sonnet-5.5,anthropic/claude-haiku-5.5");

/** About 2.7 MB of JPEG. The app sends at most ~1536 px at quality 0.9, well under this. */
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
  // Optional: the same photo brightened and sharpened on the phone.
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
    // Belt and braces: never pass on a sentence that names something a photo can't show.
    analysis.summary = stripUnsupported(analysis.summary);
    analysis.quality.explanation = stripUnsupported(analysis.quality.explanation);
    // The emergency category must agree with its observation, and the reverse.
    if (analysis.category === "angle_closure_signs" && analysis.observations.angle_closure !== "possible") analysis.category = "inconclusive";
    if (analysis.quality.usable && analysis.observations.angle_closure === "possible") analysis.category = "angle_closure_signs";
    return Response.json({ analysis, triage: advice, model, latencyMs, clinicalReview: CLINICAL_REVIEW });
  }
  return Response.json(
    { error: "The photo couldn't be reviewed right now. Please try again in a minute.", triage: advice },
    { status: 502 },
  );
}
