import { db, errorResponse } from "@/lib/server/db";
import { makeDemoScan } from "@/lib/server/demo-scan";
import { getSessionUserId } from "@/lib/server/session";

/**
 * POST → run and save a demo scan for the signed-in user.
 * Results are generated on the server (the camera scan isn't live yet), so the
 * browser can't save made-up statuses; it can only add an optional note.
 */
export async function POST(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  let note: string | undefined;
  try {
    const body = (await request.json().catch(() => ({}))) as { note?: unknown };
    if (typeof body.note === "string") note = body.note;
  } catch {
    // no body: fine
  }
  try {
    return Response.json(await db.addScan(userId, makeDemoScan(note)), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
