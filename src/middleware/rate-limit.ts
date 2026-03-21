import type { Context, Next } from "hono";

interface WindowEntry {
  count: number;
  resetAt: number;
}

const getClientIp = (c: Context): string => {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    const [firstIp] = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (firstIp) return firstIp;
  }

  return c.req.header("x-real-ip") ?? "unknown";
};

export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const windows = new Map<string, WindowEntry>();

  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const now = Date.now();
    const entry = windows.get(ip);

    if (!entry || now >= entry.resetAt) {
      windows.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      c.header("X-RateLimit-Limit", String(maxRequests));
      c.header("X-RateLimit-Remaining", "0");
      return c.text("Too many requests. Please try again later.", 429);
    }

    entry.count++;
    c.header("X-RateLimit-Limit", String(maxRequests));
    c.header("X-RateLimit-Remaining", String(maxRequests - entry.count));
    return next();
  };
};
