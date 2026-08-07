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
        <Link href="/admin" className="flex items-center gap-2.5 mb-8 px-2">
          <Image
            src="/images/logo-mark.png"
            alt=""
            width={678}
            height={220}
            className="h-5 w-auto shrink-0"
            priority
          />
          <span>
            <span className="block text-base font-bold tracking-tight leading-tight">
              Ride On Click
            </span>
            <span className="block text-[11px] text-ink-inverse/45">Admin panel</span>
          </span>
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
