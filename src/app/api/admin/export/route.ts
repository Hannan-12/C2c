import { and, desc, eq, gte, inArray, like, lt, or } from "drizzle-orm";
import { db } from "@/db";
import {
  bookings,
  bookingAssignments,
  drivers,
  BOOKING_STATUSES,
  SERVICE_TYPES,
} from "@/db/schema";
import type { BookingStatus } from "@/lib/booking-status";
import { requireAdmin } from "@/lib/admin-session";
import { splitFare } from "@/lib/commission";
import { phoneSuffix } from "@/lib/search";
import { normaliseReferenceCode } from "@/lib/reference-code";

/**
 * Bookings as a spreadsheet.
 *
 * Getting figures out meant copying from the screen or opening phpMyAdmin, and
 * handing an accountant database access to produce a CSV is how a production
 * table gets edited by accident.
 *
 * Honours the same filters as the bookings list, so what downloads and what is
 * on screen can never disagree — the export is the page, in another format.
 */

/** Excel opens UTF-8 as Windows-1252 without this, mangling every accent. */
const BOM = "﻿";

/**
 * RFC 4180 quoting. Every field is quoted rather than only the ones that need
 * it: a pickup address containing a comma is the normal case here, not the
 * exception, and conditional quoting is where CSV writers go wrong.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function isoOrEmpty(value: Date | null): string {
  return value ? value.toISOString() : "";
}

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const service = url.searchParams.get("service") ?? "";
  const payment = url.searchParams.get("payment") ?? "";
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();

  const filters = [];

  if (BOOKING_STATUSES.includes(status as never)) {
    filters.push(eq(bookings.status, status as BookingStatus));
  }
  if (SERVICE_TYPES.includes(service as never)) {
    filters.push(eq(bookings.serviceType, service as (typeof SERVICE_TYPES)[number]));
  }
  if (from) filters.push(gte(bookings.pickupDatetime, new Date(`${from}T00:00:00`)));
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    filters.push(lt(bookings.pickupDatetime, end));
  }

  if (payment === "paid") filters.push(eq(bookings.paymentStatus, "paid"));
  if (payment === "unpaid") {
    filters.push(
      and(
        eq(bookings.paymentMethod, "card"),
        inArray(bookings.paymentStatus, ["pending", "not_required"]),
      )!,
    );
  }
  if (payment === "cash") filters.push(eq(bookings.paymentMethod, "cash"));

  if (q) {
    const suffix = phoneSuffix(q);
    filters.push(
      or(
        like(bookings.referenceCode, `%${normaliseReferenceCode(q).replace(/^C2C-/, "")}%`),
        like(bookings.customerName, `%${q}%`),
        ...(suffix ? [like(bookings.customerWhatsapp, `%${suffix}`)] : []),
      )!,
    );
  }

  const rows = await db
    .select({
      referenceCode: bookings.referenceCode,
      status: bookings.status,
      serviceType: bookings.serviceType,
      createdAt: bookings.createdAt,
      pickupDatetime: bookings.pickupDatetime,
      pickupLocation: bookings.pickupLocation,
      dropoffLocation: bookings.dropoffLocation,
      vehicleCategory: bookings.vehicleCategory,
      passengerCount: bookings.passengerCount,
      distanceKm: bookings.distanceKm,
      customerName: bookings.customerName,
      customerWhatsapp: bookings.customerWhatsapp,
      customerEmail: bookings.customerEmail,
      paymentMethod: bookings.paymentMethod,
      paymentStatus: bookings.paymentStatus,
      fareEstimate: bookings.fareEstimate,
      agreedFare: bookings.agreedFare,
      amountPaid: bookings.amountPaid,
      amountRefunded: bookings.amountRefunded,
      paidAt: bookings.paidAt,
      refundedAt: bookings.refundedAt,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
      cancellationReason: bookings.cancellationReason,
      driverName: drivers.name,
      payoutSettledAt: bookingAssignments.payoutSettledAt,
      payoutAmount: bookingAssignments.payoutAmount,
    })
    .from(bookings)
    .leftJoin(bookingAssignments, eq(bookingAssignments.bookingId, bookings.id))
    .leftJoin(drivers, eq(drivers.id, bookingAssignments.driverId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookings.pickupDatetime));

  const header = [
    "Reference", "Status", "Service", "Booked at", "Pickup at",
    "From", "To", "Vehicle", "Passengers", "Distance km",
    "Customer", "WhatsApp", "Email",
    "Payment method", "Payment status",
    "Quoted fare", "Agreed fare", "Amount paid", "Amount refunded",
    "Net collected", "Company share", "Driver share",
    "Paid at", "Refunded at", "Stripe reference", "Cancellation reason",
    "Driver", "Payout settled at", "Payout amount",
  ];

  const body = rows.map((r) => {
    /**
     * The split is included so the accountant is not left recomputing a
     * percentage — and so the figures in the spreadsheet are the same ones the
     * money screen showed, rather than a second opinion.
     */
    const split = splitFare(r);

    return [
      r.referenceCode, r.status, r.serviceType,
      isoOrEmpty(r.createdAt), isoOrEmpty(r.pickupDatetime),
      r.pickupLocation, r.dropoffLocation, r.vehicleCategory,
      r.passengerCount, r.distanceKm,
      r.customerName,
      // Leading apostrophe: a spreadsheet reads 971501234567 as a number and
      // renders it as 9.71501E+11, which is not a phone number any more.
      `'${r.customerWhatsapp}`,
      r.customerEmail,
      r.paymentMethod, r.paymentStatus,
      r.fareEstimate, r.agreedFare, r.amountPaid, r.amountRefunded,
      split.net.toFixed(2),
      // Only meaningful once a trip is done — an unfinished booking has earned
      // nobody anything, and printing a share against it invites paying it.
      r.status === "completed" ? split.company.toFixed(2) : "",
      r.status === "completed" ? split.driver.toFixed(2) : "",
      isoOrEmpty(r.paidAt), isoOrEmpty(r.refundedAt),
      r.stripePaymentIntentId, r.cancellationReason,
      r.driverName, isoOrEmpty(r.payoutSettledAt), r.payoutAmount,
    ].map(cell).join(",");
  });

  const csv = BOM + [header.map(cell).join(","), ...body].join("\r\n") + "\r\n";
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rideonclick-bookings-${stamp}.csv"`,
      // Customer names, numbers and addresses. Nothing should keep a copy.
      "Cache-Control": "no-store",
    },
  });
}
