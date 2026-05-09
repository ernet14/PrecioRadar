import type { InputType, MatchType } from "@/types/common";
import type { ProductOffer, ProductWithOffers } from "@/types/product";

export type SearchResultStatus =
  | "empty"
  | "ready"
  | "coming_soon"
  | "unsupported_url"
  | "mercadolibre_pending";

export type SearchResultItem = {
  product: ProductWithOffers;
  bestOffer?: ProductOffer;
  matchType: MatchType;
  score: number;
};

export type SearchResult = {
  query: string;
  detectedType: InputType;
  exactMatches: SearchResultItem[];
  similarMatches: SearchResultItem[];
  total: number;
  status: SearchResultStatus;
  message?: string;
  usedDemoFallback: boolean;
  searchedAt: Date;
};
