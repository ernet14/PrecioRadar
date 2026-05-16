"use client";

import { useEffect } from "react";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";

export default function BuscarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-slate-50 py-12 text-slate-950">
      <Container>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            Algo salió mal con la búsqueda
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            No pudimos procesar tu búsqueda. Podés reintentar o volver al inicio.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Reintentar
            </button>
          </div>
        </Card>
      </Container>
    </main>
  );
}
