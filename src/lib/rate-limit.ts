/**
 * Fixed-window in-memory rate limiter.
 *
 * Deliberately simple: the production target is a single shared-hosting Node
 * process (docs Section 6), so a shared store would add a dependency for no
 * gain. If the app ever runs on more than one instance this becomes per-
 * instance and the effective limit multiplies — revisit then.
 */
type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  const allowed = entry.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/** Best-effort client IP. Trusts proxy headers, which is correct behind a host's proxy. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Prevents unbounded growth of the bucket map in a long-lived process. */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of buckets) {
      if (now >= entry.resetAt) buckets.delete(key);
    }
  },
  10 * 60 * 1000,
).unref?.();
