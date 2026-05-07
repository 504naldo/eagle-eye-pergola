import { TRPCError } from "@trpc/server";

// In-memory sliding-window rate limiter for tRPC procedures.
// Keyed by arbitrary string (e.g. "action:userId").
// Expired timestamps are pruned on each check so the Map stays bounded.

const windows = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): void {
  const now = Date.now();
  const cutoff = now - windowMs;
  const prev = windows.get(key) ?? [];
  const recent = prev.filter(t => t > cutoff);

  if (recent.length >= maxRequests) {
    const retryAfterSec = Math.ceil((prev[0]! - cutoff) / 1000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${retryAfterSec}s.`,
    });
  }

  recent.push(now);
  windows.set(key, recent);
}
