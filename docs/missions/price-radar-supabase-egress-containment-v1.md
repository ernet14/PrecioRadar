# Contención de egress de Supabase — Precio Radar V1

Fecha del diagnóstico: 2026-08-31. Ciclo afectado: 2026-08-06 a 2026-09-06.

## Resultado y alcance

El origen material fue la consulta histórica de índices de precios ejecutada por Data Radar.
Cada invocación calculaba 13 alcances y repetía 13 veces la misma consulta completa a
`PriceHistory`, `Product` y `Category`; el filtro por categoría se hacía después en JavaScript.
La corrección hace una sola lectura acotada por ejecución, comparte un guard distribuido entre
las dos rutas que pueden lanzar este análisis y evita que las páginas públicas lo recalculen.

No se modificó MarketPlace/Machina Latam, no se cambió el esquema ni se borraron datos. El
despliegue queda deliberadamente bloqueado hasta confirmar en forma independiente que la base
configurada en el destino de Vercel corresponde al proyecto Supabase Precio Radar y configurar
las variables requeridas. La mejora de consumo productivo solo podrá confirmarse después del
reinicio de cuota.

## Evidencia inicial y atribución

Supabase informó 10,221 GB de egress para Precio Radar, 0 GB de Storage, 0 GB de Cached Egress,
0 de Realtime y 0 de Edge Functions. El 2026-08-29 registró aproximadamente 958,85 MB de Shared
Pooler Egress. En el mismo período Vercel registró 360 invocaciones en seis horas: una por minuto.

`pg_stat_statements`, consultado solo en lectura, conservaba estadísticas desde
2026-05-06T21:55:07.511Z. La sentencia con mayor volumen era exactamente la agregación usada por
`computePriceIndex`: 5.684 llamadas y 84.086.075 filas devueltas. Entre dos lecturas consecutivas
subió una llamada y 84.353 filas, que representa el volumen actual de una sola consulta. Una
muestra SQL acotada a 20.000 filas midió 114,60 bytes medios por tupla agregada.

| Trigger o scheduler | Frecuencia observada/configurada | Ruta o función | Consulta y volumen anterior | Invocaciones | Egress aproximado | Certeza |
| --- | --- | --- | --- | --- | --- | --- |
| Caller productivo no identificable con la retención/plan disponible de logs | Observado: 1/min en Vercel durante 6 h | `/api/internal/data-radar` | 13 consultas completas; 13 × 84.353 = 1.096.589 filas por request | 360/6 h observadas; no todas necesariamente alcanzaron la DB restringida | ~125,7 MB de tuplas por ejecución actual; ~7,6 ejecuciones exitosas bastan para 958,85 MB | Alta para ruta/consulta; media para el scheduler exacto |
| Cron versionado en `vercel.json` | Antes y después: `0 11 * * *` (1/día) | `/api/internal/data-radar` | Misma consulta repetida 13 veces antes del cambio | 1/día configurada | ~125,7 MB/día al tamaño actual antes del cambio | Alta; descarta que el minuto esté en la configuración actual del repo |
| ISR público | Antes: cada 3.600 s | `/indice` → `computePriceIndex` | 1 consulta completa de 84.353 filas por regeneración | Dependía del tráfico/bots | ~9,67 MB por regeneración, sin overhead | Alta; origen secundario eliminado |
| Ruta interna independiente | Bajo demanda, sin cron versionado | `/api/internal/phase-readiness` | 13 consultas completas por evaluación | No determinada | Igual orden que Data Radar | Alta para el costo potencial |
| Health checks | Variables; `/api/health` y health-watch | Salud interna | `SELECT 1` y una fila reciente | No determinada | Insuficiente para explicar el volumen | Alta para descartarlo como causa material |

La igualdad de 5.684 = 437 × 13 + 3 corrobora el patrón de trece consultas por ejecución. El
envolvente de tuplas de esa sentencia desde el reinicio de estadísticas es aproximadamente
84.086.075 × 114,60 = 9,636 GB. No se lo atribuye temporalmente en forma exacta al ciclo de cuota,
pero su orden de magnitud, la muestra viva de 84.353 filas y la forma del código demuestran la
ruta causal. La identidad del scheduler externo o del deployment divergente no pudo recuperarse:
Observability por ruta requiere un plan adicional y los logs del 29/08 ya no estaban disponibles.

## Cambios realizados

- `computePriceIndexes` carga una sola vez cinco columnas explícitas, ordena desde lo más nuevo y
  aplica un límite estricto de 90.000 filas; hasta 16 alcances se calculan en memoria sobre esa
  única lectura.
- Este trabajo no procesa una cola de productos con estado `pending`/`due`: genera un agregado
  histórico diario. Su equivalente acotado es leer únicamente las 90.000 tuplas agregadas más
  recientes; el refresco de ofertas, que sí trabaja por lotes, no fue el origen material.
- Data Radar y Phase Readiness comparten el mismo guard `price-index-analysis`: lock/cooldown
  distribuido con Upstash y presupuesto máximo de una ejecución aceptada por día.
- En producción el guard falla cerrado si Redis no está disponible. El fallback en memoria existe
  solo para desarrollo y tests.
- `PRICE_RADAR_CRON_ENABLED` es un kill switch explícito y cerrado por defecto. Autorización y
  switch se evalúan antes de consultar PostgreSQL.
- `/indice` pasa de regeneración horaria con consulta histórica a revalidación diaria leyendo
  únicamente el índice ya persistido. En producción no vuelve a la consulta pesada si falta el
  snapshot.
- Las respuestas de los endpoints contienen solo estado, conteos, duración y tamaño aproximado.
  Los logs estructurados no incluyen productos, HTML, JSON voluminoso, secretos ni datos personales.
- Errores parciales no liberan el presupuesto para un reintento en bucle: el token diario se consume
  al adquirir el guard y expira automáticamente.

## Antes y después

| Control | Antes | Después |
| --- | --- | --- |
| Frecuencia versionada de Data Radar | 1/día (`0 11 * * *`) | 1/día (`0 11 * * *`), nunca `* * * * *` |
| Frecuencia efectiva permitida | Sin límite interno | Máximo 1/día compartido entre ambas rutas analíticas |
| Consultas por ejecución | 13 lecturas históricas completas | 1 lectura histórica acotada |
| Filas de DB por ejecución | ~1.096.589 actuales | ≤90.000 |
| Columnas | Agregados repetidos, todas las fechas | 5 columnas agregadas explícitas |
| Página pública `/indice` | Consulta viva cada hora | Snapshot persistido, revalidado cada 24 h |
| Solapamiento | Posible entre instancias/rutas | `SET NX EX` distribuido con clave compartida |
| Apagado | Sin kill switch propio | `PRICE_RADAR_CRON_ENABLED=false` |

## Presupuesto y proyección

La cota conservadora mensual es:

```text
90.000 filas/ejecución
× 114,60 bytes/fila medidos
× 1 ejecución/día
× 31 días
× 2 de reserva (protocolo y todas las demás lecturas DB)
= 639.468.000 bytes/mes = 0,639 GB/mes
```

La proyección queda por debajo del límite interno de 1 GB mensual. El factor 2 asigna nuevamente
todo el volumen de la consulta principal como reserva para overhead del protocolo y las demás
lecturas de la aplicación. La ejecución analítica sola queda limitada a ~10,31 MB/día de tuplas.
Si el log informa `truncated=true`, no se debe aumentar el límite sin rehacer esta proyección.

## Variables de entorno requeridas

- `PRICE_RADAR_CRON_ENABLED`: `true` habilita los trabajos; cualquier otro valor los detiene.
- `CRON_SECRET`: autentica las rutas internas programadas.
- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`: lock y contador distribuidos.
- `DATABASE_URL`: conexión existente de Precio Radar; no se modifica en esta misión.

No registrar ni copiar sus valores. Para apagar el trabajo, establecer
`PRICE_RADAR_CRON_ENABLED=false` en el entorno afectado y desplegar/promover esa configuración.
El 2026-08-31 se verificaron las cinco variables en Vercel Production y
`PRICE_RADAR_CRON_ENABLED` quedó configurada con el valor habilitante exacto. Upstash respondió
`PONG` mediante una comprobación no destructiva. `CRON_SECRET` se conservó: no se rotó porque la
arquitectura documenta callers externos legítimos que comparten ese secreto y rotarlo sin
actualizarlos los rompería. Las solicitudes sin autorización siguen rechazándose antes de DB y
el caller que conserve autorización queda contenido por lock y presupuesto diario.

## Validación local

- Unitarias: 201/201 aprobadas.
- ESLint: aprobado sin errores ni advertencias.
- TypeScript (`tsc --noEmit`): aprobado.
- Build de producción con Next.js 16.2.6: aprobado.
- Playwright: 21/21 E2E aprobadas. El servidor local registró fallos de consultas Prisma porque
  Supabase continúa restringido; las pantallas degradaron según el comportamiento existente.
- Verificación productiva de solo lectura: existen 1.215 snapshots, el último es del 2026-08-31 y
  contiene un índice total válido; `/indice` conserva datos visibles sin recalcular el historial.
- Migraciones: ninguna.

La asociación de Vercel quedó confirmada como proyecto `precio-radar`, repositorio
`ernet14/PrecioRadar` y dominios oficiales. La referencia Supabase enmascarada `iucg…qrow`
coincide entre `DATABASE_URL`, `DIRECT_URL`, cliente público y el check oficial de integración
Supabase del mismo repositorio. La conexión de solo lectura confirmó las tablas propias de Precio
Radar. Preview y Production se desplegaron y verificaron como se detalla a continuación.

## Despliegue de producción — 2026-08-31

- Artefacto funcional exacto: `89489c632f85bc3323274df2f6b01707fa542cf6`.
- Integración durable: fast-forward de `origin/master` desde `f2acb93` al SHA anterior; sin force,
  reescritura ni merge divergente.
- Preview verificado: `https://precio-radar-19sn6z5a2-proyectosernet-1071s-projects.vercel.app`.
- Production verificado: `https://precio-radar-ftcxwxhdf-proyectosernet-1071s-projects.vercel.app`,
  con aliases `https://precio-radar.com`, `https://www.precio-radar.com` y
  `https://precio-radar.vercel.app`.
- Smoke Preview: `/`, `/buscar` y `/api/health` respondieron 200; Data Radar sin autorización
  respondió 401 y `Cache-Control: no-store`.
- Smoke Production: `/`, `/buscar`, `/indice` y `/api/health` respondieron 200; Data Radar sin
  autorización respondió 401 con payload pequeño. No se llamó el cron con autorización.
- Logs productivos revisados en la ventana posterior al deploy: 20 eventos, sin 5xx ni patrones
  sensibles; una sola llamada a Data Radar, la prueba 401. No se observó recurrencia por minuto
  en esa ventana, sin afirmar todavía comportamiento de largo plazo.
- Los deployments creados por esta misión pertenecen únicamente a `precio-radar`. Los deployments
  visibles de MarketPlace/Machina Latam son anteriores y no se modificaron.
- No hubo migraciones ni escrituras directas sobre la base.

## Rollback

1. Activar primero el kill switch para detener nuevas lecturas.
2. Si ya se desplegó, promover el deployment anterior de Precio Radar o revertir el único commit
   de esta misión y desplegar ese revert.
3. No revertir migraciones: esta misión no crea ninguna.
4. Confirmar que ninguna acción apunta a MarketPlace/Machina Latam.

## Runbook para el reinicio del 06/09/2026

Antes de habilitar: confirmar inequívocamente que el proyecto Vercel es `precio-radar`, que la
base enlazada es el proyecto Supabase Precio Radar y que las variables anteriores existen en el
entorno correcto.

1. **Una hora:** comprobar que llamadas sin autorización reciben 401 antes de acceder a DB;
   buscar logs `price-index-analysis` y confirmar como máximo una ejecución analítica aceptada,
   nunca una por minuto. Revisar `rowsRead <= 90000`, respuesta pequeña y ausencia de payloads
   sensibles.
2. **Seis horas:** comparar invocaciones reales con el cron esperado. Debe haber como máximo una
   ejecución analítica aceptada; las adicionales deben mostrar `cooldown` o `budget_exhausted`.
3. **Veinticuatro horas:** confirmar máximo una ejecución aceptada y calcular
   `Shared Pooler Egress diario × 31`. La referencia conservadora es ≤20,63 MB/día y 0,639 GB/mes.
4. Si el consumo supera 20,63 MB diarios de forma sostenida o la proyección supera 1 GB/mes,
   establecer `PRICE_RADAR_CRON_ENABLED=false` en Production y desplegar esa configuración antes
   de continuar la investigación. Si reaparece una ejecución pesada repetida, aplicar el mismo
   apagado de inmediato.

El consumo pasado no se reduce retroactivamente. El deployment está identificado, pero no debe
afirmarse que el egress real bajó hasta contar con métricas posteriores al reinicio.
