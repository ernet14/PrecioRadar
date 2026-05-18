import Link from "next/link";
import { logoutAction } from "@/app/auth/actions";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/supabase/auth";

const navLinkClass = "transition hover:text-slate-950";
const linkButtonClass =
  "inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const secondaryLinkButtonClass = `${linkButtonClass} border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400`;
const primaryLinkButtonClass = `${linkButtonClass} bg-slate-950 text-white shadow-sm hover:bg-slate-800 focus-visible:outline-slate-950`;

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <Container className="flex min-h-16 items-center justify-between gap-4 py-3">
        <Link
          href="/"
          className="text-xl font-semibold tracking-normal text-slate-950"
          aria-label="PrecioRadar inicio"
        >
          Precio<span className="text-emerald-600">Radar</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link className={navLinkClass} href="/#buscar">
            Buscar
          </Link>
          <Link className={navLinkClass} href="/#categorias">
            Categorías
          </Link>
          <Link className={navLinkClass} href="/#como-funciona">
            Cómo funciona
          </Link>
        </nav>

        {user ? (
          <div className="flex items-center gap-2">
            <Link className={secondaryLinkButtonClass} href="/dashboard">
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
            <Link className={secondaryLinkButtonClass} href="/login">
              Ingresar
            </Link>
            <Link className={primaryLinkButtonClass} href="/registro">
              Registrarse
            </Link>
          </div>
        )}
      </Container>
    </header>
  );
}
