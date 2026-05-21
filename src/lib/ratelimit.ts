import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { API_TIERS, type ApiTier } from "@/lib/apiTiers";

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

// Límite diario por tier de la API pública (Etapa 18). Se crea un limiter por
// tier de forma perezosa; sin Upstash configurado degrada a "success".
const apiTierLimiters = new Map<ApiTier, ReturnType<typeof createLimiter>>();

export async function rateLimitApi(
  tier: ApiTier,
  identifier: string,
): Promise<RateLimitResult> {
  if (!apiTierLimiters.has(tier)) {
    apiTierLimiters.set(tier, createLimiter(API_TIERS[tier].dailyLimit, "1 d"));
  }

  const limiter = apiTierLimiters.get(tier);
  if (!limiter) return { success: true };

  const result = await limiter.limit(`api:${tier}:${identifier}`);

  return { success: result.success, remaining: result.remaining };
}
