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
  { href: "/admin/servicios", label: "Servicios" },
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
      </div>
    </nav>
  );
}
