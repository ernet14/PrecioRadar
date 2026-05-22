# Etapa 19 — Reposicionamiento a capa de datos + Extensión de navegador

> Estado: planificación (2026-05-22). Esta etapa no reemplaza nada de lo construido;
> reposiciona el foco del producto y agrega el primer producto de la nueva dirección.

## Tesis

PrecioRadar deja de competir como "otro comparador más" y se reposiciona como **la capa
independiente de datos de precios del e-commerce argentino**. El activo defensivo real es
la serie temporal `PriceHistory`: no se puede backfillear (el tiempo solo avanza), así que
cada día que pasa el foso crece. Precedente: PriceStats / Billion Prices Project
(Cavallo y Rigobon, índice de inflación independiente nacido por la desconfianza en INDEC).

**La secuencia no son 3 productos sueltos: es un activo que se compone.** La extensión es
el primer producto Y el motor que alimenta el dataset para el índice/radar dólar que vienen
después.

## Decisiones (usuario, 2026-05-22)

- **Primer producto: extensión de navegador estilo CamelCamelCamel para MercadoLibre.**
- Dedicación: **part-time (~10-20h/sem)** → una iniciativa principal a la vez.
- Presupuesto: **empezar lean** (Hobby + trigger externo de crons), invertir en infra
  (Vercel Pro, más crons, más volumen) **si hay tracción**.

## Insight que de-riesga el plan

El bloqueo de búsqueda de ML (403 en `/sites/MLA/search`, ver
`docs/mercadolibre-permiso-busqueda.md`) impedía crawlear el catálogo. La extensión lo da
vuelta: **cada usuario que navega ML aporta el item ID**, y se lee el precio por
`/items/{id}` (API oficial, legal, funciona). Los usuarios son el crawler legal; cada uso
engorda la serie histórica que después monetiza el índice B2B.

**Problema honesto a manejar (cold-start):** la primera vez que se ve un ítem no hay
histórico ("seguimiento desde hoy"). Se mitiga con un **seed** de los ítems más populares
de los search logs antes de lanzar.

---

## Fase 0 — Fundaciones de datos *(innegociable, ~2-3 semanas)*

| Entregable | Estado / Nota |
|---|---|
| Histórico perpetuo (no borrar) | **YA EXISTE.** `priceCompactionService.ts` hace roll-up por etapas (día → semana → mes), nunca borra del todo. |
| **Preservar mín/máx por bucket en la compaction** | **PASO 2 de esta etapa.** Hoy conserva solo el punto más antiguo del bucket → pierde el mínimo/máximo del período. Necesario para el "precio más bajo de la historia" de la extensión y para la fidelidad del índice. |
| Aislar demo/real | Verificar que `isDemo` nunca contamine gráficos ni agregaciones del índice. |
| Servicio reusable de "veredicto de oferta" | Extraer la lógica del Termómetro a una función `{min30, min90, típico, veredicto}` que compartan sitio + extensión. |
| Hardening ingest por item-id | Multiget (`/items?ids=` hasta 20), cache, circuit breaker (ya existen). |

Migraciones en prod: **SQL manual + `prisma migrate resolve`**, nunca `migrate dev/reset`
contra Supabase prod.

---

## Fase 1 — MVP de la extensión *(~4-6 semanas)*

**Arquitectura del widget (menor esfuerzo para un solo dev): iframe embed**, no chart
bundleado. El content script inyecta `<iframe src="/embed/ml/{itemId}">` que renderiza con
recharts. Ventaja: se actualiza el widget sin re-publicar la extensión.

| Componente | Detalle |
|---|---|
| `GET /api/ext/item/[mlId]` | Busca en DB; si existe → history+verdict; si es nuevo → fetch ML, encola tracking, devuelve precio actual + "seguimiento iniciado". Rate-limit por extension key. |
| `/embed/ml/[itemId]` | Página frameable (CSP correcto): precio actual + gráfico + veredicto. |
| Extensión MV3 | Content script detecta página de producto ML (`articulo.mercadolibre.com.ar/MLA-…`, `/p/MLA…`), extrae itemId, inyecta el iframe. |
| Cron de refresh | Re-fetch diario de ítems trackeados en batches de 20 (multiget). |
| Privacy policy | Solo se envía el itemId, nunca el browsing completo. Crítico para confianza y para aprobación en Chrome Web Store. |
| Seed inicial | Precargar histórico de top N ítems de los search logs. |

**Gate:** instalar la extensión, entrar a una publicación real de ML, ver gráfico +
veredicto correctos.

---

## Fase 2 — Retención + crecimiento *(~2-4 semanas)*

- Alertas de precio sobre ítems ML reales (reusa el sistema `Alert`: email/push/badge).
- Watchlist en el popup de la extensión.
- Botón "compartir gráfico" → imagen/OG (viral + backlinks).
- Afiliado en el click-through (reusa `/api/out`).
- Publicar en Chrome Web Store + Firefox + landing dedicada.

**Gate de inversión:** medir instalaciones, ítems únicos trackeados, retención semanal,
alertas creadas, clicks afiliados. Si hay tracción → escalar infra y arrancar el Índice.

---

## Fase 3+ — Lo que la extensión habilitó

Índice de precios/inflación público + radar dólar pass-through, construidos sobre los miles
de ítems que la extensión ya viene trackeando. Recién acá la monetización B2B tiene algo
único que vender.

## Riesgos

- **Cold-start de histórico** → seed + transparencia ("seguimiento desde hoy").
- **Confianza/privacidad** → activo más frágil de una extensión: mínima recolección,
  política clara, posible open-source del content script.
- **ToS de ML** → modelo CamelCamelCamel (precios de ítems que el usuario ya ve, vía API
  oficial, linkeando de vuelta a ML) es defendible. La API de items es central al
  ecosistema de ML → riesgo mucho menor que el search.
- **Revisión de Chrome** → puede demorar; el approach iframe permite iterar sin re-revisión.
