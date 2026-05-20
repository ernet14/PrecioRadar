import { mercadoLibreProvider } from "@/providers/stores/mercadoLibreProvider";
import { vtexProviders } from "@/providers/stores/vtexStores";
import type { StoreProvider } from "@/providers/stores/types";

export { mercadoLibreProvider } from "@/providers/stores/mercadoLibreProvider";
export { mockProvider } from "@/providers/stores/mockProvider";
// Tiendas reales sobre VTEX (Frávega, Cetrogar, Naldo, OnCity, Easy, Coppel,
// Carrefour, Jumbo, Vea, Día). `vtexProviders` es el array que consume searchService.
export {
  vtexProviders,
  fravegaProvider,
  cetrogarProvider,
  naldoProvider,
  oncityProvider,
  easyProvider,
  coppelProvider,
  carrefourProvider,
  jumboProvider,
  veaProvider,
  diaProvider,
} from "@/providers/stores/vtexStores";
// ETAPA 1: providers stub (megatone, musimundo, temu, tiendamia) quedan fuera del
// barrel hasta tener integración real. Megatone/Musimundo no exponen VTEX público.

// Todos los providers con datos reales (MercadoLibre + VTEX) y el índice por
// store slug que usa el cron de refresh-prices para rutear cada oferta.
export const realProviders: StoreProvider[] = [mercadoLibreProvider, ...vtexProviders];
export const providerByStoreSlug = new Map(
  realProviders.map((provider) => [provider.name, provider]),
);

export type {
  ProviderPrice,
  ProviderPriceInput,
  ProviderProduct,
  StoreProvider,
} from "@/providers/stores/types";
