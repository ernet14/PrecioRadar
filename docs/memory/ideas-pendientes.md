# Ideas pendientes

> Ideas con potencial e ítems diferidos. No son compromisos; son el backlog estratégico.

## Ideas de producto (usando la API oficial de ML, NO herramientas para vendedores)

1. **Índice independiente de precios e inflación** ("PriceStats argentino"). Sobre una
   canasta fija de ítems por ID (no necesita el search bloqueado). Vendible a medios,
   research, bancos, fondos. Es el negocio B2B con más foso.
2. **Extensión CamelCamelCamel-ML** (primer producto, Fase 1): historial real + veredicto de
   oferta trucha en cualquier publicación de ML. Crece orgánico y captura datos.
3. **Radar de devaluación / pass-through al dólar**: v0 interno listo con CSV explícito
   (`scripts/measure-pass-through.ts`), fuente base BNA venta (`scripts/fetch-bna-dollar.ts`),
   corrida operativa (`scripts/run-data-radar.ts`), cron interno (`/api/internal/data-radar`) y
   tarjeta interna en `/admin/monitor`. Pendiente: sumar blue/MEP como series separadas,
   snapshot DB, 30+ días de serie y página pública/B2B.
4. **Minería de la API de Preguntas**: agregar con IA las dudas reales de compra → guías y
   FAQs honestas (defensa del consumidor + SEO de cola larga).
5. **Canasta familiar / costo de vida del hogar**: "¿cuánto subió MI canasta?". Retención
   emocional alta. El índice, personalizado.
6. **Radar de faltantes / quiebres de stock**: señal económica (desabastecimiento) para
   prensa/consultoras.

## Diferido de Fase 1 (construir con su consumidor: el endpoint de la extensión)
- Multiget `/items?ids=` (batches de 20) para refresh eficiente.
- Circuit breaker distribuido (Upstash) además del in-memory, por cold starts.
- Dedupe a nivel request para el mismo `(storeSlug, externalId)`.
- `/api/ext/item/[mlId]` con rate-limit por extension key (por minuto, no diario).
- Seed de historial de los ítems más populares (mitiga cold-start de la extensión).

## Deuda técnica / limpieza
- `README.md` (raíz) tiene datos stale (describe crons cada 4h/30min; hoy `vercel.json`
  tiene 4 crons diarios). Actualizar.
- `src/tests/README.md` dice "no test runner configured" — falso (hay 25+ tests,
  `npm test` corre). Borrar o reescribir.
- `docs/Cloude Informe Profundo.md` y el header de `docs/precioradar-etapas_1.md` describen
  un estado viejo ("35–45%, 6 stubs, historial sintético"). Marcar como snapshot histórico.
- Posible reorg de `docs/` en subcarpetas (estrategia/decisiones/integraciones/referencia)
  con `git mv` para preservar historial — no urgente.
- Afiliados ML manuales: semi-automatizar o aceptar que no es el modelo (foco en datos).
- Sitemap/categorías usan productos mock; migrar a reales cuando el dataset crezca (Fase 2+).
