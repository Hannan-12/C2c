import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/**
 * Connection settings, from discrete variables when the host provides them and
 * from DATABASE_URL otherwise.
 *
 * A connection URL puts the password inside a URI, where `/`, `#`, `?` and `@`
 * all terminate a field. When one of those appears unescaped the authority
 * splits in the wrong place and the *username* is read as the hostname — which
 * is exactly how production failed, with `getaddrinfo ENOTFOUND
 * u618324088_rideapp`. Discrete variables have no such parsing step, so any
 * password works verbatim; DATABASE_URL stays supported because local
 * development and drizzle-kit both use it.
 */
function connectionOptions(): mysql.PoolOptions {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DATABASE_URL } =
    process.env;

  if (DB_HOST && DB_USER && DB_NAME) {
    return {
      host: DB_HOST,
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD ?? "",
      database: DB_NAME,
    };
  }

  if (DATABASE_URL) return { uri: DATABASE_URL };

  throw new Error(
    "No database configuration. Set DATABASE_URL, or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.",
  );
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
    ...connectionOptions(),
    connectionLimit: 5,
    // MySQL DATETIME columns have no timezone; keep everything in UTC so the
    // app and the database agree regardless of where either is hosted.
    timezone: "Z",
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema, mode: "default" });
export { schema };
