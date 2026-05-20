import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { mvpCategoryDescriptors } from "@/data/categories";
import { requireAdmin } from "@/lib/supabase/auth";
import { formatDate } from "@/lib/utils";
import {
  getProductImportDashboard,
  type ProductImportDashboard,
  type ProductImportFieldSources,
} from "@/services/productImportService";
import { ImportLinksForm } from "./ImportLinksForm";
import { publishImportDraftAction, saveImportDraftAction } from "./actions";

type ImportarProductosPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ProductImportDraftItem = ProductImportDashboard["drafts"][number];

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const textareaClass =
  "mt-1 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function decimalInputValue(value: unknown) {
  if (value === null || value === undefined) return "";

  return String(value);
}

function getFieldSources(draft: ProductImportDraftItem): ProductImportFieldSources {
  if (!draft.fieldSources || typeof draft.fieldSources !== "object") {
    return {};
  }

  if (Array.isArray(draft.fieldSources)) {
    return {};
  }

  return draft.fieldSources as unknown as ProductImportFieldSources;
}

function getFieldSource(
  draft: ProductImportDraftItem,
  field: string,
): "auto" | "empty" | "manual" {
  return getFieldSources(draft)[field] ?? "empty";
}

function FieldSourceBadge({
  field,
  draft,
}: {
  field: string;
  draft: ProductImportDraftItem;
}) {
  const source = getFieldSource(draft, field);

  if (source === "auto") {
    return <Badge variant="success">Detectado</Badge>;
  }

  if (source === "manual") {
    return <Badge variant="brand">Manual</Badge>;
  }

  return <Badge variant="neutral">Vacio</Badge>;
}

function FormField({
  children,
  draft,
  field,
  label,
}: {
  children: ReactNode;
  draft: ProductImportDraftItem;
  field: string;
  label: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-700">
        {label}
        <FieldSourceBadge draft={draft} field={field} />
      </span>
      {children}
    </label>
  );
}

function ReadOnlyFact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || "-"}
      </p>
    </div>
  );
}

function Feedback({
  params,
}: {
  params: Record<string, string | string[] | undefined>;
}) {
  const created = getSearchParam(params.created);
  const saved = getSearchParam(params.saved);
  const published = getSearchParam(params.published);
  const error = getSearchParam(params.error);

  if (error) {
    return (
      <Card className="border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 shadow-none">
        {error}
      </Card>
    );
  }

  if (created) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-none">
        Se crearon {created} borradores.
      </Card>
    );
  }

  if (published) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-none">
        Producto publicado: {published}.
      </Card>
    );
  }

  if (saved) {
    return (
      <Card className="border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-800 shadow-none">
        Borrador guardado.
      </Card>
    );
  }

  return null;
}

function DraftStatusBadge({ draft }: { draft: ProductImportDraftItem }) {
  if (draft.status === "PUBLISHED") {
    return <Badge variant="success">Publicado</Badge>;
  }

  return <Badge variant="neutral">Borrador</Badge>;
}

function DraftCard({ draft }: { draft: ProductImportDraftItem }) {
  const disabled = draft.status === "PUBLISHED";

  return (
    <Card className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-950">
              {draft.productName || draft.suggestedTitle || "Producto sin titulo"}
            </h2>
            <DraftStatusBadge draft={draft} />
            {draft.unexpandedShortUrl ? (
              <Badge variant="neutral">Link corto/no expandido</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Creado {formatDate(draft.createdAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ReadOnlyFact label="Dominio" value={draft.sourceDomain} />
        <ReadOnlyFact label="Tienda detectada" value={draft.detectedStoreName} />
        <ReadOnlyFact label="Slug posible" value={draft.suggestedSlug} />
        <ReadOnlyFact label="Categoria sugerida" value={draft.suggestedCategorySlug} />
        <ReadOnlyFact label="Link original" value={draft.originalUrl} />
        <ReadOnlyFact label="Link limpio" value={draft.normalizedUrl} />
        <ReadOnlyFact label="Titulo sugerido" value={draft.suggestedTitle} />
        <ReadOnlyFact
          label="Tipo de link"
          value={draft.shortUrl ? "Corto" : "Producto directo"}
        />
      </div>

      <form action={saveImportDraftAction} className="mt-6 space-y-5">
        <input name="id" type="hidden" value={draft.id} />

        <div className="grid gap-4 lg:grid-cols-2">
          <FormField draft={draft} field="productName" label="Nombre">
            <input
              className={inputClass}
              defaultValue={draft.productName ?? ""}
              disabled={disabled}
              name="productName"
              placeholder="Ej. Samsung Galaxy A55 256GB"
            />
          </FormField>
          <FormField draft={draft} field="categorySlug" label="Categoria">
            <select
              className={inputClass}
              defaultValue={draft.categorySlug ?? ""}
              disabled={disabled}
              name="categorySlug"
            >
              <option value="">Sin categoria</option>
              {mvpCategoryDescriptors.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField draft={draft} field="storeSlug" label="Slug de tienda">
            <input
              className={inputClass}
              defaultValue={draft.storeSlug ?? ""}
              disabled={disabled}
              name="storeSlug"
              placeholder="mercadolibre"
            />
          </FormField>
          <FormField draft={draft} field="storeName" label="Nombre de tienda">
            <input
              className={inputClass}
              defaultValue={draft.storeName ?? ""}
              disabled={disabled}
              name="storeName"
              placeholder="MercadoLibre"
            />
          </FormField>
          <FormField draft={draft} field="currentPrice" label="Precio actual">
            <input
              className={inputClass}
              defaultValue={decimalInputValue(draft.currentPrice)}
              disabled={disabled}
              inputMode="decimal"
              name="currentPrice"
              placeholder="1299999"
            />
          </FormField>
          <FormField draft={draft} field="previousPrice" label="Precio anterior">
            <input
              className={inputClass}
              defaultValue={decimalInputValue(draft.previousPrice)}
              disabled={disabled}
              inputMode="decimal"
              name="previousPrice"
              placeholder="Opcional"
            />
          </FormField>
          <FormField draft={draft} field="externalUrl" label="Link externo">
            <input
              className={inputClass}
              defaultValue={draft.externalUrl ?? ""}
              disabled={disabled}
              name="externalUrl"
              placeholder="https://..."
            />
          </FormField>
          <FormField draft={draft} field="affiliateUrl" label="Link afiliado">
            <input
              className={inputClass}
              defaultValue={draft.affiliateUrl ?? ""}
              disabled={disabled}
              name="affiliateUrl"
              placeholder="Opcional"
            />
          </FormField>
          <FormField draft={draft} field="imageUrl" label="URL de imagen">
            <input
              className={inputClass}
              defaultValue={draft.imageUrl ?? ""}
              disabled={disabled}
              name="imageUrl"
              placeholder="https://..."
            />
          </FormField>
          <FormField
            draft={draft}
            field="shortDescription"
            label="Descripcion corta"
          >
            <textarea
              className={textareaClass}
              defaultValue={draft.shortDescription ?? ""}
              disabled={disabled}
              name="shortDescription"
              placeholder="Detalle interno breve para revisar antes de publicar."
            />
          </FormField>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled={disabled} type="submit" variant="secondary">
            Guardar borrador
          </Button>
          <Button
            disabled={disabled}
            formAction={publishImportDraftAction}
            type="submit"
            variant="success"
          >
            Guardar y publicar
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default async function ImportarProductosPage({
  searchParams,
}: ImportarProductosPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const dashboard = await getProductImportDashboard();

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
              href="/admin"
            >
              &lt;- Admin
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              Importar productos
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Crea borradores desde links, completa lo confiable por dominio y URL,
              y publica solo cuando los campos clave esten revisados.
            </p>
          </div>
          <Badge variant="neutral">
            {dashboard.importedTodayCount} importados hoy
          </Badge>
        </section>

        <Feedback params={params} />

        <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <ImportLinksForm />
        </Card>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                Borradores recientes
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Vista previa editable antes de guardar o publicar.
              </p>
            </div>
            <Badge variant="neutral">{dashboard.drafts.length} visibles</Badge>
          </div>

          {dashboard.drafts.length > 0 ? (
            dashboard.drafts.map((draft) => (
              <DraftCard draft={draft} key={draft.id} />
            ))
          ) : (
            <Card className="border-dashed border-slate-200 p-6 text-sm text-slate-500 shadow-none">
              Todavia no hay borradores de importacion.
            </Card>
          )}
        </section>
      </Container>
    </main>
  );
}
