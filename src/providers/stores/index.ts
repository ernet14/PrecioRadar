export { mercadoLibreProvider } from "@/providers/stores/mercadoLibreProvider";
export { mockProvider } from "@/providers/stores/mockProvider";
// ETAPA 1: providers stub (cetrogar, fravega, megatone, musimundo, temu, tiendamia)
// quedan fuera del barrel hasta tener integración real. Archivos siguen en disco como referencia.
export type {
  ProviderPrice,
  ProviderPriceInput,
  ProviderProduct,
  StoreProvider,
} from "@/providers/stores/types";
