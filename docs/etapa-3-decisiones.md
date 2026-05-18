# ETAPA 3 — Decisiones de seguridad diferidas

Tres decisiones tomadas durante la implementación de ETAPA 3 que conscientemente quedaron como mejora futura. Este documento las deja rastreables para no perderlas.

## 1. CSP con `'unsafe-inline'` y `'unsafe-eval'` en `script-src`

**Estado actual:** `next.config.ts` define una CSP con allowlist explícito de orígenes (Supabase, Sentry, Vercel Analytics, MercadoLibre images) pero mantiene `'unsafe-inline'` y `'unsafe-eval'` en `script-src`.

**Por qué se dejó así:** Next.js 16 inyecta scripts y estilos inline para hidratación de Server Components y Turbopack. Sacar `'unsafe-inline'` sin un pipeline de nonces rompe la app entera. Implementar nonces estrictos requiere middleware/proxy que inyecte un nonce por request y lo propague a todo `<Script>` y `<style>` server-rendered, más pruebas E2E completas.

**Cuándo resolverlo:** ETAPA 7 (Robustez de runtime), junto con middleware, rate limiting maduro y Sentry afinado. Esa etapa ya planea tocar el proxy/middleware, es el momento natural.

**Mientras tanto:** la defensa real viene de `frame-ancestors 'self'`, `object-src 'none'`, `upgrade-insecure-requests` y la allowlist de orígenes. No es CSP estricta, pero detiene el caso típico de inyección de scripts externos.

## 2. `AuditLog` append-only — sin excepción para purga/retención

**Estado actual:** triggers `BEFORE UPDATE` y `BEFORE DELETE` bloquean cualquier mutación con `RAISE EXCEPTION`, incluso para el rol `postgres` directo. Solo se puede revertir desactivando temporalmente los triggers.

**Por qué se dejó así:** la Ley 25.326 (art. 16) requiere que los datos personales se puedan eliminar a pedido del titular. Si un usuario pide derecho de supresión, sus eventos en `AuditLog` deberían poder borrarse o anonimizarse. Hoy esto requiere intervención manual del DBA (drop trigger, delete, recreate trigger).

**Cuándo resolverlo:** ETAPA 4 (Compliance legal AAIP + ARCO automatizado). Cuando construyamos el endpoint `/api/me/data-export` y el botón "Eliminar mi cuenta", debemos definir:

- Si el log entero se borra (pierde valor probatorio del propio acto del usuario).
- Si solo se anonimiza el `actorId` y `actorEmail` pero se mantiene el evento.
- Si se conserva un período mínimo legal (ej: 12 meses) y después se anonimiza.

Recomendación inicial: anonimizar `actorEmail` y `actorId` (null) pero mantener `event`, `createdAt`, `ipHash`. Implementar mediante un endpoint admin que ejecute como service role con triggers temporalmente deshabilitados o como función `SECURITY DEFINER`.

**Mientras tanto:** no exponemos endpoint de purga. La regla por defecto es "logs no se modifican" — bueno para forensia, inadecuado para ARCO total.

## 3. `AUDIT_IP_HASH_SALT` en Vercel

**Estado actual:** `auditLogService.hashIp` usa `AUDIT_IP_HASH_SALT` desde env, con default `"precioradar-default-salt"` si no está seteado.

**Acción requerida (fuera de código):** generar 3 valores distintos (Production, Preview, Development) con:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Cargarlos como `AUDIT_IP_HASH_SALT` en Vercel Dashboard → Settings → Environment Variables, scoped al environment correspondiente. Después redeploy a Production una vez.

**Cuándo rotar:** mínimo cada 6 meses (alineado con la `Secret rotation policy` que aún no documentamos formalmente — pendiente para ETAPA 3 o ETAPA 4).
