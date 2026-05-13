This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Auth MVP

Supabase Auth is prepared for email/password using `@supabase/supabase-js` and
`@supabase/ssr`.

Required local variables:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="[SUPABASE_PUBLISHABLE_OR_ANON_KEY]"
# NEXT_PUBLIC_SUPABASE_ANON_KEY also works as fallback.
DATABASE_URL="postgresql://..."
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-only and is not used by the browser
auth flow.

User sync is intentionally simple: after a successful login or signup, the
Supabase `auth.users.id` is used as `User.id` in Prisma and the email/name are
upserted through `src/services/userSyncService.ts`. If `DATABASE_URL` still has
placeholder values, auth can compile and the sync is skipped until the real
database is configured.

## Local Codex skills

Project-local agent skills are intentionally ignored by Git. To recreate the
marketing skills locally, run:

```bash
npx skills add coreyhaines31/marketingskills --skill product-marketing-context page-cro copywriting seo-audit site-architecture schema-markup social-content cold-email
```

## Internal alert evaluation endpoint

The MVP alert evaluator is exposed at `/api/internal/evaluate-alerts` for cron
jobs or manual internal runs. Configure `CRON_SECRET` server-side and call it
with either `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret:
<CRON_SECRET>`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
