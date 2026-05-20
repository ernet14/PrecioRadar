import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/supabase/auth";
import {
  formatDayOfWeek,
  formatPromoBenefit,
  listAllBankPromos,
} from "@/services/bankPromoService";
import type { BankPromo } from "@/services/bankPromoService";
import { CreatePromoForm } from "./CreatePromoForm";
import { deletePromoAction, togglePromoAction } from "./actions";

function PromoRow({ promo }: { promo: BankPromo }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">
            {promo.entity} - {formatPromoBenefit(promo)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {formatDayOfWeek(promo.dayOfWeek)} - Pago: {promo.paymentType}
            {promo.storeSlug ? ` - Tienda: ${promo.storeSlug}` : ""}
            {promo.categorySlug ? ` - Categoria: ${promo.categorySlug}` : ""}
            {promo.commerceChannel ? ` - Canal: ${promo.commerceChannel}` : ""}
          </p>
          {promo.notes ? (
            <p className="mt-1 text-xs text-slate-400">{promo.notes}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            promo.active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {promo.active ? "Activa" : "Inactiva"}
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        <form
          action={async () => {
            "use server";
            await togglePromoAction(promo.id, !promo.active);
          }}
        >
          <button
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            type="submit"
          >
            {promo.active ? "Desactivar" : "Activar"}
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await deletePromoAction(promo.id);
          }}
        >
          <button
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            type="submit"
          >
            Eliminar
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function PromosPage() {
  await requireAdmin();
  const promos = await listAllBankPromos();

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="flex items-center justify-between gap-4">
          <div>
            <Link
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
              href="/admin"
            >
              &lt;- Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Promos bancarias</h1>
            <p className="mt-1 text-sm text-slate-500">
              Descuentos, reintegros y cuotas sin interes vigentes.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
            {promos.length} promos
          </span>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {promos.length > 0 ? (
              promos.map((promo) => <PromoRow key={promo.id} promo={promo} />)
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                No hay promos cargadas todavia.
              </p>
            )}
          </div>

          <Card className="border-slate-200 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
            <h2 className="text-lg font-semibold text-slate-950">Nueva promo</h2>
            <p className="mt-1 text-sm text-slate-500">
              Los campos marcados con * son requeridos.
            </p>
            <CreatePromoForm />
          </Card>
        </section>
      </Container>
    </main>
  );
}
