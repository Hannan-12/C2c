import Image from "next/image";
import Link from "next/link";
import { AdminNav } from "@/components/admin-nav";
import { signOut } from "./actions";

/**
 * Admin shell (docs Section 13.3): the same dock geometry as the public site,
 * with admin navigation in place of the booking form.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <aside
        className="bg-dock text-ink-inverse flex flex-col lg:h-screen lg:sticky lg:top-0
                   w-full lg:w-[260px] shrink-0 px-5 py-7"
      >
        <Link href="/admin" className="block mb-8 px-2">
          <Image
            src="/images/logo-lockup-light.png"
            alt="Ride On Click"
            width={858}
            height={383}
            className="h-9 w-auto"
            priority
          />
          <span className="mt-1.5 block text-[11px] text-ink-inverse/45">Admin panel</span>
        </Link>

        <AdminNav />

        <form action={signOut} className="mt-auto pt-8">
          <button
            type="submit"
            className="w-full rounded-field border border-dock-border px-3.5 py-2.5
                       text-sm text-ink-inverse/70 hover:text-ink-inverse
                       hover:bg-white/5 transition-colors"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 min-w-0 bg-canvas px-6 sm:px-8 lg:px-10 py-8">
        {children}
      </main>
    </div>
  );
}
