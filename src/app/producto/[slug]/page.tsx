import Link from "next/link";
import type { CSSProperties } from "react";
import { Container } from "@/components/layout/Container";
import { AlertFeedback } from "@/components/alerts/AlertFeedback";
import { CreateAlertPanel } from "@/components/product/CreateAlertPanel";
import { PriceHistoryChart } from "@/components/product/PriceHistoryChart";
import { ReportFeedback } from "@/components/product/ReportFeedback";
import { ReportProblemForm } from "@/components/product/ReportProblemForm";
import { TrackProductButton } from "@/components/product/TrackProductButton";
import { TrackingFeedback } from "@/components/product/TrackingFeedback";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrencyARS, formatDate } from "@/lib/utils";
import { getCurrentUser } from "@/lib/supabase/auth";
import { buildOfferClickHref } from "@/services/clickTrackingService";
import {
  getAllMockProductSlugs,
  getMockProductDetailBySlug,
  type ProductDetail,
  type ProductSummary,
} from "@/services/productService";
import {
  getTrackingOverviewForUser,
  type TrackingOverview,
} from "@/services/trackedProductService";
import {
  getAlertOverviewForUser,
  type AlertOverview,
} from "@/services/alertService";
import type { ProviderProduct } from "@/providers/stores";
import type { RecommendationLevel } from "@/types";

type ProductoPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    alert?: string | string[];
    report?: string | string[];
    reportOffer?: string | string[];
    tracking?: string | string[];
  }>;
};

const offerGridStyle = {
  "--offer-grid": "minmax(220px, 1fr) 125px 110px 120px 150px",
} as CSSProperties;

export function generateStaticParams() {
  return getAllMockProductSlugs().map((slug) => ({ slug }));
}

function ProductImage({
  imageUrl,
  name,
  size = "large",
}: {
  imageUrl?: string | null;
  name: string;
  size?: "large" | "small";
}) {
  const isLarge = size === "large";

  if (!imageUrl) {
    return (
      <div
        className={
          isLarge
            ? "flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-sm font-medium text-slate-400"
            : "flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-medium text-slate-400"
        }
      >
        Sin imagen
      </div>
    );
  }

  return (
    <div
      aria-label={name}
      className={
        isLarge
          ? "aspect-square rounded-lg bg-white bg-contain bg-center bg-no-repeat"
          : "h-28 w-full rounded-lg bg-white bg-contain bg-center bg-no-repeat"
      }
      role="img"
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
  );
}

function NotFoundState() {
  return (
    <main className="bg-slate-50 py-12 text-slate-950">
      <Container>
        <Card className="mx-auto max-w-2xl p-8 text-center">
          <Badge variant="neutral">Producto no disponible</Badge>
          <h1 className="mt-5 text-3xl font-semibold text-slate-950">
            No encontramos este producto
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Puede que el link sea incorrecto o que el producto todavia no este
            cargado en los datos demo.
          </p>
          <Link
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/buscar"
          >
            Volver a buscar
          </Link>
        </Card>
      </Container>
    </main>
  );
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function ActionPanel({
  alertOverview,
  product,
}: {
  alertOverview: AlertOverview;
  product: ProductDetail;
}) {
  return (
    <Card className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-100 pb-4">
        <p className="text-sm font-semibold uppercase tracking-normal text-blue-700">
          Seguimiento
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          Alertas y acciones
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Configur&aacute; avisos simples para este producto.
        </p>
      </div>
      <div className="mt-4 space-y-3">
        <CreateAlertPanel
          alertOverview={alertOverview}
          currentPrice={product.bestOffer.price}
          productSlug={product.slug}
          returnTo={`/producto/${product.slug}`}
        />
        <Button
          className="w-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          size="lg"
          variant="ghost"
        >
          Compartir
        </Button>
      </div>
      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-500">
        Ultima actualizacion: {formatDate(product.priceHistoryStats.lastUpdatedAt)}
      </p>
    </Card>
  );
}

function getRecommendationClass(level: RecommendationLevel) {
  if (level === "EXCELLENT_PRICE" || level === "GOOD_PRICE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (level === "EXPENSIVE" || level === "WAIT") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function RecommendationBadge({
  level,
  label,
}: {
  level: RecommendationLevel;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRecommendationClass(level)}`}
    >
      {label}
    </span>
  );
}

function getOfferKey(offer: ProviderProduct) {
  return `${offer.storeSlug}:${offer.externalId}`;
}

function OfferRow({
  offer,
  productSlug,
  trackingOverview,
}: {
  offer: ProviderProduct;
  productSlug: string;
  trackingOverview: TrackingOverview;
}) {
  const offerKey = getOfferKey(offer);
  const offerHref = buildOfferClickHref({ offerKey, productSlug });

  return (
    <div
      className="grid gap-4 bg-white p-4 lg:[grid-template-columns:var(--offer-grid)] lg:items-center lg:gap-3"
      style={offerGridStyle}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-base font-semibold text-blue-700 ring-1 ring-blue-100">
          {offer.storeName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="break-words text-base font-semibold leading-5 text-slate-950">
            {offer.storeName}
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
            {offer.title}
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 px-4 py-3 lg:bg-transparent lg:px-0 lg:py-0 lg:text-right">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
          Precio
        </p>
        <p className="text-2xl font-semibold leading-tight text-slate-950">
          {formatCurrencyARS(offer.price)}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
          Estado
        </p>
        <p
          className={`text-sm font-semibold ${
            offer.available ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {offer.available ? "Disponible" : "Sin stock"}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {formatDate(offer.lastCheckedAt)}
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
        <Link
          className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-lg px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-blue-700"
          href={`/producto/${productSlug}?reportOffer=${encodeURIComponent(
            offerKey,
          )}#reportar-problema`}
        >
          Reportar
        </Link>
      </div>

      <div className="min-w-0">
        <TrackProductButton
          className="h-11 !bg-blue-600 px-3 text-sm hover:!bg-blue-700 focus-visible:outline-blue-600"
          offerKey={offerKey}
          fullWidth
          productSlug={productSlug}
          returnTo={`/producto/${productSlug}`}
          trackingOverview={trackingOverview}
        />
      </div>
    </div>
  );
}

function SimilarProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/producto/${product.slug}`}>
      <Card className="h-full overflow-hidden transition hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 bg-slate-50 p-4">
        <ProductImage imageUrl={product.imageUrl} name={product.name} size="small" />
        </div>
        <div className="p-4">
          <h3 className="line-clamp-2 font-semibold leading-6 text-slate-950">
            {product.name}
          </h3>
          <p className="mt-2 text-sm text-slate-500">{product.storeName}</p>
          <p className="mt-3 text-xl font-semibold text-slate-950">
            {formatCurrencyARS(product.price)}
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-700">
            {product.recommendationLabel}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export default async function ProductoPage({
  params,
  searchParams,
}: ProductoPageProps) {
  const { slug } = await params;
  const queryParams = await searchParams;
  const product = getMockProductDetailBySlug(slug);

  if (!product) {
    return <NotFoundState />;
  }

  const user = await getCurrentUser();
  const trackingOverview = await getTrackingOverviewForUser(user?.id);
  const alertOverview = await getAlertOverviewForUser(user?.id);
  const alertStatus = getQueryValue(queryParams.alert);
  const reportStatus = getQueryValue(queryParams.report);
  const selectedReportOfferKey = getQueryValue(queryParams.reportOffer);
  const trackingStatus = getQueryValue(queryParams.tracking);

  return (
    <main className="bg-[#f4f7fb] py-8 text-slate-950">
      <Container className="space-y-10">
        <Link
          className="inline-flex text-sm font-semibold text-blue-700 transition hover:text-blue-800"
          href="/buscar"
        >
          Volver a resultados
        </Link>

        <TrackingFeedback status={trackingStatus} />
        <AlertFeedback status={alertStatus} />
        <ReportFeedback status={reportStatus} />

        <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)_320px]">
          <Card className="overflow-hidden border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
            <div className="bg-slate-50 p-5">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <ProductImage imageUrl={product.imageUrl} name={product.name} />
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                Ofertas disponibles
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {product.offers.length} tienda{product.offers.length === 1 ? "" : "s"}
              </p>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap gap-2">
                <Badge variant="brand">Demo</Badge>
                {product.categorySlug ? (
                  <Badge variant="neutral">{product.categorySlug}</Badge>
                ) : null}
                <RecommendationBadge
                  label={product.recommendation.label}
                  level={product.recommendation.level}
                />
              </div>
              <h1 className="mt-5 break-words text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                {product.name}
              </h1>
              <p className="mt-3 text-sm font-medium text-slate-500">
                {product.brand ? `${product.brand} ` : ""}
                {product.model ?? ""}
              </p>
            </Card>

            <Card className="overflow-hidden border-blue-100 bg-blue-50 shadow-[0_18px_45px_rgba(37,99,235,0.08)]">
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">
                  Precio actual
                </p>
                <p className="mt-2 text-5xl font-semibold leading-tight text-slate-950">
                  {formatCurrencyARS(product.bestOffer.price)}
                </p>
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Mejor oferta en {product.bestOffer.storeName}
                </p>
              </div>

              <div className="border-t border-blue-100 bg-white/70 p-5">
                <p className="text-sm leading-6 text-slate-600">
                  <span className="font-semibold text-emerald-800">
                    {product.recommendation.label}
                  </span>
                  <span className="block text-slate-600">
                    {product.recommendation.reason}
                  </span>
                </p>
              </div>
            </Card>
          </div>

          <ActionPanel
            alertOverview={alertOverview}
            product={product}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <PriceHistoryChart
                currentPrice={product.bestOffer.price}
                history={product.priceHistory}
                initialStats={product.priceHistoryStats}
              />
              <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-slate-600">
                {product.historyMessage}
              </div>
            </Card>

            <Card className="overflow-hidden border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="bg-slate-950 px-5 py-4 text-white">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      Ofertas disponibles
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                      Comparaci&oacute;n entre tiendas mock disponibles.
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-blue-200">
                    {product.offers.length} oferta
                    {product.offers.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div
                className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500 lg:grid lg:[grid-template-columns:var(--offer-grid)] lg:items-center lg:gap-3"
                style={offerGridStyle}
              >
                <span>Tienda</span>
                <span className="text-right">Precio</span>
                <span>Estado</span>
                <span className="text-center">Oferta</span>
                <span className="text-center">Seguimiento</span>
              </div>

              <div className="divide-y divide-slate-100">
                {product.offers.map((offer) => (
                  <OfferRow
                    offer={offer}
                    key={offer.externalId}
                    productSlug={product.slug}
                    trackingOverview={trackingOverview}
                  />
                ))}
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold text-slate-950">
              Acciones del producto
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ayudanos a mantener precios, relaciones y links confiables.
            </p>
            <ReportProblemForm
              product={product}
              returnTo={`/producto/${product.slug}`}
              selectedOfferKey={selectedReportOfferKey}
            />
          </Card>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">
              Productos similares
            </h2>
          </div>

          {product.similarProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {product.similarProducts.map((similarProduct) => (
                <SimilarProductCard
                  key={similarProduct.slug}
                  product={similarProduct}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-white p-8 text-center shadow-none">
              <p className="text-base font-semibold text-slate-950">
                Sin similares relevantes
              </p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                No encontramos productos similares relevantes para esta comparaci&oacute;n.
              </p>
            </Card>
          )}
        </section>
      </Container>
    </main>
  );
}
