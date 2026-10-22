import "server-only";
import { createRemoteJWKSet, errors, jwtVerify } from "jose";

/**
 * Who is calling? Verifies the Clerk session token the dashboard sends as
 * `Authorization: Bearer <token>` (from `getToken()`).
 *
 * Clerk session tokens are RS256 JWTs signed by the app's Frontend API. We check the
 * signature against Clerk's published public keys (JWKS), the issuer, the expiry, and
 * that the token was issued to a page on this site (`azp`). This is the same check
 * Clerk's own SDK does; it doesn't need the Clerk secret key, which only the dashboard
 * can provide. To switch to `clerkMiddleware` + `auth()` later, add CLERK_SECRET_KEY.
 */

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
    // Sessions with unfinished tasks (e.g. required setup) aren't fully signed in yet.
    if (payload.sts === "pending") return null;
    return typeof payload.sub === "string" && payload.sub.startsWith("user_") ? payload.sub : null;
  } catch (e) {
    if (!(e instanceof errors.JOSEError)) console.error("session check failed", e instanceof Error ? e.message : e);
    return null;
  }
}
