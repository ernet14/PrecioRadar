import Link from "next/link";
import { Container } from "@/components/layout/Container";

export function BetaBanner() {
  return (
    <div className="border-b border-indigo-200/60 bg-gradient-to-r from-indigo-50 via-white to-emerald-50">
      <Container className="flex flex-col gap-1 py-2 text-xs leading-5 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          />
          <span>
            <span className="font-semibold text-slate-950">
              PrecioRadar está en beta.
            </span>{" "}
            Comparamos precios reales de MercadoLibre y sumamos tiendas todas
            las semanas.
          </span>
        </p>
        <Link
          className="shrink-0 font-semibold text-indigo-700 underline-offset-2 hover:underline"
          href="/como-funcionamos"
        >
          Cómo funcionamos →
        </Link>
      </Container>
    </div>
  );
}
