import {
  mysqlTable,
  char,
  varchar,
  int,
  decimal,
  datetime,
  boolean,
  json,
  text,
  mysqlEnum,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/** docs Section 5 — service_type */
export const SERVICE_TYPES = [
  "ride",
  "hourly",
  "city_tour",
  "airport",
  "courier",
] as const;

/**
 * How the customer chose to pay.
 *
 * `cash` is the existing behaviour and stays the default: settle with the
 * driver, nothing to reconcile online. `card` routes through Stripe, but only
 * after an admin has confirmed the fare — the site never charges for a trip
 * the business has not yet accepted.
 */
export const PAYMENT_METHODS = ["cash", "card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Where a card payment has reached. Cash bookings sit at `not_required`
 * forever; the column describes the online payment, not whether the customer
 * has settled up in the car.
 *
 * `pending` means a Stripe Checkout session exists and is unpaid — either the
 * customer has not opened it yet, or they abandoned it. Sessions expire, so
 * `pending` is not a promise of payment.
 */
export const PAYMENT_STATUSES = [
  "not_required",
  "pending",
  "paid",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** docs Section 5 — vehicle_category */
export const VEHICLE_CATEGORIES = [
  "comfort",
  "business",
  "suv",
  "vip",
  "van",
] as const;

/**
 * docs Section 5 — booking status.
 *
 * `requested` = submitted by the customer, not yet actioned.
 * `awaiting_confirmation` = admin has contacted the customer and is waiting on
 * their reply. Confirmed as a distinct state by the client.
 */
export const BOOKING_STATUSES = [
  "requested",
  "awaiting_confirmation",
  "confirmed",
  "assigned",
  "en_route",
  "completed",
  "cancelled",
] as const;

/** An intermediate stop on a multi-leg trip. Stored in `bookings.stops`. */
export type BookingStop = {
  address: string;
  lat?: number;
  lng?: number;
};

export const bookings = mysqlTable(
  "bookings",
  {
    id: char("id", { length: 36 }).primaryKey(),

    /**
     * Public-facing code, e.g. C2C-7K4M2XQP.
     * Long and random by design — the tracking page is unauthenticated and
     * returns customer PII, so a short sequential code would let the whole
     * customer list be enumerated. See docs Section 5.1.
     */
    referenceCode: varchar("reference_code", { length: 16 }).notNull().unique(),

    serviceType: mysqlEnum("service_type", SERVICE_TYPES).notNull(),

    pickupLocation: varchar("pickup_location", { length: 500 }).notNull(),
    pickupLat: decimal("pickup_lat", { precision: 10, scale: 7 }),
    pickupLng: decimal("pickup_lng", { precision: 10, scale: 7 }),

    /** Null for hourly bookings, which have a duration instead of a destination. */
    dropoffLocation: varchar("dropoff_location", { length: 500 }),
    dropoffLat: decimal("dropoff_lat", { precision: 10, scale: 7 }),
    dropoffLng: decimal("dropoff_lng", { precision: 10, scale: 7 }),

    stops: json("stops").$type<BookingStop[]>(),

    pickupDatetime: datetime("pickup_datetime").notNull(),

    /** Hourly bookings only. */
    durationHours: int("duration_hours"),

    /** Airport rides only. */
    flightNumber: varchar("flight_number", { length: 20 }),

    vehicleCategory: mysqlEnum("vehicle_category", VEHICLE_CATEGORIES).notNull(),
    passengerCount: int("passenger_count").notNull(),
    luggageCount: int("luggage_count").notNull().default(0),

    /** Auto-calculated from the Routes API at quote time. */
    distanceKm: decimal("distance_km", { precision: 8, scale: 2 }),
    durationMin: int("duration_min"),
    fareEstimate: decimal("fare_estimate", { precision: 10, scale: 2 }),

    /**
     * What a person actually agreed with the customer, when that differs from
     * the calculated estimate.
     *
     * Separate from `fareEstimate` rather than overwriting it. The estimate is
     * what the system quoted from the route; the agreed fare is what was
     * settled on WhatsApp — after extra stops, a negotiated rate, or a trip the
     * customer changed. Keeping both means a booking can always answer "what
     * did you quote me?" as well as "what am I paying?", which is the first
     * question in any dispute about a fare that moved.
     *
     * Null means nobody overrode anything and the estimate stands.
     */
    agreedFare: decimal("agreed_fare", { precision: 10, scale: 2 }),

    customerName: varchar("customer_name", { length: 200 }).notNull(),
    customerWhatsapp: varchar("customer_whatsapp", { length: 30 }).notNull(),
    customerEmail: varchar("customer_email", { length: 320 }),

    status: mysqlEnum("status", BOOKING_STATUSES).notNull().default("requested"),

    /**
     * When the "Booking Confirmed" email went out (docs Section 2).
     *
     * Recorded rather than inferred from status, because status can move
     * backwards and forwards — an admin toggling confirmed → assigned →
     * confirmed must not re-send the email each time.
     */
    confirmationEmailSentAt: datetime("confirmation_email_sent_at"),

    /** Chosen by the customer on the booking form. */
    paymentMethod: mysqlEnum("payment_method", PAYMENT_METHODS)
      .notNull()
      .default("cash"),
    paymentStatus: mysqlEnum("payment_status", PAYMENT_STATUSES)
      .notNull()
      .default("not_required"),

    /**
     * Stripe's identifiers, kept so a payment can be traced from a booking to
     * the Stripe dashboard and back without guesswork during a dispute.
     * Unique on the session so a replayed webhook cannot be applied twice.
     */
    stripeSessionId: varchar("stripe_session_id", { length: 255 }).unique(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),

    /**
     * What was actually charged, in AED. Stored separately from fareEstimate:
     * the estimate can be revised after the customer has already paid, and the
     * amount taken from their card is the figure that matters in a dispute.
     */
    amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
    paidAt: datetime("paid_at"),

    /**
     * What has been given back, in AED, and when the last refund was issued.
     *
     * An amount rather than a flag, because a partial refund is the common
     * case — a late cancellation returns half the fare, and a trip that went
     * partly wrong returns part of it. `paymentStatus` only becomes `refunded`
     * when the whole charge has come back; until then the booking is still
     * paid, with some of it returned, and both figures have to be visible or
     * the customer cannot tell which.
     */
    amountRefunded: decimal("amount_refunded", { precision: 10, scale: 2 }),
    refundedAt: datetime("refunded_at"),

    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`)
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Admin dashboard filters by status and sorts by date (docs Section 8).
    index("bookings_status_idx").on(t.status),
    index("bookings_pickup_datetime_idx").on(t.pickupDatetime),
    index("bookings_created_at_idx").on(t.createdAt),
  ],
);

/**
 * Admin accounts for the dashboard (docs Section 8).
 *
 * A table rather than a single set of environment variables, so the client can
 * have more than one operator and a password can be rotated without a redeploy.
 * Seeded from ADMIN_EMAIL / ADMIN_PASSWORD on first run.
 */
export const adminUsers = mysqlTable("admin_users", {
  id: char("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** scrypt, stored as `salt:derivedKey` — never a plaintext password. */
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 200 }),
  active: boolean("active").notNull().default(true),
  lastLoginAt: datetime("last_login_at"),
  createdAt: datetime("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Fare rates per vehicle category.
 *
 * Held in the database rather than in code because this is the value most
 * likely to change after client feedback, and the client must be able to
 * change it without a redeploy (docs Section 6).
 */
export const vehiclePricing = mysqlTable("vehicle_pricing", {
  category: mysqlEnum("category", VEHICLE_CATEGORIES).primaryKey(),
  /** Flat charge applied to every trip. */
  baseFare: decimal("base_fare", { precision: 10, scale: 2 }).notNull(),
  perKm: decimal("per_km", { precision: 10, scale: 2 }).notNull(),
  perMin: decimal("per_min", { precision: 10, scale: 2 }).notNull(),
  /** Floor for distance-based fares — short trips never bill below this. */
  minimumFare: decimal("minimum_fare", { precision: 10, scale: 2 }).notNull(),
  /** Used for hourly bookings, which have a duration instead of a route. */
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("AED"),
  active: boolean("active").notNull().default(true),
  updatedAt: datetime("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
    .$onUpdate(() => new Date()),
});

export const drivers = mysqlTable(
  "drivers",
  {
    id: char("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    whatsappNumber: varchar("whatsapp_number", { length: 30 }).notNull(),
    vehicleAssigned: varchar("vehicle_assigned", { length: 200 }),
    /** Only active drivers appear in the assignment dropdown. */
    active: boolean("active").notNull().default(true),
    createdAt: datetime("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("drivers_active_idx").on(t.active)],
);

export const bookingAssignments = mysqlTable(
  "booking_assignments",
  {
    id: char("id", { length: 36 }).primaryKey(),
    bookingId: char("booking_id", { length: 36 })
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    driverId: char("driver_id", { length: 36 })
      .notNull()
      .references(() => drivers.id),
    assignedAt: datetime("assigned_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    /** Free-text admin note, e.g. "confirmed via WhatsApp at 3:40pm". */
    notes: text("notes"),
  },
  (t) => [
    index("assignments_booking_idx").on(t.bookingId),
    index("assignments_driver_idx").on(t.driverId),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
export type BookingAssignment = typeof bookingAssignments.$inferSelect;
export type VehiclePricing = typeof vehiclePricing.$inferSelect;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];
export type ServiceType = (typeof SERVICE_TYPES)[number];
