import Link from "next/link";
import { Container } from "@/components/layout/Container";

export function BetaBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <Container className="flex flex-col gap-1 py-2 text-xs leading-5 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold">PrecioRadar está en beta.</span>{" "}
          Hoy comparamos precios reales de MercadoLibre y sumamos más
          tiendas todas las semanas. El catálogo destacado se muestra como
          demostración.
        </p>
        <Link
          className="shrink-0 font-semibold text-amber-900 underline-offset-2 hover:underline"
          href="/como-funcionamos"
        >
          Cómo funcionamos
        </Link>
      </Container>
    </div>
  );
}
