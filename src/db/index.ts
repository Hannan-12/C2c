import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

/**
 * Reuse the pool across hot reloads in development, otherwise every edit opens
 * a new set of connections and exhausts the server's connection limit — which
 * matters on shared hosting, where that limit is low.
 */
const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

const pool =
  globalForDb.pool ??
  mysql.createPool({
    uri: process.env.DATABASE_URL,
    connectionLimit: 5,
    // MySQL DATETIME columns have no timezone; keep everything in UTC so the
    // app and the database agree regardless of where either is hosted.
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
