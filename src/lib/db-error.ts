/**
 * Drizzle wraps driver errors: `error.message` is only "Failed query: select …",
 * and the MySQL text and error code that say *why* sit on `error.cause`. Logging
 * the wrapper alone produces the stack traces that told us nothing when the
 * production database was unreachable — a failing SELECT and a failing INSERT,
 * with no indication of whether the cause was auth, host or schema.
 */

/** Innermost cause, so nested wrapping still reaches the driver error. */
function root(error: unknown): unknown {
  let current = error;
  while (current instanceof Error && current.cause !== undefined) {
    current = current.cause;
  }
  return current;
}

/** Message with the driver's own text appended — safe for logs, never a response. */
export function dbErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = root(error);
  if (cause === error || !(cause instanceof Error)) return error.message;

  const code = (cause as { code?: string }).code;
  return `${error.message} | ${code ? `${code}: ` : ""}${cause.message}`;
}

/** MySQL error code (`ER_DUP_ENTRY`, `ECONNREFUSED`, …), through the wrapper. */
export function dbErrorCode(error: unknown): string | undefined {
  const cause = root(error);
  if (typeof cause !== "object" || cause === null) return undefined;
  const code = (cause as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

/**
 * A unique constraint rejected the write.
 *
 * Reads through Drizzle's wrapper: the driver's code sits on `error.cause`, so
 * checking the wrapper directly never matches and the caller retries nothing.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  return dbErrorCode(error) === "ER_DUP_ENTRY";
}
