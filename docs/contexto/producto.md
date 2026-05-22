# Producto — PrecioRadar

Comparador de precios para Argentina, en transición hacia una **capa de datos de precios**
(ver [negocio](negocio.md)). Dominio canónico: `https://www.precio-radar.com` (con guion).

## Qué hace hoy

- **Comparación de precios** entre tiendas para un mismo producto, agrupando por
  código de barras (EAN/GTIN) > marca+modelo > nombre.
- **Búsqueda** por texto o pegando un link de producto. La búsqueda por texto se apoya en
  proveedores VTEX + fallback demo; la búsqueda de MercadoLibre por texto está **apagada**
  (403 de plataforma), pero el flujo por **link pegado** de MeLi sí trae precio real.
- **Historial de precios** por oferta (`PriceHistory`), con gráfico de 7/30/90 días.
- **Detector de ofertas falsas ("Termómetro")**: veredicto de 4 niveles
  (REAL / MINOR / INFLATED / NO_DATA) comparando el precio actual contra el promedio de
  60 días, con umbral por categoría y detección de inflado pre-evento comercial.
- **Alertas de precio**: por objetivo (`TARGET_PRICE`) o caída porcentual
  (`PERCENTAGE_DROP`). Canales: email (Resend), Web Push (VAPID) e in-app. Cooldown 24h,
  máx. 3 alertas activas en free.
- **Promos bancarias**: calendario de descuentos por banco/billetera, día y tienda;
  notificación a productos seguidos cuando hay promo aplicable hoy. Bot que desactiva
  promos vencidas. Parser de texto para precargar (sin scraping/IA).
- **Productos seguidos** (`TrackedProduct`) y **centro de notificaciones** in-app.
- **Reseñas y votos** de usuarios sobre productos.
- **Reportes de usuario** (link roto, precio incorrecto, match equivocado, oferta
  sospechosa) con panel de moderación en admin.
- **PWA** instalable + offline + Web Push.
- **Descripciones SEO** autogeneradas con IA (opt-in; degradación si no hay gateway).
- **API pública B2B** (`/api/v1`) con planes y rate limit (sin cobro implementado).
- **Panel admin** con pestañas: Resumen, Promos, Importar, Monitor en vivo, Estado,
  Reportes, API keys, Servicios.

## Usuarios

- **Hoy:** consumidores que comparan precios e historial, y un admin (solo-founder).
- **Hacia dónde:** consumidores vía **extensión de navegador** (CamelCamelCamel para ML) y,
  como producto-dato, clientes B2B del índice de precios (medios, research, finanzas).

## Estado honesto

El comparador funciona pero es commodity y depende de scraping frágil (VTEX) + el bloqueo
de búsqueda de ML. El activo diferencial real es la **serie histórica de precios** que se
acumula sola. Detalle de la estrategia en [negocio](negocio.md) y el plan en
[roadmap](roadmap.md).

> Referencias de detalle: `docs/etapa-6-seo.md`, `docs/admin-status.md`,
> `docs/etapa-12` (termómetro, en el roadmap maestro), `docs/Cloude Informe Profundo.md`
> (snapshot histórico, estado desactualizado).
