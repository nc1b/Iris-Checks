import "server-only";
import { CATEGORIES, QUALITY_PROBLEMS, type PhotoAnalysis } from "@/lib/eye-check-types";
import { aiConfigured, aiFetch } from "@/lib/server/hackclub";

/**
 * Asks an image-capable model, through the Hack Club AI proxy, to describe one phone photo of
 * the front of an eye. The model only reports what is visible, says when it can't tell, and
 * never names conditions a phone photo can't show. The model choice is based on the comparison
 * in scripts/eye-photos/MODEL-EVAL.md.
 */

export { AI_BASE } from "@/lib/server/hackclub";

export const SYSTEM_PROMPT = `You review one phone photo of the front of a person's eye for an educational eye-health app made by students. You are not diagnosing. Describe only what is visible. Take your time and look closely before answering.

A phone photo of the front of the eye CAN show: redness of the white of the eye; a grey, white or cloudy-looking pupil (possible lens cloudiness, as in cataract); eyelid swelling, a lump, or a drooping upper lid; discharge or crusting; a yellow tint to the white of the eye; and the visible signs of a sudden eye-pressure attack (see angle_closure below).
It CANNOT show: ordinary (slow) glaucoma, eye pressure, diabetic eye disease, retinal or macular problems, optic nerve problems, or how well someone sees. Never claim to assess these.

You may get two images. The first is the original photo. The second, if present, is the same photo brightened and sharpened on the phone to show detail. Judge colours (redness, yellow tint, the colour of the pupil) from the first image; use the second only to see structure such as the pupil edge.

Lens cloudiness (cataract), look carefully:
- A healthy pupil is evenly black, even in a bright photo.
- Cloudiness makes the pupil itself look grey, milky, white, or yellow-brown, either all over or in patches, spokes or a central disc behind the pupil.
- A common age-related kind (nuclear cataract) makes the pupil look amber, brown or dull dark-brown instead of jet black, while the iris around it looks normal. In a brown eye, compare the pupil's colour with the darkest shadows in the photo: a pupil that is clearly less black than they are can be this kind of cloudiness.
- A small bright dot, square or window shape is a reflection of a light on the cornea, NOT cloudiness. Look at the pupil around the reflection.
- A light grey or blue iris is not cloudiness. Compare the pupil with the iris around it.
- Use "likely" when the pupil is clearly grey or white, "possible" when it looks faintly hazy, "none" when it is clearly black, and "cannot_assess" when the pupil is too small, dark, blurred or hidden to judge.

angle_closure ("possible" only when several of these appear together): redness concentrated around the coloured part of the eye, a hazy or steamy-looking cornea (the clear front surface) that blurs the view of the iris, and a pupil that looks mid-sized, oval or unevenly shaped. Otherwise "none", or "cannot_assess" if the photo can't show it.

Rules:
- First judge whether the photo is good enough. It is unusable if there is no eye, the eye is closed, it is blurry, too dark, washed out by glare, too far away to see the pupil and the white of the eye, or the eye is cut off. Pick the main problem.
- A small bright dot or window shape on the pupil or iris is a normal reflection of a light, NOT cloudiness.
- Lens cloudiness means the pupil itself looks grey, milky or white.
- If you are not sure about a feature, use "cannot_assess". Saying you can't tell is better than guessing.
- "inflammation_signs" means redness concentrated in a ring around the coloured part of the eye, or a hazy or irregular pupil together with redness.
- Use the category "angle_closure_signs" only when angle_closure is "possible". It takes priority over the other categories.
- Use "inconclusive" when the photo is usable but does not support a clear answer.
- The summary is one or two plain sentences about what you see, with no diagnosis, no condition names beyond the visible features, and no advice about treatment.

Reply with ONLY this JSON, no other text:
{"quality":{"usable":true|false,"problem":"none|no_eye|blur|too_dark|glare|too_far|eye_closed|cropped|other","explanation":"short reason"},
"observations":{"redness":"none|mild|marked|cannot_assess","lens_cloudiness":"none|possible|likely|cannot_assess","eyelid":"normal|swelling_or_lump|drooping|cannot_assess","discharge":"none|present|cannot_assess","yellow_whites":"none|possible|cannot_assess","angle_closure":"none|possible|cannot_assess"},
"category":"no_visible_concern|redness|lens_cloudiness|eyelid|inflammation_signs|angle_closure_signs|inconclusive",
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
      angle_closure: pick(o.angle_closure, ["none", "possible", "cannot_assess"] as const, "cannot_assess"),
    },
    category: usable ? pick(raw.category, CATEGORIES, "inconclusive") : "inconclusive",
    confidence: pick(raw.confidence, ["low", "medium", "high"] as const, "low"),
    summary: typeof raw.summary === "string" ? raw.summary.slice(0, 400) : "",
  };
  return analysis;
}

/** Most concerning first, for combining the panel's answers. */
const CATEGORY_PRIORITY: PhotoAnalysis["category"][] = [
  "angle_closure_signs",
  "inflammation_signs",
  "lens_cloudiness",
  "eyelid",
  "redness",
  "inconclusive",
  "no_visible_concern",
];
const SEVERITY: Record<string, number> = { cannot_assess: -1, none: 0, normal: 0, mild: 1, possible: 1, present: 1, drooping: 1, swelling_or_lump: 1, marked: 2, likely: 2 };
const CONFIDENCE = ["low", "medium", "high"] as const;

/**
 * Combines answers from several models looking at the same photo, cautiously: each feature
 * takes the most concerning answer any model gave, and the category is the most concerning
 * one, so a miss needs every model to miss. In testing, one model called a cataract normal
 * while another flagged it; combined, it was flagged.
 * When the models disagree on the category, confidence drops to "low".
 */
export function combineAnalyses(answers: PhotoAnalysis[]): PhotoAnalysis {
  const usable = answers.filter((a) => a.quality.usable);
  if (usable.length === 0) return answers[0];
  if (usable.length === 1) return usable[0];
  const observations = { ...usable[0].observations };
  for (const key of Object.keys(observations) as (keyof PhotoAnalysis["observations"])[]) {
    for (const a of usable.slice(1)) {
      if ((SEVERITY[a.observations[key]] ?? -1) > (SEVERITY[observations[key]] ?? -1)) (observations as Record<string, string>)[key] = a.observations[key];
    }
  }
  let category = CATEGORY_PRIORITY.find((c) => usable.some((a) => a.category === c)) ?? "inconclusive";
  // One model saw nothing of concern and was fairly sure, the other just couldn't tell: report
  // the clear answer (with low confidence) instead of "can't tell". Any finding still wins.
  if (category === "inconclusive" && usable.some((a) => a.category === "no_visible_concern" && a.confidence !== "low")) category = "no_visible_concern";
  const lead = usable.find((a) => a.category === category) ?? usable[0];
  const agree = usable.every((a) => a.category === category);
  const confidence = agree ? CONFIDENCE[Math.min(...usable.map((a) => CONFIDENCE.indexOf(a.confidence)))] : "low";
  return { quality: lead.quality, observations, category, confidence, summary: lead.summary };
}

/** Words a phone-photo answer must never contain (things a photo can't show, or diagnoses). */
export const UNSUPPORTED_CLAIMS = /glaucoma|diabet|retin|macula|optic nerve|eye pressure|you have|diagnos/i;

/**
 * Drops any sentence that names something a photo can't show or sounds like a diagnosis, and
 * keeps the rest. (Earlier, one such sentence, even "this is not a diagnosis", threw away the
 * whole result, which turned real findings such as a cloudy pupil into "inconclusive".)
 */
export function stripUnsupported(text: string): string {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [])
    .filter((sentence) => !UNSUPPORTED_CLAIMS.test(sentence))
    .join("")
    .trim();
}

export type ModelCall = {
  analysis: PhotoAnalysis | null;
  raw: string;
  latencyMs: number;
  usage: { prompt_tokens?: number; completion_tokens?: number; cost?: number } | null;
  error?: string;
};

/** "off" disables thinking (fastest); "low" asks for a little; "high" lets the model look carefully. */
export type Reasoning = "off" | "low" | "high" | "default";

export async function analysePhoto(
  model: string,
  imageDataUrl: string,
  {
    context,
    enhancedDataUrl,
    reasoning = "high",
    timeoutMs = 60_000,
  }: { context?: string; enhancedDataUrl?: string; reasoning?: Reasoning; timeoutMs?: number } = {},
): Promise<ModelCall> {
  if (!aiConfigured()) return { analysis: null, raw: "", latencyMs: 0, usage: null, error: "not_configured" };
  const started = Date.now();
  try {
    const res = await aiFetch(
      "/chat/completions",
      {
        model,
        temperature: 0,
        // Leaves room for thinking before the JSON answer. The proxy reserves the cost of
        // max_tokens up front, and larger budgets hit the key's spending limit (402).
        max_tokens: reasoning === "off" ? 700 : reasoning === "high" ? 6000 : 3000,
        ...(reasoning === "off" ? { reasoning: { enabled: false } } : reasoning === "default" ? {} : { reasoning: { effort: reasoning } }),
        usage: { include: true },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: context ? `Describe this eye photo. Context from the person (do not let it change what you see): ${context}` : "Describe this eye photo." },
              { type: "image_url", image_url: { url: imageDataUrl } },
              ...(enhancedDataUrl ? [{ type: "image_url", image_url: { url: enhancedDataUrl } }] : []),
            ],
          },
        ],
      },
      timeoutMs,
    );
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
