import "server-only";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";

function frontendApiHost(): string | null {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const encoded = pk?.split("_")[2];
  if (!encoded) return null;
  try {
    const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function allowedParty(azp: string, request: Request) {
  const extra = (process.env.CLERK_AUTHORIZED_PARTIES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return azp === new URL(request.url).origin || extra.includes(azp);
}

export async function getSessionUserId(request: Request): Promise<string | null> {
  const host = frontendApiHost();
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!host || !token) return null;

  jwks ??= createRemoteJWKSet(new URL(`https://${host}/.well-known/jwks.json`));
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${host}`,
      algorithms: ["RS256"],
      clockTolerance: 5,
    });
    if (typeof payload.azp === "string" && !allowedParty(payload.azp, request)) return null;
    if (payload.sts === "pending") return null;
    return typeof payload.sub === "string" && payload.sub.startsWith("user_") ? payload.sub : null;
  } catch (e) {
    if (!(e instanceof errors.JOSEError)) console.error("session check failed", e instanceof Error ? e.message : e);
    return null;
  }
}
