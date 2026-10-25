import type { PhotoMatchResponse } from "@/lib/eye-photo";
import { errorResponse } from "@/lib/server/db";
import { cleanEmbedding, matchEye, PHOTO_ACCURACY, REFERENCE_COUNT } from "@/lib/server/photo-match";
import { getSessionUserId } from "@/lib/server/session";

export async function POST(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { eyes?: Record<string, unknown> };
  const inputs = (["right", "left"] as const)
    .map((eye) => ({ eye, x: cleanEmbedding(body.eyes?.[eye]) }))
    .filter((e): e is { eye: "right" | "left"; x: Float64Array } => e.x !== null);
  if (inputs.length === 0) return Response.json({ error: "No eye photos to compare." }, { status: 400 });

  try {
    const eyes: PhotoMatchResponse["eyes"] = {};
    for (const { eye, x } of inputs) eyes[eye] = await matchEye(x);
    return Response.json({ eyes, referenceCount: REFERENCE_COUNT, accuracy: PHOTO_ACCURACY } satisfies PhotoMatchResponse);
  } catch (e) {
    return errorResponse(e);
  }
}
