import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Gate for the admin dashboard.
 *
 * Renamed from `middleware.ts` in Next 16, which deprecated that convention.
 *
 * This is the outer guard only — each admin page and server action verifies
 * the session again. Proxy runs at a network boundary in front of the app and
 * is not an authorisation boundary on its own: a route added outside the
 * matcher would silently become public.
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!session && !isLoginPage) {
    const url = new URL("/admin/login", req.url);
    // Return the operator to where they were headed after signing in.
    url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
