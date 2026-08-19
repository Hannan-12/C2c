"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings, bookingAssignments, drivers, BOOKING_STATUSES } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-session";
import { notifyBookingConfirmed } from "@/lib/email/notify";
import { ensurePaymentLink } from "@/lib/payments/checkout";
import { SESSION_COOKIE } from "@/lib/session";
import type { BookingStatus } from "@/lib/booking-status";

/**
 * Every action re-verifies the session. Middleware gates the routes, but a
 * server action is its own POST endpoint — it is reachable without ever
 * rendering the page that contains it.
 */

/**
 * Statuses that mean the booking is agreed with the customer. An admin can
 * jump straight from "requested" to "assigned" without passing through
 * "confirmed", so the confirmation email keys off the whole set, not one value.
 */
const CONFIRMED_STATUSES: BookingStatus[] = [
  "confirmed",
  "assigned",
  "en_route",
  "completed",
];

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

export async function updateBookingStatus(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const status = String(formData.get("status") ?? "") as BookingStatus;

  if (!bookingId || !BOOKING_STATUSES.includes(status)) {
    throw new Error("Invalid status update");
  }

  await db.update(bookings).set({ status }).where(eq(bookings.id, bookingId));

  // Anything from "confirmed" onwards means the booking is agreed, so the
  // customer is owed the confirmation email. notifyBookingConfirmed sends it
  // at most once, whichever of these transitions happens first.
  if (CONFIRMED_STATUSES.includes(status)) {
    // Before the email, so a card customer's confirmation carries the link
    // rather than arriving first and being followed by a second message.
    const payUrl = await ensurePaymentLink(bookingId);
    await notifyBookingConfirmed(bookingId, payUrl ?? undefined);
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function assignDriver(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!bookingId || !driverId) throw new Error("Booking and driver are required");

  // Replace any previous assignment rather than stacking rows, so the tracking
  // page's join can't return two drivers for one booking.
  await db.delete(bookingAssignments).where(eq(bookingAssignments.bookingId, bookingId));

  await db.insert(bookingAssignments).values({
    id: randomUUID(),
    bookingId,
    driverId,
    notes: notes || null,
  });

  // Assigning a driver is what moves the booking to "assigned"; doing it here
  // means the operator can't leave the two out of step. Only advances from the
  // earlier states — a booking already en route or completed stays where it is.
  await db
    .update(bookings)
    .set({ status: "assigned" })
    .where(
      and(
        eq(bookings.id, bookingId),
        inArray(bookings.status, [
          "requested",
          "awaiting_confirmation",
          "confirmed",
        ]),
      ),
    );

  // Assigning can be the first confirming transition, so the payment link is
  // created here too — otherwise a booking that went straight from requested
  // to assigned would be confirmed by email with nothing to pay against.
  const payUrl = await ensurePaymentLink(bookingId);
  await notifyBookingConfirmed(bookingId, payUrl ?? undefined);

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function unassignDriver(formData: FormData) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Booking is required");

  await db.delete(bookingAssignments).where(eq(bookingAssignments.bookingId, bookingId));

  await db
    .update(bookings)
    .set({ status: "confirmed" })
    .where(eq(bookings.id, bookingId));

  revalidatePath("/admin");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function createDriver(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsappNumber") ?? "").replace(/[\s\-()+]/g, "");
  const vehicle = String(formData.get("vehicleAssigned") ?? "").trim();

  if (!name) throw new Error("Driver name is required");
  if (!/^\d{8,15}$/.test(whatsapp)) {
    throw new Error("Enter a valid WhatsApp number in international format");
  }

  await db.insert(drivers).values({
    id: randomUUID(),
    name,
    whatsappNumber: whatsapp,
    vehicleAssigned: vehicle || null,
    active: true,
  });

  revalidatePath("/admin/drivers");
}

export async function toggleDriverActive(formData: FormData) {
  await requireAdmin();

  const driverId = String(formData.get("driverId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!driverId) throw new Error("Driver is required");

  await db.update(drivers).set({ active }).where(eq(drivers.id, driverId));

  revalidatePath("/admin/drivers");
}
