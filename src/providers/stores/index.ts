export { mercadoLibreProvider } from "@/providers/stores/mercadoLibreProvider";
export { mockProvider } from "@/providers/stores/mockProvider";
// Tiendas reales sobre VTEX (Frávega, Cetrogar, Naldo, OnCity, Easy, Coppel,
// Carrefour, Jumbo). `vtexProviders` es el array que consume searchService.
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
} from "@/providers/stores/vtexStores";
// ETAPA 1: providers stub (megatone, musimundo, temu, tiendamia) quedan fuera del
// barrel hasta tener integración real. Megatone/Musimundo no exponen VTEX público.
export type {
  ProviderPrice,
  ProviderPriceInput,
  ProviderProduct,
  StoreProvider,
} from "@/providers/stores/types";
