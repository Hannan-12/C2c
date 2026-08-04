import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "./session";

/**
 * Verifies the session for a page or server action.
 *
 * Re-checks the account against the database rather than trusting the token
 * alone, so deactivating an operator takes effect immediately instead of when
 * their token happens to expire.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const store = await cookies();
  const session = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");

  const [user] = await db
    .select({ id: adminUsers.id, active: adminUsers.active })
    .from(adminUsers)
    .where(eq(adminUsers.id, session.sub))
    .limit(1);

  if (!user || !user.active) redirect("/admin/login");

  return session;
}
