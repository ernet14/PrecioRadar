// Tiers de la API pública pagada (Etapa 18, modelo Keepa-light).
// dailyLimit: llamadas permitidas por día. historyDays: profundidad de
// historial accesible (null = sin límite).
export type ApiTier = "FREE" | "PRO" | "BUSINESS";

export type ApiTierConfig = {
  dailyLimit: number;
  historyDays: number | null;
};

export const API_TIERS: Record<ApiTier, ApiTierConfig> = {
  FREE: { dailyLimit: 100, historyDays: 30 },
  PRO: { dailyLimit: 5_000, historyDays: 365 },
  BUSINESS: { dailyLimit: 50_000, historyDays: null },
};

export function getTierConfig(tier: ApiTier): ApiTierConfig {
  return API_TIERS[tier];
}
