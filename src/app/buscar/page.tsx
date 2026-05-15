import type { CSSProperties } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { TrackProductButton } from "@/components/product/TrackProductButton";
import { TrackingFeedback } from "@/components/product/TrackingFeedback";
import { SearchForm } from "@/components/search/SearchForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCurrencyARS, formatDate } from "@/lib/utils";
import { getCurrentUser } from "@/lib/supabase/auth";
import { buildOfferClickHref } from "@/services/clickTrackingService";
import { searchProducts } from "@/services/searchService";
import {
  getTrackingOverviewForUser,
  type TrackingOverview,
} from "@/services/trackedProductService";
import type { ProductOffer, SearchResult, SearchResultItem } from "@/types";

type BuscarPageProps = {
  searchParams: Promise<{ q?: string | string[]; tracking?: string | string[] }>;
};

const detectedTypeLabels: Record<SearchResult["detectedType"], string> = {
  text: "Texto",
  url: "URL",
  mercadolibre_url: "URL MercadoLibre",
};

const offerGridStyle = {
  "--offer-grid": "minmax(220px, 1fr) 125px 100px 105px 130px",
} as CSSProperties;

function getQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function StatusMessage({ result }: { result: SearchResult }) {
  if (!result.message) {
    return null;
  }

  const title =
    result.status === "coming_soon"
      ? "Pr\u00f3ximamente"
      : result.status === "unsupported_url"
        ? "URL no soportada"
        : result.status === "mercadolibre_pending"
          ? "MercadoLibre preparado"
          : "Estado de b\u00fasqueda";

  return (
    <Card className="border-emerald-100 bg-emerald-50 p-5 shadow-none">
      <p className="text-sm font-semibold text-emerald-900">{title}</p>
      <p className="mt-2 leading-7 text-emerald-900/80">{result.message}</p>
    </Card>
  );
}

function getOfferKey(offer: ProductOffer) {
  if (!offer.externalId || !offer.store?.slug) {
    return null;
  }

  return `${offer.store.slug}:${offer.externalId}`;
}

function ResultCard({
  item,
  returnTo,
  trackingOverview,
}: {
  item: SearchResultItem;
  returnTo: string;
  trackingOverview: TrackingOverview;
}) {
  const offer = item.bestOffer;
  const offersCount = item.product.offers.length;
  const topOffers = item.product.offers.slice(0, 2);
  const recommendation = item.product.recommendation;
  const imageUrl = item.product.imageUrl ?? offer?.imageUrl ?? null;

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)] transition hover:border-blue-200 hover:shadow-[0_26px_80px_rgba(15,23,42,0.12)]">
      <div className="grid lg:grid-cols-[300px_1fr]">
        <div className="border-b border-slate-100 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
          <div className="flex min-h-72 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            {imageUrl ? (
              <div
                aria-label={item.product.name}
                className="h-64 w-full bg-contain bg-center bg-no-repeat"
                role="img"
                style={{ backgroundImage: `url(${imageUrl})` }}
              />
            ) : (
              <div className="px-4 text-center text-sm font-medium text-slate-400">
                Sin imagen
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">
              Ofertas
            </span>
            <span className="text-sm font-semibold text-slate-950">
              {offersCount} disponible{offersCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-6 lg:p-7">
          <div className="grid gap-5 xl:grid-cols-[1fr_260px] xl:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.matchType === "exact" ? "success" : "neutral"}>
                  {item.matchType === "exact" ? "Exacto" : "Similar"}
                </Badge>
                {offer?.isDemo ? <Badge variant="brand">Demo</Badge> : null}
                {recommendation?.label ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {recommendation.label}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-4 text-2xl font-semibold leading-8 text-slate-950 sm:text-3xl">
                {item.product.name}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Producto agrupado con {offersCount} oferta
                {offersCount === 1 ? "" : "s"} para comparar.
              </p>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 xl:text-right">
              <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">
                {offersCount > 1 ? "Desde" : "Precio actual"}
              </p>
              <p className="mt-1 text-4xl font-semibold leading-tight text-slate-950">
                {formatCurrencyARS(offer?.price ?? recommendation?.currentPrice ?? 0)}
              </p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {offer?.lastCheckedAt
                  ? `Actualizado ${formatDate(offer.lastCheckedAt)}`
                  : "Actualizacion pendiente"}
              </p>
            </div>
          </div>

          {topOffers.length > 0 ? (
            <div className="mt-7 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="bg-slate-950 px-5 py-4 text-white">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold">Ofertas destacadas</p>
                    <p className="text-sm text-slate-300">
                      Mini comparaci&oacute;n de tiendas para este producto.
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-normal text-blue-200">
                    Precio + tienda + seguimiento
                  </span>
                </div>
              </div>

              <div
                className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500 lg:grid lg:[grid-template-columns:var(--offer-grid)] lg:items-center lg:gap-2"
                style={offerGridStyle}
              >
                <span>Tienda</span>
                <span className="text-right">Precio</span>
                <span>Estado</span>
                <span className="text-center">Oferta</span>
                <span className="text-center">Seguimiento</span>
              </div>

              <div className="divide-y divide-slate-100">
                {topOffers.map((topOffer) => {
                  const offerKey = getOfferKey(topOffer);
                  const storeName = topOffer.store?.name ?? "Tienda demo";
                  const offerHref =
                    topOffer.isDemo && item.product.slug && offerKey
                      ? buildOfferClickHref({
                          offerKey,
                          productSlug: item.product.slug,
                        })
                      : topOffer.productUrl;

                  return (
                    <div
                      className="grid gap-4 bg-white p-4 lg:[grid-template-columns:var(--offer-grid)] lg:items-center lg:gap-2"
                      key={topOffer.id}
                      style={offerGridStyle}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-base font-semibold text-blue-700 ring-1 ring-blue-100">
                          {storeName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="break-words text-base font-semibold leading-5 text-slate-950">
                            {storeName}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            Oferta puntual de tienda
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 px-4 py-3 lg:bg-transparent lg:px-0 lg:py-0 lg:text-right">
                        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                          Precio
                        </p>
                        <p className="text-2xl font-semibold leading-tight text-slate-950">
                          {formatCurrencyARS(topOffer.price)}
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
                        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                          Estado
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            topOffer.available ? "text-emerald-700" : "text-slate-500"
                          }`}
                        >
                          {topOffer.available ? "Disponible" : "Sin stock"}
                        </p>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {topOffer.lastCheckedAt
                            ? formatDate(topOffer.lastCheckedAt)
                            : "Sin fecha"}
                        </p>
                      </div>

                      <div>
                        <a
                          className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                          href={offerHref}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Ver oferta
                        </a>
                      </div>

                      <div className="min-w-0">
                        {item.product.slug && offerKey ? (
                          <TrackProductButton
                            offerKey={offerKey}
                            fullWidth
                            productSlug={item.product.slug}
                            returnTo={returnTo}
                            trackingOverview={trackingOverview}
                            className="h-11 !bg-blue-600 px-3 text-sm hover:!bg-blue-700 focus-visible:outline-blue-600"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-emerald-800">
                {recommendation?.label ??
                  (offer?.available ? "Disponible" : "Sin stock")}
              </span>
              {recommendation?.reason ? (
                <span className="block text-slate-500">{recommendation.reason}</span>
              ) : null}
              {offersCount > 1 ? (
                <span className="block text-slate-500">
                  Mejor oferta en {offer?.store?.name ?? "tienda demo"}.
                </span>
              ) : null}
            </p>
            <div className="flex flex-col gap-2 lg:items-end">
              {item.product.slug ? (
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  href={`/producto/${item.product.slug}`}
                >
                  Ver comparacion
                </Link>
              ) : (
                <span className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-400">
                  Ver detalle
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ResultsSection({
  emptyText,
  items,
  returnTo,
  title,
  trackingOverview,
}: {
  title: string;
  items: SearchResultItem[];
  emptyText: string;
  returnTo: string;
  trackingOverview: TrackingOverview;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
        <span className="text-sm font-medium text-slate-500">
          {items.length} resultado{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="space-y-6">
          {items.map((item) => (
            <ResultCard
              item={item}
              key={item.product.id}
              returnTo={returnTo}
              trackingOverview={trackingOverview}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-slate-300 bg-white p-8 text-center shadow-none">
          <p className="text-base font-semibold text-slate-950">
            Sin resultados para mostrar
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {emptyText} Prob&aacute; con un modelo, marca o categor&iacute;a m&aacute;s
            espec&iacute;fica.
          </p>
        </Card>
      )}
    </section>
  );
}

export default async function BuscarPage({ searchParams }: BuscarPageProps) {
  const params = await searchParams;
  const query = getQueryValue(params.q);
  const trackingStatus = getQueryValue(params.tracking);
  const result = await searchProducts(query);
  const user = await getCurrentUser();
  const trackingOverview = await getTrackingOverviewForUser(user?.id);
  const returnTo = query ? `/buscar?q=${encodeURIComponent(query)}` : "/buscar";

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-10">
        <section className="border-b border-slate-200 bg-white py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge variant="brand">B&uacute;squeda MVP</Badge>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950">
                Resultados de b&uacute;squeda
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Compar&aacute; productos agrupados, precios por tienda y segu&iacute; la
                oferta puntual que te interesa.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              Tipo detectado: {detectedTypeLabels[result.detectedType]}
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <SearchForm
              buttonClassName="!bg-blue-600 hover:!bg-blue-700 focus-visible:outline-blue-600"
              defaultValue={query}
              helperText="Ejemplos: Samsung A55, RTX 5070, notebook Lenovo. Los datos demo est&aacute;n identificados."
              id="buscar-search"
              inputClassName="bg-white text-lg focus:border-blue-400 focus:ring-blue-100"
              variant="hero"
            />
          </div>
        </section>

        <TrackingFeedback status={trackingStatus} />

        <StatusMessage result={result} />

        <ResultsSection
          emptyText="No hay coincidencias exactas para esta busqueda."
          items={result.exactMatches}
          returnTo={returnTo}
          title="Resultados exactos"
          trackingOverview={trackingOverview}
        />

        <ResultsSection
          emptyText="No encontramos productos similares relevantes para esta busqueda."
          items={result.similarMatches}
          returnTo={returnTo}
          title="Resultados similares"
          trackingOverview={trackingOverview}
        />
      </Container>
    </main>
  );
}
