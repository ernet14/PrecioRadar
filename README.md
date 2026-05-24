# PrecioRadar

Comparador de precios para Argentina en transición hacia una **capa de datos de
precios** (índice de inflación). Stack: Next.js 16 · React 19 · Prisma 7 ·
Supabase (Postgres) · Upstash · Vercel. Dominio: `www.precio-radar.com`.

## Contexto para IA / nuevos devs

Empezá por **[`CLAUDE.md`](CLAUDE.md)** (índice) → [`docs/contexto/`](docs/contexto)
(qué es y cómo está armado) → [`docs/memory/`](docs/memory) (decisiones y
aprendizajes). Las reglas de trabajo viven en [`AGENTS.md`](AGENTS.md).

## Setup local

1. `npm install`
2. Copiar `.env.example` → `.env.local` y completar variables (**nunca** commitear
   secretos). Auth usa Supabase; sin `DATABASE_URL` real la app compila y saltea el sync.
3. `npm run dev` → http://localhost:3000

## Scripts

- `npm run dev` / `build` / `start`
- `npm test` (node:test + tsx, lista explícita en `package.json`) · `npm run test:e2e` (Playwright)
- `npm run lint` (eslint) · `npm run db:generate` (prisma generate) · `npm run db:seed`

## Crons (`vercel.json`, horario UTC)

- `09:00` `/api/internal/refresh-prices` — snapshot de precios + compactación de historial.
- `10:00` `/api/internal/evaluate-bank-promos` — limpia/actualiza promos del bot + notifica.
- `13:00` `/api/internal/evaluate-alerts` — evalúa alertas de usuario y notifica.

Otros (`health-watch`, `daily-report`, `generate-descriptions`) van por **trigger
externo** porque Hobby limita la cantidad de crons. Todas las rutas internas están
protegidas por `CRON_SECRET` (`Authorization: Bearer <CRON_SECRET>` o `x-cron-secret`).

## Deploy

Push a `master` → Vercel buildea y deploya. **Regla crítica de migraciones:** nunca
`prisma migrate dev/reset` contra Supabase prod; usar SQL manual + `prisma migrate resolve`.
Checklist previo a deploys públicos: [`docs/mvp-qa-deploy-checklist.md`](docs/mvp-qa-deploy-checklist.md).
