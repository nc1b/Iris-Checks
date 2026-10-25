import type { ImageEmbedder } from "@mediapipe/tasks-vision";
import thresholds from "@/data/eye-photo-thresholds.json";

export const PHOTO_LABELS = thresholds.labels as PhotoLabel[];
export type PhotoLabel = "normal" | "cataract" | "conjunctivitis" | "uveitis" | "eyelid";
export type PhotoCondition = Exclude<PhotoLabel, "normal">;
const PHONE_MARGIN: Partial<Record<PhotoCondition, number>> = { uveitis: 1.4 };

export const PHOTO_THRESHOLDS = Object.fromEntries(
  Object.entries(thresholds.thresholds).map(([c, t]) => [c, Math.min(0.95, t * (PHONE_MARGIN[c as PhotoCondition] ?? 1))]),
) as Record<PhotoCondition, number>;

export const PHOTO_CONDITIONS: Record<PhotoCondition, { name: string; summary: string; nextStep: string }> = {
  cataract: { name: "Cataract", summary: "Cloudy lens behind the pupil", nextStep: "An eye exam" },
  conjunctivitis: { name: "Red eye", summary: "Redness of the white of the eye, such as pink eye", nextStep: "See a doctor if it lasts more than a few days or hurts" },
  uveitis: { name: "Inflammation inside the eye", summary: "Possible signs of uveitis", nextStep: "An eye doctor within a day or two, sooner with pain or vision changes" },
  eyelid: { name: "Eyelid problem", summary: "A drooping, swollen or bumpy eyelid", nextStep: "A doctor visit; call 911 if a droop came on suddenly" },
};

const MEDIAPIPE_VERSION = "1.1.1";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const EMBEDDER_URL = "https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_large/float32/1/mobilenet_v3_large.tflite";

export const PHOTO_SMALL = 96;
const PHOTO_INPUT = 224;

export function captureEyePhoto(video: HTMLVideoElement, cx: number, cy: number, side: number, mirror = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_SMALL;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  if (mirror) {
    ctx.translate(PHOTO_SMALL, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, cx - side / 2, cy - side / 2, side, side, 0, 0, PHOTO_SMALL, PHOTO_SMALL);
  return canvas;
}

let embedderPromise: Promise<ImageEmbedder> | null = null;

export function loadEyeEmbedder() {
  embedderPromise ??= (async () => {
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
    const make = (delegate: "GPU" | "CPU") =>
      vision.ImageEmbedder.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: EMBEDDER_URL, delegate },
        runningMode: "IMAGE",
        l2Normalize: true,
        quantize: false,
      });
    return make("GPU").catch(() => make("CPU"));
  })().catch((e) => {
    embedderPromise = null;
    throw e;
  });
  return embedderPromise;
}

export async function embedEyePhoto(photo: HTMLCanvasElement) {
  const embedder = await loadEyeEmbedder();
  const big = document.createElement("canvas");
  big.width = big.height = PHOTO_INPUT;
  const ctx = big.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(photo, 0, 0, PHOTO_INPUT, PHOTO_INPUT);
  return Array.from(embedder.embed(big).embeddings[0].floatEmbedding ?? []);
}

export type PhotoNeighbor = { label: PhotoLabel; similarity: number };

export type EyePhotoMatch = {
  usable: boolean;
  probs: Record<PhotoLabel, number>;
  flagged: PhotoCondition[];
  neighbors: PhotoNeighbor[];
};

export type PhotoMatchResponse = {
  eyes: Partial<Record<"left" | "right", EyePhotoMatch>>;
  referenceCount: number;
  accuracy: Record<PhotoCondition, { sensitivity: number | null; specificity: number | null }>;
};
