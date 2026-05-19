"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";

type ErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
};

export function ErrorState({
  description = "Ocurrió un problema al cargar esta sección. Reintentá en unos segundos o volvé al inicio.",
  error,
  reset,
  title = "Algo salió mal",
}: ErrorStateProps) {
  useEffect(() => {
    console.error("[error-boundary]", {
      digest: error.digest,
      message: error.message,
      name: error.name,
    });
  }, [error]);

  return (
    <main className="bg-slate-50 py-12 text-slate-950">
      <Container>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-4 text-xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          {error.digest ? (
            <p className="mt-3 text-xs font-mono text-slate-400">
              error: {error.digest}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="button"
            >
              Reintentar
            </button>
            <Link
              className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href="/"
            >
              Volver al inicio
            </Link>
          </div>
        </Card>
      </Container>
    </main>
  );
}
