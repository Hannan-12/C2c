import { SignJWT, jwtVerify } from "jose";

/**
 * Session tokens only — deliberately free of `node:crypto`.
 *
 * Middleware runs on the Edge runtime, which has no Node built-ins, so
 * password hashing lives separately in `password.ts`. Keeping them apart is
 * what lets middleware import this file at all.
 */
export const SESSION_COOKIE = "ride_admin_session";
const SESSION_HOURS = 12;

function sessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters. Generate with: openssl rand -base64 32",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { sub: string; email: string };

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(sessionSecret());
}

/** Returns null rather than throwing, so callers can just redirect to login. */
export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
};
