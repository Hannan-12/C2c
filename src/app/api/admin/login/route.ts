import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
} from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Admin sign-in, as a route handler rather than a server action.
 *
 * The action version worked locally and failed in production with
 * `failed to get redirect response: TypeError: fetch failed`. A server action's
 * redirect is not an HTTP redirect: Next renders the destination by making an
 * internal request back to the app, and on this host that request cannot
 * complete — so a correct email and password produced a 500 and no session.
 *
 * A route handler returns an ordinary 303 that the browser follows itself. No
 * internal request, nothing to block. The booking API works on this host for
 * the same reason.
 */

/** Brute-force guard: 10 attempts per IP per 15 minutes. */
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/**
 * 303 specifically, not 302: it tells the browser to follow with GET. A 302
 * after a POST leaves the method up to the client, and a re-POSTed login is a
 * second rate-limit hit for one attempt.
 */
function seeOther(req: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

export async function POST(req: Request) {
  const form = await req.formData();

  const rawNext = String(form.get("next") ?? "/admin");
  // Only relative admin paths, so a crafted ?next= cannot bounce the freshly
  // authenticated browser to another host.
  const nextPath = rawNext.startsWith("/admin") ? rawNext : "/admin";
  const failed = `/admin/login?error=1&next=${encodeURIComponent(nextPath)}`;

  if (!rateLimit(`admin-login:${clientIp(req)}`, LOGIN_LIMIT, LOGIN_WINDOW_MS).allowed) {
    return seeOther(
      req,
      `/admin/login?error=throttled&next=${encodeURIComponent(nextPath)}`,
    );
  }

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return seeOther(req, failed);

  const [user] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  // Same failure for unknown account, wrong password and deactivated account —
  // the form must not reveal which emails exist.
  if (!user || !user.active) return seeOther(req, failed);
  if (!(await verifyPassword(password, user.passwordHash))) return seeOther(req, failed);

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  const token = await createSessionToken({ sub: user.id, email: user.email });

  // Set on the redirect response itself: a cookie written via next/headers
  // from a route handler does not attach to a response built here.
  const response = seeOther(req, nextPath);
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
