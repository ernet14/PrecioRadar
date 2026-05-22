# Aprendizajes

> Cosas no obvias aprendidas trabajando en el proyecto, para no re-descubrirlas.

## MercadoLibre
- **`/sites/MLA/search` da 403 a nivel plataforma**, no por código ni scope: probado sin
  token, con token de usuario y con `client_credentials`. No hay cambio de código que lo
  destrabe; hay que pedir habilitación a MeLi. Detalle y texto del pedido en
  `docs/mercadolibre-permiso-busqueda.md`.
- **`/items/{id}` y multiget sí traen precio** y son estables/legales. El flujo por link
  pegado no pasa por el gate y queda siempre activo.
- El search está apagado por `MERCADOLIBRE_SEARCH_ENABLED` (default off) para no meter
  latencia ni ruido de logs mientras no haya permiso.
- Afiliados ML hoy es **manual por oferta** (link completo desde el panel, guardado en
  `ProductOffer.affiliateUrl`). No escala. Ver `docs/afiliados-mercadolibre.md`.

## Datos / proveedores
- **Frávega bloquea las IPs de Vercel (403)** → marcado `blocked:true`.
- **`compactPriceHistory` ya hacía roll-up perpetuo** (día/semana/mes), no borraba a 180d.
  El problema real era que conservaba solo el punto más antiguo por bucket → se perdía el
  mínimo histórico. Ahora preserva mín/máx (clave para "precio más bajo de la historia").
- **El demo ya estaba casi aislado**: la mayoría de queries filtran `isDemo:false`. Solo los
  contadores del resumen admin lo mezclaban. `sitemap` y `categoria/[slug]` usan mock por
  diseño (MVP).
- El veredicto de oferta tiene **una sola fuente de verdad**: `detectDealQuality`. No
  duplicar esa lógica; componerla con `verdictService`.

## Infra / operación
- **Prisma:** nunca `migrate dev/reset` contra Supabase prod. SQL manual +
  `migrate resolve`.
- **Crons en Hobby** tienen límite de cantidad → algunos van por trigger externo.
- **Resend** estuvo en modo testing (verificar dominio para enviar a cualquier destinatario).
- **Circuit breaker** es in-memory por instancia → se resetea en cold start de Vercel (no
  hay estado distribuido). Riesgo bajo hoy; relevante bajo carga (Fase 1).
- **Dominio canónico:** `www.precio-radar.com` (con guion), no `precioradar.com.ar`.

## Next.js 16
- Es una versión con breaking changes respecto al training (ver `AGENTS.md`): leer la guía
  en `node_modules/next/dist/docs/` antes de escribir código de framework.
- CSP mantiene `'unsafe-inline'`/`'unsafe-eval'` por hidratación de RSC/Turbopack; sacarlo
  requiere pipeline de nonces (diferido, `docs/etapa-3-decisiones.md`).
