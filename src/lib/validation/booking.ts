import { z } from "zod";
import { PAYMENT_METHODS, SERVICE_TYPES, VEHICLE_CATEGORIES } from "@/db/schema";
import { vehicleSpec } from "@/lib/vehicles";

const stopSchema = z.object({
  address: z.string().min(1).max(500),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

/**
 * WhatsApp numbers are stored in international format, digits only, so that
 * wa.me links can be built from them directly (docs Section 8).
 */
const whatsappSchema = z
  .string()
  .transform((v) => v.replace(/[\s\-()+]/g, ""))
  .refine((v) => /^\d{8,15}$/.test(v), {
    message: "Enter a valid WhatsApp number in international format",
  });

export const createBookingSchema = z
  .object({
    serviceType: z.enum(SERVICE_TYPES),

    pickupLocation: z.string().min(1).max(500),
    pickupLat: z.number().min(-90).max(90).optional(),
    pickupLng: z.number().min(-180).max(180).optional(),

    dropoffLocation: z.string().min(1).max(500).optional(),
    dropoffLat: z.number().min(-90).max(90).optional(),
    dropoffLng: z.number().min(-180).max(180).optional(),

    stops: z.array(stopSchema).max(5).optional(),

    pickupDatetime: z.coerce.date(),

    // Minimum published in /terms and on /city-tour. Enforced here so the
    // rule holds for any client, not just our own form.
    durationHours: z.number().int().min(2).max(24).optional(),
    flightNumber: z.string().max(20).optional(),

    vehicleCategory: z.enum(VEHICLE_CATEGORIES),
    passengerCount: z.number().int().min(1).max(20),
    luggageCount: z.number().int().min(0).max(20).default(0),

    customerName: z.string().min(1).max(200),
    customerWhatsapp: whatsappSchema,
    customerEmail: z.email().max(320).optional(),

    // Defaults to cash so an older client, or a request made before card
    // payment existed, keeps the original behaviour rather than failing.
    paymentMethod: z.enum(PAYMENT_METHODS).default("cash"),
  })
  // Hourly bookings have a duration instead of a destination; every other
  // service type needs somewhere to go (docs Section 5).
  .refine((d) => d.serviceType === "hourly" || !!d.dropoffLocation, {
    message: "Dropoff location is required for this service type",
    path: ["dropoffLocation"],
  })
  .refine((d) => d.serviceType !== "hourly" || !!d.durationHours, {
    message: "Duration is required for hourly bookings",
    path: ["durationHours"],
  })
  // A booking in the past is always a mistake. Small grace window so a form
  // that took a moment to submit doesn't get rejected.
  .refine((d) => d.pickupDatetime.getTime() > Date.now() - 5 * 60 * 1000, {
    message: "Pickup time must be in the future",
    path: ["pickupDatetime"],
  })
  // Capacity is a rule, not a hint. Eight passengers in a three-seat saloon is
  // a booking the business cannot fulfil, and it should be refused whatever
  // sends it — our form, a future app, or a curl.
  .superRefine((d, ctx) => {
    const spec = vehicleSpec(d.vehicleCategory);
    if (!spec) return;

    if (d.passengerCount > spec.seats) {
      ctx.addIssue({
        code: "custom",
        path: ["passengerCount"],
        message: `${spec.label} seats ${spec.seats}. Choose a larger vehicle for ${d.passengerCount} passengers.`,
      });
    }

    if (d.luggageCount > spec.bags) {
      ctx.addIssue({
        code: "custom",
        path: ["luggageCount"],
        message: `${spec.label} takes ${spec.bags} suitcases. Choose a larger vehicle for ${d.luggageCount}.`,
      });
    }
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
