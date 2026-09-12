interface Bucket {
  count: number;
  resetAt: number;
}

// Fixed-window counter kept in memory; enough for a single-instance login endpoint.
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  hit(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= this.limit,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  reset(key: string) {
    this.buckets.delete(key);
  }

  private sweep(now: number) {
    if (this.buckets.size < 1000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
