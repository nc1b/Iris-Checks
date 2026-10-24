import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import cases from "@/eval/dataset-cases.json";
import { AI_BASE, analysePhoto, UNSUPPORTED_CLAIMS } from "@/lib/server/eye-photo-ai";

/**
 * TEMPORARY: compares image models on the same labelled eye photos (see
 * scripts/eye-photos/MODEL-EVAL.md). Only works when IRIS_EVAL_TOKEN is set and the request
 * carries it; otherwise it pretends not to exist. Remove after the evaluation.
 *
 * GET ?token=…&action=models          → models the proxy offers that accept images
 * GET ?token=…&action=run&model=…     → runs every test case through that model
 */

export const maxDuration = 300;

const DATASET_RAW =
  "https://raw.githubusercontent.com/Codernointed/Eye-Disease-Detection-Simple/224679be00db8d52f8b74d2d7a52347888fa80be/Dataset";

type Case = { id: string; kind: "dataset" | "quality"; label: string; file: string };

const QUALITY_CASES: Case[] = [
  { id: "q-sharp", kind: "quality", label: "usable:normal", file: "q_sharp_eye.jpg" },
  { id: "q-blur", kind: "quality", label: "unusable:blur", file: "q_blur.jpg" },
  { id: "q-dark", kind: "quality", label: "unusable:too_dark", file: "q_dark.jpg" },
  { id: "q-glare", kind: "quality", label: "unusable:glare", file: "q_glare.jpg" },
  { id: "q-far", kind: "quality", label: "unusable:too_far", file: "q_far.jpg" },
  { id: "q-noeye", kind: "quality", label: "unusable:no_eye", file: "q_no_eye.jpg" },
];

const ALL_CASES: Case[] = [...(cases as Case[]), ...QUALITY_CASES];

/** Categories that count as a correct description of each labelled condition's visible signs. */
const EXPECTED: Record<string, string[]> = {
  cataract: ["lens_cloudiness"],
  conjunctivitis: ["redness", "inflammation_signs"],
  // Uveitis can only show as redness (often around the iris) or a hazy pupil in a photo.
  uveitis: ["inflammation_signs", "redness"],
  eyelid: ["eyelid"],
};

type Row = {
  id: string;
  label: string;
  ms?: number;
  cost?: number;
  error?: string;
  unsupported?: boolean;
  usable?: boolean;
  problem?: string;
  category?: string;
  confidence?: string;
};

/** correct / abstained / wrong per case, plus totals, so models can be compared at a glance. */
function score(rows: Row[]) {
  const verdict = (r: Row) => {
    if (r.error || r.category === undefined) return "error";
    if (r.label.startsWith("unusable:")) return r.usable ? "wrong" : r.problem === r.label.slice(9) ? "correct" : "correct_other_reason";
    if (r.label === "usable:normal") return r.usable ? (r.category === "no_visible_concern" ? "correct" : "false_alarm") : "abstained";
    if (r.label === "normal") {
      if (r.category === "no_visible_concern") return "correct";
      return r.category === "inconclusive" ? "abstained" : "false_alarm";
    }
    if (EXPECTED[r.label]?.includes(r.category)) return "correct";
    if (r.category === "inconclusive") return "abstained";
    return r.category === "no_visible_concern" ? "missed" : "wrong";
  };
  const per = rows.map((r) => ({ ...r, verdict: verdict(r) }));
  const tally = (filter: (r: (typeof per)[number]) => boolean) => {
    const out: Record<string, number> = {};
    for (const r of per.filter(filter)) out[r.verdict] = (out[r.verdict] ?? 0) + 1;
    return out;
  };
  const ms = per.map((r) => r.ms ?? 0).filter(Boolean).sort((a, b) => a - b);
  return {
    disease: tally((r) => r.label in EXPECTED),
    normal: tally((r) => r.label === "normal"),
    quality: tally((r) => r.id.startsWith("q-")),
    unsupported: per.filter((r) => r.unsupported).length,
    errors: per.filter((r) => r.verdict === "error").length,
    medianMs: ms[Math.floor(ms.length / 2)] ?? null,
    p90Ms: ms[Math.floor(ms.length * 0.9)] ?? null,
    costPer100: +(per.reduce((t, r) => t + (r.cost ?? 0), 0) * (100 / Math.max(1, per.length))).toFixed(3),
    cases: per.map((r) => [r.id, r.verdict, r.category ?? r.error, r.problem, r.confidence, r.ms].join(" ")),
  };
}

function authorised(request: Request) {
  const expected = process.env.IRIS_EVAL_TOKEN;
  const given = new URL(request.url).searchParams.get("token") ?? "";
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function imageDataUrl(c: Case) {
  if (c.kind === "quality") {
    const bytes = await readFile(path.join(process.cwd(), "eval/fixtures", c.file));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  }
  const [folder, name] = c.file.split("/");
  const res = await fetch(`${DATASET_RAW}/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const type = res.headers.get("content-type")?.startsWith("image/png") ? "image/png" : "image/jpeg";
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Not found", { status: 404 });
  const params = new URL(request.url).searchParams;
  const key = process.env.HACKCLUB_API_KEY;
  if (!key) return Response.json({ error: "HACKCLUB_API_KEY missing" }, { status: 500 });

  if (params.get("action") === "models") {
    const res = await fetch(`${AI_BASE}/models`, { headers: { Authorization: `Bearer ${key}` } });
    const json = (await res.json().catch(() => ({}))) as { data?: Record<string, unknown>[] };
    const models = (json.data ?? []).map((m) => {
      const arch = (m.architecture ?? {}) as { input_modalities?: string[]; modality?: string };
      return {
        id: m.id,
        input: arch.input_modalities ?? arch.modality ?? null,
        pricing: m.pricing ?? null,
        context: m.context_length ?? null,
      };
    });
    return Response.json({ status: res.status, total: models.length, models });
  }

  const model = params.get("model");
  if (!model) return Response.json({ error: "model required" }, { status: 400 });
  const only = params.get("cases")?.split(",");
  const reasoning = (["off", "low", "default"] as const).find((r) => r === params.get("reasoning")) ?? "low";
  const selected = ALL_CASES.filter((c) => !only || only.includes(c.id));

  const results: unknown[] = [];
  const rows: Row[] = [];
  const queue = [...selected];
  // A few requests at a time keeps latency numbers realistic without hitting rate limits.
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        try {
          const call = await analysePhoto(model, await imageDataUrl(c), { reasoning });
          const cost = call.usage?.cost || (call.usage as { cost_details?: { upstream_inference_cost?: number } } | null)?.cost_details?.upstream_inference_cost;
          rows.push({
            id: c.id,
            label: c.label,
            ms: call.latencyMs,
            cost,
            error: call.error ?? (call.analysis ? undefined : `unparsed: ${call.raw.slice(0, 80)}`),
            unsupported: UNSUPPORTED_CLAIMS.test(`${call.analysis?.summary ?? ""} ${call.analysis?.quality.explanation ?? ""}`),
            usable: call.analysis?.quality.usable,
            problem: call.analysis?.quality.problem,
            category: call.analysis?.category,
            confidence: call.analysis?.confidence,
          });
          results.push({
            id: c.id,
            label: c.label,
            ms: call.latencyMs,
            usage: call.usage,
            error: call.error,
            unsupported: UNSUPPORTED_CLAIMS.test(`${call.analysis?.summary ?? ""} ${call.analysis?.quality.explanation ?? ""}`),
            a: call.analysis && {
              usable: call.analysis.quality.usable,
              problem: call.analysis.quality.problem,
              category: call.analysis.category,
              confidence: call.analysis.confidence,
              obs: call.analysis.observations,
              summary: call.analysis.summary,
            },
            raw: call.analysis ? undefined : call.raw.slice(0, 300),
          });
        } catch (e) {
          const error = e instanceof Error ? e.message : "failed";
          results.push({ id: c.id, label: c.label, error });
          rows.push({ id: c.id, label: c.label, error });
        }
      }
    }),
  );
  if (params.get("format") === "score") return Response.json({ model, reasoning, n: rows.length, ...score(rows) });
  return Response.json({ model, reasoning, n: results.length, results });
}
