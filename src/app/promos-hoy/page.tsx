import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { CommercialEventBanner } from "@/components/commercial/CommercialEventBanner";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { getAbsoluteUrl } from "@/lib/seo/site";
import {
  formatDayOfWeek,
  formatPromoBenefit,
  getActivePromosForDate,
} from "@/services/bankPromoService";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Promos bancarias hoy en Argentina",
  description:
    "Calendario diario de descuentos, reintegros y cuotas sin interes para comprar online en Argentina.",
  alternates: { canonical: getAbsoluteUrl("/promos-hoy") },
};

function scopeLabel(promo: {
  categorySlug: string | null;
  commerceChannel: string;
  storeSlug: string | null;
}) {
  const parts = [
    promo.storeSlug ? `Tienda: ${promo.storeSlug}` : "Todas las tiendas",
    promo.categorySlug ? `Categoria: ${promo.categorySlug}` : "Todas las categorias",
    promo.commerceChannel === "both"
      ? "Online y fisica"
      : promo.commerceChannel === "physical"
        ? "Fisica"
        : "Online",
  ];

  return parts.join(" - ");
}

export default async function PromosHoyPage() {
  const today = new Date();
  const promos = await getActivePromosForDate({ date: today });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: promos.map((promo, index) => ({
      "@type": "ListItem",
      item: {
        "@type": "Offer",
        description: `${promo.entity} - ${formatPromoBenefit(promo)}`,
        validFrom: promo.validFrom.toISOString(),
        ...(promo.validUntil ? { validThrough: promo.validUntil.toISOString() } : {}),
      },
      position: index + 1,
    })),
    name: "Promos bancarias de hoy",
  };

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CommercialEventBanner now={today} />
      <Container className="space-y-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
          <p className="text-sm font-semibold text-emerald-200">
            Actualizado {formatDate(today)}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Promos bancarias hoy
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            Descuentos, reintegros y cuotas disponibles para comparar el precio
            final antes de comprar.
          </p>
          <p className="mt-4 max-w-2xl text-xs leading-5 text-slate-400">
            Informacion orientativa, sujeta a cambios sin previo aviso. No somos
            el emisor de estas promociones ni tenemos relacion con los bancos o
            billeteras mencionados: verifica las condiciones en la fuente oficial
            antes de comprar.
          </p>
        </section>

        {promos.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {promos.map((promo) => (
              <Card
                className="flex h-full flex-col justify-between border-slate-200 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
                key={promo.id}
              >
                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    {formatDayOfWeek(promo.dayOfWeek)}
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    {promo.entity}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {formatPromoBenefit(promo)}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {scopeLabel(promo)} - Pago: {promo.paymentType}
                  </p>
                  {promo.notes ? (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                      {promo.notes}
                    </p>
                  ) : null}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                  <span>
                    Hasta {promo.validUntil ? formatDate(promo.validUntil) : "nuevo aviso"}
                  </span>
                  {promo.sourceUrl ? (
                    <a
                      className="text-emerald-700 hover:underline"
                      href={promo.sourceUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Fuente
                    </a>
                  ) : null}
                </div>
              </Card>
            ))}
          </section>
        ) : (
          <Card className="border-dashed border-slate-200 p-6 text-sm text-slate-500">
            Por ahora no tenemos promos bancarias confirmadas para hoy. Volve a
            revisar: actualizamos el calendario seguido.
          </Card>
        )}
      </Container>
    </main>
  );
}
