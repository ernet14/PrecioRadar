import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

export const PRICE_INDEX_JOB_GUARD_NAME = "price-index-analysis";

export type CronGuardStore = {
  acquireCooldown(key: string, token: string, ttlSeconds: number): Promise<boolean>;
  incrementDaily(key: string, ttlSeconds: number): Promise<number>;
};

export type CronGuardDecision =
  | { allowed: true; runNumber: number }
  | {
      allowed: false;
      reason: "budget_exhausted" | "cooldown" | "disabled" | "guard_unavailable";
    };

type CronGuardOptions = {
  enabled: boolean;
  jobName: string;
  maxRunsPerDay: number;
  minIntervalSeconds: number;
  now?: Date;
  store?: CronGuardStore | null;
};

const INCREMENT_DAILY_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`;

const memoryCooldowns = new Map<string, number>();
const memoryDailyCounts = new Map<string, number>();

const developmentStore: CronGuardStore = {
  async acquireCooldown(key, _token, ttlSeconds) {
    const now = Date.now();
    if ((memoryCooldowns.get(key) ?? 0) > now) return false;
    memoryCooldowns.set(key, now + ttlSeconds * 1000);
    return true;
  },
  async incrementDaily(key) {
    const count = (memoryDailyCounts.get(key) ?? 0) + 1;
    memoryDailyCounts.set(key, count);
    return count;
  },
};

function createRedisStore(): CronGuardStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return {
    async acquireCooldown(key, value, ttlSeconds) {
      return (await redis.set(key, value, { ex: ttlSeconds, nx: true })) === "OK";
    },
    async incrementDaily(key, ttlSeconds) {
      const result = await redis.eval<[string], number>(INCREMENT_DAILY_SCRIPT, [key], [
        String(ttlSeconds),
      ]);
      return Number(result);
    },
  };
}

function createDefaultStore() {
  return createRedisStore() ?? (process.env.NODE_ENV === "production" ? null : developmentStore);
}

export async function acquireCronRunGuard(
  options: CronGuardOptions,
): Promise<CronGuardDecision> {
  if (!options.enabled) return { allowed: false, reason: "disabled" };

  const store = options.store === undefined ? createDefaultStore() : options.store;
  if (!store) return { allowed: false, reason: "guard_unavailable" };

  const now = options.now ?? new Date();
  const token = randomUUID();
  const prefix = `price-radar:cron:${options.jobName}`;

  try {
    // El cooldown funciona también como lock distribuido: mientras exista, otra
    // instancia serverless no puede iniciar el mismo trabajo.
    const acquired = await store.acquireCooldown(
      `${prefix}:cooldown`,
      token,
      options.minIntervalSeconds,
    );
    if (!acquired) return { allowed: false, reason: "cooldown" };

    const day = now.toISOString().slice(0, 10);
    const runNumber = await store.incrementDaily(`${prefix}:runs:${day}`, 2 * 24 * 60 * 60);
    if (!Number.isFinite(runNumber) || runNumber > options.maxRunsPerDay) {
      return { allowed: false, reason: "budget_exhausted" };
    }

    return { allowed: true, runNumber };
  } catch {
    // Sin guarda distribuida no se permite llegar a PostgreSQL.
    return { allowed: false, reason: "guard_unavailable" };
  }
}
