/**
 * Rate limiting — STUB / NOT YET ENFORCED.
 *
 * Decision (audit item 6): deferred until a durable, distributed backing store
 * is provisioned. On serverless (Vercel Fluid Compute) an in-memory limiter does
 * NOT share state across instances, so it provides only partial protection and
 * must not be relied on as the real control.
 *
 * Recommended production implementation:
 *   - Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) via the Vercel
 *     Marketplace, keyed by IP and/or email, OR
 *   - Vercel BotID / Firewall rules for the auth + registration surfaces.
 *
 * Apply to: POST /api/registration, login (signInWithPassword), and file uploads.
 *
 * Usage (once a real limiter is wired):
 *   const res = await checkRateLimit(`register:${ip}`, { limit: 5, windowMs: 60_000 });
 *   if (!res.ok) return tooManyRequests(res.retryAfterSeconds);
 */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

// Best-effort, per-instance fallback. Explicitly NOT a production control.
const buckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  key: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  // TODO(security/item-6): replace with Upstash Redis or Vercel Firewall.
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  return { ok: true, remaining: opts.limit - entry.count, retryAfterSeconds: 0 };
}
