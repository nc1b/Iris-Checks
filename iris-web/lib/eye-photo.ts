import type { ImageEmbedder } from "@mediapipe/tasks-vision";
import thresholds from "@/data/eye-photo-thresholds.json";

/**
 * Photo match: a close-up photo of each eye is turned into an AI fingerprint on the phone
 * (Google's MobileNet V3 Large, via MediaPipe) and compared on the server with labelled
 * front-of-eye photos in the Iris database. Only the fingerprint is sent, never the photo.
 * See scripts/eye-photos for how the reference database was built.
 */

export const PHOTO_LABELS = thresholds.labels as PhotoLabel[];
export type PhotoLabel = "normal" | "cataract" | "conjunctivitis" | "uveitis" | "eyelid";
export type PhotoCondition = Exclude<PhotoLabel, "normal">;
/**
 * Phone close-ups look different from the web photos the model learned from. A healthy eye in
 * a real phone scan scored 43% "inflammation inside the eye" (flag line 35%), the class the
 * model is least precise on (57% of its flags were right in testing). So that flag needs 1.4×
 * its tuned score from phone photos. Provisional: re-tune with labelled phone photos.
 */
const PHONE_MARGIN: Partial<Record<PhotoCondition, number>> = { uveitis: 1.4 };

/** Score at which each condition is flagged (tuned to catch at least 85% of cases, then PHONE_MARGIN). */
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

/** The eye close-up is stored at this size; the reference photos were shrunk to the same size. */
export const PHOTO_SMALL = 96;
const PHOTO_INPUT = 224;

/**
 * Copies a square around the eye from the camera frame into a 96 px canvas.
 * `side` is in video pixels (about 1.1× the eye's corner-to-corner width).
 */
export function captureEyePhoto(video: HTMLVideoElement, cx: number, cy: number, side: number, mirror = false) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_SMALL;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  // Reference photos show eyes as others see them, so the eye photo is not mirrored by default.
  if (mirror) {
    ctx.translate(PHOTO_SMALL, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, cx - side / 2, cy - side / 2, side, side, 0, 0, PHOTO_SMALL, PHOTO_SMALL);
  return canvas;
}

let embedderPromise: Promise<ImageEmbedder> | null = null;

/** Loads the image model once (about 11 MB). Safe to call early to warm it up. */
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

/** Fingerprint of a 96 px eye photo, enlarged to 224 px exactly like the reference photos. */
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
  /** False when the photo looks unlike any reference photo, so Iris doesn't guess. */
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
