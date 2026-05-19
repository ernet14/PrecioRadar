# PrecioRadar — Plan de Etapas Completo

## Documento de trabajo para implementación

**Solo-founder · Bajo presupuesto (USD 0–80/mes) · Stack: Next.js 16 + Prisma + Supabase + Resend + Vercel**

**Estado actual:** Readiness 35–45%. Un provider real (MercadoLibre), seis stubs vacíos, historial sintético, sin RLS, sin SEO, sin compliance legal.

**Fecha:** Mayo 2026

---

## Reglas de oro (aplican a todas las etapas)

1. Nunca mostrar una recomendación sin datos reales que la sostengan.
2. Cada provider stub apagado vale más que cualquier feature nueva.
3. El SEO long-tail es la única adquisición sostenible a bajo costo.
4. Afiliados MeLi >> AdSense en este nicho (estimado 10x por mil visitantes).
5. Antes de pelearle a Precialo en "cantidad de tiendas", ganar en honestidad y velocidad.
6. NO saltear etapas. NO abrir Etapa 11+ hasta cerrar Etapa 10.
7. Si una etapa se atrasa, congelar features y resolver. Mejor llegar tarde que llegar con bugs.

---

## Calendario de eventos comerciales AR 2026

- **Hot Sale:** 11–13 mayo 2026 + Hot Week 14–17 mayo
- **Día del Padre:** junio 2026
- **Día del Niño:** agosto 2026
- **CyberMonday:** 2–4 noviembre 2026 + Cyber Week 5–8 nov
- **Black Friday:** 27 noviembre 2026 + Black Week 28–29 nov
- **Navidad:** diciembre 2026

---

## ETAPA 0 — Verificación previa (sin tocar código)

**Objetivo:** Confirmar que el código no tiene 3 bombas latentes antes de cambiar nada.

**Versión:** v1 · **Esfuerzo:** S (1–2 días) · **Riesgo:** Bajo (solo lectura)

### Tareas

1. **Verificar OAuth MercadoLibre.** ¿El provider usa OAuth o la API pública que devuelve 403 desde abril 2025? Revisar `mercadoLibreProvider.ts` buscando Bearer token, client_id, client_secret.
2. **Verificar imports runtime Edge.** Correr `grep -r 'runtime.*edge' src/` — si devuelve algo, hay conflicto con `proxy.ts` que solo corre en Node.js runtime.
3. **Verificar estado RLS en Supabase.** Correr `SELECT relname, relrowsecurity FROM pg_class WHERE relkind='r' AND relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');` — si devuelve `false` en tablas con datos de usuarios, la DB está abierta.
4. **Auditoría de "deuda de honestidad".** Hacer un Google Doc con tres columnas: "lo que la home dice", "lo que el código hace", "delta legal". Evidencia de due diligence.
5. **Snapshot del estado actual con Wayback Machine.** Archivar en web.archive.org antes de borrar stubs/mocks. Prueba de evolución si después alguien cuestiona algo que ya cambiaste.
6. **Revisar Términos de la API de MeLi.** Cláusulas sobre cache de precios, uso comercial, branding obligatorio ("Ver en Mercado Libre").

### Quick wins

- `pnpm audit` + `pnpm outdated`
- `npx @next/codemod@latest upgrade`
- Habilitar 2FA en Vercel, Supabase, GitHub, MeLi developers
- `npx prisma validate`
- `npm run build`

### Validación

- `grep -r 'runtime.*edge' src/` no devuelve nada
- `grep 'Bearer' en mercadoLibreProvider.ts` aparece
- `SELECT rowsecurity FROM pg_tables` devuelve false en tablas privadas (confirma el problema)

### Commit

Sin commit (etapa de diagnóstico).

---

## ETAPA 1 — Apagar el riesgo de confianza (P0 CRÍTICO)

**Objetivo:** El sitio deja de mentirle al usuario. Stubs invisibles + historial sintético reemplazado por estado honesto.

**Versión:** v1 · **Esfuerzo:** M (3–5 días) · **Riesgo:** ALTO (la UI queda pelada hasta Etapa 5, es esperado y correcto)

### Tareas

1. **Ocultar los 6 providers stub del HTML renderizado.** Frávega, Musimundo, Cetrogar, Megatone, TiendaMia, Temu: invisibles en búsqueda, home, resultados, cards y cualquier texto. Grep de nombres stub no debe aparecer en HTML server-rendered.
2. **Reemplazar getMockPriceHistory por consulta real a PriceHistory.** Sin historial: mostrar "Recolectando datos — necesitamos más tiempo para mostrar evolución confiable". No mostrar gráficos falsos.
3. **Eliminar TODA recomendación basada en datos sintéticos.** "Excelente precio", "Buen precio", "Conviene esperar": desactivadas hasta Etapa 5 con ≥14 puntos reales.
4. **Banner "Beta abierta" arriba de todo.** "PrecioRadar está en beta. Actualmente comparamos precios reales de MercadoLibre. Sumamos más tiendas todas las semanas." Defensa legal directa contra art. 8 Ley 24.240.
5. **Renombrar stubs como "Próximamente" con teaser de email.** En vez de borrar páginas, convertirlas en landing con "Avisame cuando esté disponible" → captura email. No perdés SEO + armás lista de espera segmentada.
6. **Página "Cómo funcionamos" honesta.** `/como-funcionamos`: de dónde sacás los precios, con qué frecuencia se actualizan, cómo construís el historial.
7. **Cambiar copy de marketing.** "Comparamos 7 tiendas" → "Comparamos MercadoLibre y sumamos tiendas todas las semanas".

### Archivos probables

`mockStoreProducts.ts`, `searchService.ts`, `productService.ts`, `priceHistoryService.ts`, `recommendationService.ts`, `types/recommendation.ts`, `PriceHistoryChart.tsx`, `page.tsx` (home)

### Quick wins

- `noindex` en stubs vacíos
- Disclaimer en cada gráfico de historial vacío

### Validación

- Grep de nombres stub no aparece en `.next/server/app/`
- Para producto sin historial: muestra "Recolectando datos", no label de precio
- `npm run lint && npm run build`

### Commit sugerido

`chore: hide stub providers and replace synthetic price history with honest empty state`

---

## ETAPA 2 — OAuth MercadoLibre con auto-refresh

**Objetivo:** Asegurar que el único provider real funciona en producción post-restricción de API pública (abril 2025).

**Versión:** v1 · **Esfuerzo:** L (5–7 días) · **Riesgo:** ALTO (la app tiene que estar registrada en developers.mercadolibre.com.ar antes de esta etapa)

### Tareas

1. **Implementar OAuth flow completo.** Access_token expira a las 6h, refresh_token tiene un solo uso. Guardar ambos en Supabase con RLS.
2. **Auto-refresh defensivo.** Antes de cada llamada, chequear si quedan <10 min → refresh. Si falla, log a Sentry + email automático. No usar Vercel Env Vars para tokens rotativos.
3. **Cachear respuestas de MeLi en Supabase con TTL por endpoint.**
   - `/items/{id}`: TTL 4h
   - `/sites/MLA/search`: TTL 1h
   - `/categories/{id}`: TTL 24h
4. **Fallback con MeLi Public API (sin OAuth) para anónimos.** Endpoints públicos sin OAuth como respaldo. Más rate limit, menos features, pero baja dependencia.
5. **Loguear en ProviderLog.** Registrar errores, refreshes, latencia.
6. **Actualizar .env.example con variables necesarias.** `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET`, `MELI_REDIRECT_URI`.

### Ideas futuras (v2)

- **Multi-app pool para escalar.** Varias apps de developer en MeLi con credentials rotadas. Rate limit es por app, no por dominio.
- **Webhook listener para item updates.** MeLi soporta webhooks (`items_prices`, `stock-locations`). Reduce costo de Vercel functions y da updates real-time.

### Archivos probables

`mercadoLibreProvider.ts`, nuevo `src/lib/mercadolibre/oauth.ts`, `.env.example`, `providerLogService.ts`

### Validación

- `curl` manual al endpoint con token válido devuelve 200
- Forzar token expirado: refresh ocurre automáticamente
- ProviderLog registra errores y refreshes
- `npm run build`

### Commit sugerido

`feat(providers): implement OAuth flow with auto-refresh for MercadoLibre`

---

## ETAPA 3 — Seguridad mínima de datos (RLS + Zod + Headers)

**Objetivo:** El sitio deja de tener la base de datos abierta y los inputs sin validar.

**Versión:** v1 · **Esfuerzo:** M (3–5 días) · **Riesgo:** MEDIO (si una policy RLS queda mal escrita, un usuario logueado puede no ver sus propias alertas — probar con dos cuentas distintas)

### Tareas

1. **Habilitar RLS en TODAS las tablas Supabase + policy "deny all" base.**
   - `prices`: SELECT público; INSERT/UPDATE solo service_role
   - `users`, `alerts`, `favorites`: todas operaciones solo `auth.uid() = user_id`
   - `affiliate_clicks`: INSERT público (rate limited); SELECT solo service_role
2. **Migrar todos los Server Actions a validación Zod.** Input malformado devuelve error legible sin tocar DB.
3. **Sanitización HTML.** Pasar user content por DOMPurify server-side.
4. **Headers de seguridad en next.config.ts.** CSP estricto con nonces, HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy.
5. **Rate limit básico en endpoints sensibles.** Map en memoria por IP para `/api/auth/*`, `/api/alerts/*`, `/api/search`. Upstash viene en Etapa 7.
6. **Audit log inmutable.** Tabla `audit_logs` append-only que registre cambios de email, password, eliminación de cuenta, creación de alertas masivas. Te salva en denuncia AAIP.
7. **Secret rotation policy.** Documento privado: cada cuánto rotás MELI_CLIENT_SECRET, SUPABASE_SERVICE_ROLE, RESEND_API_KEY. Mínimo cada 6 meses.
8. **Validar SSRF en getProductByUrl.** Allowlist de dominios.
9. **Agregar crypto.timingSafeEqual al CRON_SECRET.**

### Quick wins

- Vercel Firewall (gratis Hobby)
- Network restrictions en Supabase
- Dependabot habilitado

### Archivos probables

Supabase migrations (SQL), nuevo `src/lib/validation/` con schemas Zod, todos los `app/**/actions.ts`, `next.config.ts`, `package.json` (+zod)

### Validación

- Usuario A no lee alertas de usuario B via anon key
- Input malformado en Server Action devuelve error legible
- securityheaders.com da grado A o mejor
- `npm run lint && npm run build && npm test`

### Commit sugerido

`feat(security): enable RLS, validate inputs with Zod, set strict security headers`

---

## ETAPA 4 — Compliance legal (Ley 25.326 + Cookies + Textos)

**Objetivo:** No operar ilegalmente.

**Versión:** v1 · **Esfuerzo:** M (3–5 días) · **Riesgo:** BAJO técnicamente, ALTO si no se hace

### Tareas

1. **Inscripción en el Registro Nacional de Bases de Datos (RNBD) de la AAIP.** Ley 25.326 art. 21 obliga a toda persona que recolecte datos personales (no doméstico) a inscribir sus bases. Se hace por TAD (Trámites a Distancia) en argentina.gob.ar/aaip/datospersonales. Costo: $0. Inscribir: vos como Responsable + base "Usuarios PrecioRadar" + base "Suscriptores newsletter".
2. **Política de privacidad alineada a Disposición 60/2016.** Debe incluir:
   - Identidad del responsable (nombre, CUIT, domicilio)
   - Finalidad del tratamiento
   - Categoría de datos recolectados (email, queries, clicks, alertas)
   - Derechos ARCO con email de contacto real y plazo de respuesta (10 días corridos)
   - Transferencias internacionales: Vercel/Supabase/Resend en USA — necesitás cláusulas tipo o consentimiento expreso
   - Retención por categoría de dato
3. **Términos y condiciones con cláusula "comparador, no vendedor".** "PrecioRadar es una plataforma de comparación de información de precios. No comercializa productos ni servicios. La compra se realiza directamente con la tienda enlazada, quien es el único responsable."
4. **Banner de consentimiento de cookies con granularidad real.** 3 categorías: Esenciales (always on), Analytics (opt-in), Marketing (opt-in).
5. **Derecho de acceso ARCO automatizado.** Endpoint `/api/me/data-export` que descarga TODOS los datos del usuario en JSON.
6. **Botón "Eliminar mi cuenta" sin fricción.** Obligatorio bajo art. 16 Ley 25.326. Eliminación real en <48h con tombstone (soft delete).
7. **Doble opt-in para newsletter.** Email de confirmación obligatorio antes de marcar `subscribed=true`.
8. **DPA (Data Processing Agreement) con cada proveedor.** Descargar y firmar el DPA de Supabase, Vercel, Resend, Sentry. Archivarlos. La AAIP los pide en inspección.
9. **Disclaimer de no afiliación con tiendas.** Salvo cuando sea explícita (MeLi afiliados).

### Quick wins

- Footer con 3 URLs separadas: `/privacidad`, `/terminos`, `/cookies`
- `privacidad@precio-radar.com` operativo
- Logs de consentimiento con timestamp + IP hash

### Archivos probables

`app/privacidad/page.tsx`, `app/terminos/page.tsx`, nuevo `app/cookies/page.tsx`, nuevo `CookieBanner.tsx`, `app/layout.tsx`, `Footer.tsx`

### Validación

- Primera visita incógnita muestra banner
- Aceptar → cookie `pr_cookie_consent=accepted`
- Rechazar → script analytics no carga
- Tres páginas legales con contenido completo
- `npm run lint && npm run build`

### Commit sugerido

`feat(legal): privacy policy, terms, cookies page and consent banner (Ley 25.326)`

---

## ETAPA 5 — Historial real persistido (Cron + Tabla)

**Objetivo:** El sitio empieza a acumular datos reales. Sin esta etapa, la Etapa 1 deja la UI vacía indefinidamente.

**Versión:** v1 · **Esfuerzo:** L (5–7 días) · **Riesgo:** MEDIO (si el cron corre mal, llena la DB con basura; si corre poco, tarda 2 meses en tener historial útil)

### Tareas

1. **Subir Decimal(12,2) a Decimal(14,2) en schema.prisma.** En ProductOffer.price y PriceHistory.price. La inflación argentina lo exige.
2. **Crear tabla optimizada de historial.**
   - Campos: `id`, `product_id`, `provider`, `price NUMERIC(14,2)`, `currency CHAR(3)`, `in_stock BOOLEAN`, `captured_at TIMESTAMPTZ`, `source_url TEXT`
   - Índice compuesto: `(product_id, captured_at DESC)` — baja queries de gráfico de 2s a 30ms con 100K rows
3. **Índice compuesto faltante: ProductOffer(productId, storeId, isActive).** Para listar ofertas activas.
4. **Cron de refresh de precios cada 4h.** A las 0, 4, 8, 12, 16, 20 UTC con jitter aleatorio (Math.random() * 60000 ms). Vercel Cron Hobby = 2 crons gratis. Sobre top 500 productos.
5. **Compactación progresiva (downsampling).** Sin esto, Supabase free (500MB) explota en ~3 meses.
   - A los 30 días → 1 row/día (AVG/MIN/MAX)
   - A los 90 días → 1 row/semana
   - A 1 año → 1 row/mes
6. **Regla "≥14 puntos" como check en query.** Si no hay ≥14 puntos en 30 días, mostrar "Historial en construcción". Cubre frente a publicidad engañosa.
7. **Detección de outliers antes de persistir.** Si precio nuevo es >50% o <50% del último → flag "sospechoso". Evita que un bug del API de MeLi ensucie el historial.
8. **Recomendaciones solo con historial real.** El recommendationService.ts debe usar percentiles reales, no datos sintéticos.
9. **Tabla ScrapeJob/ProviderRun.** Log de cada corrida del cron para debuggear fallos silenciosos.
10. **Agregar SearchLog(createdAt) para purgas y dashboards.**
11. **Agregar deletedAt DateTime? (soft delete) en Product, Store, Category.** Para no destruir URLs SEO.

### Ideas futuras (v2)

- **Cloudflare Workers como alternativa al cron de Vercel.** CF Workers free tier: 100K invocaciones/día. Worker hace fetch a MeLi → POST a tu API `/api/ingest-price` con HMAC signature. Permite escalar a miles de productos sin tocar Vercel.
- **Versionado de productos.** Campo `canonical_product_id` para agrupar variantes (Galaxy A55 256GB vs 128GB).
- **Snapshot diario en Cloudflare R2.** Backup diario (10GB gratis, sin egress fees).

### Estrategia de crons (necesidades completas)

| Cron | Frecuencia | Acción |
|------|-----------|--------|
| Refresh de precios | Cada 4h | MeLi API → ProductOffer.price + PriceHistory |
| Evaluar alertas | Cada 30 min | Comparar vs target → email Resend si cumple |
| Limpieza | Diaria | SearchLog >90 días, ProviderLog >30 días |
| Rebuild sitemap | Semanal | Regenerar sitemap con productos nuevos |

**Nota:** Vercel Cron en plan free permite 2 jobs con frecuencia mínima diaria. Para los 4 crons hace falta plan Pro ($20/mes) o cron externo gratuito (cron-job.org, Upstash QStash free tier, Cloudflare Workers).

### Archivos probables

`schema.prisma`, nuevo `priceSnapshotService.ts`, nuevo `app/api/internal/refresh-prices/route.ts`, `vercel.json` o cron externo, `recommendationService.ts`

### Validación

- Tras 24h con cron c/4h: `SELECT COUNT(*) FROM PriceHistory WHERE isDemo=false >= 300`
- Tras 3–4 días: productos con ≥14 puntos muestran recomendaciones reales
- `npx prisma migrate dev --name decimal_14_2`
- `npx prisma generate && npm run build`

### Commit sugerido

`feat(history): real price snapshotting via cron and Decimal(14,2)`

---

## ETAPA 6 — SEO Foundational (Robots, Sitemap, Metadata, Structured Data)

**Objetivo:** Google puede encontrar e indexar las páginas. Sin esto, no hay adquisición orgánica.

**Versión:** v1 · **Esfuerzo:** M (3–5 días) · **Riesgo:** BAJO (aditivo, no rompe nada existente)

### Tareas

1. **app/robots.ts.** Bloquear `/dashboard`, `/admin`, `/api/internal/*`, `/api/out`. GET /robots.txt devuelve 200 con reglas correctas.
2. **app/sitemap.ts dinámico desde Prisma.** Con todas las URLs de producto y categoría activas. Regenerado semanal.
3. **Sitemap index para escalar a +50K URLs (v2).** `sitemap.xml` (índice) + `sitemap-products-1.xml`, etc.
4. **generateMetadata dinámico en /producto/[slug] y /categoria/[slug].** Title dinámico con precio mínimo + cantidad de tiendas. Cada producto tiene metadata único verificable.
5. **JSON-LD Product + AggregateOffer en página de producto.** `lowPrice`, `highPrice`, `offerCount`, `priceCurrency: 'ARS'`. Activa carrusel de precios en Google Search.
6. **JSON-LD BreadcrumbList en producto y categoría.** Rich Results Test detecta breadcrumb.
7. **Open Graph + Twitter cards dinámicas con OG image.** Generado por `opengraph-image.tsx` o `@vercel/og` (viral en WhatsApp).
8. **Canonical URL en cada producto.** Para evitar duplicados.
9. **hreflang AR.** `<link rel="alternate" hreflang="es-AR">`.
10. **Páginas "categoría" optimizadas para long-tail.** `/celulares-baratos/samsung`, `/notebooks-cuotas-sin-interes`. Cada una con su JSON-LD `CollectionPage`.
11. **Internal linking estratégico.** En cada producto: links a "más baratos en la categoría", "del mismo vendedor", "comparativas similares".
12. **Search Console + IndexNow configurados.** IndexNow notifica a Bing/Yandex al instante.

### Ideas futuras (v2)

- **Páginas comparativas "X vs Y".** `/comparar/galaxy-a55-vs-motorola-g84`. Patrón SmartPrix, GSMArena.
- **Schema.org PriceSpecification con validFrom/validThrough.** Para promos bancarias y cuotas.

### Quick wins

- Submit sitemap a Search Console + Bing Webmaster Tools
- Google Merchant Center
- Schema validator en CI

### Archivos probables

Nuevo `app/robots.ts`, nuevo `app/sitemap.ts`, `app/producto/[slug]/page.tsx` (generateMetadata + JSON-LD), nuevo `src/lib/seo/jsonLd.ts`, nuevo componente JsonLd, `app/producto/[slug]/opengraph-image.tsx`

### Validación

- GET /robots.txt y /sitemap.xml devuelven contenido válido
- Rich Results Test detecta Product + AggregateOffer + BreadcrumbList sin errores
- `npm run build`

### Commit sugerido

`feat(seo): robots, dynamic sitemap, dynamic metadata and JSON-LD structured data`

---

## ETAPA 7 — Robustez de Runtime (Rate Limiting, Loading/Error, Sentry, next/image)

**Objetivo:** El sitio resiste tráfico real y se puede debuggear cuando rompa.

**Versión:** v1 · **Esfuerzo:** L (5–7 días) · **Riesgo:** MEDIO (Sentry puede mandar PII si no se configura beforeSend para scrubbear emails; rate limit muy agresivo puede frenar al propio cron — whitelistear por CRON_SECRET)

### Tareas

1. **Rate limiting Upstash en /api/out, búsqueda, registro y Server Actions sensibles.** Upstash Redis free: 10K commands/día.
   - Anónimos: 60 req/min por IP
   - Logueados: 300 req/min
   - API key (futuro B2B): 1000 req/min
   - Test de estrés devuelve 429 al exceder (100 requests rápidos a /api/out → 429 a partir del 31)
2. **loading.tsx en rutas principales.** Con Suspense + skeleton que matchea layout final. Reduce CLS → mejor Core Web Vitals → mejor SEO. Skeleton visible en 3G.
3. **error.tsx en rutas principales.** Con CTA reintentar + auto-report a Sentry.
4. **Sentry free tier (5K errors/mes) client + server.** Con sourcemaps. Configurar `beforeSend` para filtrar PII (emails, queries con datos personales). Error de prueba aparece en Sentry en <30 segundos.
5. **Migrar TODAS las imágenes a next/image.** No negociable. Reemplazo masivo de `<img>` por `<Image>`. Configurar `remotePatterns` en `next.config.ts` para dominios de MeLi. Fallback visual si imagen falla. Lighthouse mobile score >85 en home y producto.
6. **Recharts cargar solo en página de producto con dynamic + ssr: false.** Para no bloquear LCP.
7. **Circuit breaker pattern para providers externos.** Si MeLi devuelve 5xx 5 veces seguidas, abrir circuito y servir datos cacheados con flag `stale=true`. Usuario ve "Precios actualizados hace 6h" en vez de error.
8. **Health check endpoint público `/api/health`.** JSON con estado de cada provider, último cron exitoso, conexión a DB. UptimeRobot lo monitorea (free, 50 monitors).
9. **Logging estructurado.** JSON con `level`, `route`, `user_id` (hasheado), `latency_ms`.
10. **Graceful degradation de la home.** Si trending falla, mostrar productos cacheados estáticos (ISR de 24h).
11. **Habilitar Turbopack.** Default en Next.js 16.

### Ideas futuras (v2)

- **Cloudflare como CDN de imágenes.** Vercel cobra por GB de transformación después de 1000 GB. Alternativas: Cloudflare Images ($5/mes/100K), ImageKit (free 20GB), Bunny CDN ($0.01–0.06/GB).

### Quick wins

- Vercel Analytics (free Hobby)
- `output: 'standalone'`
- Lighthouse CI con presupuestos LCP <2.5s, CLS <0.1

### Archivos probables

Nuevo `src/lib/ratelimit.ts`, `app/api/out/route.ts`, `app/buscar/page.tsx`, Server Actions, nuevos `loading.tsx` + `error.tsx` en todas las rutas, `sentry.*.config.ts`, reemplazo masivo de `<img>` por `<Image>`, `next.config.ts` (remotePatterns)

### Validación

- 100 requests rápidos a /api/out → 429 a partir del 31
- Error de prueba aparece en Sentry en <30s
- Lighthouse mobile ≥85, LCP <2.5s
- `npm run build`

### Commit sugerido

`feat(reliability): rate limiting, loading/error boundaries, Sentry and next/image migration`

---

## ETAPA 8 — Tests + CI

**Objetivo:** El próximo cambio no rompe login, registro, alertas o click out sin que nadie se entere.

**Versión:** v1 · **Esfuerzo:** M (3–5 días) · **Riesgo:** BAJO en código, ALTO si se descubre que algo no estaba funcionando (es bueno descubrirlo ahora)

### Tareas

1. **Pirámide de tests realista para solo-founder.**
   - ~60 tests unitarios Vitest (utilidades, parsers, validators)
   - ~10 tests integración (Server Actions con DB test)
   - 3 tests E2E Playwright críticos: signup, agregar alerta, ver historial
   - No buscar 100% coverage, buscar happy paths críticos
2. **Snapshot testing de respuestas de MeLi.** Fixtures de respuestas reales. Si MeLi cambia schema, tests fallan antes de producción.
3. **GitHub Actions con matriz de Node.** Test contra Node 20 y 22.
4. **Preview deploys con Vercel + branch protection.** Main protegido: no merge sin PR review.
5. **CI cache agresivo.** Cachear `node_modules`, `.next/cache`, Playwright browsers. CI de 8min a 2min.

### Ideas futuras (v2)

- **Visual regression con Playwright.** `page.screenshot()` en cada PR comparado con baseline.
- **Tests contra producción (smoke tests) cada hora.** GitHub Actions cron → `/api/health` + búsqueda real.
- **Mutation testing con Stryker (v3).** Solo con 100+ tests.

### Quick wins

- `pnpm typecheck` step separado
- Pre-commit hook con `lefthook` o `husky`
- Dependabot auto-merge para patches

### Archivos probables

`package.json` (+vitest, @playwright/test), `vitest.config.ts`, `tests/unit/`, `tests/e2e/` (5 flows), `.github/workflows/ci.yml`

### Validación

- `npm test`: todos los unit tests pasan
- `npm run test:e2e`: los 5 flows pasan
- PR de prueba en GitHub dispara el workflow y pasa todos los checks

### Commit sugerido

`test: vitest unit tests, playwright e2e for critical flows, github actions CI`

---

## ETAPA 9 — Contenido + Adquisición

**Objetivo:** Hay algo para indexar. Sin contenido, el sitemap es un cascarón.

**Versión:** v1 · **Esfuerzo:** L (7–10 días) · **Riesgo:** BAJO (es contenido, no infraestructura)

### Tareas

1. **5 guías pilares SEO publicadas e indexables.** 2.500–4.000 palabras, 8–12 imágenes, JSON-LD `Article`, internal linking a productos, CTA newsletter:
   - "Cómo identificar ofertas falsas en Hot Sale 2026"
   - "Calendario de promociones bancarias 2026: día por día"
   - "Comparativa Galaxy A55 vs Motorola G84: cuál conviene en cuotas"
   - "Cómo aprovechar CyberMonday sin caer en trampas"
   - "Programa de Afiliados Mercado Libre: guía paso a paso"
2. **Newsletter signup con doble opt-in.** Flow completo: email → confirmación → suscripción activa en DB. Resend free: 3K emails/mes alcanza para arrancar.
3. **Newsletter con cohort segmentado.** Listas: "Cazadores de ofertas" (semanal, top 10 bajadas), "Tecno fan" (cuando hay drop en tech), "Hot Sale tracker" (estacional).
4. **Tabla NewsletterSubscription en Prisma.** Con campos: email, confirmed, segments, subscribedAt, confirmedAt.
5. **Plantilla profesional de email (React Email + Resend).** Mail-Tester score ≥9/10.
6. **Cron evaluación alertas c/30min + cooldown.** Alerta cumplida dispara exactamente 1 email y no repite en cooldown.
7. **Página "Quiénes somos" honesta + LinkedIn del founder.** Para SEO local AR, mostrar persona real.
8. **Linkbait: "Termómetro de Hot Sale".** Página live durante Hot Sale mostrando: "X% de productos sin descuento real / Y% con descuento parcial / Z% con descuento genuino". Widget embebible para medios → backlinks.
9. **AnalyticsEvent table + helper track().** Admin panel muestra eventos del día.
10. **Decisión visual final entre las 3 propuestas del documento maestro.** Design system tokenizado, ningún color hard-coded fuera de Tailwind config.

### Quick wins

- Publicar las 5 guías ANTES de Hot Sale 2026 (deadline: 3 semanas antes del evento)
- Reddit monitoring: r/argentina, r/Argaming, r/merval para "comparar precios", "MercadoTrack no funciona"
- Twitter/X: cuenta que postee 1–3 ofertas verificadas/día con captura del historial real

### Archivos probables

Nuevo `app/guias/page.tsx`, `app/guias/[slug]/page.tsx`, `content/guias/*.md` (5 guías), componente `NewsletterSignup.tsx`, nueva tabla `NewsletterSubscription` en Prisma, Server Action `subscribeToNewsletter`

### Validación

- 5 guías indexables, sin errores en Rich Results Test, cada una con ≥5 internal links
- Form de newsletter captura email, envía confirmación y activa suscripción en DB
- `npm run build && npm run lint`

### Commit sugerido

`feat(content): 5 pillar guides, newsletter signup with double opt-in`

---

## ETAPA 10 — Monetización (Afiliados MeLi)

**Objetivo:** Convertir tráfico en ingresos. Solo se hace después de que la fiscalidad esté en orden (monotributo) y haya aprobación de MeLi.

**Versión:** v1 · **Esfuerzo:** M (3–5 días) · **Riesgo:** MEDIO (si se rompe el deeplink, los clicks no se atribuyen — probar manualmente cada formato antes de activar a escala)

### Tareas

1. **Inscripción al Programa de Afiliados MeLi Argentina.**
   - Lanzado oficialmente 13 de noviembre de 2025
   - Requisitos: mayor 18, cuenta MeLi activa + Mercado Pago, monotributista
   - Solo links de productos nuevos con vendedores reputación verde
   - Comisión hasta 15% según categoría en AR (hasta 24% regional en categorías específicas)
   - Atribución last-click + ventas indirectas
2. **Monotributo: categoría sugerida A.** Inscripción AFIP, 10 minutos. Tener listo antes de generar links.
3. **Deeplinks con tracking propio + UTM.** `/api/out/{product_id}?p=meli` → server loguea click → 302 al deeplink afiliado. Permite calcular CTR real.
4. **Disclosure visible de "link de afiliado".** Obligatorio bajo Resolución 446/2025 y art. 1101 CCyCN. "Algunos enlaces son de afiliado. Si comprás, ganamos una comisión sin costo extra para vos."
5. **Dashboard de conversión por producto/categoría.** Tabla `affiliate_clicks` + `affiliate_conversions`. CTR, conversion rate, EPC por categoría.
6. **Productos "anti-recomendados" como diferenciador.** Cuando un producto subió 30% en 30 días y MeLi lo promociona como "oferta", ponerle "⚠️ No es oferta real". Te puede costar la comisión de ese item pero te gana confianza para los próximos 100.
7. **Disclaimers en cards de producto y footer.** Badge claro "Link de afiliado" donde aplique.

### Ideas futuras (v2)

- **A/B test del placement de links.** Variación A: botón "Ver en MeLi" prominente. B: botón + "Ver historial primero". Medir LTV, no clicks.
- **TiendaMia como segundo programa.** Comisión 3–5%. Categorías USA específicos.

### Archivos probables

`clickTrackingService.ts` o `app/api/out/route.ts` (deeplink afiliado), `.env` (+MERCADOLIBRE_AFFILIATE_TAG), `Footer.tsx` (disclaimer), cards de producto (disclaimer inline)

### Validación

- Click en /api/out desde sesión limpia: URL final lleva parámetro de afiliado
- En panel MeLi (24–48h): clicks atribuidos
- Compra de prueba: aparece como conversión
- `npm run build`

### Commit sugerido

`feat(monetization): MercadoLibre affiliate deeplinks on outbound clicks`

---

## ETAPA 11 — Comparador de supermercados + canasta básica (v2)

**Objetivo:** Expandir a supermercados. 70% de los argentinos compra semanalmente en super. Mercado grande con poca competencia digital seria.

**Versión:** v2 (post-tracción) · **Esfuerzo:** L (2–3 semanas) · **Riesgo:** ALTO (supers bloquean scrapers)

### Prerrequisitos

- Etapas 0–10 cerradas
- Historial real estable al menos 30 días
- Al menos 500 MAU

### Tareas

1. **Scraping legal de Coto, Carrefour, Día, Jumbo, ChangoMás.** Catálogos públicos completos sin login requerido. Marco legal AR: no hay ley que prohíba scraping de datos públicos sin cláusula contractual. Stack: Playwright en Cloudflare Workers Paid Plan ($5/mes) con browser-rendering. Rotación de user agents.
2. **Comparador de canasta básica con shopping list compartible.** UX: armás lista de 30 productos típicos → ve cuánto sale en cada super → "esta semana te conviene Carrefour por $X". Compartible por WhatsApp con link único.
3. **Provider pattern reutilizable.** Cada super como un provider igual que MeLi, usando la misma arquitectura de adapters.
4. **Rate limiting del scraping.** Máximo 1 request/5s por dominio. Respetar robots.txt de cada super.
5. **Cache agresivo.** 1 update/día por producto alcanza para supers.

### Ideas futuras (v3)

- **Geolocalización: precios por sucursal.** Coto/Carrefour tienen precios distintos por sucursal.
- **Alerta "el producto X bajó 10% en tu super favorito".** Web Push API (gratis) + Resend backup.
- **Integración con Precios Claros API si la abren.** Datos oficiales del Estado.

### Mitigación de riesgos

- Proxies rotativos low-cost: Webshare/Decodo $5–20/mes
- Cache agresivo (1 update/día por producto alcanza)
- Fallback a revisión manual de apps móviles de cada super
- Headless browser pool con jitter entre requests
- Rotación de user agents y fingerprints

### Commit sugerido

`feat(providers): add supermarket scraping for Coto, Carrefour, Día`

---

## ETAPA 12 — Detector algorítmico de ofertas falsas (v2)

**Objetivo:** Mejor ángulo PR de PrecioRadar. Los medios AR repiten cada mayo y noviembre "cómo identificar ofertas falsas". Diferencial único.

**Versión:** v2 · **Esfuerzo:** M (3–5 días) · **Riesgo:** MEDIO (legal: datos verificables, derecho a réplica)

### Prerrequisitos

- Etapa 5 cerrada con historial real ≥60 días en productos populares
- ≥14 puntos de historial por producto

### Tareas

1. **Algoritmo base: precio actual vs P30, P60, P90.**
   - Precio actual ≤ 90% del promedio 60 días → ✅ "Oferta real"
   - Precio actual entre 90% y 100% del promedio → ⚠️ "Descuento menor"
   - Precio actual > 100% del promedio 60 días → 🚫 "Oferta inflada"
   - Historial insuficiente (menos de 14 puntos) → 🔹 "Sin datos suficientes"
2. **Detección de patrón "infla antes del evento".** Si en los 14 días previos al Hot Sale/CyberMonday el precio subió >15%, flag fuerte.
3. **Umbrales por categoría (configurables desde admin).**
   - Tech: >10%
   - Indumentaria: >25%
   - Electrodomésticos: >8%
   - Supermercado: >15%
4. **Etiquetas visuales en cada producto.** Badge con color y ícono.
5. **Reporte público "Termómetro Hot Sale 2026".** Página live con estadísticas agregadas. Linkbait masivo. Widget embebible para medios.
6. **Integración con alertas.** Cuando se detecta oferta inflada, puede disparar una alerta al usuario que sigue ese producto.

### Consideraciones legales

- Publicidad comparativa bajo art. 1101 CCyCN debe ser objetiva, comparable, no denigrante
- Solo datos verificables, derecho a réplica
- No denigrar vendedores individuales: hablar de precios y patrones, no de personas

### Ideas futuras (v3)

- **Histórico de "tramposos" público.** Ranking de vendedores que más inflan precios. OJO LEGAL: requiere proceso cuidadoso.

### Commit sugerido

`feat(detection): algorithmic fake discount detector with visual badges`

---

## ETAPA 13 — Calendario de promos bancarias + cuotas sin interés (v2)

**Objetivo:** Killer feature único de PrecioRadar. Nadie lo resuelve bien en AR. Combinatoria "precio + promo bancaria del día + cuotas + envío" es el nicho de diferenciación.

**Versión:** v2 · **Esfuerzo:** M (3–5 días) · **Riesgo:** BAJO técnico (mantenimiento mensual manual)

### Prerrequisitos

- Panel admin básico operativo
- Al menos 1 provider real con productos activos

### Tareas

1. **Base de datos curada de promos bancarias al inicio.** Actualización manual desde admin. Las promos cambian mensualmente. Estructura por entrada:
   - Entidad (banco/billetera)
   - Día(s) válido(s)
   - Tipo de descuento (%, reintegro, cuotas sin interés)
   - Porcentaje/monto
   - Categorías aplicables
   - Tope de reintegro
   - Tiendas aplicables (online, física, ambas)
   - Medio de pago requerido
   - Vigencia (desde/hasta)
   - Fuente (URL oficial)
2. **Entidades cubiertas inicialmente.** Bancos: Nación, Galicia, Macro, Santander, BBVA, ICBC, Comafi, Credicoop, Supervielle, Ciudad, Columbia, Bancor. Billeteras: Mercado Pago, Ualá, Personal Pay, Naranja X, MODO.
3. **Filtro en cada producto: "con qué banco te conviene hoy".** 3 precios efectivos top (precio - reintegro - intereses de cuotas) y cuál aplica HOY.
4. **Página `/promos-hoy` actualizada por cron diario.** SEO killer. "Promos bancarias martes" es búsqueda top.
5. **Push notif "hoy hay promo en tu producto seguido".** Web Push gratis. Combinación historial precio + calendario bancario = timing perfecto.

### Ideas futuras (v3)

- **Scraping de páginas oficiales de bancos.** Galicia.ar, Bbva.com.ar, Macro.com.ar. Frecuencia: 1x/día.
- **Crowdsourcing:** usuarios reportan promos nuevas o vencidas, con validación manual.
- **Monetización lateral: sponsored placement bancario.** Cuando haya tráfico, bancos pagan por aparecer "destacados". Disclosure obligatoria.

### Commit sugerido

`feat(promos): bank promotions calendar with daily filtering per product`

---

## ETAPA 14 — Diversificación de afiliados (v2)

**Objetivo:** Reducir dependencia de MercadoLibre como único programa de monetización.

**Versión:** v2 · **Esfuerzo:** M (3–5 días por programa) · **Riesgo:** MEDIO

### Prerrequisitos

- Etapa 10 cerrada con tracking funcional
- Monotributo activo
- Al menos 3 meses de historial de clicks/conversiones

### Programas a activar (orden de prioridad)

| Programa | Relevancia AR | Comisión estimada | Moneda |
|----------|--------------|-------------------|--------|
| Awin | Alta (Falabella, Sodimac, marcas internacionales) | 3–6% | EUR/USD |
| Amazon Afiliados (ES/MX) | Alta (compras del exterior) | 1–10% según categoría | USD |
| Impact | Media (marcas D2C modernas, Shein) | Variable | USD |
| CJ Affiliate | Media (Lenovo, GoDaddy) | Variable | USD |
| Rakuten Advertising | Media (marcas premium) | Variable | USD |
| Temu Affiliate | Alta (crecimiento AR 2025) | 5–30% | USD |
| Shein Affiliate | Alta (ropa y accesorios) | 10–20% | USD |

### Reglas que no cambian

- El mejor precio real siempre se muestra, tenga afiliado o no
- Nunca se prioriza una oferta por comisión sobre una más conveniente para el usuario
- El aviso de afiliados en footer y textos legales se mantiene en todos los programas
- Los links afiliados no deben agregar redirecciones confusas ni degradar la UX

### Tareas

1. **Alta en los programas.** Se puede gestionar en paralelo al desarrollo sin requerir cambios en el código.
2. **Arquitectura del AffiliateService.** Cada provider sabe si tiene un link de afiliado y cuál usar. La lógica está encapsulada en el provider, no en la UI.
3. **Click tracking multi-programa.** Atribuir correctamente a qué programa corresponde cada click.
4. **Ingresos en USD.** Cobro vía Payoneer o Wise. Factura tipo E de exportación de servicios.

### Commit sugerido

`feat(affiliates): multi-program affiliate support with per-provider tracking`

---

## ETAPA 15 — PWA installable + Web Push (postergar extensión Chrome)

**Objetivo:** App mobile sin pasar por App Store/Play Store. Extensión Chrome se posterga a v3.

**Versión:** v2 · **Esfuerzo:** M (3–5 días) · **Riesgo:** BAJO

### Prerrequisitos

- Etapa 7 cerrada (next/image, loading states)
- UX mobile estable

### Tareas

1. **PWA con manifest + service worker.** Next.js 16 + `@ducanh2912/next-pwa`. Instalable en iOS/Android sin App Store.
2. **Offline cache de productos seguidos.** Workbox + IndexedDB.
3. **Web Push notifications.** API nativa del navegador, costo $0. Aceptación en e-commerce AR: 8–15%. Mejor canal que email para alertas (CTR 10x).
4. **Compartir vía Web Share API.** Botón nativo "Compartir este precio" → WhatsApp, Telegram, Instagram.

### Ideas futuras (v3)

- **Extensión Chrome — solo cuando haya >10K MAU.** Patrón "Keepa light": solo inyecta gráfico de historial en MercadoLibre. NO TOCAR cookies de afiliación de nadie (lección Honey). Modelo: gratis + premium $3/mes.
- **Scanner código de barras mobile.** Web API BarcodeDetector para comparar precios en góndola.

### Commit sugerido

`feat(pwa): installable PWA with offline support and web push notifications`

---

## ETAPA 16 — Comunidad / UGC (v3)

**Objetivo:** Retención vía comunidad. Valor SEO masivo con reviews.

**Versión:** v3 · **Esfuerzo:** L (1–2 semanas) · **Riesgo:** MEDIO (moderación necesaria)

### Prerrequisitos

- Al menos 1.000 MAU
- Sistema de cuentas estable
- Moderación básica disponible

### Tareas

1. **"Reportá un precio mal" community-sourced.** Botón en cada producto. 3+ reportes → flag automático + revisión.
2. **Votos "¿esta oferta es real?" (👍👎).** Señal de sentimiento. Cuidado con manipulación.
3. **Comentarios moderados por producto.** Requiere cuenta + 7 días antigüedad. Moderación con OpenAI Moderation API (gratis).
4. **UGC reviews de productos.** Valor SEO con Schema.org `Review` que da Rich Snippets.
5. **Sistema de karma/reputación.** Anti-spam. Patrón Stack Overflow simplificado.

### Ideas futuras

- **Foros estilo Reddit por categoría.** "Tecno AR", "Supermercados". Complejo pero alto retention.

### Commit sugerido

`feat(community): user reports, votes, and moderated reviews with Schema.org`

---

## ETAPA 17 — Features con IA (v3)

**Objetivo:** Diferenciación tecnológica. Costo estimado: $5–30/mes con gpt-4o-mini.

**Versión:** v3 · **Esfuerzo:** variable por feature · **Riesgo:** MEDIO

### Prerrequisitos

- Catálogo >5.000 productos con historial
- Al menos 1.000 MAU

### Tareas

1. **Resumen automático de reviews de MeLi (M).** "Lo bueno: cámara, batería. Lo malo: pantalla, calor." OpenAI gpt-4o-mini ($0.15/1M tokens input). Costo: ~$5/mes para 1.000 productos.
2. **Búsqueda semántica "celular bueno con buena cámara hasta 500K" (L).** Embeddings de productos en Supabase pgvector (gratis). Lenguaje natural → similarity search + filtro precio.
3. **Detector de anomalías de precio con ML (L).** Isolation Forest sobre el historial.
4. **Recomendaciones personalizadas "porque seguiste X" (L).** Collaborative filtering simple (k-NN sobre alertas guardadas). Necesitás 1.000+ usuarios.
5. **Generación automática de descripciones SEO de productos (S).** Ayuda con duplicate content de Google.

### Ideas futuras

- **Chatbot conversacional propio.** Dataset propio, recomendaciones contextuales.

### Commit sugerido

`feat(ai): LLM-powered review summaries and semantic product search`

---

## ETAPA 18 — B2B SaaS / API pagada (v3)

**Objetivo:** La monetización seria de largo plazo. Sellers MeLi tienen presupuesto y dolor agudo.

**Versión:** v3 · **Esfuerzo:** L (3–4 semanas) · **Riesgo:** MEDIO

### Prerrequisitos

- Catálogo >10.000 productos con historial >6 meses
- Infraestructura estable (Etapas 7+8 cerradas)
- Al menos 3.000 MAU

### Tareas

1. **API pagada modelo Keepa-light.**
   - Tier 0 (gratis): 100 calls/día, historial 30 días
   - Tier 1 ($9/mes): 5K calls/día, historial 1 año, alertas ilimitadas
   - Tier 2 ($29/mes): 50K calls/día, historial completo, webhooks
2. **Dashboard para sellers MeLi: inteligencia de precio.** SaaS B2B. "Tu producto X está $5K arriba del promedio del top 10". Pricing: USD 19–49/mes. Mercado: +100K sellers profesionales MeLi en AR. Conversión 0.1% = 100 clientes = USD 2K–5K MRR.
3. **API para medios de prensa.** Infobae, La Nación, Clarín hacen notas de Hot Sale, inflación. API con datos agregados. Enterprise: $200–500/mes.
4. **Reporte mensual de pricing intelligence.** PDF para gerentes de e-commerce. USD 99/reporte o USD 49/mes suscripción.
5. **Cobro internacional.** Lemon Squeezy o Paddle como Merchant of Record. MercadoPago Subscriptions para AR retail.

### Ideas futuras

- **White-label para fintechs.** "Powered by PrecioRadar" embebido en apps de Naranja X, Ualá, Personal Pay. Revenue-share.
- **Programa propio "PrecioRadar Verified Partners".** Pymes AR que venden directo. Listing premium.

### Commit sugerido

`feat(b2b): tiered API with pricing intelligence dashboard for MeLi sellers`

---

## Resumen de costos estimados por fase

| Fase | Etapas | Costo mensual estimado |
|------|--------|----------------------|
| v1 base | 0–10 | USD 0–10 |
| v2 con supers y promos | 11–15 | USD 20–50 |
| v3 escalado | 16–18 | USD 50–80 |

---

## Resumen del roadmap temporal

| Trimestre | Período | Etapas | Foco |
|-----------|---------|--------|------|
| Q1 | Mayo–Julio 2026 | 0–5 | Lanzar honesto + historial real |
| Q2 | Agosto–Octubre 2026 | 6–10 | SEO + monetización + preparar CyberMonday |
| Q3 | Noviembre 2026–Enero 2027 | 11–13 | Supers + detector ofertas + promos bancarias |
| Q4 | Febrero–Abril 2027 | 14–15 | Diversificar afiliados + PWA |
| 2027 H2 | Mayo–Diciembre 2027 | 16–18 | Comunidad + IA + B2B SaaS |

---

## Decisiones clave

1. **NO abrir Etapa 11+ hasta cerrar Etapa 5.** Sin historial real (≥14 puntos por producto), todo lo demás es pintura.
2. **Sí agregar supers (Etapa 11) pero no antes de tener base sólida.**
3. **El detector de ofertas falsas (Etapa 12) es el mejor ángulo PR.**
4. **Calendario de promos bancarias (Etapa 13) es el killer feature único.**
5. **Extensión Chrome NO en v1.** Demasiado riesgo legal y mantenimiento post-Honey. PWA + Web Push primero.
6. **B2B SaaS para sellers MeLi (Etapa 18) es la monetización real de largo plazo,** no los afiliados.
7. **Manifesto público "El comparador honesto" desde día 1.** Post-Honey, el mercado lo pide.
