@AGENTS.md

# PrecioRadar — Índice de contexto

Comparador de precios para Argentina en transición hacia **capa de datos de precios**
(índice de inflación + extensión de navegador). Stack: Next.js 16 + React 19 + Prisma 7 +
Supabase (Postgres) + Upstash + Vercel. Dominio: `www.precio-radar.com`.

> Las **reglas de trabajo** (13) vienen de [`AGENTS.md`](AGENTS.md), importado arriba.
> Leé solo el contexto necesario para la tarea.

## Delegación a subagentes

Antes de empezar, decidí si un subagente debe hacer parte del trabajo. Preferí el
agente seguro más barato y escalá solo cuando aparezca riesgo.

1. `precio-scout`: archivos, rutas, flujo de datos, sitemap o código afectado poco claro.
2. `precio-auditor`: antes de SEO/indexación, sitemap, robots, canonical, hreflang,
   datos estructurados, ingesta, fuentes externas, exposición Supabase, cron, cookies,
   analytics o cambios sensibles de admin/seguridad.
3. `precio-architect`: arquitectura, estrategia de ingesta/SEO, refactors grandes o
   decisiones ambiguas de producto.
4. `precio-coder`: solo cuando el problema se entiende y el cambio es pequeño y seguro.
5. `precio-helper`: lint, build, tests, logs y diagnóstico.
6. `precio-guardian`: después de editar y antes de commit, push, deploy, cron,
   migraciones o trabajo sensible para producción.

Nunca hagas commit, push, deploy, apliques migraciones, cambies cron ni toques
producción sin aprobación explícita. Mantené los cambios pequeños, reversibles y
seguros para SEO. Al final, indicá qué subagentes usaste; si no usaste ninguno,
explicá por qué.

## Contexto del proyecto
- [Producto](docs/contexto/producto.md) — qué hace hoy, features, usuarios.
- [Negocio](docs/contexto/negocio.md) — modelo, monetización, estrategia, legal.
- [Arquitectura](docs/contexto/arquitectura.md) — stack, modelo de datos, providers, crons, APIs, auth, SEO.
- [Roadmap](docs/contexto/roadmap.md) — etapas, estado, qué está congelado.

## Memoria de trabajo (bitácoras)
- [Decisiones recientes](docs/memory/decisiones-recientes.md)
- [Aprendizajes](docs/memory/aprendizajes.md) — cosas no obvias, para no re-descubrirlas.
- [Ideas pendientes](docs/memory/ideas-pendientes.md) — backlog estratégico + deuda técnica.

## Docs de detalle (referencia profunda)
- `docs/precioradar-etapas_1.md` — roadmap maestro original.
- `docs/etapa-19-extension.md` — plan del pivot a capa de datos + extensión.
- `docs/mercadolibre-permiso-busqueda.md`, `docs/afiliados-mercadolibre.md` — integración ML.
- `docs/etapa-3-decisiones.md`, `docs/etapa-4-decisiones.md` — seguridad / compliance diferidos.
- `docs/etapa-6-seo.md`, `docs/admin-status.md`, `docs/mvp-qa-deploy-checklist.md` — referencia / runbooks.
- `docs/Cloude Informe Profundo.md` — revisión profunda (snapshot mayo 2026; estado desactualizado, leer como histórico).

## Mapa resumido del proyecto

Solo carpetas y archivos importantes (excluye `node_modules`, `.next`, `.git`, `dist`,
generados como `src/generated`, `.env*` y secretos).

```
CLAUDE.md / AGENTS.md            contexto IA + 13 reglas de trabajo
README.md                        setup (parcialmente stale)
package.json                     deps + script `test` (lista explícita de archivos)
next.config.ts                   config Next (CSP, imágenes)
vercel.json                      crons de Vercel
prisma.config.ts · playwright.config.ts · sentry.*.config.ts
prisma/schema.prisma             MODELO DE DATOS (fuente de verdad)
docs/                            ver índice arriba (contexto/, memory/, etapas, integraciones)
public/                          PWA (manifest, service worker, íconos) + estáticos
supabase/                        config / SQL de Supabase
scripts/                         scripts utilitarios
tests/                           tests unitarios (node:test + tsx)
src/
├─ app/                          App Router (RSC)
│  ├─ <páginas>                  buscar · producto/[slug] · categoria/[slug] · dashboard ·
│  │                             alertas · termometro · promos-hoy · sellers · guias ·
│  │                             admin/* · auth · login · registro · reviews · votes …
│  └─ api/
│     ├─ v1/products(/[slug])    API pública B2B (key + rate limit por tier)
│     ├─ internal/*              CRONS (refresh-prices, evaluate-alerts,
│     │                          evaluate-bank-promos, health-watch, daily-report,
│     │                          generate-descriptions) — protegidas por CRON_SECRET
│     ├─ auth/mercadolibre/*     OAuth ML
│     ├─ out/                    redirect + click tracking (afiliados)
│     └─ push · me/data-export · newsletter · cookies · health · debug/mercadolibre
├─ providers/stores/             integraciones por tienda
│  ├─ mercadoLibreProvider.ts    API oficial ML (/items OK · search 403)
│  ├─ vtexProvider.ts + vtexStores.ts   10 tiendas VTEX (Frávega bloqueado)
│  ├─ {fravega,cetrogar,megatone,musimundo,temu,tiendamia}Provider.ts · mock/stub
│  └─ index.ts · types.ts
├─ services/                     lógica de negocio (~40). Clave:
│  ├─ search/producto: searchService · productService · priceSnapshotService ·
│  │     priceCompactionService · priceHistoryService
│  ├─ ofertas: fakeDiscountService (veredicto) · verdictService (veredicto+stats) ·
│  │     thermometerService · recommendationService
│  ├─ alertas/notif: alertService · notificationService · emailService · pushService ·
│  │     trackedProductService · bankPromo{Service,Parser,Fetcher}
│  ├─ api/afiliados: apiKeyService · apiPricingService · affiliateService · clickTrackingService
│  ├─ admin/observabilidad: adminService · monitorService · monitoringService ·
│  │     analyticsService · auditLogService · providerLogService · searchLogService
│  └─ otros: aiDescriptionService · reviewService · voteService · reportService ·
│        productImportService · userSyncService · mercadoLibreCacheService
├─ lib/                          utilidades transversales
│  ├─ prisma.ts · circuitBreaker.ts · cronAuth.ts · ratelimit.ts · logger.ts
│  ├─ apiAuth.ts · apiTiers.ts · cn.ts
│  ├─ supabase/ (auth.ts) · mercadolibre/ (oauth, authStorage)
│  └─ seo/ (jsonLd) · utils/ (text → getCanonicalProductKey) · validation/
├─ components/                   UI (product, search, alerts, pwa, layout, ui, …)
├─ data/                         mockStoreProducts · commercialEvents · categoriesData
├─ content/guides/               guías (contenido SEO)
└─ types/                        tipos compartidos
```
