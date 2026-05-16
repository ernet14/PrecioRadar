



PRECIORADAR
Revisión profunda de producto, técnica,
legal, negocio y plan de trabajo
Mayo 2026  ·  Solo-founder  ·  Bajo presupuesto


Generado con investigación profunda de código, mercado y marco legal argentino
 
1. Diagnóstico general
PrecioRadar hoy es una maqueta funcional muy bien pensada a nivel arquitectónico, pero todavía no es un comparador de precios real. Lo es solo de manera nominal.

	Readiness para producción pública: 35–45%
Suficiente para demo cerrada. No suficiente para abrir a Google, redes y tráfico público.

El problema central
Tiene un (1) provider real (MercadoLibre) y seis stubs vacíos (Frávega, Musimundo, Cetrogar, Megatone, TiendaMia, Temu) que devuelven [] / null. Los gráficos de historial salen de una función determinística sin persistencia.
El problema no es técnico: es de promesa al usuario. Una recomendación tipo 'excelente precio', 'buen precio' o 'conviene esperar' calculada sobre una serie sintética es potencialmente publicidad engañosa (art. 4 y 8, Ley 24.240).
Un badge 'Demo' no es suficiente cuando lo que se muestra al lado es un precio en pesos, una tienda con nombre y logo, y un botón 'Ir a la tienda'.

Brecha entre documento maestro y código real
Promesa del documento	Estado real en código
Comparador multi-tienda con historial	Búsqueda live MercadoLibre + series sintéticas
Alertas por email evaluadas por cron con cooldown	Endpoint /api/internal/evaluate-alerts listo, sin cron real ni Resend en prod
Click tracking y afiliados	Modelo Prisma existe; programa MeLi abierto en nov-2025, no integrado
robots.txt	El archivo NO existe
6 providers reales	6 stubs devuelven [] y null

 
2. Lo que está bien planteado
•	Separación providers/adapters: cuando llegue Frávega, la cirugía es local.
•	Modelo Prisma normalizado: Product separado de ProductOffer separado de PriceHistory con índice por offerId + recordedAt.
•	Evaluación de alertas con cooldown: evita spam de notificaciones.
•	Sistema de reportes con tipos broken_link, incorrect_price, etc.: imprescindible para escalar con bajo costo de moderación.
•	Panel admin básico: UI para resolver reportes sin SQL directo.
•	Manejo de database_unavailable como degradación gradual.
•	Auth con Supabase + proxy.ts protegiendo /dashboard, /alertas, /admin. proxy.ts confirma migración al patrón Next.js 16.
•	CRON_SECRET con doble vía (Bearer y header custom): compatible con casi cualquier provider de cron.
•	ClickTracking, SearchLog, ProviderLog: instrumentación desde el día uno.

 
3. Lo que está flojo o incompleto
Área	Problema concreto	Impacto
Datos	6 de 7 providers son stubs; historial 100% sintético	BLOQUEANTE para confianza
SEO	Sin robots.ts, sitemap.ts, metadata dinámica	Sin tracción orgánica posible
SEO	Sin structured data Product/Offer/AggregateOffer	Pierde rich results en Google
Confianza	Recomendación de compra sobre serie sintética	Riesgo legal Ley 24.240
Tests	'No test runner is configured yet' en README	Refactor inseguro
Observabilidad	Sin Sentry, sin uptime monitor	Producción a ciegas
Rate limiting	/api/out y búsqueda sin throttling	Abuso trivial, costo de API
Imágenes	No usa next/image	LCP malo, CWV fallido
UX	Sin loading.tsx ni error.tsx	UI rota durante latencia
Legal	Sin consentimiento, política privacidad ni términos reales	Incumple Ley 25.326
Caching	Sin revalidate ni unstable_cache	Costo de DB y API innecesario

 
4. Riesgos
4.1 Técnicos
•	API pública MercadoLibre cambió en abril 2025: endpoint /sites/MLA/search ahora devuelve 403 sin OAuth. CRÍTICO.
•	Deuda por stubs: cada stub es una mentira contractual con el front.
•	Historial sintético: si se mezclan fuentes real+sintético, la confianza se destruye cuando un usuario observador detecta la inconsistencia.
•	Next.js 16 / proxy.ts solo corre en Node.js runtime, NO en Edge. Si hay imports Edge-only heredados, rompe en producción.
•	Cron real: Vercel Cron en plan free tiene límite de 2 jobs y frecuencia mínima diaria. Para evaluar alertas cada 30 min hace falta plan Pro o cron externo.
•	Sin pruebas E2E: cualquier cambio en proxy.ts puede romper login en producción sin que nadie se entere.

4.2 Legales en Argentina
	Ley 24.240 — Defensa del Consumidor
Art. 4: información cierta, clara y detallada. Art. 8: las precisiones de la publicidad se tienen por incluidas en el contrato. Mostrar precios y recomendaciones sobre datos mock viola ambos artículos.

	Ley 25.326 — Protección de Datos Personales
PrecioRadar recolecta email, queries (SearchLog), clicks (ClickTracking) y configuración de alertas = base de datos personales. Obligación de inscripción en RNBD de la AAIP vía TAD, consentimiento informado, política de privacidad, mecanismo ARCO.

•	Uso de logos y nombres de tiendas: admisible como uso descriptivo, pero requiere disclaimer de no afiliación salvo cuando sea explícita.
•	Programa de afiliados MeLi (lanzado nov-2025): solo para monotributistas, comisión hasta 15% según categoría, solo productos con reputación verde.

4.3 Comerciales — Competidores directos
Competidor	Fortaleza	Debilidad	Modelo
Precialo (+80 tiendas)	Cobertura amplia, historial	UX mejorable, sin diferenciación	Afiliados
Historial.com.ar	Excelente función central, citado en prensa	UI básica, sin recomendaciones	Afiliados
MercadoTrack	Foco extremo, historial denso c/2h	Solo MeLi	Afiliados
HardGamers / Comp-Hardware	+30 tiendas, profundidad hardware	Solo hardware	Afiliados/ads
CamelCamelCamel	Simple, gratuito, tradición	Solo Amazon, sin móvil	Afiliados + ads
Keepa	Datos profundos, API, extensión	Curva de aprendizaje, pago	Freemium

 
5. Mejoras prioritarias
5.a Imprescindibles antes de lanzar (P0)
1.	Historial real persistido aunque sea de UNA sola tienda. Cron cada 2–6 h → PriceHistory. Hasta entonces: 'Recolectando datos — vuelve en X días'.
2.	Eliminar TODA visibilidad de providers stub. Frávega, Musimundo, Cetrogar, Megatone, TiendaMia, Temu: invisibles hasta que estén reales.
3.	robots.ts y sitemap.ts en app/.
4.	generateMetadata dinámico en /producto/[slug] y /categoria/[slug].
5.	Política de privacidad y términos en español argentino con Ley 25.326, datos de contacto del responsable, derechos ARCO, AAIP.
6.	Banner de consentimiento de cookies.
7.	Rate limiting básico en /api/out, /api/search y Server Actions sensibles (Upstash).
8.	error.tsx y loading.tsx en rutas principales.
9.	Logging con Sentry free tier para errores client + server.
10.	RLS en todas las tablas Supabase public con policies auth.uid().
11.	Validación de inputs con Zod en todos los Server Actions.
12.	Headers de seguridad: CSP, X-Frame-Options DENY, nosniff, Referrer-Policy.

5.b Importantes pero pueden esperar (P1)
•	2–3 providers reales más (prioridad: Frávega feed, HardGamers, TiendaMia).
•	Páginas de categoría SEO con texto curado.
•	Blog/guías de compra estacionales.
•	Alertas por email con plantilla HTML profesional (React Email).
•	Tests automatizados E2E (Playwright) + unit (Vitest).
•	Decisión visual final entre las 3 propuestas del documento maestro.

5.c Ideas futuras (P2)
•	PWA installable con push notifications.
•	Extensión de browser (patrón Keepa/Honey para MeLi).
•	IA para detección de falsas ofertas Hot Sale.
•	Comparador entre modelos (Galaxy A55 vs Motorola G84).
•	Plan premium freemium (alertas ilimitadas, historial extendido, sin ads).
•	API pagada para sellers y revendedores (modelo Keepa-light).
•	B2B SaaS: inteligencia de precios para sellers MeLi.
 
6. Revisión de UX y pantallas
Home
Mejor patrón: hero corto + buscador prominente + carruseles de 'Top bajadas verificadas / Más buscados / Categorías' con datos reales. Referencia: Idealo + Precialo.
Búsqueda
Cards con foto 100x100, título a 2 líneas, precio grande, mejor tienda, mini-sparkline 30 días. Filtros laterales en desktop, drawer en mobile, sticky. Referente: Precialo (densidad) + CamelCamelCamel (austeridad).
Página de Producto
La página clave del SEO. Estructura ideal: nombre + imagen → bloque precio actual → tabla de tiendas → gráfico historial REAL → CTA alerta → JSON-LD → FAQ → similares. El botón 'Ir a la tienda' debe ser lo más prominente de la página.
Dashboard
Estado vacío de primer login: debe ofrecer crear la primera alerta con un producto sugerido. Métricas reales: alertas activas, productos vistos, notificaciones pendientes.
Badge Demo vs precio real
	OPINIÓN FUERTE
Eliminar coexistencia de 'Demo' con precio formateado y recomendación. Hasta que haya datos reales: no mostrar el producto. Punto.
Comparación con referentes
Herramienta	UX fuerte	UX débil
Idealo (Europa)	Mobile-first, velocidad, claridad	No opera en AR
CamelCamelCamel	Simplicidad extrema, gráfico arriba	Solo para usuarios técnicos
Keepa	Densidad de datos, extensión	Intimida al comprador casual
Honey	Flujo de extensión	Destruyó reputación en 6 meses por afiliados
Precialo AR	Cobertura amplia visible	UX genérica, lenta en mobile

 
7. Revisión SEO
	Estado actual: 2/10
Sin robots.txt, sitemap, structured data, metadata dinámica robusta ni internal linking estructurado.

Lo que falta implementar
•	app/sitemap.ts dinámico generado desde Prisma con todas las URLs de producto y categoría.
•	app/robots.ts que bloquee /dashboard, /admin, /api/internal/*, /api/out.
•	JSON-LD por producto: Product + AggregateOffer (lowPrice, highPrice, offerCount, priceCurrency: 'ARS') + BreadcrumbList.
•	Open Graph + Twitter cards dinámicas con OG image generada por opengraph-image.tsx.
•	Canonical URL en cada producto para evitar duplicados.

Estrategia de contenido SEO
Es la palanca principal de crecimiento con bajo presupuesto. Costo marginal por página: cero después de la infra.
•	Páginas pilares por categoría: 'Mejores notebooks para estudiar 2026 en Argentina'.
•	Long-tail por modelo: 'precio Samsung Galaxy A55 Argentina', 'Galaxy A55 cuotas sin interés'.
•	Guías estacionales: una guía sobre Hot Sale publicada en abril puede traer tráfico que se convierte en alertas en mayo.

Core Web Vitals
•	Migrar TODAS las imágenes a next/image. No negociable.
•	Recharts cargar solo en página de producto con dynamic + ssr: false.
•	Habilitar Turbopack (default en Next.js 16).

 
8. Revisión técnica del stack
Next.js 16 y proxy.ts
	Breaking change crítico
proxy.ts corre SOLO en Node.js runtime, NO en Edge. Si hay imports Edge-only, rompe en prod. La auth real debe estar en el data layer, no solo en proxy.ts.

•	params y searchParams son async en Next.js 16: acceso sincrónico falla en build.
•	next/image cambió defaults de calidad y formatos en v16.
•	Turbopack: si alguna lib usa configs de Webpack en next.config, portarlas a turbopack.*.

Prisma + Supabase
•	Decimal(12,2) puede ser limitante con inflación argentina alta. Subir a Decimal(14,2).
•	Falta índice compuesto en ProductOffer (productId, storeId, isActive).
•	RLS en Supabase: sin políticas activas, el anon key permite leer toda la base.

Server Components vs Client Components
Probable over-use de Client Components donde Server alcanzaría. Recharts obliga a Client; el wrapper de página no debería serlo. Patrón: page.tsx como Server, dentro un <PriceChart data={...} /> como Client.

Gaps detectados
Gap	Impacto	Solución
Sin Suspense/streaming	Páginas cargan en blanco	Suspense boundary por sección
Sin loading.tsx / error.tsx	UI rota visible al usuario	Crear en todas las rutas principales
Sin bundle analysis	Bundle hinchado sin detectar	@next/bundle-analyzer en CI
Sin cache strategy	Costo innecesario de DB y API	revalidate por ruta, unstable_cache
Validación manual FormData	Injection posible en Server Actions	Migrar a Zod

 
9. Revisión de base de datos y modelos Prisma
Bien resuelto
•	Normalización clara: Product ↔ ProductOffer ↔ PriceHistory.
•	PriceHistory (offerId, recordedAt) indexado correctamente.

Tablas que faltan
Tabla nueva	Propósito
NewsletterSubscription	Captar emails sin requerir cuenta (CTA Hot Sale)
ScrapeJob / ProviderRun	Log de cada corrida del cron para debuggear fallos silenciosos
AnalyticsEvent (genérica)	Tracking de eventos UI sin depender de Google Analytics

Ajustes en schema existente
•	Subir Decimal(12,2) a Decimal(14,2) en ProductOffer.price y PriceHistory.price.
•	Agregar deletedAt DateTime? (soft delete) en Product, Store, Category para no destruir URLs SEO.
•	Índice compuesto faltante: ProductOffer(productId, storeId) para listar ofertas activas.
•	SearchLog(createdAt) para purgas y dashboards.

Estrategia de crons
Cron	Frecuencia	Acción
Refresh de precios	Cada 4 h	MeLi API → ProductOffer.price + PriceHistory
Evaluar alertas	Cada 30 min	Comparar vs target → email Resend si cumple
Limpieza	Diaria	SearchLog >90 días, ProviderLog >30 días
Rebuild sitemap	Semanal	Regenerar sitemap con productos nuevos

Nota: Vercel Cron en plan free permite 2 jobs con frecuencia mínima diaria. Para los 4 crons hace falta plan Pro ($20/mes) o cron externo gratuito (cron-job.org, Upstash QStash free tier).
 
10. Revisión de seguridad y privacidad
Ítem	Estado	Acción
Service role key	✅ Server-only	Mantener
CRON_SECRET Bearer + header	✅ OK	Agregar crypto.timingSafeEqual
Supabase RLS	❌ No configurado	URGENTE: habilitar + policies
Validación FormData	❌ Manual	Migrar a Zod en todos los Server Actions
SSRF en getProductByUrl	⚠️ Riesgo latente	Validar allowlist de dominios
PII en SearchLog	⚠️ Queries sin TTL	Purgar >90 días, documentar
Consentimiento cookies	❌ No existe	Banner + opt-in analytics
Headers HTTP seguridad	❌ No configurados	CSP, X-Frame-Options, nosniff, etc.
Inscripción RNBD (AAIP)	❌ No iniciado	Trámite TAD antes de operar a escala

	Supabase RLS — riesgo alto
Sin Row Level Security habilitado, cualquier persona con el anon key puede hacer SELECT * en toda la base. Eso incluye emails, alertas y configuraciones de usuarios. Habilitar RLS con policies auth.uid() es la tarea de mayor impacto por menor esfuerzo.

Política mínima Ley 25.326 (obligatoria)
•	Identificación del responsable (nombre real o razón social).
•	Finalidad: comparación de precios, alertas, mejora del servicio.
•	Datos recolectados: email, hash de password, queries, clicks, alertas.
•	Cesiones: Supabase (USA), Resend (USA), Vercel (USA) — verificar adecuación.
•	Retención por categoría de dato.
•	Derechos ARCO con datos de contacto del responsable y plazo de respuesta.
•	Inscripción en RNBD de la AAIP antes de operar a escala.
 
11. Revisión de monetización
MercadoLibre Afiliados Argentina (vigente desde nov-2025)
•	Comisión hasta 15% según categoría (electrónica suele ser 3–6%; moda/belleza más alto). % exacto por categoría: no publicado, verificar en panel de afiliado.
•	Requisitos: +18 años, cuenta MeLi activa + Mercado Pago, monotributista (primera etapa).
•	Solo links de productos de vendedores con reputación verde.
•	Fuente: news.mercadolibre.com/programa-de-afiliados-y-creadores-mercado-libre-argentina-2025

Otras tiendas argentinas
	Gap de mercado
Frávega, Garbarino, Musimundo, Cetrogar, Megatone NO tienen programa de afiliados público propio en Argentina a la fecha (beckerle.com.ar). Es una queja histórica del ecosistema. Vía redes externas (Awin, Impact, Tradetracker) hay opciones limitadas.

Tabla de modelos de monetización
Modelo	Realismo LATAM solo-founder	Comentario
Afiliados MeLi	Alto	Único camino claro hoy en AR para electro/tech
Google AdSense	Medio	RPM LATAM bajo (USD 1–5 /mil PV en tech)
Premium freemium	Medio-alto	Rentable cuando haya 5–10k usuarios activos
Newsletter pago revendedores	Medio	Mercado chico, valor alto por suscriptor
API pagada para sellers	Medio	Viable cuando haya catálogo + volumen (modelo Keepa)
Sponsored deals (con badge)	Medio	Requiere disclaimer claro por Ley 24.240
Display ads (blog)	Bajo	Solo en páginas que no compitan con CTA
Ebook / curso	Bajo	Buen lead magnet, mal producto principal

Costos de infraestructura (estimación)
•	Vercel: free → Pro USD 20/mes con tráfico real.
•	Supabase: free → Pro USD 25/mes (500 MB DB, 50k MAU).
•	Resend: free 3k emails/mes → USD 20/mes por 50k.
•	Sentry, Upstash Ratelimit: free tier alcanza para empezar.
•	TOTAL estimado mes 1–3: USD 0–25/mes. Con tráfico real: USD 60–80/mes.
 
12. Comparación con alternativas reales del mercado
Comparador	Foco	Fortaleza	Debilidad	Modelo
Precialo	+80 tiendas, multi-cat.	Cobertura amplia, historial	UX mejorable	Afiliados
Historial.com.ar	Evolución de precio	Citado en prensa, foco central	UI básica	Afiliados
MercadoTrack	MeLi c/2 h	Historial denso	Solo MeLi	Afiliados
HardGamers	Hardware AR	+30 tiendas, comunidad	Solo hardware	Afiliados/ads
Pricely/Preciosuper	Supermercados	Datos diarios	No tech	Mix
CamelCamelCamel	Amazon global	Simple, gratuito	Sin móvil	Afiliados+ads
Keepa	Amazon global	Profundidad, API, ext.	Pago	Freemium
Idealo	Europa multi-cat.	UX referencia	No opera en AR	Afiliados
Google Shopping	Global	Distribución masiva	Hostil al SEO orgánico	Ads

Diferenciación posible para PrecioRadar
•	Honestidad estructural: única plataforma AR que no muestra recomendaciones sin datos reales. Posicionamiento: 'preferimos decir no sabemos antes que mentirte'.
•	Mobile-first real: la UX de Precialo e Historial es aceptable pero genérica. Una experiencia con velocidad Vercel + diseño cuidado gana la primera impresión.
•	Cobertura curada: 10–15 tiendas creíbles para tech/electro/PC builder con profundidad real.
•	Contenido editorial: ningún comparador AR tiene un blog serio. Es un foso amplio.
 
13. Roadmap recomendado (3–6 meses, solo-founder)
Etapa	Período	Foco
A — Tapar agujeros críticos	Semanas 1–3	RLS, OAuth MeLi, robots/sitemap, legal, rate limiting, Sentry, next/image
B — Beta pública restringida	Semanas 4–9	Cron real, historial persistido, email alerts, onboarding, whitelist 50–200 users
C — SEO y contenido	Semanas 10–16	10 guías pilares, páginas de categoría, newsletter, Search Console
D — Monetización + 2do provider	Meses 4–6	Afiliados MeLi, 2do provider real, plan premium beta

Calendario de eventos clave (no perderse)
•	Hot Sale — Mayo: el evento más importante del año. Preparar contenido 3 semanas antes.
•	Día del Padre — Junio: oportunidad para categorías tech y electro.
•	Día del Niño — Agosto: juguetes, consolas, accesorios.
•	CyberMonday — Noviembre: segunda ventana más importante.
•	Black Friday + Navidad — Nov/Dic: tercera ventana. Preparar alertas masivas.
 
14. Estrategia de adquisición de usuarios
	La palanca principal con bajo presupuesto
El SEO long-tail es la única adquisición sostenible. Cada producto bien indexado con structured data y un párrafo único es un cebo permanente para queries de intención de compra.

Prioridades
13.	SEO long-tail: 'precio Samsung Galaxy A55 Argentina', 'RTX 4070 cuotas', 'notebook Lenovo IdeaPad i5'. Costo marginal: cero.
14.	Reddit y foros: r/argentina, r/Argaming, r/merval, PoolDevPC, comunidades Discord de PC builder. Estilo: aportar valor antes de promover.
15.	Twitter/X: cuenta que postee 1–3 ofertas verificadas/día con captura del historial real. Hilos durante Hot Sale y CyberMonday.
16.	Newsletter semanal: 1.000 suscriptores comprometidos > 10.000 visitas casuales.
17.	Colaboraciones con creadores tech AR (Topa Tech, Pisapapeles, canales de hardware).
18.	Product Hunt: bajo impacto en LATAM pero gratis y sirve para feedback.

Canal	Costo	Potencial	Urgencia
SEO long-tail	$0	Muy alto (compuesto)	Empezar YA
Reddit/Discord	$0	Medio	Empezar en beta
Twitter/X ofertas	$0	Medio-alto	Empezar en beta
Newsletter	$0–20/mes	Alto a largo plazo	Día de lanzamiento
Creadores tech	$0 (bartering)	Alto	Cuando haya v1 sólido
Google Ads	$50–200/mes	Bajo en este nicho	Solo cuando haya conversión probada
 
15. Ideas de monetización ampliadas
19.	Afiliados MeLi (base, ya detallado en sección 11).
20.	Premium freemium: Free (5 alertas, historial 30 días, ads), Pro (~ARS 3–5k/mes: alertas ilimitadas, historial completo, sin ads), Resellers (~ARS 15–30k/mes: API, lotes, dashboards).
21.	Newsletter pago para revendedores: 'top 20 productos con mayor caída esta semana', 'anomalías de stock'. Modelo Keepa-light.
22.	API pública pagada (modelo Keepa): tokens por minuto, planes mensuales. Solo viable con catálogo y volumen.
23.	Sponsored deals con badge clarísimo 'Patrocinado': una tienda paga para destacar. El badge debe ser tan visible como la oferta (Ley 24.240 art. 8).
24.	Display ads en blog y categorías, nunca en página de producto.
25.	'Inteligencia de precios' para sellers MeLi (B2B SaaS lateral): misma infra, producto separado.
26.	Reportes mensuales de tendencias por categoría vendidos a marcas/agencias.
27.	Afiliados de servicios bancarios/tarjetas con descuentos (Galicia, Macro, BBVA).
28.	Ebook/curso 'Cómo comprar online en Argentina sin que te estafen': USD 5–10, sirve como lead magnet.
 
16. Lista de tareas priorizadas para Claude Code / Codex
P0 — Bloqueantes de lanzamiento
ID	Tarea	Criterio de aceptación
T-001	Habilitar RLS + policies Supabase	Usuario A no puede leer alertas del usuario B via anon key
T-002	Crear app/robots.ts	GET /robots.txt devuelve 200 con reglas correctas
T-003	Crear app/sitemap.ts dinámico	Sitemap válido en sitemap.org/validator + Search Console
T-004	generateMetadata en /producto/[slug] y /categoria/[slug]	Cada producto tiene metadata único verificable
T-005	JSON-LD Product + AggregateOffer en página de producto	Rich Results Test de Google sin errores
T-006	JSON-LD BreadcrumbList en producto y categoría	Rich Results Test detecta breadcrumb
T-007	Apagar visibilidad de providers stub	Nombres de stubs no aparecen en HTML renderizado
T-008	Reemplazar getMockPriceHistory por consulta real	Sin historial: muestra 'Recolectando datos', no label de precio
T-009	Migrar validación Server Actions a Zod	Input malformado devuelve error legible sin tocar DB
T-010	Rate limiting Upstash en /api/out, búsqueda, registro	Test de estrés devuelve 429 al exceder
T-011	Headers de seguridad en next.config.ts	securityheaders.com da grado A o mejor
T-012	Política de privacidad + términos + banner cookies	Banner en primer visit; páginas legales completas
T-013	loading.tsx y error.tsx en rutas principales	Skeleton visible en 3G; error con CTA reintentar
T-014	Validar OAuth MercadoLibre (post-restricción abril 2025)	Token expirado se refresca solo, búsqueda sigue OK
T-015	Sentry client + server	Error de prueba aparece en Sentry en <30 segundos

P1 — Importantes para tracción
ID	Tarea	Criterio de aceptación
T-101	Cron de refresh de precios c/4h sobre top 500 productos	Tras 24h hay ≥6 puntos por offer en PriceHistory
T-102	Cron evaluación alertas c/30min + cooldown	Alerta cumplida dispara exactamente 1 email y no repite en cooldown
T-103	Template email profesional (React Email + Resend)	Mail-Tester score ≥9/10
T-104	Segundo provider real	≥100 ofertas reales del 2do provider en DB
T-105	5 guías pilares SEO	Cada guía indexable, sin errores Search Console, ≥5 internal links
T-106	AnalyticsEvent table + helper track()	Admin panel muestra eventos del día
T-107	Newsletter signup + doble opt-in	Flow completo entrega email confirmación que activa suscripción
T-108	Migrar todas las imágenes a next/image	Lighthouse mobile score >85 en home y producto
T-109	Decisión visual final + design system tokenizado	Ningún color hard-coded fuera de Tailwind config
T-110	Tests E2E Playwright para 5 flows críticos	CI corre tests en cada PR; todos pasan

P2 — Mejora continua
ID	Tarea	Criterio de aceptación
T-201	Afiliados MeLi integrado en /api/out	Conversión acreditada en panel de afiliados
T-202	Plan Premium con Stripe/MercadoPago	Usuario puede upgrade; límites se aplican correctamente
T-203	PWA installable	Chrome ofrece 'Instalar app' en mobile
T-204	Comparador entre modelos	Página /comparar?a=slug1&b=slug2 funcional
T-205	Extensión de browser	Extensión publicada en Chrome Web Store con ≥50 instalaciones
T-206	Inscripción RNBD AAIP (trámite)	Número de expediente AAIP obtenido
T-207	Modo claro/oscuro persistido	Preferencia guardada en localStorage/cookie
 
17. Plan de trabajo por etapas para implementar en código

ETAPA 0  —  VERIFICACIÓN PREVIA (SIN TOCAR CÓDIGO)
OBJETIVO	Confirmar que el código no tiene 3 bombas latentes antes de cambiar nada.
ARCHIVOS PROBABLES	mercadoLibreProvider.ts, proxy.ts, schema.prisma, package.json, Supabase dashboard
RIESGO	Bajo. Solo lectura.
CÓMO VALIDAR	grep -r 'runtime.*edge' src/ no devuelve nada. grep 'Bearer' en mercadoLibreProvider.ts aparece. SELECT rowsecurity FROM pg_tables devuelve false en tablas privadas.
COMMIT	—  (etapa de diagnóstico, sin commit)
NIVEL RIESGO	● BAJO
COMANDO	npx prisma validate
npm run build


ETAPA 1  —  APAGAR RIESGO DE CONFIANZA (P0 CRÍTICO)
OBJETIVO	El sitio deja de mentirle al usuario. Stubs invisibles + historial sintético reemplazado por estado honesto.
ARCHIVOS PROBABLES	mockStoreProducts.ts, searchService.ts, productService.ts, priceHistoryService.ts, recommendationService.ts, types/recommendation.ts, PriceHistoryChart.tsx, page.tsx (home)
RIESGO	MEDIO-ALTO. Esta etapa vacía la UI. Se va a ver pelado hasta la Etapa 5. Es esperado y correcto.
CÓMO VALIDAR	Grep de nombres stub no aparece en HTML server-rendered. Para producto sin historial: muestra 'Recolectando datos', no label de precio.
COMMIT	chore: hide stub providers and replace synthetic price history with honest empty state
NIVEL RIESGO	● ALTO
COMANDO	npm run lint
npm run build
grep -rn 'Frávega\|Musimundo\|Cetrogar' .next/server/app/


ETAPA 2  —  VALIDAR PROVIDER MERCADOLIBRE CON OAUTH REAL
OBJETIVO	Asegurar que el único provider real funciona en producción post-restricción de API pública (abril 2025).
ARCHIVOS PROBABLES	mercadoLibreProvider.ts, nuevo src/lib/mercadolibre/oauth.ts, .env.example, providerLogService.ts
RIESGO	ALTO si nunca se probó con tráfico real. La app tiene que estar registrada en developers.mercadolibre.com.ar antes de esta etapa.
CÓMO VALIDAR	curl manual al endpoint con token válido devuelve 200. Forzar token expirado: refresh ocurre automáticamente. ProviderLog registra errores y refreshes.
COMMIT	feat(providers): implement OAuth flow with auto-refresh for MercadoLibre
NIVEL RIESGO	● ALTO
COMANDO	npm run build
curl -H 'Authorization: Bearer $TOKEN' 'https://api.mercadolibre.com/sites/MLA/search?q=galaxy'


ETAPA 3  —  SEGURIDAD MÍNIMA DE DATOS (RLS + ZOD + HEADERS)
OBJETIVO	El sitio deja de tener la base de datos abierta y los inputs sin validar.
ARCHIVOS PROBABLES	Supabase migrations (SQL), nuevo src/lib/validation/ con schemas Zod, todos los app/**/actions.ts, next.config.ts, package.json (+zod)
RIESGO	MEDIO. Si una policy RLS queda mal escrita, un usuario logueado puede no ver sus propias alertas. Probar con dos cuentas distintas.
CÓMO VALIDAR	Usuario A no lee alertas de usuario B via anon key. Input malformado en Server Action devuelve error legible. securityheaders.com da grado A.
COMMIT	feat(security): enable RLS, validate inputs with Zod, set strict security headers
NIVEL RIESGO	● MEDIO
COMANDO	npm install zod
npm run lint
npm run build
npm test


ETAPA 4  —  COMPLIANCE LEGAL (LEY 25.326 + COOKIES + TEXTOS)
OBJETIVO	No operar ilegalmente.
ARCHIVOS PROBABLES	app/privacidad/page.tsx (reescribir), app/terminos/page.tsx (reescribir), nuevo app/cookies/page.tsx, nuevo CookieBanner.tsx, app/layout.tsx, Footer.tsx
RIESGO	BAJO técnicamente, ALTO si no se hace.
CÓMO VALIDAR	Primera visita incógnita muestra banner. Aceptar → cookie pr_cookie_consent=accepted. Rechazar → script analytics no carga. Tres páginas legales con contenido completo.
COMMIT	feat(legal): privacy policy, terms, cookies page and consent banner (Ley 25.326)
NIVEL RIESGO	● BAJO
COMANDO	npm run lint
npm run build


ETAPA 5  —  PERSISTIR HISTORIAL REAL (CRON + TABLA)
OBJETIVO	El sitio empieza a acumular datos reales. Sin esta etapa, la Etapa 1 deja la UI vacía indefinidamente.
ARCHIVOS PROBABLES	schema.prisma (Decimal 14,2), nuevo priceSnapshotService.ts, nuevo app/api/internal/refresh-prices/route.ts, vercel.json o cron externo, recommendationService.ts (percentiles reales)
RIESGO	MEDIO. Si el cron corre mal, llena la DB con basura. Si corre poco, tarda 2 meses en tener historial útil.
CÓMO VALIDAR	Tras 24h con cron c/4h: SELECT COUNT(*) FROM PriceHistory WHERE isDemo=false >= 300. Tras 3-4 días: productos con ≥14 puntos muestran recomendaciones reales.
COMMIT	feat(history): real price snapshotting via cron and Decimal(14,2)
NIVEL RIESGO	● MEDIO
COMANDO	npx prisma migrate dev --name decimal_14_2
npx prisma generate
npm run build
curl -X POST /api/internal/refresh-prices -H 'Authorization: Bearer $CRON_SECRET'


ETAPA 6  —  SEO FOUNDATIONAL (ROBOTS, SITEMAP, METADATA, STRUCTURED DATA)
OBJETIVO	Google puede encontrar e indexar las páginas. Sin esto, no hay adquisición orgánica.
ARCHIVOS PROBABLES	nuevo app/robots.ts, nuevo app/sitemap.ts, app/producto/[slug]/page.tsx (generateMetadata + JSON-LD), nuevo src/lib/seo/jsonLd.ts, nuevo componente JsonLd, app/producto/[slug]/opengraph-image.tsx
RIESGO	BAJO. Aditivo, no rompe nada existente.
CÓMO VALIDAR	GET /robots.txt y /sitemap.xml devuelven contenido válido. Rich Results Test detecta Product + AggregateOffer + BreadcrumbList sin errores.
COMMIT	feat(seo): robots, dynamic sitemap, dynamic metadata and JSON-LD structured data
NIVEL RIESGO	● BAJO
COMANDO	npm run build
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml | head -50


ETAPA 7  —  ROBUSTEZ DE RUNTIME (RATE LIMITING, LOADING/ERROR, SENTRY, NEXT/IMAGE)
OBJETIVO	El sitio resiste tráfico real y se puede debuggear cuando rompa.
ARCHIVOS PROBABLES	nuevo src/lib/ratelimit.ts, app/api/out/route.ts, app/buscar/page.tsx, Server Actions, nuevos loading.tsx + error.tsx en todas las rutas, sentry.*.config.ts, reemplazo masivo de <img> por <Image>, next.config.ts (remotePatterns)
RIESGO	MEDIO. Sentry puede mandar PII si no se configura beforeSend para scrubbear emails. Rate limit muy agresivo puede frenar al propio cron (whitelistear por CRON_SECRET).
CÓMO VALIDAR	100 requests rápidos a /api/out → 429 a partir del 31. Error de prueba aparece en Sentry en <30s. Lighthouse mobile ≥85, LCP <2.5s.
COMMIT	feat(reliability): rate limiting, loading/error boundaries, Sentry and next/image migration
NIVEL RIESGO	● MEDIO
COMANDO	npm install @upstash/ratelimit @upstash/redis @sentry/nextjs
npm run build
npx lighthouse https://[deploy]/ --form-factor=mobile


ETAPA 8  —  TESTS + CI
OBJETIVO	El próximo cambio no rompe login, registro, alertas o click out sin que nadie se entere.
ARCHIVOS PROBABLES	package.json (+vitest, @playwright/test), vitest.config.ts, tests/unit/, tests/e2e/ (5 flows), .github/workflows/ci.yml
RIESGO	BAJO en código, ALTO si se descubre que algo no estaba funcionando. Es bueno descubrirlo ahora.
CÓMO VALIDAR	npm test: todos los unit tests pasan. npm run test:e2e: los 5 flows pasan. PR de prueba en GitHub dispara el workflow y pasa todos los checks.
COMMIT	test: vitest unit tests, playwright e2e for critical flows, github actions CI
NIVEL RIESGO	● BAJO
COMANDO	npm install -D vitest @playwright/test
npx playwright install --with-deps chromium
npm test
npm run test:e2e


ETAPA 9  —  CONTENIDO + ADQUISICIÓN
OBJETIVO	Hay algo para indexar. Sin contenido, el sitemap es un cascarón.
ARCHIVOS PROBABLES	nuevo app/guias/page.tsx, app/guias/[slug]/page.tsx, content/guias/*.md (5 guías), componente NewsletterSignup.tsx, nueva tabla NewsletterSubscription en Prisma, Server Action subscribeToNewsletter
RIESGO	BAJO. Es contenido, no infraestructura.
CÓMO VALIDAR	5 guías indexables, sin errores en Rich Results Test, cada una con ≥5 internal links. Form de newsletter captura email, envía confirmación y activa suscripción en DB.
COMMIT	feat(content): 5 pillar guides, newsletter signup with double opt-in
NIVEL RIESGO	● BAJO
COMANDO	npm run build
npm run lint


ETAPA 10  —  MONETIZACIÓN (AFILIADOS MELI)
OBJETIVO	Convertir tráfico en ingresos. Solo se hace después de que la fiscalidad esté en orden (monotributo) y haya aprobación de MeLi.
ARCHIVOS PROBABLES	clickTrackingService.ts o app/api/out/route.ts (deeplink afiliado), .env (+MERCADOLIBRE_AFFILIATE_TAG), Footer.tsx (disclaimer), cards de producto (disclaimer inline)
RIESGO	MEDIO. Si se rompe el deeplink, los clicks no se atribuyen. Probar manualmente cada formato antes de activar a escala.
CÓMO VALIDAR	Click en /api/out desde sesión limpia: URL final lleva parámetro de afiliado. En panel MeLi (24-48h): clicks atribuidos. Compra de prueba: aparece como conversión.
COMMIT	feat(monetization): MercadoLibre affiliate deeplinks on outbound clicks
NIVEL RIESGO	● MEDIO
COMANDO	npm run build


 
Plan de acción de una página
PRECIORADAR — PLAN DE ACCIÓN INMEDIATO
Solo-founder  ·  Bajo presupuesto  ·  Foco: lanzar honesto

⚡ ESTA SEMANA — 5 cosas que mueven la aguja
☐  Apagar visibilidad de los 6 providers stub
☐  Reemplazar getMockPriceHistory por consulta real (o 'sin datos')
☐  Verificar que el provider MeLi usa OAuth (post-abril 2025)
☐  Crear app/robots.ts y app/sitemap.ts
☐  Conectar Sentry free tier

📋 PRÓXIMAS 2 SEMANAS — Asentar la base legal/SEO
☐  Habilitar RLS en Supabase con policies por tabla (auth.uid())
☐  JSON-LD Product / AggregateOffer / BreadcrumbList en página de producto
☐  generateMetadata dinámico en producto y categoría
☐  Política de privacidad, términos, banner de cookies (Ley 25.326)
☐  Rate limiting con Upstash en /api/out, búsqueda y registro
☐  loading.tsx y error.tsx en rutas principales
☐  Migrar a next/image
☐  Validación Zod en todos los Server Actions

🚀 ANTES DE BETA PÚBLICA — Semanas 4 a 8
☐  Cron de refresh cada 4h sobre top 500 productos MeLi
☐  Cron de evaluación de alertas cada 30 min con cooldown
☐  Plantilla profesional de email (React Email + Resend)
☐  Decisión visual final entre las 3 propuestas del documento maestro
☐  Mostrar recomendaciones SOLO sobre historial real ≥ 14 puntos
☐  5 guías pilares publicadas e indexables

📈 PRIMEROS 3–6 MESES — Tracción + monetización
☐  Sumar 2do provider real (Frávega feed / HardGamers / TiendaMia)
☐  Inscripción a afiliados MeLi (cuando el régimen fiscal aplique)
☐  Newsletter semanal lanzado
☐  AnalyticsEvent table + dashboard interno
☐  Plan Premium beta a 50 usuarios más activos
☐  Hot Sale (mayo) y CyberMonday (nov): contenido preparado 3 semanas antes

REGLAS DE ORO
→  Nunca mostrar una recomendación sin datos reales que la sostengan.
→  Cada provider stub apagado vale más que cualquier feature nueva.
→  El SEO de cola larga es la única adquisición sostenible a bajo costo.
→  Afiliados MeLi >> AdSense en este nicho (estimado 10x por mil visitantes).
→  Antes de pelearle a Precialo en 'cantidad de tiendas', ganar en honestidad y velocidad.

PrecioRadar — Etapas de trabajo
Diagnóstico: Readiness 35–45%. Un provider real (MeLi), seis stubs vacíos, historial sintético, sin RLS, sin SEO, sin legal. Riesgo legal activo.
________________________________________
Etapa 0 — Verificación previa (solo lectura, sin commit)
Confirmar 3 bombas latentes antes de tocar nada:
•	¿MeLi provider usa OAuth o API pública (403 desde abril 2025)?
•	¿Hay imports runtime: 'edge' que rompan con proxy.ts?
•	¿RLS de Supabase está desactivado?
________________________________________
Etapa 1 — Apagar el riesgo de confianza ⚠️ CRÍTICO
•	Ocultar los 6 providers stub del HTML renderizado
•	Reemplazar getMockPriceHistory por estado honesto: "Recolectando datos"
•	Eliminar recomendaciones basadas en datos sintéticos
Riesgo: La UI queda pelada hasta la Etapa 5. Es intencional.
________________________________________
Etapa 2 — OAuth MercadoLibre
•	Implementar OAuth con auto-refresh de token
•	Registrar app en developers.mercadolibre.com.ar
•	Loguear en ProviderLog
________________________________________
Etapa 3 — Seguridad mínima de datos
•	Habilitar RLS en Supabase con policies auth.uid()
•	Migrar todos los Server Actions a validación Zod
•	Security headers: CSP, X-Frame-Options, nosniff
________________________________________
Etapa 4 — Compliance legal (Ley 25.326)
•	Política de privacidad en español argentino
•	Términos de uso
•	Banner de consentimiento de cookies
•	Páginas /privacidad, /terminos, /cookies
________________________________________
Etapa 5 — Historial real persistido
•	Cron refresh de precios c/4h → PriceHistory
•	Subir Decimal(12,2) a Decimal(14,2) en schema
•	Recomendaciones solo con ≥14 puntos reales
________________________________________
Etapa 6 — SEO foundational
•	app/robots.ts + app/sitemap.ts dinámico desde Prisma
•	generateMetadata dinámico en /producto/[slug] y /categoria/[slug]
•	JSON-LD: Product + AggregateOffer + BreadcrumbList
________________________________________
Etapa 7 — Robustez de runtime
•	Rate limiting con Upstash en /api/out, búsqueda, registro
•	loading.tsx + error.tsx en rutas principales
•	Sentry free tier (client + server)
•	Migrar <img> → next/image
________________________________________
Etapa 8 — Tests + CI
•	Vitest para unit tests
•	Playwright E2E para 5 flows críticos
•	GitHub Actions CI
________________________________________
Etapa 9 — Contenido + adquisición
•	5 guías pilares SEO en /guias/[slug]
•	Newsletter signup con doble opt-in
•	Tabla NewsletterSubscription en Prisma
________________________________________
Etapa 10 — Monetización (afiliados MeLi)
•	Deeplinks de afiliado en /api/out
•	Disclaimers en cards y footer
•	Solo después de aprobación MeLi y monotributo en orden

24. Detector de ofertas falsas
El detector de ofertas falsas es uno de los diferenciales más importantes de PrecioRadar para el mercado argentino, donde la práctica de inflar precios antes de un descuento es ampliamente conocida y criticada.

Objetivo
Mostrarle al usuario si un descuento anunciado es real o si el precio fue inflado previamente para simular una rebaja. El tono debe ser claro, directo y sin alarmismo.

Algoritmo base (disponible desde v2)
La detección compara el precio actual contra la media móvil de los últimos 60 días. Requiere historial real persistente — no puede activarse con datos mock o sintéticos.

Condición	Etiqueta	Mensaje al usuario
Precio actual ≤ 90% del promedio 60 días	✅ Oferta real	El precio está genuinamente por debajo de su promedio reciente.
Precio actual entre 90% y 100% del promedio	⚠️ Descuento menor	El descuento es pequeño o marginal respecto al promedio.
Precio actual > 100% del promedio 60 días	🚫 Oferta inflada	El precio subió antes del supuesto descuento. Revisar condiciones.
Historial insuficiente (menos de 14 puntos)	🔹 Sin datos suficientes	Aún no hay historial suficiente para evaluar este precio.

Ejemplo de mensaje en la UI
“Este celular costó en promedio $850.000 los últimos 60 días. Hace 15 días subió a $1.100.000 y ahora figura en ‘oferta’ a $999.000. Hoy estás pagando más que el promedio histórico.”

Umbrales configurables desde el admin
Los porcentajes (90%, 100%) deben ser configurables por el admin para ajustarlos según categoría o período estacional. Durante Hot Sale puede convenir usar umbrales más amplios.

Dependencia técnica
•	Requiere historial de precios persistente con cron job activo (Etapa 5 del plan de trabajo).
•	No puede activarse con datos mock. Los mensajes de recomendación deben estar desactivados hasta tener ≥14 puntos de historial real.
•	Integración con alertas honestas: cuando se detecta oferta inflada, puede disparar una alerta al usuario que sigue ese producto.

Impacto en riesgo legal
Al mostrar recomendaciones únicamente sobre historial real y etiquetar correctamente las ofertas infladas, PrecioRadar reduce activamente el riesgo de incumplir los arts. 4 y 8 de la Ley 24.240 identificados en la sección 4.2 de este informe.


25. Calendario de promos bancarias
El mercado argentino tiene un comportamiento de compra fuertemente condicionado por promociones bancarias diarias: descuentos en supermercados ciertos días, reintegros en combustibles, cuotas sin interés por banco en determinados comercios. Esta información está dispersa y es difícil de centralizar. Es un diferencial único de PrecioRadar en el mercado actual.

Objetivo
Mostrarle al usuario qué descuento o beneficio adicional puede aplicar hoy al comprar un producto, según su banco o billetera. El sistema debe integrarse con el buscador y el detalle de producto.

Entidades cubiertas desde v2
Bancos: Nación, Galicia, Macro, Santander, BBVA, ICBC, Comafi.
Billeteras digitales: Mercado Pago, Ualá, Personal Pay, Naranja X.

Estructura de cada entrada del calendario
Campo	Descripción
Entidad	Banco o billetera (ej. Banco Nación, Naranja X).
Día(s) válido(s)	Días de la semana o fechas específicas.
Tipo de descuento	Porcentaje, reintegro, cuotas sin interés.
Porcentaje / monto	Valor del beneficio.
Categorías aplicables	Supermercados, combustible, electrodomésticos, etc.
Tope de reintegro	Monto máximo del beneficio si aplica.
Tiendas aplicables	Online, física o ambas.
Medio de pago requerido	Tarjeta de débito, crédito, QR, app.
Vigencia	Fecha desde/hasta. Renovación mensual si aplica.
Fuente	URL oficial del banco o billetera.

Integración con el detalle de producto
Cuando el usuario ve una oferta, PrecioRadar muestra automáticamente si hoy hay alguna promo bancaria aplicable a esa tienda o categoría, cuánto quedaría el precio final con ese beneficio, y el medio de pago requerido.
Ejemplo: “Comprá este lavarropas en Frávega con Banco Macro hoy lunes y ahorrás un 25% adicional. Precio con descuento: $X. Requiere tarjeta Macro Selecta.”

Mantenimiento
•	Primera etapa: actualización manual desde el admin. Las promos bancarias cambian mensualmente.
•	Futuro: scraping de los sitios oficiales de bancos y billeteras para automatizar la actualización.
•	Crowdsourcing futuro: los usuarios podrán reportar promos nuevas o vencidas, con validación manual antes de publicar.

Ubicación en el roadmap
Versión 2. Requiere CMS de promos en el admin (sección 5 del plan de trabajo, Etapa admin) y la integración en el detalle de producto. No depende del historial de precios pero sí del panel admin básico.


26. Diversificación de afiliados
PrecioRadar inicia con MercadoLibre como único programa de afiliados. Esto genera un riesgo estratégico real: si MercadoLibre modifica comisiones, suspende la cuenta o cambia sus términos, el modelo de monetización queda sin soporte. El programa MeLi fue lanzado en noviembre 2025 y admite solo monotributistas, con comisión hasta 15% según categoría y solo para productos con reputación verde.

Reglas que no cambian
•	El mejor precio real siempre se muestra, tenga afiliado o no.
•	Nunca se prioriza una oferta por comisión sobre una más conveniente para el usuario.
•	El aviso de afiliados en footer y textos legales se mantiene en todos los programas.
•	Los links afiliados no deben agregar redirecciones confusas ni degradar la UX.

Programas a activar (orden de prioridad)
Programa	Relevancia AR	Comisión estimada	Moneda
Awin	Alta — Falabella, Sodimac, marcas internacionales	3–6%	EUR/USD
Amazon Afiliados (ES/MX)	Alta — argentinos que compran del exterior	1–10% según categoría	USD
Impact	Media — marcas D2C modernas, Shein	Variable	USD
CJ Affiliate	Media — Lenovo, GoDaddy y otras marcas globales	Variable	USD
Rakuten Advertising	Media — marcas premium internacionales	Variable	USD
Temu Affiliate	Alta — crecimiento explosivo en AR 2025	5–30%	USD
Shein Affiliate	Alta — especialmente en ropa y accesorios	10–20%	USD
MercadoLibre Afiliados	Muy alta — programa actual, mantener activo	Hasta 15%	ARS/USD

Tiendas argentinas sin programa de afiliados
Frávega, Garbarino, Cetrogar, Coto Digital y Carrefour AR no tienen programas de afiliados oficiales. Su inclusión en PrecioRadar sirve para dar valor al usuario mediante la comparación, aunque no generen comisión directa. Esto alimenta la base de datos de historial y refuerza la confianza, que es el activo principal del producto.

Ingresos en dólares — consideración especial
Awin, Amazon, CJ, Rakuten e Impact pagan en USD o EUR. Para el contexto argentino esto tiene un valor adicional significativo. El cobro se puede gestionar vía Payoneer o Wise. Esta fuente de ingresos en moneda extranjera debe gestionarse de forma separada a la facturación en pesos (factura tipo E de exportación de servicios, exenta de algunos impuestos).

Arquitectura del AffiliateService
•	Cada provider debe saber si tiene un link de afiliado disponible y cuál usar.
•	La lógica de construcción del link afiliado debe estar encapsulada en el provider, no en la UI.
•	El AffiliateService existente debe evolucionar para soportar múltiples programas en paralelo.
•	El click tracking ya modelado en Prisma debe atribuir correctamente a qué programa corresponde cada click.

Timing de implementación
El alta en los programas (Awin, Amazon, Impact) se puede gestionar en paralelo al desarrollo sin requerir cambios en el código. La integración de los links en el producto va en la Etapa 10 del plan de trabajo (monetización), una vez que el régimen fiscal esté en orden y haya historial real para respaldar los clicks.







