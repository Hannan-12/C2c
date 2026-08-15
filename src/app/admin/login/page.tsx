import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/admin";

  return (
    <div className="min-h-screen grid place-items-center bg-dock px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 text-ink-inverse">
          <Image
          src="/images/logo-mark.png"
          alt=""
          width={678}
          height={220}
          className="h-5 w-auto shrink-0"
          priority
        />
          <span className="text-lg font-bold tracking-tight">Ride On Click Admin</span>
        </div>

        {/*
          A route handler, not a server action: an action's redirect is
          resolved by an internal request back to the app, which this host
          blocks. See api/admin/login/route.ts.
        */}
        <form action="/api/admin/login" method="post" className="card">
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
