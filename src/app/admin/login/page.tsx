import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionToken,
} from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

/** Brute-force guard: 10 attempts per IP per 15 minutes. */
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/admin";

  async function signIn(formData: FormData) {
    "use server";

    const headerList = await headers();
    const ip =
      headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
      headerList.get("x-real-ip") ??
      "unknown";

    const nextPath = String(formData.get("next") ?? "/admin");
    const failed = `/admin/login?error=1&next=${encodeURIComponent(nextPath)}`;

    if (!rateLimit(`admin-login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS).allowed) {
      redirect(`/admin/login?error=throttled&next=${encodeURIComponent(nextPath)}`);
    }

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    if (!email || !password) redirect(failed);

    const [user] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1);

    // Same failure for unknown account, wrong password and deactivated
    // account — the form must not reveal which emails exist.
    if (!user || !user.active) redirect(failed);
    if (!(await verifyPassword(password, user.passwordHash))) redirect(failed);

    await db
      .update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, user.id));

    const token = await createSessionToken({ sub: user.id, email: user.email });
    (await cookies()).set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);

    // Only relative paths, so a crafted ?next= can't bounce to another host.
    redirect(nextPath.startsWith("/admin") ? nextPath : "/admin");
  }

  return (
    <div className="min-h-screen grid place-items-center bg-dock px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 text-ink-inverse">
          <span className="size-2 rounded-full bg-accent" aria-hidden />
          <span className="text-lg font-bold tracking-tight">Ride On Click Admin</span>
        </div>

        <form action={signIn} className="card">
          <h1 className="display text-xl mb-1">Sign in</h1>
          <p className="text-sm text-ink-muted mb-5">
            Booking dashboard access.
          </p>

          <input type="hidden" name="next" value={next} />

          <div className="mb-3.5">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="field-input"
            />
          </div>

          <div className="mb-4">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="field-input"
            />
          </div>

          {error && (
            <p role="alert" className="mb-4 text-sm text-red-600">
              {error === "throttled"
                ? "Too many sign-in attempts. Try again in a few minutes."
                : "That email and password combination didn't work."}
            </p>
          )}

          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
