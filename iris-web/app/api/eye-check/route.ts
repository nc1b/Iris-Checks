import { CLINICAL_REVIEW, EMPTY_SYMPTOMS, symptomContext, triage, type Symptoms } from "@/lib/eye-symptoms";
import { analysePhoto, UNSUPPORTED_CLAIMS } from "@/lib/server/eye-photo-ai";
import { getSessionUserId } from "@/lib/server/session";

/**
 * POST { image: "data:image/jpeg;base64,…", symptoms } → what an image model can see in one
 * phone photo of the front of an eye, plus advice from the symptom answers.
 *
 * The photo is sent to the AI provider for this one request and is not stored by Iris.
 * Models are tried in order; the default order comes from the comparison in
 * scripts/eye-photos/MODEL-EVAL.md and can be changed with IRIS_EYE_MODELS.
 */

export const maxDuration = 60;

const MODELS = (process.env.IRIS_EYE_MODELS ?? "anthropic/claude-opus-5.5,anthropic/claude-sonnet-5.5")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/** About 2.7 MB of JPEG. The app sends at most ~1536 px at quality 0.9, well under this. */
const MAX_DATA_URL = 3_600_000;

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

  const body = (await request.json().catch(() => ({}))) as { image?: unknown; symptoms?: unknown };
  const image = typeof body.image === "string" ? body.image : "";
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
    return Response.json({ error: "Send one JPEG, PNG or WebP photo." }, { status: 400 });
  }
  if (image.length > MAX_DATA_URL) return Response.json({ error: "That photo is too large. Please retake it." }, { status: 413 });

  const symptoms = cleanSymptoms(body.symptoms);
  const advice = triage(symptoms);

  let lastError = "";
  for (const [i, model] of MODELS.entries()) {
    // Both attempts must fit inside maxDuration: the fallback gets what's left.
    const call = await analysePhoto(model, image, { context: symptomContext(symptoms), timeoutMs: i === 0 ? 35_000 : 20_000 });
    if (!call.analysis) {
      lastError = call.error ?? "unreadable reply";
      continue;
    }
    const analysis = call.analysis;
    // Belt and braces: never pass on a summary that names something a photo can't show.
    if (UNSUPPORTED_CLAIMS.test(`${analysis.summary} ${analysis.quality.explanation}`)) {
      analysis.summary = "The photo was reviewed, but the description couldn't be shown. Please treat this result as inconclusive.";
      analysis.category = "inconclusive";
    }
    return Response.json({ analysis, triage: advice, model, latencyMs: call.latencyMs, clinicalReview: CLINICAL_REVIEW });
  }
  console.error("eye-check: all models failed", lastError);
  return Response.json(
    { error: "The photo couldn't be reviewed right now. Please try again in a minute.", triage: advice },
    { status: 502 },
  );
}
