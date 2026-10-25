import { db, errorResponse } from "@/lib/server/db";
import { makeDemoScan } from "@/lib/server/demo-scan";
import { getSessionUserId } from "@/lib/server/session";
import { cleanMetrics, rateScan } from "@/lib/scan-rating";

export async function POST(request: Request) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { source?: unknown; metrics?: unknown; note?: unknown };
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;

  let scan;
  if (body.source === "camera") {
    const metrics = cleanMetrics(body.metrics);
    if (Object.keys(metrics).length === 0) {
      return Response.json({ error: "That scan didn't include any measurements." }, { status: 400 });
    }
    scan = { source: "camera" as const, ...rateScan(metrics), metrics, note };
  } else {
    scan = makeDemoScan(note ?? undefined);
  }

  try {
    return Response.json(await db.addScan(userId, scan), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
