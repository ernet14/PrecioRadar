# Roadmap — PrecioRadar

Plan maestro original (detallado): `docs/precioradar-etapas_1.md`.
Reglas de oro del roadmap: nunca recomendar sin datos reales; cada stub apagado vale más
que un feature nuevo; SEO long-tail es la adquisición sostenible; afiliados MeLi > AdSense;
no saltear etapas.

## Estado de etapas

- **Etapas 0–18: cerradas en su alcance actual.** Incluyen: seguridad/compliance
  (3–4), SEO (6), detector de ofertas falsas (12), afiliados multi-programa (14),
  PWA + Web Push (15), observabilidad/admin (16–17), IA descripciones (17), API B2B (18).
- **Congelado hasta pedido explícito:** UGC, resto de IA y **cobro/billing**.

## Etapa 19 — Reposicionamiento a capa de datos + extensión (en curso)

Ver plan completo en `docs/etapa-19-extension.md`. Decisiones: extensión primero,
part-time (~10–20h/sem), empezar lean e invertir en infra si hay tracción.

### Fase 0 — Fundaciones de datos ✅ (cerrada 2026-05-22)
- Roll-up perpetuo de `PriceHistory` preservando **mín/máx por bucket**.
- Aislar demo/real (contadores del admin alineados al catálogo real).
- Servicio de veredicto reusable (`verdictService.buildVerdictAndStats`) + `getMinPrice`.
- Branch `etapa-19-extension` (commits `f516be9`, `f46f32e`).

### Fase 1 — MVP de la extensión (próximo)
- Backend `GET /api/ext/item/[mlId]` (busca/crea, fetch ML, history+verdict, rate-limit).
- Embed frameable `/embed/ml/[itemId]` (recharts).
- Extensión MV3: content script detecta página de producto ML → inyecta iframe.
- Cron de refresh por multiget; seed de ítems populares; privacy policy.

### Fase 2 — Retención + crecimiento
Alertas sobre ítems ML reales, watchlist, "compartir gráfico" (viral/backlinks),
afiliado en el click-through, publicar en Chrome Web Store + Firefox.
**Gate de inversión:** medir instalaciones/ítems únicos/retención antes de escalar.

### Fase 3+ — Lo que la extensión habilitó
Índice de precios/inflación público + radar dólar pass-through, sobre el dataset que la
extensión acumuló. Recién acá el cobro B2B tiene algo único que vender.

## Diferido / pendiente

Ver [ideas pendientes](../memory/ideas-pendientes.md) (incluye lo diferido de Fase 1:
multiget, circuit breaker distribuido, dedupe, rate-limit por extensión) y deuda técnica.
