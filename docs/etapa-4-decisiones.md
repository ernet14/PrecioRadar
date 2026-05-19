# ETAPA 4 — Decisiones de compliance diferidas

Notas técnicas de ETAPA 4 (Ley 25.326 + Disposición 60/2016) que quedan documentadas para no perder contexto.

## 1. Eliminar mi cuenta NO borra al usuario en Supabase Auth

**Comportamiento actual del MVP** (`src/app/account/actions.ts`):

- Borramos en cascada en Prisma: `Alert`, `TrackedProduct`, `Notification`, `ClickTracking`, `SearchLog` del usuario.
- Anonimizamos `ProductReport.userId = null` (conservamos la señal agregada).
- Soft-delete del `User`: `deletedAt = NOW()`, `email = deleted-<uid>@precioradar.invalid`, `name = null`.
- Registramos `account.delete` en `AuditLog`.
- Hacemos `supabase.auth.signOut()` para cerrar la sesión actual.

**Lo que NO hace:** invocar `supabase.auth.admin.deleteUser(uid)`. La cuenta sigue existiendo en el namespace de Supabase Auth.

### Por qué se dejó así

- `admin.deleteUser` requiere el `service_role` key. Llamarla desde una Server Action implica:
  - Cargar `SUPABASE_SERVICE_ROLE_KEY` server-side con un cliente admin separado (no el que usa `createServerSupabaseClient`).
  - Manejar el caso de que el delete en Auth falle DESPUÉS de haber borrado en Prisma — quedás con state inconsistente.
  - Decidir qué hacer si el usuario vuelve a registrarse con el mismo email: hoy puede, porque Auth no recuerda. Si borráramos el row de Auth, ese mismo email queda libre — bien o mal según el caso.
- El comportamiento actual cumple Ley 25.326 art. 16: el usuario no puede acceder a sus datos personales después del borrado y los datos están anonimizados/borrados en nuestra base.

### Cuándo resolverlo

Cuando uno de estos triggers se dé:

- Pedido formal AAIP que exija constatar el borrado en Auth (poco probable, pero posible).
- Migración de Supabase a otro proveedor (en ese momento conviene limpiar Auth antes de migrar).
- Implementación del flujo de "exportar datos + cerrar cuenta" automatizado a 48h (etapa de madurez B2B / SaaS).

### Cómo se haría

Implementación mínima sugerida cuando se decida hacerlo:

```ts
// src/lib/supabase/admin.ts (nuevo)
import { createClient } from "@supabase/supabase-js";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return cachedClient;
}
```

Y en `deleteAccountAction`, después del transaction de Prisma y antes del `signOut()`:

```ts
const admin = getSupabaseAdminClient();
if (admin) {
  await admin.auth.admin.deleteUser(user.id);
}
```

Reglas para cuando se implemente:

1. La key `SUPABASE_SERVICE_ROLE_KEY` ya está cargada en Vercel envs (verificá scope: Production + Preview, **nunca Development a menos que sea una key separada**).
2. Marcar la variable como `Sensitive` en Vercel (igual que `AUDIT_IP_HASH_SALT`).
3. La llamada a `admin.deleteUser` debe envolverse en try/catch — si falla DESPUÉS del soft-delete en Prisma, registrar en `AuditLog` con `event=account.delete` y `metadata.authDeleteFailed=true`. La cuenta queda en estado "datos borrados, Auth zombi" y debe limpiarse manualmente.
4. Considerar mover todo el flujo a una queue (Vercel Queues cuando esté GA, o Upstash QStash hoy) para que el cierre completo sea async y resista fallas parciales.

### Mientras tanto

- Si un usuario pide eliminación completa por ARCO y el soft-delete actual no le alcanza, la limpieza en Auth se hace manualmente desde el dashboard de Supabase (Auth → Users → Delete user). Documentarlo en el procedimiento de respuesta ARCO interno.
- Anotar el UUID antes de borrarlo manualmente en `AuditLog` con `event=account.delete` y `metadata.authDeletedManually=true` para mantener trazabilidad.
