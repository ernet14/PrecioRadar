# Decisiones recientes

> Bitácora de decisiones de producto/técnicas. La más nueva arriba. Esto es contexto del
> proyecto versionado en el repo (distinto de la memoria cross-sesión del agente, que vive
> fuera del repo).

## 2026-05-24 — SEO interno prioriza comparables
- En categorías, el schema `ItemList` expone `AggregateOffer` cuando un producto compara en
  varias tiendas. En producto, los similares salen de la categoría curada y se ordenan poniendo
  comparables primero.

## 2026-05-24 — Densificación automática con gate conservador
- `scripts/auto-densify.ts` reemplaza el ciclo manual de buscar modelos, aplicar, medir y
  auditar. El modo `--apply` persiste solo grupos nuevos no sospechosos; los de dispersión alta
  quedan bloqueados salvo `--include-suspects` explícito.
- Primer apply completo: comparableRate **34%** (92/271), con 1 grupo bloqueado por dispersión
  alta y auditoría DB limpia.

## 2026-05-24 — Taxonomía curada sin migración inmediata
- Para destrabar SEO por categoría e índice segmentado, las categorías crudas VTEX se
  normalizan en lectura/escritura con `normalizeCategorySlug(slug + nombre)`: las páginas e
  índice incluyen aliases existentes, pero los slugs ambiguos quedan crudos si el nombre no
  alcanza para clasificarlos. No se migra la DB todavía.

## 2026-05-22 — Reposicionamiento a capa de datos
- PrecioRadar se reposiciona de "comparador" a **capa de datos de precios** (índice de
  inflación). El activo es la serie `PriceHistory`. Ver [negocio](../contexto/negocio.md).
- **Primer producto: extensión de navegador estilo CamelCamelCamel para MercadoLibre.** La
  extensión resuelve el bloqueo de search (los usuarios aportan los item IDs; se leen por
  `/items/{id}`, API oficial).
- Dedicación **part-time (~10–20h/sem)**, una iniciativa principal a la vez. Empezar lean
  (Hobby), invertir en infra si hay tracción.

## 2026-05-22 — Push automático
- Tras cada commit, hacer `git push` sin preguntar (con `-u origin <branch>` la primera vez
  en una branch nueva).

## 2026-05-22 — Fase 0 cerrada
- Compactación de `PriceHistory` ahora preserva **mín/máx por bucket** (no solo el punto más
  antiguo); se confirmó que ya hacía roll-up perpetuo (no borra a 180d).
- Contadores del resumen admin filtran `isDemo:false`.
- Nuevo `verdictService.buildVerdictAndStats` (puro, reusable) + helper `getMinPrice`.
- Diferido a Fase 1 (con su consumidor): multiget, circuit breaker distribuido, dedupe,
  endpoint `/api/ext/item/[mlId]`.
- Branch `etapa-19-extension`, commits `f516be9` (mín/máx + plan) y `f46f32e` (Fase 0).

## 2026-05-22 — Organización del contexto IA
- `CLAUDE.md` pasa a índice corto; contexto en `docs/contexto/`, bitácoras en `docs/memory/`.
- Las 13 reglas viven solo en `AGENTS.md` (CLAUDE.md las trae con `@AGENTS.md`).

## Anteriores (referencias)
- Decisiones de seguridad diferidas: `docs/etapa-3-decisiones.md` (CSP, AuditLog, IP salt).
- Decisiones de compliance diferidas: `docs/etapa-4-decisiones.md` (borrado de cuenta,
  Ley 25.326).
- Etapas 0–18 cerradas; UGC, resto de IA y cobro congelados hasta pedido explícito.
