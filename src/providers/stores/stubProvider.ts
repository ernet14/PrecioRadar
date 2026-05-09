import type {
  ProviderPrice,
  ProviderPriceInput,
  ProviderProduct,
  StoreProvider,
} from "@/providers/stores/types";

type StubProviderOptions = {
  name: string;
  todo: string;
};

export function createStubProvider({
  name,
  todo,
}: StubProviderOptions): StoreProvider {
  return {
    name,

    async searchProducts(): Promise<ProviderProduct[]> {
      void todo;
      return [];
    },

    async getProductByUrl(): Promise<ProviderProduct | null> {
      void todo;
      return null;
    },

    async getCurrentPrice(input: ProviderPriceInput): Promise<ProviderPrice | null> {
      void input;
      void todo;
      return null;
    },

    normalizeProductData(): ProviderProduct {
      throw new Error(`${name} provider is not implemented yet. TODO: ${todo}`);
    },
  };
}
