/**
 * In-memory fixed-window rate limiter for the public booking endpoint.
 *
 * Chosen over a SQLite-backed table (the alternative from the security
 * audit): a scripted flood is stopped just as well by a counter that resets
 * on restart as by one that survives it — restarts here are rare and manual
 * (see pasto-hair-deploy), and a persisted table would cost a write on every
 * booking attempt for no real gain against this threat model.
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

// Cheap eviction so `buckets` doesn't grow unbounded over the process
// lifetime. Piggybacks on real requests (at most once a minute) rather than
// a timer — nothing else in this app runs background timers.
let lastSweep = 0;
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/** Allows up to `max` calls per `key` within `windowMs`, fixed-window. */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}

/** Test-only: clears all buckets between test cases. */
export function _resetRateLimitState(): void {
  buckets.clear();
  lastSweep = 0;
}

/**
 * Best-effort client IP behind LiteSpeed's reverse proxy. Not spoof-proof —
 * a client can send its own X-Forwarded-For — but LiteSpeed overwrites/appends
 * to it with the real peer address for a direct connection, and this is a
 * throttle against casual scripting, not an auth boundary.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
