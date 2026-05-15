# PrecioRadar MVP QA y Deploy Checklist

Checklist operativo para cerrar el MVP antes de deploy o demo publica.

## Validacion local obligatoria

- `git status -sb` sin cambios inesperados.
- `npx.cmd prisma validate`
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build`
- Revisar que `next build` liste estas rutas: `/`, `/buscar`, `/producto/[slug]`, `/dashboard`, `/alertas`, `/admin`, `/admin/reportes`, `/api/out`, `/api/internal/evaluate-alerts`.

## Variables de entorno

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side si se usa en tareas internas.
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`
- `MERCADOLIBRE_ACCESS_TOKEN` si corresponde.
- `MERCADOLIBRE_SITE_ID=MLA`

## QA manual publico

- Home carga y el buscador queda visible en mobile y desktop.
- Busqueda por texto soportado, por ejemplo `Samsung A55`, muestra resultados y etiqueta `Demo` solo cuando corresponde.
- Busqueda por link MercadoLibre resuelve item real cuando el link incluye item id compatible.
- Categorias fuera del MVP muestran mensaje claro de proxima disponibilidad.
- Detalle de producto muestra ofertas, historial, recomendacion, seguimiento, alerta y reporte.
- Boton `Ver oferta` redirige por `/api/out` en datos demo y llega a la tienda.
- Si no hay DB configurada, `/api/out` igual redirige al link original.

## QA manual autenticado

- Login y registro funcionan con Supabase configurado.
- Usuario normal puede seguir hasta 2 ofertas.
- Usuario normal puede crear, pausar, reactivar y eliminar alertas.
- Dashboard muestra ofertas seguidas, alertas y notificaciones.
- Reporte de problema se crea desde detalle de producto.
- Usuario sin rol admin no entra a `/admin`.
- Usuario admin entra a `/admin`, ve contadores, reportes y errores de providers.
- `/admin/reportes?status=OPEN` preserva query en redirect de auth.

## QA de datos internos

- `SearchLog` se crea al buscar, sin romper la busqueda si la DB falla.
- `ClickTracking` se crea al hacer click en ofertas persistidas.
- `ClickTracking.isAffiliate` queda en `true` solo si la tienda tiene afiliados habilitados y existe URL afiliada.
- `ProviderLog` registra fallas de MercadoLibre y no registra ruido por cada exito.
- El admin muestra errores de provider con estado distinto de `ok`, `ready` o `success`.

## Deploy

- Confirmar que `master` local esta limpio.
- Subir commits: `git push origin master`.
- Configurar variables en Vercel antes del primer deploy.
- En Supabase, configurar URLs de redirect para login y registro del dominio final.
- Sincronizar schema solo si corresponde: `npx.cmd prisma db push`.
- Ejecutar seed solo en entornos demo o staging: `npm.cmd run db:seed`.
- Configurar cron externo para `/api/internal/evaluate-alerts` con `Authorization: Bearer <CRON_SECRET>`.
- Hacer smoke test post deploy: `/`, `/buscar?q=Samsung%20A55`, `/login`, `/dashboard`, `/admin`.

## No incluido en MVP

- Cuotas y envio.
- WhatsApp o Telegram.
- Prediccion con IA.
- Providers reales fuera de MercadoLibre.
- App mobile nativa.
- Extension de navegador.
