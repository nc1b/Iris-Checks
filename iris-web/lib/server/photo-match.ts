import "server-only";
import model from "@/data/eye-photo-model.json";
import { PHOTO_THRESHOLDS, type EyePhotoMatch, type PhotoCondition, type PhotoLabel, type PhotoNeighbor } from "@/lib/eye-photo";
import { db } from "@/lib/server/db";

/**
 * Compares one eye's fingerprint with the Iris database of front-of-eye photos:
 * the trained classifier gives a score per condition, and Supabase (pgvector) returns
 * the most similar reference photos. See scripts/eye-photos.
 */

const LABELS = model.labels as PhotoLabel[];
const DIM = model.embedder.dim;
const weights = model.classifier.weights.map((row) => Float64Array.from(row));
const bias = Float64Array.from(model.classifier.bias);
// The same flag lines the app shows (including the phone margin in lib/eye-photo.ts).
const thresholds = PHOTO_THRESHOLDS;

export const REFERENCE_COUNT = model.dataset.images;
export const PHOTO_ACCURACY = Object.fromEntries(
  Object.entries(model.metrics.perClass).map(([k, m]) => [k, { sensitivity: m.sensitivity, specificity: m.specificity }]),
) as Record<PhotoCondition, { sensitivity: number | null; specificity: number | null }>;

/** Checks and normalises an untrusted fingerprint from a request body. */
export function cleanEmbedding(input: unknown): Float64Array | null {
  if (!Array.isArray(input) || input.length !== DIM) return null;
  const v = new Float64Array(DIM);
  let norm = 0;
  for (let i = 0; i < DIM; i++) {
    const x = input[i];
    if (typeof x !== "number" || !Number.isFinite(x) || Math.abs(x) > 10) return null;
    v[i] = x;
    norm += x * x;
  }
  norm = Math.sqrt(norm);
  if (norm < 1e-6) return null;
  for (let i = 0; i < DIM; i++) v[i] /= norm;
  return v;
}

function classify(x: Float64Array): Record<PhotoLabel, number> {
  const z = weights.map((w, k) => {
    let s = bias[k];
    for (let i = 0; i < x.length; i++) s += w[i] * x[i];
    return s;
  });
  const max = Math.max(...z);
  const e = z.map((v) => Math.exp(v - max));
  const sum = e.reduce((a, b) => a + b, 0);
  return Object.fromEntries(LABELS.map((l, k) => [l, Math.round((e[k] / sum) * 10000) / 10000])) as Record<PhotoLabel, number>;
}

export async function matchEye(x: Float64Array): Promise<EyePhotoMatch> {
  const neighbors = (await db.matchEye(`[${Array.from(x, (v) => v.toFixed(6)).join(",")}]`, 7)) as PhotoNeighbor[];
  const probs = classify(x);
  // Photos unlike every reference photo (e.g. a blurry frame or no eye) aren't scored.
  const usable = (neighbors[0]?.similarity ?? 0) >= model.novelty.minSimilarity;
  const flagged = usable ? (Object.keys(thresholds) as PhotoCondition[]).filter((c) => probs[c] >= thresholds[c]) : [];
  return { usable, probs, flagged, neighbors };
}
