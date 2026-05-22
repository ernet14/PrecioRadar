import Link from "next/link";
import { Container } from "@/components/layout/Container";

const productLinks = [
  { href: "/#buscar", label: "Buscar" },
  { href: "/#categorias", label: "Categorías" },
  { href: "/guias", label: "Guías de compra" },
  { href: "/promos-hoy", label: "Promos bancarias" },
  { href: "/termometro", label: "Termómetro de ofertas" },
  { href: "/api-docs", label: "API para desarrolladores" },
  { href: "/api-planes", label: "Planes de la API" },
  { href: "/#como-funciona", label: "Cómo funciona" },
];

const companyLinks = [
  { href: "/quienes-somos", label: "Quiénes somos" },
  { href: "/como-funcionamos", label: "Cómo funcionamos" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/terminos", label: "Términos" },
  { href: "/cookies", label: "Cookies" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-12">
        <div>
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950"
            aria-label="PrecioRadar"
          >
            <span
              aria-hidden
              className="relative grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)]"
            >
              <span className="absolute inset-1 rounded-md border border-white/25" />
              <span className="absolute h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.85)]" />
            </span>
            <span className="leading-none">
              Precio<span className="text-indigo-600">Radar</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
            Comparador de precios en Argentina con historial, alertas y
            recomendaciones para detectar ofertas reales.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Producto
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {productLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="transition hover:text-indigo-700"
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Sobre nosotros
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link
                  className="transition hover:text-indigo-700"
                  href={link.href}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="border-t border-slate-200">
        <Container className="flex flex-col gap-2 py-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© {year} PrecioRadar · Hecho en Argentina</p>
          <p className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
            />
            Beta · Mejorando todas las semanas
          </p>
        </Container>
      </div>
    </footer>
  );
}
