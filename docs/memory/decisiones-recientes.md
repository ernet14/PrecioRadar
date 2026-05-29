# Decisiones recientes

> Bitácora de decisiones de producto/técnicas. La más nueva arriba. Esto es contexto del
> proyecto versionado en el repo (distinto de la memoria cross-sesión del agente, que vive
> fuera del repo).

## 2026-05-28 — Ampliación de catálogo a verticales nuevas + ingesta automática
- Categorías nuevas (sin alimentos): pequeños electrodomésticos, hogar, deportes, indumentaria;
  herramientas ampliada a ferretería/construcción/jardín. Se guarda `isFoodProduct` para excluir
  comida (red de seguridad en `persistProductOfferView`). `normalizeCategorySlug` cae a fallback
  solo-por-keyword para clasificar productos de tiendas nuevas con categoría VTEX desconocida.
- Tiendas VTEX nuevas verificadas: Más Online (sc=1), Sportotal, Newsport, Grid, Mimo & Co,
  Desiderata, Portsaid. `searchLimit` 12→24; soporte `salesChannel` en el provider.
- Densify productizado: queries centralizadas en `src/data/densifyQueries.ts` (12 categorías,
  ~250 queries), core reutilizable en `src/services/densifyService.ts` (piso de precio + guarda de
  comida). Endpoint `/api/internal/densify` (CRON_SECRET, maxDuration 300, tanda rotativa semanal)
  + cron lunes 6am UTC. Buscador: `inferRelevantCategorySlugs` deriva categoría por keyword.

## 2026-05-28 — Matriz OWASP Top 10
- Se adopta `docs/seguridad-owasp-top-10.md` como matriz viva de seguridad basada en OWASP
  Top 10:2025, con nota separada para SSRF por compatibilidad/riesgo OWASP 2021.

## 2026-05-27 — Hardening de seguridad pro
- Admin ya no confía en `user_metadata`; en prod exige `ADMIN_EMAILS` + rol en `app_metadata`.
- Rate limit de auth/API falla cerrado en producción si falta Upstash; redirects/fetch/imports
  validan hosts permitidos; `/api/out` deja de redirigir a destinos no allowlisteados.
- `next` sube a 16.2.6 con overrides para transitive vulnerables; `npm audit` queda en 0.
- Nueva migración `20260527120000_harden_rls` habilita RLS global deny-all para tablas de app.

## 2026-05-27 — Refuerzo puntual Fase 1
- `auto-densify --apply --max-groups=80` persistió 4 grupos seguros / 13 ofertas y llevó
  comparableRate **43% → 44%** (163/374). Se bloquearon 5 sospechosos por dispersión.

## 2026-05-27 — `/api-docs` deja de ser referencia pública con código
- La página pública de API se orienta a negocio/operación: valor, datos disponibles, casos de
  uso y alta. La referencia técnica con ejemplos se entrega junto con la API key.

## 2026-05-27 — Google Analytics gateado por consentimiento
- Se instala GA4 (`G-95LPD91C5Y`, override por `NEXT_PUBLIC_GA_ID`) vía `next/script`
  `afterInteractive` en `components/analytics/GoogleAnalytics.tsx`, montado en el layout.
- Solo carga si el usuario aceptó analytics: usa `useSyncExternalStore` sobre `consent.ts`
  (lee la cookie `pr_cookie_consent` y reacciona a `CONSENT_EVENT` sin recargar).
- `CookieBanner` dejó su copia local de consent y ahora usa el helper compartido (así dispara
  el evento al guardar). CSP de `next.config.ts` habilita `googletagmanager.com` (script-src) y
  `*.google-analytics.com` / `*.analytics.google.com` (connect-src).

## 2026-05-27 — Cuarta tanda de densificación (ampliación de queries)
- Se ampliaron las `SEARCH_QUERIES` de `auto-densify.ts` (16 → 28) con familias electro/TV de
  alto solape aún sin cubrir (LG/Whirlpool en microondas/lavarropas/heladeras, Hisense/RCA en TV,
  freezers, cocinas, termotanques, anafes, lavavajillas, aires BGH).
- `auto-densify --apply --max-groups=120`: 34 grupos seguros / 100 ofertas, 8 sospechosos
  bloqueados (cocinas Domec con feed roto Carrefour + 2 lavarropas Samsung). comparableRate
  **39% → 43%** (159/367), auditoría limpia.

## 2026-05-26 — Revisión read-only de sospechosos Fase 1
- `scripts/auto-densify.ts --suspects-only` enfoca la salida en grupos bloqueados por dispersión
  y fuerza modo read-only para revisar Fase 1 sin riesgo de persistir ofertas.

## 2026-05-26 — Página pública "Cómo funciona"
- `/como-funciona` queda como explicación pública simple; `/como-funcionamos` redirige ahí para
  no mantener visible la versión técnica anterior.

## 2026-05-25 — Automatización pre-Fase 3
- No se automatiza `auto-densify --apply` dentro de Vercel Cron porque tarda ~150s y puede
  exceder límites; queda manual/operativo.
- Sí se automatiza el semáforo de madurez: `/api/internal/data-radar` persiste readiness diario
  en `SystemHealthLog`, `/api/internal/phase-readiness` lo recalcula bajo `CRON_SECRET` y
  `/admin/monitor` lo muestra.

## 2026-05-25 — Tercera tanda de densificación VTEX
- Se amplió `scripts/seed-catalog.ts` con modelos electro/TV de alto solape detectados en VTEX.
- El apply final se hizo con `auto-densify --apply --max-groups=80`: 19 grupos seguros / 57
  ofertas persistidas, 2 grupos bloqueados por dispersión, comparableRate **35% → 39%**
  (127/328), auditoría limpia.

## 2026-05-25 — SEO long-tail por marca/categoría
- Se agrega `/categoria/[slug]/marca/[brandSlug]` como faceta indexable mínima sobre dataset real.
- Solo entra al sitemap si hay 2+ productos o al menos 1 comparable; categorías y productos
  enlazan internamente a esas páginas para distribuir autoridad hacia TVs/electro con solape.

## 2026-05-24 — Tendencia total del radar en admin
- `/admin/monitor` muestra un gráfico interno del scope `total` con índice y beta lag 0 usando
  snapshots guardados; la tabla histórica sigue limitada para lectura operativa.

## 2026-05-24 — Radar BNA queda interno hasta madurar
- `scripts/run-data-radar.ts` y `/admin/monitor` cruzan el índice con dólar Banco Nación venta
  para operación diaria, pero la señal queda marcada como interna/no pública hasta tener 30+
  días de `PriceHistory`.
- `/api/internal/data-radar` corre como cron diario protegido y guarda snapshots idempotentes en
  `DataRadarSnapshot`; la tabla conserva métricas consultables + payload JSON completo.
- `/admin/monitor` lee snapshots guardados como historial operativo; la tarjeta de radar en vivo
  sigue calculando el estado actual, pero la evolución se toma de DB.

## 2026-05-24 — Radar dólar pass-through reproducible
- El radar dólar v0 no descarga cotizaciones automáticamente: `measure-pass-through.ts` exige
  CSV `date,rate`. Motivo: la fuente de dólar debe quedar explícita y reproducible antes de
  mezclarla con el índice propio o usarla en B2B.
- Fuente base elegida: dólar Banco Nación venta, exportado con `fetch-bna-dollar.ts` desde el
  histórico oficial de BNA. Los días sin cotización se completan con carry-forward por defecto.

## 2026-05-24 — Índice público sigue bloqueado por madurez temporal
- `scripts/measure-price-index.ts` mide el índice por categoría. La cobertura ya es útil en
  celulares/TV/electro, pero la serie tiene solo 4-5 días; la página pública queda diferida hasta
  30+ días para no mostrar inflación engañosa.

## 2026-05-24 — SEO interno prioriza comparables
- En categorías, el schema `ItemList` expone `AggregateOffer` cuando un producto compara en
  varias tiendas. En producto, los similares salen de la categoría curada y se ordenan poniendo
  comparables primero.

## 2026-05-24 — Densificación automática con gate conservador
- `scripts/auto-densify.ts` reemplaza el ciclo manual de buscar modelos, aplicar, medir y
  auditar. El modo `--apply` persiste solo grupos nuevos no sospechosos; los de dispersión alta
  quedan bloqueados salvo `--include-suspects` explícito.
- Primer apply completo: comparableRate **34%** (92/271), con 1 grupo bloqueado por dispersión
  alta y auditoría DB limpia.

## 2026-05-24 — Taxonomía curada sin migración inmediata
- Para destrabar SEO por categoría e índice segmentado, las categorías crudas VTEX se
  normalizan en lectura/escritura con `normalizeCategorySlug(slug + nombre)`: las páginas e
  índice incluyen aliases existentes, pero los slugs ambiguos quedan crudos si el nombre no
  alcanza para clasificarlos. No se migra la DB todavía.

## 2026-05-22 — Reposicionamiento a capa de datos
- PrecioRadar se reposiciona de "comparador" a **capa de datos de precios** (índice de
  inflación). El activo es la serie `PriceHistory`. Ver [negocio](../contexto/negocio.md).
- **Primer producto: extensión de navegador estilo CamelCamelCamel para MercadoLibre.** La
  extensión resuelve el bloqueo de search (los usuarios aportan los item IDs; se leen por
  `/items/{id}`, API oficial).
- Dedicación **part-time (~10–20h/sem)**, una iniciativa principal a la vez. Empezar lean
  (Hobby), invertir en infra si hay tracción.

## 2026-05-22 — Push automático
- Tras cada commit, hacer `git push` sin preguntar (con `-u origin <branch>` la primera vez
  en una branch nueva).

## 2026-05-22 — Fase 0 cerrada
- Compactación de `PriceHistory` ahora preserva **mín/máx por bucket** (no solo el punto más
  antiguo); se confirmó que ya hacía roll-up perpetuo (no borra a 180d).
- Contadores del resumen admin filtran `isDemo:false`.
- Nuevo `verdictService.buildVerdictAndStats` (puro, reusable) + helper `getMinPrice`.
- Diferido a Fase 1 (con su consumidor): multiget, circuit breaker distribuido, dedupe,
  endpoint `/api/ext/item/[mlId]`.
- Branch `etapa-19-extension`, commits `f516be9` (mín/máx + plan) y `f46f32e` (Fase 0).

## 2026-05-22 — Organización del contexto IA
- `CLAUDE.md` pasa a índice corto; contexto en `docs/contexto/`, bitácoras en `docs/memory/`.
- Las 13 reglas viven solo en `AGENTS.md` (CLAUDE.md las trae con `@AGENTS.md`).

## Anteriores (referencias)
- Decisiones de seguridad diferidas: `docs/etapa-3-decisiones.md` (CSP, AuditLog, IP salt).
- Decisiones de compliance diferidas: `docs/etapa-4-decisiones.md` (borrado de cuenta,
  Ley 25.326).
- Etapas 0–18 cerradas; UGC, resto de IA y cobro congelados hasta pedido explícito.
