import "server-only";

const MAX_KEYS = 5000;

export function rateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > MAX_KEYS) {
      for (const [k, times] of hits) if (now - times[times.length - 1] >= windowMs) hits.delete(k);
      for (const k of hits.keys()) {
        if (hits.size <= MAX_KEYS) break;
        if (k !== key) hits.delete(k);
      }
    }
    return recent.length > limit;
  };
}

export function clientIp(request: Request) {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
