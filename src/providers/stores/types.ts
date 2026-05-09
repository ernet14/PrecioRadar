import type { CurrencyCode, ProductCondition } from "@/types";

export type ProviderPriceInput = {
  productId?: string;
  externalId?: string;
  url?: string;
};

export type ProviderPrice = {
  externalId: string;
  price: number;
  currency: CurrencyCode;
  available: boolean;
  isDemo: boolean;
  lastCheckedAt: Date;
};

export type ProviderProduct = {
  externalId: string;
  provider: string;
  slug?: string;
  slugAliases?: string[];
  storeSlug: string;
  storeName: string;
  title: string;
  name: string;
  normalizedName: string;
  brand?: string | null;
  model?: string | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
  productUrl: string;
  price: number;
  currency: CurrencyCode;
  condition: ProductCondition;
  available: boolean;
  isDemo: boolean;
  lastCheckedAt: Date;
};

export interface StoreProvider {
  name: string;
  searchProducts(query: string): Promise<ProviderProduct[]>;
  getProductByUrl(url: string): Promise<ProviderProduct | null>;
  getCurrentPrice(input: ProviderPriceInput): Promise<ProviderPrice | null>;
  normalizeProductData(data: unknown): ProviderProduct;
}
