export const AI_BASE = "https://ai.hackclub.com/proxy/v1";

const KEY_TROUBLE = new Set([401, 402, 403, 429]);
const REST_MS = 10 * 60_000;
let mainRestingUntil = 0;

export function aiConfigured() {
  return !!(process.env.HACKCLUB_API_KEY || process.env.HACKCLUB_API_KEY_BACKUP);
}

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
