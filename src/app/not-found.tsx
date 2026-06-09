import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <main className="bg-slate-50 py-16 text-slate-950">
      <Container>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-indigo-700">
            Error 404
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            No encontramos esta página
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            El enlace puede estar desactualizado o la página ya no estar disponible.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              href="/buscar"
            >
              Buscar productos
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-indigo-300 hover:text-indigo-700"
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
