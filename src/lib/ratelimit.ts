import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = { success: boolean; remaining?: number };

function createLimiter(tokens: number, window: `${number} ${"ms" | "s" | "m" | "h" | "d"}`) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
  });
}

const limiters = {
  out: createLimiter(30, "1 m"),
  search: createLimiter(20, "1 m"),
  register: createLimiter(5, "1 h"),
  login: createLimiter(10, "1 m"),
} as const;

export async function rateLimit(
  type: keyof typeof limiters,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = limiters[type];

  if (!limiter) return { success: true };

  const result = await limiter.limit(identifier);

  return { success: result.success, remaining: result.remaining };
}
