"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS: { href: string; label: string; exact?: boolean }[] = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/promos", label: "Promos" },
  { href: "/admin/importar", label: "Importar" },
  { href: "/admin/monitor", label: "Monitor en vivo" },
  { href: "/admin/status", label: "Estado" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/keys", label: "API keys" },
];

// Consolas externas más usadas, a mano desde cualquier pestaña.
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

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
        <span className="mr-2 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">
          Admin
        </span>
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                active
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
              href={tab.href}
              key={tab.href}
            >
              {tab.label}
            </Link>
          );
        })}

        <details className="group relative ml-auto shrink-0">
          <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            Servicios
            <span aria-hidden className="text-slate-400 transition group-open:rotate-180">▾</span>
          </summary>
          <div className="absolute right-0 z-40 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.15)]">
            {QUICK_LINKS.map((section) => (
              <div className="mb-1 last:mb-0" key={section.group}>
                <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {section.group}
                </p>
                {section.links.map((link) => (
                  <a
                    className="block rounded-md px-2 py-1.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    href={link.href}
                    key={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
