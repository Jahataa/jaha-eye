const buckets = new Map<string, number[]>();

export function checkOfficeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  if (hits.length >= limit) {
    const oldest = hits[0] ?? now;
    return { allowed: false, retryAfterMs: Math.max(0, oldest + windowMs - now) };
  }

  hits.push(now);
  buckets.set(key, hits);
  return { allowed: true };
}

export function clearOfficeRateLimitsForTests(): void {
  buckets.clear();
}
