# MercadoLibre: cómo destrabar precios reales en la búsqueda

> Estado al 2026-05-20. El OAuth funciona; el bloqueo es de **permisos de la API**,
> no de código.

## Diagnóstico (evidencia real)

El token OAuth de la app (usuario `METALURGICA_MYF`, id `1344003777`) se guarda y
refresca bien, y autentica correctamente. Lo que está bloqueado es el acceso a
**precios** vía búsqueda. Probado con el token real, desde IP local y desde Vercel:

| Endpoint | Resultado | ¿Trae precio? |
|---|---|---|
| `/users/me` | 200 | — (valida token) |
| `/sites/MLA` | 200 (con token) | — |
| `/items/{id}` | 200 | ✅ precio + permalink |
| `/items?ids=A,B,C` (multiget) | 200 | ✅ precio + permalink |
| `/users/{id}/items/search` | 200 | solo items propios |
| `/products/search?site_id=MLA&q=…` | 200 | ❌ **sin precio** |
| `/products/{id}` (`buy_box_winner`) | 200 pero `buy_box_winner: null` | ❌ |
| **`/sites/MLA/search?q=…`** | **403 forbidden** | — endpoint cerrado |
| `/highlights/MLA/…` | 403 `PolicyAgent` | — |

**Conclusión:** MercadoLibre dejó de servir la búsqueda de ítems con precio
(`/sites/$SITE/search`) a apps no habilitadas, y la Catalog API (`/products/search`)
devuelve el catálogo **sin precio** y con `buy_box_winner` en `null` mientras la app
no tenga el permiso de buy box / catálogo. Ningún cambio de código devuelve precios:
hay que **habilitar la app en MercadoLibre**.

## Qué pedir / verificar (en orden)

1. **Panel de desarrolladores** → https://developers.mercadolibre.com.ar/
   - Entrá a *Mis aplicaciones* → tu app (la del `MERCADOLIBRE_CLIENT_ID` de Vercel).
   - Revisá **Permisos / Scopes** habilitados. Hoy el token trae `read write
     offline_access` + varios `urn:ml:mktp:…:/read-only`. Falta el permiso que
     habilita lectura de **buy box / precios de catálogo**.
   - Confirmá el **tipo de aplicación**. Las apps de uso interno/seller a veces no
     tienen acceso a search público; el acceso a búsqueda de catálogo con precios
     suele requerir aprobación.

2. **Probar token de aplicación (`client_credentials`)** — vale la pena descartarlo
   antes del trámite. Algunos recursos responden distinto con token de app que con
   token de usuario.

   **De dónde sacar el Client Secret:** en Vercel está como *Sensitive* (write-only,
   no se puede leer ni con `vercel env pull`). Sacalo del panel de MeLi:
   https://developers.mercadolibre.com.ar/ → *Tus integraciones* → tu app → ahí figuran
   *App ID* (= Client ID) y *Clave secreta* (= Client Secret).

   **Comando (PowerShell):**
   ```powershell
   $id = "TU_CLIENT_ID"
   $secret = "TU_CLIENT_SECRET"
   $resp = curl.exe -s -X POST https://api.mercadolibre.com/oauth/token -d "grant_type=client_credentials" -d "client_id=$id" -d "client_secret=$secret"
   $resp
   $tok = ($resp | ConvertFrom-Json).access_token
   curl.exe -s -w "`nHTTP %{http_code}`n" -H "Authorization: Bearer $tok" "https://api.mercadolibre.com/sites/MLA/search?q=samsung+galaxy&limit=2"
   ```
   - `HTTP 200` con productos → el app-token destraba la búsqueda; ajustar el provider
     para usar `client_credentials`.
   - `HTTP 403 forbidden` → el bloqueo es de la cuenta/app: necesitás el paso 3.

   **Resultado probado (2026-05-20): 403.** Sin token, con token de usuario y con
   token de app (`client_credentials`) → los tres dan `403 forbidden`. Confirma que el
   bloqueo es de plataforma, no de scope/tipo de token. Único camino: paso 3.

3. **Solicitar acceso a MercadoLibre** (Centro de Desarrolladores → Soporte / formulario
   de permisos). Pedí explícitamente: *acceso a la API de búsqueda de ítems y/o a
   `buy_box_winner` de la Catalog API para comparar precios*. Adjuntá la tabla de
   arriba: muestra que tu app autentica bien y que solo el recurso de precios está
   bloqueado (`403 forbidden` en `/sites/MLA/search`, `buy_box_winner: null` en
   `/products/{id}`).

4. **Programa de afiliados** (si aplica a tu caso de uso de comparador): ver
   `docs/afiliados-mercadolibre.md`. El acceso de afiliado a veces viene con permisos
   de lectura de precios.

## Texto listo para enviar a MercadoLibre (paso 3)

Mandar desde el Centro de Desarrolladores → Soporte / formulario de permisos, o por el
canal de contacto de la app. Reemplazar `APP_ID` por el Client ID real.

> **Asunto:** Solicitud de acceso a la API de búsqueda de ítems / precios de catálogo
>
> Hola. Desarrollo **PrecioRadar** (https://www.precio-radar.com), un comparador de
> precios para consumidores en Argentina. App ID `APP_ID`, cuenta `METALURGICA_MYF`
> (user_id 1344003777).
>
> El OAuth funciona y mi token autentica correctamente (`/users/me`, `/items/{id}`,
> `/sites/MLA` responden 200). Sin embargo necesito **leer precios para comparar
> ofertas** y hoy esos recursos me devuelven 403:
>
> - `GET /sites/MLA/search?q=...` → `403 forbidden` (sin token, con token de usuario
>   y con token de aplicación `client_credentials`).
> - `GET /products/{id}` → `buy_box_winner: null` (sin precio).
>
> ¿Qué permiso/scope o habilitación necesita mi aplicación para acceder a la búsqueda
> de ítems con precios y/o al `buy_box_winner` de la Catalog API? Mi uso es mostrar y
> comparar precios públicos enlazando a la publicación original en MercadoLibre
> (participo además del programa de Afiliados). Quedo a disposición para los pasos de
> verificación que necesiten. Gracias.

## Cómo re-testear cuando MeLi habilite el permiso

El endpoint de debug ya está listo y no requiere cambios:

```bash
curl -s -H "x-cron-secret: $CRON_SECRET" \
  "https://www.precio-radar.com/api/debug/mercadolibre?q=samsung%20galaxy%20a55"
```

- Si `probes.search.bearer.status` pasa de `403` a `200` con `resultCount > 0`,
  la búsqueda quedó habilitada.
- **Para reactivarla**, poné `MERCADOLIBRE_SEARCH_ENABLED=true` en las env vars
  (Vercel + `.env`). El search está apagado por un *capability gate* en
  `mercadoLibreProvider.searchProducts`: con el flag en `true` vuelve a usar
  `/sites/{site}/search` sin ningún otro cambio de código. Mientras el flag no
  esté, el provider ni siquiera llama al endpoint (evita latencia y ruido de logs).
- Si en cambio MeLi habilita solo `buy_box_winner` en la Catalog API, hay que
  reescribir `mercadoLibreProvider.searchProducts` para usar `/products/search` +
  `buy_box_winner` (cambio de código aparte, planificable).

## Mientras tanto

- **No tocar env vars de credenciales ni Vercel:** el token funciona
  (`client_credentials` + `/users/me` OK). El único faltante es el permiso de
  search del lado de MeLi. Re-confirmado manualmente el 2026-05-20 por PowerShell.
- El **capability gate** (`MERCADOLIBRE_SEARCH_ENABLED`, default off) mantiene el
  search MeLi desactivado sin romper nada: el sitio usa proveedores VTEX + datos
  manuales/demo cargados desde admin. Se reactiva con una sola env var.
- El flujo por **link pegado** (`/items/{id}`) sí trae precio real y queda
  siempre activo (no pasa por el gate). El fix del circuit breaker (2026-05-20)
  evita que el `403 forbidden` de search abra el circuito y tumbe ese flujo.
- La búsqueda por texto sigue cayendo a datos demo hasta que se habilite el permiso.
