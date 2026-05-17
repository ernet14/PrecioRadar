import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { guides } from "@/content/guides";

export const metadata: Metadata = {
  title: "Guias de compra en Argentina 2026",
  description:
    "Guías prácticas para comprar tecnología y electrónica en Argentina sin pagar de más. Comparación de precios, historial y consejos actualizados en 2026.",
  alternates: { canonical: "/guias" },
};

export default function GuiasPage() {
  return (
    <main className="bg-slate-50 py-10 text-slate-950">
      <Container className="space-y-10">
        <header className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Contenido editorial
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-slate-950">
            Guías de compra en Argentina
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600">
            Artículos prácticos para comprar tecnología y electrónica sin pagar de más.
            Actualizados con datos reales de precios.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <Link key={guide.slug} href={`/guias/${guide.slug}`}>
              <Card className="h-full p-6 transition hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {guide.category}
                </span>
                <h2 className="mt-4 text-lg font-semibold leading-snug text-slate-950">
                  {guide.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                  {guide.description}
                </p>
                <p className="mt-4 text-xs font-medium text-slate-400">
                  {guide.readingMinutes} min de lectura · Actualizado {guide.updatedAt}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            ¿Querés recibir las mejores ofertas verificadas?
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Seguí{" "}
            <Link href="/buscar" className="font-semibold text-blue-700 hover:underline">
              buscando productos
            </Link>{" "}
            y activá alertas de precio para que te avisemos cuando baje.
          </p>
        </div>
      </Container>
    </main>
  );
}
