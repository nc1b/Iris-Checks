/**
 * Hack Club AI (ai.hackclub.com/proxy/v1), with a backup key.
 *
 * HACKCLUB_API_KEY is used first. When it has run out or is limited (402 for the spending limit,
 * 429, or 401/403 for a key that no longer works), the same request is sent again with
 * HACKCLUB_API_KEY_BACKUP, and this server instance uses the backup first for the next 10
 * minutes, so every request doesn't pay for a failed try.
 */

export const AI_BASE = "https://ai.hackclub.com/proxy/v1";

/** Statuses that mean "this key can't be used right now", not "this request is wrong". */
const KEY_TROUBLE = new Set([401, 402, 403, 429]);
const REST_MS = 10 * 60_000;
let mainRestingUntil = 0;

/** Is any Hack Club AI key set? */
export function aiConfigured() {
  return !!(process.env.HACKCLUB_API_KEY || process.env.HACKCLUB_API_KEY_BACKUP);
}

/** POSTs `body` as JSON to `path` (e.g. "/chat/completions"), trying the main key, then the backup. */
export async function aiFetch(path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const main = process.env.HACKCLUB_API_KEY;
  const backup = process.env.HACKCLUB_API_KEY_BACKUP;
  let keys = [main, backup].filter((k): k is string => !!k);
  if (main && backup && Date.now() < mainRestingUntil) keys = [backup, main];
  if (!keys.length) throw new Error("not_configured");
  const payload = JSON.stringify(body);
  let res: Response | null = null;
  for (const [i, key] of keys.entries()) {
    res = await fetch(`${AI_BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok || !KEY_TROUBLE.has(res.status) || i === keys.length - 1) return res;
    if (key === main) mainRestingUntil = Date.now() + REST_MS;
    console.warn(`hackclub: ${key === main ? "main" : "backup"} key returned ${res.status}, trying the other key`);
    await res.body?.cancel();
  }
  return res!;
}
