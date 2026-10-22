import { AGE_RANGES, ANSWERS, type Profile } from "@/lib/dashboard-types";
import { db, errorResponse } from "@/lib/server/db";
import { getSessionUserId } from "@/lib/server/session";

/**
 * The signed-in user's dashboard data.
 * GET    → profile + recent scans (creates the profile on first visit)
 * PATCH  → update optional profile answers and research consent
 * DELETE → delete the profile and every saved scan
 */

const unauthorized = () => Response.json({ error: "Please sign in." }, { status: 401 });

export async function GET(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return unauthorized();
  try {
    return Response.json(await db.dashboard(userId));
  } catch (e) {
    return errorResponse(e);
  }
}

function pick<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const profile: Partial<Profile> = {
    age_range: pick(body.age_range, AGE_RANGES),
    diabetes: pick(body.diabetes, ANSWERS),
    glaucoma: pick(body.glaucoma, ANSWERS),
    cataract: pick(body.cataract, ANSWERS),
    research_consent: body.research_consent === true,
  };
  try {
    return Response.json(await db.updateProfile(userId, profile));
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return unauthorized();
  try {
    await db.deleteMyData(userId);
    return Response.json({ deleted: true });
  } catch (e) {
    return errorResponse(e);
  }
}
