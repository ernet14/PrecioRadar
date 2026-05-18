import Link from "next/link";
import { Container } from "@/components/layout/Container";

export function BetaBanner() {
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <Container className="flex flex-col gap-1 py-2 text-xs leading-5 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold">PrecioRadar est&aacute; en beta.</span>{" "}
          Hoy comparamos precios reales de MercadoLibre y sumamos m&aacute;s
          tiendas todas las semanas. El cat&aacute;logo destacado se muestra como
          demostraci&oacute;n.
        </p>
        <Link
          className="shrink-0 font-semibold text-amber-900 underline-offset-2 hover:underline"
          href="/como-funcionamos"
        >
          C&oacute;mo funcionamos
        </Link>
      </Container>
    </div>
  );
}
