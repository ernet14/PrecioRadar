# Arquitectura — PrecioRadar

## Stack

- **Next.js 16.2.4** (App Router, RSC) + **React 19.2**.
- **Prisma 7.8** con `@prisma/adapter-pg` sobre **PostgreSQL / Supabase**. Cliente generado
  en `src/generated/prisma`.
- **Supabase Auth** (`@supabase/ssr`, `@supabase/supabase-js`) para autenticación.
- **Upstash Redis** (`@upstash/ratelimit`, `@upstash/redis`) para rate limiting y cache.
- **Resend** (email), **web-push** (VAPID) para notificaciones.
- **AI SDK v6** (`ai`) vía **Vercel AI Gateway** (modelo por defecto `openai/gpt-4o-mini`).
- **Sentry**, **@vercel/analytics**, **recharts** (gráficos).
- **Tests:** `node --test` + `tsx` (lista explícita de archivos en `package.json`), e2e con
  **Playwright**. Deploy en **Vercel**.

## Capas

`providers/` (integraciones por tienda) → `services/` (lógica de negocio) →
`app/api/**` (rutas) → páginas RSC en `app/`. Circuit breaker propio
(`src/lib/circuitBreaker.ts`), cache por endpoint, soft-deletes, audit log.

## Modelo de datos (Prisma)

- **Product / ProductOffer / PriceHistory** — núcleo. `ProductOffer` único por
  `(storeId, externalId)`. `PriceHistory` con índices compuestos por tiempo.
- **Store** — tiendas; `blockedUntil`/`blockReason` para auto-bloqueo temporal.
- **Alert** — alertas (TARGET_PRICE / PERCENTAGE_DROP), cooldown 24h, máx 3 free.
- **BankPromo** — promos bancarias (entidad, días, %, tienda/categoría, vigencia).
- **PushSubscription / Notification** — Web Push + notificaciones in-app.
- **ApiKey** — API B2B; tier FREE/PRO/BUSINESS; solo hash SHA-256 (nunca plaintext).
- **TrackedProduct** — productos seguidos por usuario.
- **MercadoLibreAuth** — tokens OAuth de ML (singleton, refresh automático).
- **MercadoLibreCache** — cache DB de respuestas ML (TTL: items 4h, search 1h, cats 24h).
- **AuditLog** (append-only), **SystemHealthLog** (bitácora del bot), **ScrapeJob**
  (tracking de crons), **ProviderLog**, **SearchLog**, **AnalyticsEvent**,
  **ClickTracking**, **AffiliateLink**, **ProductReport**, **Review/Vote**, **Category**,
  **ProductImportDraft**, **User** (soft-delete `deletedAt`).

## Providers / scraping

- **MercadoLibre** (`src/providers/stores/mercadoLibreProvider.ts`): API oficial + OAuth.
  `/items/{id}` y multiget `/items?ids=` traen precio (estable, legal). `/sites/MLA/search`
  da **403** (bloqueo de plataforma) → apagado por gate `MERCADOLIBRE_SEARCH_ENABLED`.
  Estrategia bearer-first; 4xx no abre el circuit breaker.
- **VTEX** (`vtexProvider.ts`, 10 tiendas: Frávega, Cetrogar, Naldo, OnCity, Easy, Coppel,
  Carrefour, Jumbo, Vea, Día): API JSON pública, sin auth. **Frávega bloqueado (403 desde
  IPs de Vercel)**.
- **Stubs sin integrar:** Megatone, Musimundo, Temu, Tiendamia. **Mock** como fallback demo.
- **Matching cross-tienda:** `getCanonicalProductKey` (EAN/GTIN > marca+modelo > nombre) en
  `src/lib/utils/text.ts`.

## APIs

- **Pública B2B** `/api/v1/products` (búsqueda) y `/api/v1/products/[slug]` (precios +
  historial). Auth por API key, rate limit por tier (Upstash). **Cobro no implementado.**
- **Internas** `/api/internal/*` (crons, protegidas por `CRON_SECRET`), `/api/out`
  (redirect + click tracking), `/api/push/*`, `/api/auth/mercadolibre/*` (OAuth).

## Crons / tareas programadas (`vercel.json`)

- `/api/internal/refresh-prices` — snapshot de precios + compactación de historial.
- `/api/internal/evaluate-alerts` — evalúa alertas y notifica.
- `/api/internal/evaluate-bank-promos` — desactiva promos vencidas + notifica.
- `/api/internal/refresh-weekly-featured` — selección semanal "Detectadas por PrecioRadar"
  (lunes 08:00 UTC). Trigger externo en cron-job.org (header `X-Cron-Secret`).
- `/api/internal/densify` — tanda rotativa de densificación (lunes 06:00 UTC). Trigger externo
  en cron-job.org (header `X-Cron-Secret`).
- Trigger externo (Hobby limita cantidad): `health-watch`, `daily-report`,
  `generate-descriptions`, `refresh-weekly-featured`, `densify`. Los `crons` de `vercel.json`
  quedan definidos pero en Hobby no se garantiza que corran todos; el trigger real es externo
  (cron-job.org / UptimeRobot) pegando con `CRON_SECRET`.
- **Compactación de `PriceHistory`:** roll-up perpetuo (día → semana → mes), preservando
  por bucket la fila más antigua + el mínimo + el máximo (no borra todo a 180d).

## Servicios clave

- `fakeDiscountService.detectDealQuality` — única fuente de verdad del veredicto de oferta.
- `verdictService.buildVerdictAndStats` — compone veredicto + stats de ventana
  (min30/min90/avg60/típico). Puro, reusable (sitio + futura extensión).
- `priceHistoryService` — `getAveragePrice`, `getMinPrice`, `calculatePriceHistoryStats`.
- `monitorService` / `monitoringService` — scorecard del catálogo + salud del sistema.

## Auth & seguridad

- Supabase Auth. Registro exige nombre + contraseña fuerte; login laxo (compatibilidad).
- Admin: `requireAdmin()` + allowlist `ADMIN_EMAILS` (`src/lib/supabase/auth.ts`).
- CSP, rate limiting, audit log. Decisiones diferidas en `docs/etapa-3-decisiones.md`.

## SEO

`robots.ts`, `sitemap.ts`, JSON-LD (Product/AggregateOffer/Breadcrumb/CollectionPage),
canonical por página, OG image dinámica por producto, hreflang es-AR. Detalle en
`docs/etapa-6-seo.md`.

## Migraciones (regla crítica)

**Nunca** `prisma migrate dev/reset` contra Supabase prod. Usar SQL manual +
`prisma migrate resolve`.
