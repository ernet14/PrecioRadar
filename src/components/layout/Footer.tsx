import Link from "next/link";
import { Container } from "@/components/layout/Container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="flex flex-col gap-4 py-8 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div>
          <p>
            Algunos enlaces pueden generar una comisi&oacute;n para mantener
            PrecioRadar, sin costo extra para vos.
          </p>
          <nav className="mt-3 flex flex-wrap gap-4 font-medium text-slate-700">
            <Link className="transition hover:text-slate-950" href="/como-funcionamos">
              C&oacute;mo funcionamos
            </Link>
            <Link className="transition hover:text-slate-950" href="/guias">
              Gu&iacute;as
            </Link>
            <Link className="transition hover:text-slate-950" href="/privacidad">
              Privacidad
            </Link>
            <Link className="transition hover:text-slate-950" href="/terminos">
              T&eacute;rminos
            </Link>
            <Link className="transition hover:text-slate-950" href="/cookies">
              Cookies
            </Link>
          </nav>
        </div>
        <p className="font-medium text-slate-700">PrecioRadar</p>
      </Container>
    </footer>
  );
}
