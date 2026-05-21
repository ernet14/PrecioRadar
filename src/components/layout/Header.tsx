import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/auth";

const navLinkClass =
  "relative text-slate-600 transition hover:text-slate-950 after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-gradient-to-r after:from-indigo-500 after:to-emerald-400 after:transition-all hover:after:w-full";

const linkButtonBase =
  "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const secondaryLinkClass = `${linkButtonBase} border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/60 focus-visible:outline-indigo-400`;
const primaryLinkClass = `${linkButtonBase} bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.55)] hover:from-indigo-500 hover:to-indigo-700 focus-visible:outline-indigo-500`;

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <Container className="flex min-h-16 items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="group flex items-center gap-2 text-lg font-bold tracking-tight text-slate-950"
          aria-label="PrecioRadar inicio"
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

        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link className={navLinkClass} href="/#buscar">
            Buscar
          </Link>
          <Link className={navLinkClass} href="/#categorias">
            Categorías
          </Link>
          <Link className={navLinkClass} href="/guias">
            Guías
          </Link>
          <Link className={navLinkClass} href="/promos-hoy">
            Promos
          </Link>
          <Link className={navLinkClass} href="/#como-funciona">
            Cómo funciona
          </Link>
        </nav>

        {user ? (
          <div className="flex items-center gap-2">
            <Link className={secondaryLinkClass} href="/sellers">
              Precios PRO
            </Link>
            <Link className={secondaryLinkClass} href="/dashboard">
              Dashboard
            </Link>
            <form action={logoutAction}>
              <Button size="sm" type="submit" variant="ghost">
                Salir
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link className={secondaryLinkClass} href="/login">
              Ingresar
            </Link>
            <Link className={primaryLinkClass} href="/registro">
              Registrarse
            </Link>
          </div>
        )}
      </Container>
    </header>
  );
}
