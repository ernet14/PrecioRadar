import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Servicios",
  robots: { follow: false, index: false },
};

// Consolas externas más usadas, a un clic desde el admin.
const QUICK_LINKS: { group: string; links: { label: string; href: string }[] }[] = [
  {
    group: "Infra",
    links: [
      { label: "Vercel · Deployments", href: "https://vercel.com/dashboard/deployments" },
      { label: "Vercel · Logs", href: "https://vercel.com/dashboard/usage/logs" },
      { label: "Vercel · Env vars", href: "https://vercel.com/dashboard/environment-variables" },
      { label: "Supabase · SQL", href: "https://supabase.com/dashboard/project/_/sql/new" },
      { label: "Supabase · Auth Users", href: "https://supabase.com/dashboard/project/_/auth/users" },
      { label: "Upstash · Redis", href: "https://console.upstash.com/redis" },
      { label: "Cloudflare", href: "https://dash.cloudflare.com/" },
    ],
  },
  {
    group: "SEO / Email / MeLi",
    links: [
      { label: "Search Console", href: "https://search.google.com/search-console" },
      { label: "Sentry · Issues", href: "https://sentry.io/issues/" },
      { label: "Resend · Emails", href: "https://resend.com/emails" },
      { label: "MeLi · Devcenter", href: "https://developers.mercadolibre.com.ar/devcenter" },
      { label: "MeLi · Afiliados", href: "https://www.mercadolibre.com.ar/afiliados" },
    ],
  },
];

export default async function AdminServiciosPage() {
  await requireAdmin();

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section>
          <Link
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
            href="/admin"
          >
            &lt;- Admin
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Atajos a las consolas externas que más usás. Solo links, no se exponen secretos.
          </p>
        </section>

        <div className="space-y-6">
          {QUICK_LINKS.map((section) => (
            <Card
              className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              key={section.group}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {section.group}
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <a
                      className="flex h-full items-center rounded-lg border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      href={link.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
