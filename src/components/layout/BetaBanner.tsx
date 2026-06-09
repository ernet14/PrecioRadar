import Link from "next/link";
import { Container } from "@/components/layout/Container";

export function BetaBanner() {
  return (
    <div className="border-b border-indigo-200/60 bg-gradient-to-r from-indigo-50 via-white to-emerald-50">
      <Container className="flex items-center justify-between gap-3 py-2 text-xs leading-5 text-slate-700">
        <p className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          />
          <span>
            <span className="font-semibold text-slate-950">
              Comprá con más contexto.
            </span>
            <span className="hidden sm:inline">
              {" "}
              Guardamos historial, comparamos cambios y mostramos una señal
              simple cuando hay información suficiente.
            </span>
          </span>
        </p>
        <Link
          className="shrink-0 font-semibold text-indigo-700 underline-offset-2 hover:underline"
          href="/como-funciona"
        >
          Cómo funciona
        </Link>
      </Container>
    </div>
  );
}
