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

### Fase 1 — Densificar la comparación (próximo)
- **Sembrar SKUs con solape**: elegir un set acotado (p.ej. modelos concretos de celulares
  Samsung/Sony/Motorola + electro) e importarlos en las 5 VTEX de electro para que comparen
  de verdad. Calidad de solape > cantidad de productos. Subir el `comparableRate` muy por
  encima del 8%.
- **Verificar matching EAN**: confirmar que productos que SON el mismo se agrupan (`getCanonicalProductKey`).
- **Higiene**: Frávega está `blocked` pero sus ofertas viejas siguen `available=true` (46) e
  inflan los contadores — marcarlas no disponibles. Limpiar las 3 ofertas ML residuales.
- Telcos (Movistar/Claro/Personal): **descartadas** — Movistar no es VTEX (devolvió HTML) y
  los celulares ya comparan en las VTEX de electro.

### Fase 2 — Adquisición sostenible (SEO long-tail)
Sobre el dataset comparable, páginas de producto indexables (regla de oro del roadmap).
Compone con el tiempo igual que el `PriceHistory`. Más valioso que features nuevos.

### Fase 3+ — Índice de inflación / capa de datos B2B
Índice de precios/inflación público + radar dólar pass-through, sobre el dataset VTEX
acumulado. Recién acá el cobro B2B tiene algo único que vender.

## Diferido / pendiente

Ver [ideas pendientes](../memory/ideas-pendientes.md) (incluye lo diferido de Fase 1:
multiget, circuit breaker distribuido, dedupe, rate-limit por extensión) y deuda técnica.
