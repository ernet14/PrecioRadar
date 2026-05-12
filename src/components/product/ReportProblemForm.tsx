import { reportProductProblemAction } from "@/app/producto/[slug]/actions";
import { Button } from "@/components/ui/Button";
import type { ProductDetail } from "@/services/productService";

type ReportProblemFormProps = {
  product: ProductDetail;
  returnTo: string;
  selectedOfferKey?: string;
};

const reportReasons = [
  { label: "Precio incorrecto", value: "incorrect_price" },
  { label: "Producto mal relacionado", value: "wrong_product_match" },
  { label: "Link roto", value: "broken_link" },
  { label: "Oferta sospechosa", value: "suspicious_offer" },
  { label: "Otro problema", value: "other" },
];

function getOfferKey(storeSlug: string, externalId: string) {
  return `${storeSlug}:${externalId}`;
}

export function ReportProblemForm({
  product,
  returnTo,
  selectedOfferKey = "",
}: ReportProblemFormProps) {
  return (
    <form
      action={reportProductProblemAction}
      className="mt-5 space-y-3"
      id="reportar-problema"
    >
      <input name="productSlug" type="hidden" value={product.slug} />
      <input name="returnTo" type="hidden" value={returnTo} />

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Tipo de problema
        </span>
        <select
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          name="reason"
          required
        >
          {reportReasons.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Oferta relacionada
        </span>
        <select
          className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          defaultValue={selectedOfferKey}
          name="offerKey"
        >
          <option value="">Producto en general</option>
          {product.offers.map((offer) => (
            <option
              key={`${offer.storeSlug}-${offer.externalId}`}
              value={getOfferKey(offer.storeSlug, offer.externalId)}
            >
              {offer.storeName}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Detalle opcional
        </span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          maxLength={500}
          name="message"
          placeholder="Contanos que viste para revisarlo."
        />
      </label>

      <Button
        className="w-full border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50"
        type="submit"
        variant="secondary"
      >
        Reportar problema
      </Button>
    </form>
  );
}
