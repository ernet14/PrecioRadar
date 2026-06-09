import type { DealQuality, DealVerdict } from "@/services/fakeDiscountService";

const VERDICT_CLASS: Record<DealVerdict, string> = {
  REAL: "border-emerald-200 bg-emerald-50 text-emerald-800",
  MINOR: "border-amber-200 bg-amber-50 text-amber-800",
  INFLATED: "border-red-200 bg-red-50 text-red-800",
  NO_DATA: "border-slate-200 bg-slate-100 text-slate-600",
};

export function DealQualityBadge({ dealQuality }: { dealQuality: DealQuality }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${VERDICT_CLASS[dealQuality.verdict]}`}
      title={dealQuality.reason}
    >
      <span aria-hidden>{dealQuality.emoji}</span>
      {dealQuality.label}
    </span>
  );
}

export function DealQualityPanel({ dealQuality }: { dealQuality: DealQuality }) {
  return (
    <div className={`rounded-lg border p-4 ${VERDICT_CLASS[dealQuality.verdict]}`}>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide opacity-75">
        Validación del descuento
      </p>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>{dealQuality.emoji}</span>
        {dealQuality.label}
      </p>
      <p className="mt-1 text-sm leading-6 opacity-90">{dealQuality.reason}</p>
    </div>
  );
}
