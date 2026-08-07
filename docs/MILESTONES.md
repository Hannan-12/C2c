# Milestones

Build plan for the ride booking platform, as agreed in the milestone discussion.
Ten milestones, sequenced so each one leaves the app in a working state.

Status below is derived from the current repository, not from memory — every
"Done" is backed by files that exist on `main`.

| # | Milestone | Status |
|---|-----------|--------|
| M1 | Scaffold Next.js app, git init, local MySQL via Docker | Done |
| M2 | Drizzle schema + migrations | Done |
| M3 | Booking API + secure reference codes | Done |
| M4 | Quote engine (Google Routes API + fare table) | Done |
| M5 | Split Dock layout shell + booking form UI | Done |
| M6 | Public tracking page | Done |
| M7 | Admin auth + dashboard | Done |
| M8 | Resend confirmation emails | Not started |
| M9 | Static pages + technical SEO | Not started |
| M10 | Deploy to Vercel staging with hosted MySQL | Not started |

---

## M1 — Scaffold, git, local database

Next.js 16 App Router with TypeScript and Tailwind v4, a git repository, and a
local MySQL instance via Docker so development never depends on a hosted
database.

Evidence: [package.json](../package.json), [docker-compose.dev.yml](../docker-compose.dev.yml)

## M2 — Drizzle schema and migrations

Five tables: `bookings`, `admin_users`, `vehicle_pricing`, `drivers`,
`booking_assignments`. Migrations are checked in and applied in order, with a
seed script for pricing and a first admin user.

Evidence: [src/db/schema.ts](../src/db/schema.ts), [src/db/seed.ts](../src/db/seed.ts), [drizzle/](../drizzle/) (4 migrations)

## M3 — Booking API and reference codes

Create a booking, look one up by reference code. Reference codes are generated
from a cryptographic random source rather than a sequence, so a customer cannot
enumerate other people's bookings by guessing neighbouring codes. Input is
validated with Zod at the route boundary, and lookups are rate limited.

Evidence: [src/app/api/bookings/route.ts](../src/app/api/bookings/route.ts), [src/app/api/bookings/[reference]/route.ts](../src/app/api/bookings/%5Breference%5D/route.ts), [src/lib/reference-code.ts](../src/lib/reference-code.ts), [src/lib/booking-lookup.ts](../src/lib/booking-lookup.ts), [src/lib/rate-limit.ts](../src/lib/rate-limit.ts), [src/lib/validation/booking.ts](../src/lib/validation/booking.ts)

## M4 — Quote engine

Distance and duration come from Google's Routes API (`computeRoutes`), not the
legacy Distance Matrix API, which is on a deprecation path. Fares combine that
route with a per-vehicle pricing table; hourly bookings price on time booked
rather than distance, since there is no destination to measure to.

Billing is per element, so results are cached by rounded coordinates — a
customer nudging the form does not cost another API call.

Evidence: [src/lib/routes-api.ts](../src/lib/routes-api.ts), [src/lib/quote.ts](../src/lib/quote.ts), [src/app/api/quote/route.ts](../src/app/api/quote/route.ts)

## M5 — Split Dock shell and booking form

The client-approved direction (scope Section 13), chosen after comparing four
options: a persistent dark dock on the left carrying navigation, a quick
booking form and a WhatsApp card, with page content scrolling independently on
the right. Live fare updates in the dock as the form is filled.

Palette is warm rather than neutral — cream canvas `#f7f4ef`, near-black dock
`#1c1a19`, amber accent `#eba43c` — with warm-tinted shadows, because a neutral
grey shadow reads dirty on cream.

**Note on a detour:** an interim redesign copied the palette, hero copy and
widget layout from a competitor's site. That was reverted; the identity here is
original. The working rule going forward is that layout conventions are fair to
borrow (hero with booking widget, service index, sticky fare summary are
industry patterns), but identity is not — palette, headline copy, logo
treatment and iconography must be ours.

Evidence: [src/app/globals.css](../src/app/globals.css), [src/components/booking-dock.tsx](../src/components/booking-dock.tsx), [src/components/booking-form.tsx](../src/components/booking-form.tsx), [src/components/route-board.tsx](../src/components/route-board.tsx)

## M6 — Public tracking page

Customer-facing lookup by reference code, plus the detail page the booking
confirmation redirects to. Closes the `/track/C2C-XXXXXXXX` redirect that M3
created.

Evidence: [src/app/(public)/track/page.tsx](../src/app/%28public%29/track/page.tsx), [src/app/(public)/track/[reference]/page.tsx](../src/app/%28public%29/track/%5Breference%5D/page.tsx), [src/lib/booking-status.ts](../src/lib/booking-status.ts)

## M7 — Admin auth and dashboard

Password login with hashed credentials and JWT sessions, a booking list with
filters, a booking detail view, status transitions, driver create/activate, and
driver assignment. Mutations are server actions rather than API routes.

Evidence: [src/app/admin/](../src/app/admin/), [src/app/admin/actions.ts](../src/app/admin/actions.ts), [src/lib/admin-session.ts](../src/lib/admin-session.ts), [src/lib/password.ts](../src/lib/password.ts)

---

## Remaining work

### M8 — Resend confirmation emails

Transactional email on booking creation and on status changes. Nothing is
wired yet — there is no email dependency in `package.json`.

Needs: Resend account and API key, a verified sending domain, and a decision on
which status transitions notify the customer.

### M9 — Static pages and technical SEO

Marketing and legal pages (services, about, FAQs, contact, terms, privacy),
plus `sitemap.ts`, `robots.ts`, per-page metadata and structured data. None of
these routes or files exist yet.

Content is a client deliverable. The same applies to hero photography — the
homepage layout is final and renders without it, so dropping in a licensed
photo is a small change, but the asset has to be supplied or budgeted for.

### M10 — Deploy to Vercel staging

Hosted MySQL, environment variables, and a staging deployment. The Vercel CLI
is not installed locally (`npm i -g vercel`), and no Vercel project is linked
yet.
