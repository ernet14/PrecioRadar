import { createVtexProvider, type VtexStoreConfig } from "@/providers/stores/vtexProvider";

// Tiendas argentinas sobre VTEX con Search API pública verificada (2026-05-20).
// Para sumar una nueva: confirmar que
// `https://HOST/api/catalog_system/pub/products/search/notebook?_from=0&_to=1`
// devuelve un array JSON con precio, y agregar su config acá.
const vtexStoreConfigs: VtexStoreConfig[] = [
  // Frávega bloqueado temporalmente: su Search API VTEX devuelve HTTP 403
  // persistente desde Vercel (2026-05). Quitar `blocked` cuando vuelva a
  // responder para reactivar sin más cambios de código.
  { name: "fravega", storeSlug: "fravega", storeName: "Frávega", baseUrl: "https://www.fravega.com", blocked: true },
  { name: "cetrogar", storeSlug: "cetrogar", storeName: "Cetrogar", baseUrl: "https://www.cetrogar.com.ar" },
  { name: "naldo", storeSlug: "naldo", storeName: "Naldo", baseUrl: "https://www.naldo.com.ar" },
  { name: "oncity", storeSlug: "oncity", storeName: "OnCity", baseUrl: "https://www.oncity.com" },
  { name: "easy", storeSlug: "easy", storeName: "Easy", baseUrl: "https://www.easy.com.ar" },
  { name: "coppel", storeSlug: "coppel", storeName: "Coppel", baseUrl: "https://www.coppel.com.ar" },
  { name: "carrefour", storeSlug: "carrefour", storeName: "Carrefour", baseUrl: "https://www.carrefour.com.ar" },
  { name: "jumbo", storeSlug: "jumbo", storeName: "Jumbo", baseUrl: "https://www.jumbo.com.ar" },
  { name: "vea", storeSlug: "vea", storeName: "Vea", baseUrl: "https://www.vea.com.ar" },
  { name: "dia", storeSlug: "dia", storeName: "Día", baseUrl: "https://diaonline.supermercadosdia.com.ar" },
];

export const vtexProviders = vtexStoreConfigs.map(createVtexProvider);

const bySlug = new Map(vtexProviders.map((provider) => [provider.name, provider]));

// Export nombrado por compatibilidad / acceso directo.
export const fravegaProvider = bySlug.get("fravega")!;
export const cetrogarProvider = bySlug.get("cetrogar")!;
export const naldoProvider = bySlug.get("naldo")!;
export const oncityProvider = bySlug.get("oncity")!;
export const easyProvider = bySlug.get("easy")!;
export const coppelProvider = bySlug.get("coppel")!;
export const carrefourProvider = bySlug.get("carrefour")!;
export const jumboProvider = bySlug.get("jumbo")!;
export const veaProvider = bySlug.get("vea")!;
export const diaProvider = bySlug.get("dia")!;
