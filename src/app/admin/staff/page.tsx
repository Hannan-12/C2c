import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { formatPickup } from "@/lib/format";
import { changeOwnPassword, createAdminUser, setAdminUserActive } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

export default async function StaffPage() {
  const admin = await requireAdmin();

  const accounts = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      active: adminUsers.active,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(desc(adminUsers.active), asc(adminUsers.email));

  return (
    <>
      <h1 className="display text-2xl sm:text-3xl mb-1">Staff</h1>
      <p className="text-ink-muted mb-6 max-w-2xl">
        Who can sign in here. Notes and settlements record whoever made them, so
        a shared login makes that record worth less than it looks.
      </p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="card !p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-130">
            <caption className="sr-only">Admin accounts</caption>
            <thead>
              <tr className="text-[11px] uppercase tracking-widest text-ink-faint border-b border-line">
                <th scope="col" className="text-left font-medium px-5 py-3">Account</th>
                <th scope="col" className="text-left font-medium px-4 py-3">Last signed in</th>
                <th scope="col" className="text-right font-medium px-5 py-3">Access</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-line last:border-0 hover:bg-field/60"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-medium">{account.name ?? account.email}</span>
                    {account.name && (
                      <span className="block text-[11px] text-ink-faint">
                        {account.email}
                      </span>
                    )}
                    {account.id === admin.sub && (
                      <span className="mt-1 inline-block rounded-full border border-line bg-field px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                        You
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-ink-muted whitespace-nowrap">
                    {account.lastLoginAt ? formatPickup(account.lastLoginAt) : "Never"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {/*
                      Deactivated rather than deleted, always. A booking note
                      names its author, and removing the account would leave
                      those notes signed by an address nobody can place.
                    */}
                    <form action={setAdminUserActive} className="inline">
                      <input type="hidden" name="userId" value={account.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={account.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        disabled={account.id === admin.sub && account.active}
                        className={`rounded-field border px-3 py-1.5 text-xs font-semibold transition-colors
                          disabled:opacity-40 disabled:cursor-not-allowed ${
                            account.active
                              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border-line hover:bg-field"
                          }`}
                      >
                        {account.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4">
          <section className="card">
            <h2 className="font-semibold mb-1">Add someone</h2>
            <p className="text-sm text-ink-muted mb-4">
              They can do everything you can, including refunds.
            </p>

            <form action={createAdminUser} className="grid gap-3">
              <div>
                <label className="field-label" htmlFor="name">
                  Name
                </label>
                <input id="name" name="name" className="field-input" placeholder="Optional" />
              </div>
              <div>
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="field-input"
                  placeholder="them@rideonclick.com"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  className="field-input"
                />
                <span className="mt-1 block text-[11px] text-ink-faint">
                  At least 10 characters. Tell them in person, and have them
                  change it.
                </span>
              </div>
              <button type="submit" className="btn-primary">
                Create account
              </button>
            </form>
          </section>

          <section className="card">
            <h2 className="font-semibold mb-1">Your password</h2>
            <p className="text-sm text-ink-muted mb-4">
              Signed in as {admin.email}.
            </p>

            <form action={changeOwnPassword} className="grid gap-3">
              <div>
                <label className="field-label" htmlFor="currentPassword">
                  Current password
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="newPassword">
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={10}
                  autoComplete="new-password"
                  className="field-input"
                />
              </div>
              <button type="submit" className="btn-secondary">
                Change password
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
