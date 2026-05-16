"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";

export default function ProductoError({
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
    <main className="bg-[#f4f7fb] py-12 text-slate-950">
      <Container>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            No pudimos cargar este producto
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Hubo un error al obtener la información. Podés reintentar o volver a buscar.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Reintentar
            </button>
            <Link
              href="/buscar"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Volver a buscar
            </Link>
          </div>
        </Card>
      </Container>
    </main>
  );
}
