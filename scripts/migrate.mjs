/**
 * Applies pending migrations, then exits.
 *
 *   npm run db:deploy
 *
 * Run from `start`, so a deploy migrates itself. Schema changes used to be
 * typed into phpMyAdmin by hand before each release, which is a step that gets
 * forgotten exactly once and takes the site down rather than degrading it —
 * the new code selects a column the database does not have, and every page
 * touching that table 500s.
 *
 * Plain .mjs, and not drizzle-kit, for two reasons. drizzle-kit is a dev
 * dependency and a production install may prune it, while drizzle-orm and
 * mysql2 are dependencies the app already needs. And drizzle.config.ts reads
 * DATABASE_URL alone, which is the one variable that does not work on this
 * host: the database password contains a slash, which terminates the authority
 * in a URL and makes the username parse as the hostname. Production sets the
 * discrete DB_* variables instead, and this reads them the same way src/db
 * does.
 *
 * Exits non-zero on failure. `start` chains on that, so the app refuses to
 * boot rather than serving a schema it does not match.
 */
import { existsSync, readFileSync } from "node:fs";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

/**
 * Local convenience only. On the host every variable comes from the panel, so
 * this file is absent and nothing here runs. Deliberately minimal: it reads
 * KEY=value and stops at the first `=`, which is all a database URL needs.
 */
function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    // Values may be quoted; a password can legitimately contain anything else.
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

/**
 * Mirrors connectionOptions() in src/db/index.ts. Duplicated rather than
 * imported because this runs before and outside the built app, with no
 * TypeScript loader available — so if you change the precedence there, change
 * it here too.
 */
function connectionOptions() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DATABASE_URL } = process.env;

  if (DB_HOST && DB_USER && DB_NAME) {
    return {
      host: DB_HOST,
      port: DB_PORT ? Number(DB_PORT) : 3306,
      user: DB_USER,
      password: DB_PASSWORD ?? "",
      database: DB_NAME,
      multipleStatements: true,
    };
  }

  if (DATABASE_URL) return { uri: DATABASE_URL, multipleStatements: true };

  throw new Error(
    "No database configuration. Set DATABASE_URL, or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.",
  );
}

/**
 * A database can be a second or two behind the app at boot — a restarted
 * container, a host still bringing MySQL up. Retrying a few times means a
 * cold start is not mistaken for a broken schema, while a genuinely wrong
 * configuration still fails fast enough to be obvious.
 */
const ATTEMPTS = 5;
const BACKOFF_MS = 2000;

async function connect() {
  const options = connectionOptions();

  for (let attempt = 1; ; attempt++) {
    try {
      return await mysql.createConnection(options);
    } catch (error) {
      if (attempt >= ATTEMPTS) throw error;
      console.warn(
        `Database not reachable (attempt ${attempt}/${ATTEMPTS}): ${error.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS * attempt));
    }
  }
}

loadLocalEnv();

let connection;
try {
  connection = await connect();
  await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
  console.log("Migrations up to date.");
} catch (error) {
  // The cause carries the MySQL code; the message alone is often just
  // "Failed query", which says nothing useful in a deploy log.
  console.error("Migration failed:", error?.cause?.message ?? error?.message ?? error);
  process.exitCode = 1;
} finally {
  await connection?.end();
}
