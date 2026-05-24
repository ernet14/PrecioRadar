# Roadmap — PrecioRadar

Plan maestro original (detallado): `docs/precioradar-etapas_1.md`.
Reglas de oro del roadmap: nunca recomendar sin datos reales; cada stub apagado vale más
que un feature nuevo; SEO long-tail es la adquisición sostenible; afiliados MeLi > AdSense;
no saltear etapas.

## Estado de etapas

- **Etapas 0–18: cerradas en su alcance actual.** Incluyen: seguridad/compliance
  (3–4), SEO (6), detector de ofertas falsas (12), afiliados multi-programa (14),
  PWA + Web Push (15), observabilidad/admin (16–17), IA descripciones (17), API B2B (18).
- **Congelado hasta pedido explícito:** UGC, resto de IA y **cobro/billing**.

## Etapa 19 — Reposicionamiento a capa de datos sobre retailers VTEX (en curso)

Ver plan original en `docs/etapa-19-extension.md` (parcialmente obsoleto, leer con la
salvedad de abajo). Decisiones: part-time (~10–20h/sem), empezar lean, invertir si hay tracción.

> **La extensión de navegador para MercadoLibre está MUERTA (2026-05-22).** ML bloquea
> `/items/{id}` de terceros con `403 PolicyAgent`, igual que `/sites/search` — cierre
> platform-wide, sin vía en la API oficial. Pedido de permiso a ML: enviado, sin respuesta;
> no apostar a eso. La página `/ml/[itemId]` ya se retiró (commit `e1cce8b`). Toda la Fase 1/2/3
> que dependía de la extensión queda **archivada** hasta que ML responda.
> **El rumbo es la capa de datos sobre retailers VTEX**, que sí responden.

### Fase 0 — Fundaciones de datos ✅ (cerrada 2026-05-22)
- Roll-up perpetuo de `PriceHistory` preservando **mín/máx por bucket**.
- Aislar demo/real (contadores del admin alineados al catálogo real).
- Servicio de veredicto reusable (`verdictService.buildVerdictAndStats`) + `getMinPrice`.
- Branch `etapa-19-extension` (commits `f516be9`, `f46f32e`).

### Diagnóstico del dataset (medido 2026-05-22)
Pipeline **sano**: cron de precios corre y está fresco (~795 updates/24h, 8 tiendas VTEX
respondiendo: Cetrogar, Naldo, OnCity, Easy, Coppel, Carrefour, Jumbo, Vea, Día). ML falla
por diseño (664 errores/48h = el 403). El cuello de botella **no** es frescura ni cantidad de
tiendas, es **comparabilidad**: de 313 productos con ofertas, solo **26 (8%) tienen 2+ tiendas**.
El catálogo (380 productos) se sembró por tienda sin asegurar solape, así que 92% no compara
contra nada — y un comparador sin comparación no entrega su valor central.

### Fase 1 — Densificar la comparación (en curso, 2026-05-23)
- **Sembrar SKUs con solape** ✅: `scripts/seed-catalog.ts` busca un set curado de modelos en
  las VTEX activas y persiste por el flujo real (idempotente, dry-run/`--apply`). Sembrados:
  celulares (S24 Ultra, Edge 50 Fusion, Redmi Note 13/13C, iPhone 15/13) + TVs (U8000 50/55/65,
  LG 50UA8050PSA, QLED 65). 11/15 modelos quedan comparables.
- **Verificar matching EAN** ✅: clave de celulares por marca+modelo+capacidad (el EAN
  por-variante fragmenta por color); fix `getPhoneStorage` (`"256/8gb"`) y `normalizeEan`
  (padding GTIN-14: `07796…` == `7796…`). Las TVs agrupan limpio por EAN/SKU a través de
  súper+electro; los celulares fragmentan por segmento (electro=storage/no-EAN vs
  súper=EAN/no-storage) — limitación estructural conocida, despriorizada.
- **Higiene** ✅: el cron ahora marca `available=false` las ofertas de tiendas con bloqueo
  permanente (`provider.blocked`) en vez de saltearlas; `scripts/cleanup-blocked-offers.ts`
  limpió las existentes (46 Frávega + 2 ML).
- **Descubrimiento sobre catálogo existente** ✅: `scripts/densify-existing.ts` toma cada
  producto con oferta en 1 sola tienda + clave canónica, re-busca su nombre en las otras VTEX
  y persiste las ofertas cuya clave coincide exactamente (match seguro por EAN/SKU/phone-key).
  Ataca la causa raíz (catálogo sembrado por tienda sin solape) y escala. Idempotente.
- **Limpieza pre-SEO** ✅: `scripts/audit-comparables.ts` validó que el matching por clave
  canónica es correcto (sin agrupaciones falsas). `scripts/rekey-products.ts` consolidó 136
  productos con slug-por-nombre (persistidos antes de la lógica canónica) en 49 canónicos —
  dedup de variantes de color que serían páginas duplicadas en SEO. `scripts/fix-junk-prices.ts`
  marcó 7 ofertas con precio roto (celular/heladera < $10k por feed defectuoso).
- **Medición**: `scripts/measure-comparables.ts` (reusa `getScorecardHeadline`).
  `comparableRate` honesto: **8% (sucio) → 14% (seed+higiene) → 20% (descubrimiento) → 24%
  (61 comparables / 256 con ofertas, tras dedup+limpieza) → 25% (64/261, 2026-05-23: +2
  modelos TV en el seeder, 75" U8000 y QLED 55 Q6FAA)**.
- **Discovery agotado sobre el catálogo actual** (2026-05-23): `densify-existing --limit 80`
  dio **0 nuevos** comparables — los 124 productos de 1 sola tienda restantes son modelos
  discontinuados/exclusivos que no existen en otras VTEX. Subir el rate ahora depende de
  **sembrar modelos vigentes de alto solape** (electro/TV), no de re-descubrir lo viejo.
- **Pipeline automático de densificación** ✅ (2026-05-24): `scripts/auto-densify.ts` descubre
  candidatos en VTEX activas, agrupa por clave canónica, bloquea grupos sospechosos por
  dispersión de precio, mide comparabilidad y reporta precios basura. Dry-run por defecto;
  `--apply` persiste solo grupos seguros.
- **Apply automático ejecutado** ✅ (2026-05-24): `auto-densify --apply` persistió grupos
  seguros adicionales y dejó bloqueado 1 grupo sospechoso por dispersión x4.75. Resultado:
  **comparableRate 26% → 34%** (92 comparables / 271 con ofertas vivas). Auditoría limpia:
  0 sospechosos en DB y 0 precios caros rotos bajo $10k.
- **Segunda tanda de seed** (2026-05-23): +5 modelos vigentes — TVs entrada (Crystal UHD 50/43
  DU7000) y **primera línea blanca** (heladera Samsung RT38, microondas BGH B223D, lavarropas
  Samsung WW90), todos agrupando por EAN súper+electro. **comparableRate 25% → 26%**
  (71 comparables / 275 con ofertas). La línea blanca agrupa tan bien como las TVs.
- Telcos (Movistar/Claro/Personal): **descartadas** — Movistar no es VTEX (devolvió HTML) y
  los celulares ya comparan en las VTEX de electro.
- **Próximo**: seguir sumando modelos electro/EAN de alto solape (TVs/electro agrupan 4-6
  tiendas); apuntar a modelos que las tiendas stockean HOY (los viejos como A55/G24/G34 están
  discontinuados y solo aparecen en 1 tienda).

### Fase 2 — Adquisición sostenible (SEO long-tail) (iniciada 2026-05-23)
Sobre el dataset comparable, páginas de producto indexables (regla de oro del roadmap).
Compone con el tiempo igual que el `PriceHistory`. Más valioso que features nuevos.

- **Primer paso SEO real** ✅: `sitemap.xml` y `generateStaticParams` de `/producto/[slug]`
  usan productos reales indexables (no demo, no borrados, con oferta viva y tienda activa)
  en vez del catálogo mock. Los comparables tienen prioridad más alta. Si no hay DB en build,
  el sitemap cae a rutas estáticas.
- Medición local 2026-05-23: **216 productos reales indexables**, **49 comparables** con el
  filtro estricto de sitemap.
- **Categorías sobre dataset real** ✅ (2026-05-23): `/categoria/[slug]` usa
  `listRealProductsByCategory` (mismos filtros de indexabilidad que el sitemap) en vez del
  catálogo mock; cae al mock solo si la categoría aún no tiene dataset real. Metadata,
  contador y JSON-LD `CollectionPage` ahora reflejan precios/ofertas reales; badge "N tiendas"
  + conteo de comparables en la cabecera. `revalidate=3600`. El 2026-05-24 se sumó
  normalización feed→taxonomía curada en lectura, para que slugs VTEX crudos como
  `tv-y-video` / `electro-y-tecnologia` alimenten páginas curadas cuando el nombre permite
  clasificar sin ambigüedad.
- **Links internos y schema priorizando comparables** ✅ (2026-05-24): los similares en
  `/producto/[slug]` ahora salen de la categoría curada y priorizan productos comparables;
  `/categoria/[slug]` suma `ItemList` en JSON-LD con `AggregateOffer` cuando hay 2+ tiendas.

### Fase 3+ — Índice de inflación / capa de datos B2B (motor iniciado 2026-05-23)
Índice de precios/inflación público + radar dólar pass-through, sobre el dataset VTEX
acumulado. Recién acá el cobro B2B tiene algo único que vender.

- **Motor del índice** ✅ (2026-05-23): `priceIndexService.computePriceIndex()` calcula un
  índice **encadenado tipo Jevons** (media geométrica de relativos de precio sobre productos
  emparejados día-a-día; mediana diaria por producto como precio representativo). Es la
  metodología de los IPC para agregados elementales: robusta al cambio de canasta. Acepta
  `categorySlug`. Expuesto en `/admin/monitor` (tarjeta con índice actual, variación acumulada,
  cobertura y mini-serie). Read-only, sin migración.
- **Gated por historia**: hoy `PriceHistory` real abarca **~5 días** (arrancó 2026-05-20), así
  que el índice es casi plano (base 100 → ~99) y NO mide inflación todavía. Compone solo con el
  cron diario. **Página pública diferida** hasta tener ~30+ días de serie (evitar publicar un
  índice engañoso); mientras tanto vive en el admin como "construyendo serie".
- **Índice por categoría destrabado en código** (2026-05-24): `computePriceIndex({categorySlug})`
  normaliza la categoría cruda con slug + nombre del producto antes de segmentar. Falta medir
  con DB real si la cobertura por categoría ya es suficiente para publicar.
- **Medición por categoría** ✅ (2026-05-24): `scripts/measure-price-index.ts` mide madurez por
  categoría con gate público conservador (30+ días, 30+ productos, sample latest 20+). Foto
  actual: total 5 días / 320 productos / sample 213; celulares 5d / 71 / 62; televisores
  4d / 45 / 27; electrodomésticos 4d / 64 / 20. **Ninguna categoría publicable todavía por
  falta de días**, no por falta de código.
- **Radar dólar pass-through v0 interno** ✅ (2026-05-24): `passThroughService` cruza el índice
  de precios con una serie diaria de dólar provista por CSV (`date,rate`) y estima beta/correlación
  por lags 0/1/3/7/14 días. `scripts/measure-pass-through.ts` es read-only y exige fuente explícita
  para mantener reproducibilidad. No se publica UI: con 4-5 días de historia solo sirve como radar
  interno.
- **Fuente BNA para dólar oficial** ✅ (2026-05-24): `scripts/fetch-bna-dollar.ts` exporta
  dólar Banco Nación **venta** desde el histórico oficial de BNA a CSV compatible con el radar.
  Completa días sin cotización (domingos/feriados) con carry-forward por defecto; se puede
  desactivar con `--no-carry-forward`.
- **Corrida operativa + admin interno** ✅ (2026-05-24): `scripts/run-data-radar.ts` corre en
  una sola salida índice + BNA venta + pass-through para total/categorías, y `/admin/monitor`
  muestra una tarjeta interna "no público". Sigue bloqueado para UI pública hasta 30+ días.
- Pendiente Fase 3: página pública del índice, página pública del radar dólar y empaquetado B2B
  cuando haya 30+ días de serie.

## Diferido / pendiente

Ver [ideas pendientes](../memory/ideas-pendientes.md) (incluye lo diferido de Fase 1:
multiget, circuit breaker distribuido, dedupe, rate-limit por extensión) y deuda técnica.
