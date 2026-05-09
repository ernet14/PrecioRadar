export type Store = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string;
  logoUrl?: string | null;
  isDemo: boolean;
  hasAffiliate: boolean;
  affiliateEnabled: boolean;
  active: boolean;
};
