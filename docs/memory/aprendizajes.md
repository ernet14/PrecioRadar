# Aprendizajes

> Cosas no obvias aprendidas trabajando en el proyecto, para no re-descubrirlas.

## MercadoLibre
- **`/sites/MLA/search` da 403 a nivel plataforma**, no por código ni scope: probado sin
  token, con token de usuario y con `client_credentials`. No hay cambio de código que lo
  destrabe; hay que pedir habilitación a MeLi. Detalle y texto del pedido en
  `docs/mercadolibre-permiso-busqueda.md`.
- **`/items/{id}` de terceros está BLOQUEADO en prod** (`403 access_denied` / PolicyAgent),
  aun con el token de USUARIO. Verificado 2026-05-22 con ítem vivo `MLA1502732935`. Es el
  MISMO muro que el search 403, no resoluble por código ni reconectando OAuth. Contradice el
  doc de 2026-05-20 (`/items` daba 200) — probablemente ML lo restringió o ese 200 era de un
  ítem propio del seller. **Implica que la premisa de la extensión (leer cualquier
  publicación por la API) NO se sostiene hoy.** `getMercadoLibreToken()` no tiene fallback a
  client_credentials: si hay token, es el de usuario (el token termina en el user_id de la
  cuenta). IDs de 8 dígitos (`MLA43534649`) dan `404 not_found` = ítems muertos.
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
