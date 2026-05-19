# /admin/status — Tablero operativo

Pagina interna para revisar de un vistazo el estado tecnico de PrecioRadar.

- Ruta: `/admin/status`
- Codigo: `src/app/admin/status/page.tsx`
- Acceso: solo usuarios con rol `ADMIN` en Supabase. Se valida con `requireAdmin()` (`src/lib/supabase/auth.ts`). Los usuarios sin permiso son redirigidos a `/login` o `/dashboard?error=admin`.
- Indexacion: la pagina hereda `robots: { index: false, follow: false }` del layout admin y vuelve a forzarlo en su propia `metadata`.

## Controles globales

- **Semaforo de salud** (4 chips arriba): DB, Sitemap, Errores ProviderLog (24h), Crons (edad del ultimo job completado). Niveles `ok` / `warn` / `error` / `unknown`.
- **Boton Refrescar** (client component `RefreshControls`): dispara `router.refresh()` y muestra "Actualizado hace Xs". No hay auto-poll.
- **Modo console** (`?ui=console`): alterna a fondo `slate-950` con titulo mono, para sentir terminal.
- **Filtro de rango** (`?range=1d|7d|14d|30d`, default `14d`): controla el grafico y los KPIs de actividad.

## Que muestra

1. **Base de datos** — ejecuta `SELECT 1` via Prisma (`prisma.$queryRaw`) para medir latencia y reportar si Postgres responde. Si `DATABASE_URL`/`DIRECT_URL` no estan configuradas, se reporta como "no configurada" sin exponer la URL.
2. **Sitemap** — hace un `GET` a `${getSiteUrl()}/sitemap.xml` con timeout de 5 s, sin cache, y cuenta entradas `<url>`. Reporta status HTTP, latencia y URLs detectadas.
3. **ScrapeJob recientes** — ultimos 10 jobs ordenados por `startedAt` desc. Columnas: `provider`, `action`, `status`, `processed`, `updated`, `errors`, `outliers`, `durationMs`, `startedAt`, `finishedAt`.
4. **ProviderLog relevantes** — ultimos 15 registros que cumplan alguna de estas condiciones:
   - `status` distinto de `ok`/`ready`/`success`, o
   - `action = "cron.outlierDetected"`.
   Muestra fecha, provider, action, status, tienda asociada, latencia y `errorMessage`.
5. **AuditLog recientes** — ultimos 10 eventos administrativos: fecha, `event`, `resource`, `resourceId`, `actorEmail`.
6. **Actividad reciente** — KPIs con sparkline + grafico de barras SVG de busquedas (`SearchLog`) y clicks (`ClickTracking`) por dia. El rango es configurable (1d / 7d / 14d / 30d). El `delta vs anterior` se calcula partiendo el rango por la mitad. Sirve como proxy de visitas mientras no haya tracker propio de page views.
7. **Cron jobs** — listado leido directamente de `vercel.json` (importado en build): path + schedule UTC + atajo a la consola de Vercel Crons.
8. **Links rapidos** — atajos a consolas externas, agrupados por area:
   - **Hosting y deploy**: Vercel Dashboard, Deployments, Logs, Cron jobs, Env vars.
   - **Base de datos y storage**: Supabase Projects, SQL Editor, Auth Users, Upstash Redis.
   - **DNS, dominio y red**: Cloudflare, sitemap publico, robots.txt publico.
   - **SEO e indexacion**: Google Search Console, Bing Webmaster Tools, Google Analytics, PageSpeed Insights.
   - **Monitoreo y errores**: UptimeRobot, Sentry Issues, Sentry Performance.
   - **Integraciones y email**: Resend Overview, Resend Emails, MercadoLibre Devcenter, MercadoLibre Afiliados.

Cada link muestra un **icono brand** servido por `cdn.simpleicons.org/<slug>` (el host esta whitelisteado en la CSP de `next.config.ts`). Los links sin slug (sitemap, robots) caen a un placeholder con la inicial.

Todos los enlaces apuntan a dashboards publicos. **No se exponen tokens, IDs de proyecto, ni variables de entorno** en la UI. Los links Supabase usan `project/_` para que cada admin caiga en su proyecto activo sin hardcodear IDs.

9. **Footer con info de deploy** — lee `VERCEL_ENV`, `VERCEL_GIT_COMMIT_REF`, `VERCEL_GIT_COMMIT_SHA` y `VERCEL_URL` (set automaticamente por Vercel). Muestra `env`, `branch` y commit corto (7 chars) con link al deploy correspondiente. En local muestra `dev`.

## Frescura de datos

La pagina se sirve en modo dinamico (`export const dynamic = "force-dynamic"`, `revalidate = 0`). Cada visita relee la base, hace el ping al sitemap y vuelve a mostrar los listados actualizados. No tiene cache de Next.

## Manejo de errores

Cada bloque tolera fallas independientes:

- Si Prisma no esta disponible, las tablas (ScrapeJob, ProviderLog, AuditLog) muestran un aviso amarillo y la card de base de datos queda en rojo.
- Si la peticion al sitemap falla o supera el timeout, se muestra el error capturado.
- Si una sola query del listado falla, esa tabla cae a estado "no disponible" sin tirar la pagina.

## Como extenderlo

- Para sumar nuevos checks, agregar otra funcion `check*` o `load*` en el archivo y llamarla dentro del `Promise.all` en `AdminStatusPage`.
- Para nuevos links rapidos, agregar entradas al grupo correspondiente en `externalLinkGroups` o sumar un grupo nuevo con `{ group, links: [...] }`.
- Para nuevos cron jobs, basta con agregarlos a `vercel.json`; la tabla los toma automaticamente.
- Para sumar metricas pesadas (p. ej. snapshots desde Supabase), considerar moverlas a un service en `src/services/` y cachear con `revalidate` corto en lugar de leer en cada request.
- Cuando se integre tracker propio de page views, reemplazar `loadActivity` por una consulta a esa tabla y mantener el componente `ActivityChart` reutilizable.

## Seguridad

- No imprime URLs de DB, claves API ni headers.
- No incluye links que requieran tokens en query string.
- Toda la informacion sensible queda dentro del backend (Prisma + Supabase). La pagina solo expone agregados y mensajes de error de alto nivel.
