import type { CurrencyCode, DateLike, ProductCondition } from "@/types/common";
import type { Recommendation } from "@/types/recommendation";
import type { Store } from "@/types/store";

export type Product = {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  model?: string | null;
  categoryId: string;
  imageUrl?: string | null;
  normalizedName: string;
  isDemo: boolean;
  createdAt?: DateLike;
  updatedAt?: DateLike;
};

export type ProductOffer = {
  id: string;
  productId: string;
  storeId: string;
  externalId?: string | null;
  title: string;
  price: number;
  currency: CurrencyCode;
  productUrl: string;
  affiliateUrl?: string | null;
  imageUrl?: string | null;
  available: boolean;
  condition: ProductCondition;
  isDemo: boolean;
  lastCheckedAt?: DateLike | null;
  store?: Store;
};

export type PriceHistory = {
  id: string;
  productId: string;
  storeId: string;
  offerId?: string | null;
  price: number;
  currency: CurrencyCode;
  source: string;
  isDemo: boolean;
  recordedAt: DateLike;
};

export type ProductWithOffers = Product & {
  offers: ProductOffer[];
  recommendation?: Recommendation;
};
