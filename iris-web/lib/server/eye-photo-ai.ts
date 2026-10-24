import "server-only";
import { CATEGORIES, QUALITY_PROBLEMS, type PhotoAnalysis } from "@/lib/eye-check-types";

/**
 * Asks an image-capable model, through the Hack Club AI proxy, to describe one phone photo of
 * the front of an eye. The model only reports what is visible, says when it can't tell, and
 * never names conditions a phone photo can't show. The model choice is based on the comparison
 * in scripts/eye-photos/MODEL-EVAL.md.
 */

export const AI_BASE = "https://ai.hackclub.com/proxy/v1";

export const SYSTEM_PROMPT = `You review one phone photo of the front of a person's eye for an educational eye-health app made by students. You are not diagnosing. Describe only what is visible.

A phone photo of the front of the eye CAN show: redness of the white of the eye; a grey, white or cloudy-looking pupil (possible lens cloudiness, as in cataract); eyelid swelling, a lump, or a drooping upper lid; discharge or crusting; a yellow tint to the white of the eye.
It CANNOT show: glaucoma, eye pressure, diabetic eye disease, retinal or macular problems, optic nerve problems, or how well someone sees. Never mention or suggest these.

Rules:
- First judge whether the photo is good enough. It is unusable if there is no eye, the eye is closed, it is blurry, too dark, washed out by glare, too far away to see the pupil and the white of the eye, or the eye is cut off. Pick the main problem.
- A small bright dot or window shape on the pupil or iris is a normal reflection of a light, NOT cloudiness.
- Lens cloudiness means the pupil itself looks grey, milky or white.
- If you are not sure about a feature, use "cannot_assess". Saying you can't tell is better than guessing.
- "inflammation_signs" means redness concentrated in a ring around the coloured part of the eye, or a hazy or irregular pupil together with redness.
- Use "inconclusive" when the photo is usable but does not support a clear answer.
- The summary is one or two plain sentences about what you see, with no diagnosis, no condition names beyond the visible features, and no advice about treatment.

Reply with ONLY this JSON, no other text:
{"quality":{"usable":true|false,"problem":"none|no_eye|blur|too_dark|glare|too_far|eye_closed|cropped|other","explanation":"short reason"},
"observations":{"redness":"none|mild|marked|cannot_assess","lens_cloudiness":"none|possible|likely|cannot_assess","eyelid":"normal|swelling_or_lump|drooping|cannot_assess","discharge":"none|present|cannot_assess","yellow_whites":"none|possible|cannot_assess"},
"category":"no_visible_concern|redness|lens_cloudiness|eyelid|inflammation_signs|inconclusive",
"confidence":"low|medium|high",
"summary":"..."}`;

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/** Validates the model's reply. Anything malformed becomes "inconclusive", never a guess. */
export function parseAnalysis(text: string): PhotoAnalysis | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const q = (raw.quality ?? {}) as Record<string, unknown>;
  const o = (raw.observations ?? {}) as Record<string, unknown>;
  const usable = q.usable === true;
  const analysis: PhotoAnalysis = {
    quality: {
      usable,
      problem: usable ? "none" : pick(q.problem, QUALITY_PROBLEMS, "other"),
      explanation: typeof q.explanation === "string" ? q.explanation.slice(0, 240) : "",
    },
    observations: {
      redness: pick(o.redness, ["none", "mild", "marked", "cannot_assess"] as const, "cannot_assess"),
      lens_cloudiness: pick(o.lens_cloudiness, ["none", "possible", "likely", "cannot_assess"] as const, "cannot_assess"),
      eyelid: pick(o.eyelid, ["normal", "swelling_or_lump", "drooping", "cannot_assess"] as const, "cannot_assess"),
      discharge: pick(o.discharge, ["none", "present", "cannot_assess"] as const, "cannot_assess"),
      yellow_whites: pick(o.yellow_whites, ["none", "possible", "cannot_assess"] as const, "cannot_assess"),
    },
    category: usable ? pick(raw.category, CATEGORIES, "inconclusive") : "inconclusive",
    confidence: pick(raw.confidence, ["low", "medium", "high"] as const, "low"),
    summary: typeof raw.summary === "string" ? raw.summary.slice(0, 400) : "",
  };
  return analysis;
}

/** Words a phone-photo answer must never contain (things a photo can't show, or diagnoses). */
export const UNSUPPORTED_CLAIMS = /glaucoma|diabet|retin|macula|optic nerve|eye pressure|you have|diagnos/i;

export type ModelCall = {
  analysis: PhotoAnalysis | null;
  raw: string;
  latencyMs: number;
  usage: { prompt_tokens?: number; completion_tokens?: number; cost?: number } | null;
  error?: string;
};

/** "off" disables thinking (fastest); some models require it, so "low" asks for a little. */
export type Reasoning = "off" | "low" | "default";

export async function analysePhoto(
  model: string,
  imageDataUrl: string,
  { context, reasoning = "low", timeoutMs = 60_000 }: { context?: string; reasoning?: Reasoning; timeoutMs?: number } = {},
): Promise<ModelCall> {
  const key = process.env.HACKCLUB_API_KEY;
  if (!key) return { analysis: null, raw: "", latencyMs: 0, usage: null, error: "not_configured" };
  const started = Date.now();
  try {
    const res = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        temperature: 0,
        // Leaves room for a little thinking before the JSON answer.
        max_tokens: reasoning === "off" ? 700 : 3000,
        ...(reasoning === "off" ? { reasoning: { enabled: false } } : reasoning === "low" ? { reasoning: { effort: "low" } } : {}),
        usage: { include: true },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: context ? `Describe this eye photo. Context from the person (do not let it change what you see): ${context}` : "Describe this eye photo." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      choices?: { message?: { content?: string } }[];
      usage?: ModelCall["usage"];
      error?: { message?: string };
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    if (!res.ok) return { analysis: null, raw, latencyMs: Date.now() - started, usage: null, error: `${res.status} ${json.error?.message ?? ""}`.trim() };
    return { analysis: parseAnalysis(raw), raw, latencyMs: Date.now() - started, usage: json.usage ?? null };
  } catch (e) {
    return { analysis: null, raw: "", latencyMs: Date.now() - started, usage: null, error: e instanceof Error ? e.message : "request failed" };
  }
}
