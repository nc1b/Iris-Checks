import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Dashboard, Profile, Scan } from "@/lib/dashboard-types";

/**
 * Database access for the dashboard (Supabase Postgres).
 *
 * The tables live in a private `iris` schema the public API can't reach. The server calls
 * a few `public.iris_*` functions (see the iris_prototype_schema migration), passing
 * IRIS_DB_SECRET, which the database checks against a stored SHA-256 hash, plus the
 * verified Clerk user id. Every function only touches that one user's rows.
 */

export class DbError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

let client: SupabaseClient | null = null;

export function dbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY && process.env.IRIS_DB_SECRET);
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!dbConfigured()) throw new DbError("Database not configured", "not_configured");
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc(fn, { p_secret: process.env.IRIS_DB_SECRET, ...args });
  if (error) throw new DbError(error.message, error.code);
  return data as T;
}

export const db = {
  dashboard: (userId: string) => rpc<Dashboard>("iris_dashboard", { p_user: userId }),
  updateProfile: (userId: string, profile: Partial<Profile>) => rpc<Profile>("iris_update_profile", { p_user: userId, p_profile: profile }),
  addScan: (userId: string, scan: Omit<Scan, "id" | "created_at">) => rpc<Scan>("iris_add_scan", { p_user: userId, p_scan: scan }),
  deleteScan: (userId: string, scanId: string) => rpc<boolean>("iris_delete_scan", { p_user: userId, p_scan_id: scanId }),
  deleteMyData: (userId: string) => rpc<boolean>("iris_delete_my_data", { p_user: userId }),
  /** Most similar reference eye photos to a fingerprint (pgvector), as { label, similarity }. */
  matchEye: (embedding: string, k: number) => rpc<{ label: string; similarity: number }[]>("iris_match_eye", { p_embedding: embedding, p_k: k }),
};

/** Turns a thrown error into a safe JSON response (no internal details). */
export function errorResponse(e: unknown) {
  if (e instanceof DbError) {
    if (e.code === "not_configured") return Response.json({ error: "The database isn't connected yet." }, { status: 503 });
    if (e.code === "54000") return Response.json({ error: "Too many scans in the last hour. Please try again later." }, { status: 429 });
    if (e.code === "22023" || e.code === "23514") return Response.json({ error: "Some of that information isn't valid." }, { status: 400 });
  }
  console.error("dashboard api error", e instanceof Error ? e.message : e);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
