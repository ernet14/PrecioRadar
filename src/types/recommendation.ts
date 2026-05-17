export type RecommendationLevel =
  | "EXCELLENT_PRICE"
  | "GOOD_PRICE"
  | "NORMAL_PRICE"
  | "EXPENSIVE"
  | "INFLATED_OFFER"
  | "WAIT";

export type Recommendation = {
  level: RecommendationLevel;
  label: string;
  reason: string;
  score: number;
  currentPrice: number;
  minPrice?: number;
  maxPrice?: number;
  averagePrice?: number;
};
