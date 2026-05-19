# ETAPA 6 — SEO foundational

Lo que entrega el código y lo que necesitás hacer manualmente para activar la adquisición orgánica.

## Lo que ya hace el código

| Componente | Archivo | Notas |
|---|---|---|
| `robots.txt` con disallow de áreas privadas | `src/app/robots.ts` | Disallow: /dashboard, /admin, /alertas, /auth, /api/internal/, /api/out, /login, /notificaciones, /registro, /tracked-products. Apunta al sitemap. |
| Sitemap dinámico | `src/app/sitemap.ts` | Home + buscar + guías + categorías + productos + páginas legales + /como-funcionamos. |
| `hreflang es-AR` + `x-default` | `src/app/layout.tsx` `metadata.alternates.languages` | Sin variantes regionales adicionales todavía. |
| Canonical URL por página | `generateMetadata` de cada ruta | Producto, categoría, legal, /como-funcionamos. |
| JSON-LD Product + AggregateOffer + Breadcrumb | `src/lib/seo/jsonLd.ts` | Incluye `description`, `sku`, `productID`, `priceValidUntil` 24h. |
| JSON-LD CollectionPage + Breadcrumb por categoría | `src/app/categoria/[slug]/page.tsx` | Lista hasta 10 productos en `hasPart`. |
| OG image dinámica por producto | `src/app/producto/[slug]/opengraph-image.tsx` | 1200×630 PNG generado con `next/og` ImageResponse. |
| Open Graph + Twitter cards | `metadata.openGraph` / `metadata.twitter` en cada page | locale es_AR. |
| Internal linking | Home → `/categoria/[slug]`, Producto → `/categoria/[slug]` cuando matchea | Sustituyó los `/buscar?q=…` que no aportaban a SEO. |

## Lo que tenés que hacer vos (manual, fuera de código)

### 1. Verificar el sitio en Google Search Console

1. Entrá a https://search.google.com/search-console/
2. Agregá una propiedad para `https://www.precio-radar.com` (Dominio o Prefijo de URL — preferí Dominio si manejás DNS).
3. Verificá la propiedad. Si elegiste Dominio, agregás un TXT en DNS. Si elegiste Prefijo de URL, subís un HTML o usás un meta tag (lo más rápido).
4. En `Sitemaps` cargá `https://www.precio-radar.com/sitemap.xml`. Esperá unas horas y revisá que Search Console lo procese sin errores.

### 2. Verificar el sitio en Bing Webmaster Tools

1. https://www.bing.com/webmasters → Add a site.
2. Importá la verificación desde Search Console (Bing lo permite si ya verificaste en Google).
3. Sumá el mismo `sitemap.xml`.

### 3. Configurar IndexNow (Bing/Yandex notificación instantánea)

IndexNow es un protocolo abierto que notifica a Bing/Yandex cada vez que cambia una URL. Para activarlo:

1. Generá una clave (8–128 caracteres alfanuméricos):

   ```powershell
   [Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16))
   ```

2. Subí un archivo público `https://www.precio-radar.com/<TU_CLAVE>.txt` cuyo contenido sea exactamente la misma clave. La forma más fácil en este repo es agregarlo en `public/<TU_CLAVE>.txt`.

3. Cuando tengamos una operación de cron de "rebuild sitemap", podemos ping a IndexNow. Para esta etapa basta con dejarlo configurado. El ping manual es:

   ```bash
   curl "https://api.indexnow.org/indexnow?url=https://www.precio-radar.com/&key=TU_CLAVE"
   ```

   Es opcional. Bing y Yandex también respetan el sitemap.

### 4. Rich Results Test

Una vez deployado a producción, validá:

- https://search.google.com/test/rich-results → pegá `https://www.precio-radar.com/producto/<slug>` → tiene que detectar `Product` + `AggregateOffer` (cuando haya más de una oferta) + `BreadcrumbList`.
- Repetir con una URL `/categoria/<slug>` → `CollectionPage` + `BreadcrumbList`.

Si Search Console marca el JSON-LD con warnings (`priceValidUntil` viejo, `seller` faltante, etc.), avisame y lo ajustamos.

### 5. Google Merchant Center (opcional, para Etapa 9+)

Solo cuando tengamos catálogo real y vendamos vía afiliados con tracking estable. No hace falta hoy.

## Mejoras diferidas (no entran en ETAPA 6)

- **Sitemap index para escalar a +50K URLs**: partir `sitemap.xml` en `sitemap-products-1.xml`, `sitemap-products-2.xml`, etc. Lo dejamos para cuando crucemos ~10k productos reales (post-ETAPA 11).
- **Comparativas "X vs Y"** (`/comparar/galaxy-a55-vs-motorola-g84`): patrón SmartPrix/GSMArena. Espera ETAPA 9 (contenido) y al menos 2 productos competitivos con datos reales.
- **`PriceSpecification` con `validFrom`/`validThrough`** para promos bancarias: hace sentido cuando ETAPA 13 (promos bancarias) genere datos diarios.
- **OG image para `/categoria/<slug>` y home**: hoy se reutiliza la image default. Cuando haya tracción suficiente conviene generar OG por categoría.
- **`generateMetadata` dinámico para `/buscar`** con el query del usuario: hoy es estático. Cuidar XSS si se mete user input en metadata.
