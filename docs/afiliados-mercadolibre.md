# Afiliados MercadoLibre — Guía de configuración MVP

## Arquitectura

El sistema usa **links afiliados completos por oferta**, generados manualmente desde el panel de MercadoLibre Afiliados. No hay un tag global — cada producto tiene su propio link de tracking.

Flujo en `/api/out`:
1. Si `Store.affiliateEnabled = true` y `ProductOffer.affiliateUrl` tiene un valor → redirige al link afiliado → registra `isAffiliate: true` en ClickTracking.
2. Si no hay link afiliado → redirige a `ProductOffer.productUrl` normal → `isAffiliate: false`.

## Activación paso a paso

### 1. Habilitar afiliados en la tienda MercadoLibre

En Supabase SQL Editor:
```sql
UPDATE "Store" SET "affiliateEnabled" = true WHERE "slug" = 'mercadolibre';
```

### 2. Generar links desde el panel de MercadoLibre Afiliados

1. Ir a [affiliates.mercadolibre.com.ar](https://affiliates.mercadolibre.com.ar) (o el panel de creadores)
2. Buscar el producto
3. Copiar el link de afiliado completo (contiene parámetros de tracking propios de MeLi)

El link generado tiene la forma:
```
https://www.mercadolibre.com.ar/...?item_id=MLA...&category_id=...&seller_id=...&client=affiliates&...
```

### 3. Guardar el link en la base de datos

En Supabase SQL Editor, actualizar la oferta correspondiente:
```sql
UPDATE "ProductOffer"
SET "affiliateUrl" = 'https://link-afiliado-completo-de-meli'
WHERE "externalId" = 'MLA123456789';
```

O buscar por productId:
```sql
UPDATE "ProductOffer"
SET "affiliateUrl" = 'https://link-afiliado-completo-de-meli'
WHERE "productId" = (SELECT id FROM "Product" WHERE slug = 'samsung-galaxy-a55-5g-256gb')
  AND "storeId" = (SELECT id FROM "Store" WHERE slug = 'mercadolibre');
```

### 4. Verificar

Hacer clic en un producto desde `/buscar` → la URL final debe ser el link afiliado. En ClickTracking debe aparecer `isAffiliate = true`.

Después de 24-48h el panel de MeLi Afiliados muestra los clicks atribuidos.

## Sobre MERCADOLIBRE_AFFILIATE_TAG

La variable `MERCADOLIBRE_AFFILIATE_TAG` existe en `.env.example` como fallback futuro (para cuando MeLi ofrezca un tag global). Por ahora **no se usa**: si no está seteada, no tiene efecto.

## Escalado futuro

Cuando MeLi habilite un tag global o cuando se usen redes como Awin/Impact para otras tiendas, el campo `AffiliateLink` en el schema de Prisma soporta links por tienda/producto sin cambios de arquitectura.
