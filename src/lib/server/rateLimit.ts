export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next request is allowed (0 when allowed). */
  retryAfter: number;
}

/**
 * In-memory sliding-window limiter, keyed by client address. State lives in the
 * Node process, so it resets on restart; enough for a single VPS instance.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateLimitResult {
    const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);

    if (recent.length >= limit) {
      hits.set(key, recent);
      return { allowed: false, retryAfter: Math.ceil((recent[0] + windowMs - now) / 1000) };
    }

    recent.push(now);
    hits.set(key, recent);

    // Drop idle keys now and then so the map doesn't grow without bound
    if (hits.size > 10_000) {
      for (const [k, times] of hits) {
        if (times.every(t => now - t >= windowMs)) hits.delete(k);
      }
    }

    return { allowed: true, retryAfter: 0 };
  };
}
