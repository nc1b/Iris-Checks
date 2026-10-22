import { db, errorResponse } from "@/lib/server/db";
import { getSessionUserId } from "@/lib/server/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** DELETE → remove one of the signed-in user's scans. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/scans/[id]">) {
  const userId = await getSessionUserId(request);
  if (!userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await ctx.params;
  if (!UUID.test(id)) return Response.json({ error: "Scan not found." }, { status: 404 });
  try {
    const deleted = await db.deleteScan(userId, id);
    return deleted ? Response.json({ deleted: true }) : Response.json({ error: "Scan not found." }, { status: 404 });
  } catch (e) {
    return errorResponse(e);
  }
}
