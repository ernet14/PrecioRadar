# Seguridad — OWASP Top 10

Referencia adoptada: [OWASP Top 10:2025](https://owasp.org/Top10/2025/).

OWASP ya publica 2025 como version vigente. La version 2021 queda como referencia historica,
especialmente por SSRF, que en PrecioRadar sigue cubierto como riesgo explicito aunque ya no sea
la categoria A10 principal de 2025.

## Estado actual

| Riesgo OWASP 2025 | Estado | Controles actuales | Pendiente recomendado |
| --- | --- | --- | --- |
| A01 Broken Access Control | Parcial alto | Admin solo por `app_metadata.role` + `ADMIN_EMAILS`; RLS deny-all en tablas de app; ownership en baja de push subscriptions. | Prueba E2E con dos usuarios reales validando que no acceden a datos cruzados. |
| A02 Security Misconfiguration | Parcial alto | Headers en `next.config.ts`, CSP mas estricta en prod, `images.remotePatterns` allowlisteado, RLS aplicado por Prisma. | Escaneo post-deploy con securityheaders.com y revision de envs prod antes de cada release. |
| A03 Software Supply Chain Failures | Parcial | `npm audit` en 0, Next actualizado a version fija, overrides para transitivas vulnerables. | Automatizar auditoria en CI y alertas de dependencias. |
| A04 Cryptographic Failures | Parcial | HTTPS/TLS por hosting, service role fuera del cliente, `AUDIT_IP_HASH_SALT` obligatorio en prod. | Politica de rotacion de secretos y verificacion de backups/cifrado del proveedor. |
| A05 Injection | Parcial | Prisma evita SQL manual en flujos principales; validadores Zod/input helpers en endpoints criticos; URLs externas parseadas con `URL`. | Auditar todos los endpoints y server actions para validacion de input consistente. |
| A06 Insecure Design | Parcial | Flujos sensibles fallan cerrado en prod; allowlists para redirects/fetch/image; API publica separada por keys/tier. | Mantener threat model liviano por feature sensible antes de implementar. |
| A07 Authentication Failures | Parcial alto | Supabase Auth; admin no depende de metadata editable; `ADMIN_EMAILS` requerido en prod. | MFA obligatorio para administradores si Supabase/plan lo permite. |
| A08 Software or Data Integrity Failures | Parcial | Migraciones versionadas, deploy por Prisma CLI, lockfile versionado, no uso de scripts temporales sensibles en repo. | Branch protection y CI obligatorio antes de merge/deploy. |
| A09 Security Logging and Alerting Failures | Parcial | `AuditLog`, `ProviderLog`, monitoreo de salud, Sentry soportado por env. | Alertas operativas para eventos admin, errores auth, rate limit y fallas de provider. |
| A10 Mishandling of Exceptional Conditions | Parcial | Rate limit auth/API falla cerrado en prod; auditoria no usa salt inseguro; errores de fetch externo no siguen redirects inseguros. | Pruebas de fallo: env faltantes, Redis caido, Supabase caido y providers externos caidos. |

## Cobertura adicional OWASP 2021: SSRF

Aunque SSRF era A10 en OWASP 2021 y no aparece como A10 en 2025, PrecioRadar lo trata como
riesgo critico por importar productos, seguir redirects y consumir fuentes externas.

Controles actuales:

- `isAllowedOutboundUrl`, `isAllowedImageUrl` y helpers de bloqueo de hosts privados/locales.
- `fetchWithAllowedRedirects` valida cada redirect antes de seguirlo.
- `/api/out` rechaza destinos no permitidos.
- Importacion de productos sanitiza `externalUrl`, `affiliateUrl` e `imageUrl`.

Pendiente:

- Agregar pruebas E2E o integracion contra redirects encadenados reales/controlados.
- Revisar periodicamente allowlists de tiendas/CDNs para evitar aperturas amplias.
