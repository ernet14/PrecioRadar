# Negocio — PrecioRadar

Solo-founder · bajo presupuesto (objetivo USD 0–80/mes, escalar si hay tracción).

## Tesis estratégica (decidida 2026-05-22)

Dejar de competir como "otro comparador más" y reposicionarse como **la capa independiente
de datos de precios del e-commerce argentino**: un índice de inflación/precios en tiempo
real construido sobre la serie histórica que el producto ya acumula.

**El activo defensivo real es `PriceHistory`**: una serie temporal que no se puede
backfillear (el tiempo solo avanza). Cada día que pasa, el foso crece. Precedente real y
argentino: *PriceStats / Billion Prices Project* (Cavallo y Rigobon), índice independiente
nacido por la desconfianza en el INDEC.

**La secuencia es un activo que se compone, no 3 productos sueltos:**
extensión de navegador (consumo + captura de datos) → índice de precios/inflación B2B +
radar dólar, alimentados por el dataset que junta la extensión.

## Modelos de monetización

| Modelo | Cliente | Defensibilidad | Nota |
|---|---|---|---|
| **Data API / índice de inflación-precios** | Medios, consultoras, bancos, fondos, retail | 🟢 Muy alta (serie temporal) | El negocio fuerte y sostenible |
| **Extensión freemium** (histórico + alertas) | Consumidor | 🟢 Alta (distribución + datos) | Motor de adquisición + captura de datos |
| **Informe/índice premium** (suscripción) | Prensa, research, sindicatos | 🟢 Alta | Genera prensa → backlinks/SEO |
| **Inteligencia de precios B2B** | Marcas/cadenas que quieren leer el mercado (NO sellers de ML) | 🟡 Media | — |
| **Afiliados** (MeLi, Amazon, etc.) | Consumidor | 🔴 Baja (commodity) | Propina, no motor |
| **API B2B actual** (`/api/v1`) | Devs | 🟡 Media | Depende de tener datos únicos que vender |

**No construir herramientas para vendedores de ML**: ya tienen el panel de ML + su IA. El
foco son ideas distintas con la API oficial de ML (ver [ideas pendientes](../memory/ideas-pendientes.md)).

## Legal / riesgos

- **Scraping** (VTEX) es zona gris (ToS, base de datos sui generis) y frágil
  (Frávega ya bloquea IPs de Vercel). La **API oficial de ML por item** es el canal
  claramente legal.
- **Ley 24.240 (defensa del consumidor):** una recomendación de compra sobre datos
  sintéticos/insuficientes puede ser publicidad engañosa. Regla de oro: nunca mostrar un
  veredicto sin historial real suficiente (`NO_DATA` cuando no alcanza).
- **Ley 25.326 / AAIP:** compliance de datos personales, derecho de supresión (ARCO).
  Decisiones diferidas en `docs/etapa-4-decisiones.md`.
- **ToS MercadoLibre:** branding obligatorio ("Ver en Mercado Libre"), cache de precios,
  uso comercial. El modelo CamelCamelCamel (guardar precios de ítems que el usuario ya ve,
  vía API oficial, linkeando de vuelta a ML) es defendible.

## Diferenciación

Honestidad + velocidad + el histórico acumulado. No cantidad de tiendas. La marca como
"el dato honesto de precios" (citable por prensa) es una barrera que no se compra.

> Detalle estratégico ampliado: `docs/etapa-19-extension.md` y
> `docs/Cloude Informe Profundo.md` (snapshot, ojo estado desactualizado).
