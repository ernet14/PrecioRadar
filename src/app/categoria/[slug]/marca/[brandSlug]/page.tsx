import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  getCategoryDescriptorBySlug,
  mvpCategoryDescriptors,
} from "@/data/categories";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site";
import { safeJsonLd } from "@/lib/seo/safeJsonLd";
import { formatCurrencyARS } from "@/lib/utils";
import {
  listRealProductsByCategory,
  type CategoryProduct,
} from "@/services/productService";

type MarcaCategoriaPageProps = {
  params: Promise<{ brandSlug: string; slug: string }>;
};

// El Header global lee cookies de sesión, por lo que esta ruta no puede ser estática.
export const dynamic = "force-dynamic";

function getBrandName(products: CategoryProduct[], brandSlug: string) {
  return products.find((product) => product.brandSlug === brandSlug)?.brand ?? brandSlug;
}

function getComparableCount(products: CategoryProduct[]) {
  return products.filter((product) => product.comparable).length;
}

async function getPageData(categorySlug: string, brandSlug: string) {
  const descriptor = getCategoryDescriptorBySlug(categorySlug);
  if (!descriptor) return null;

  const products = await listRealProductsByCategory(categorySlug, { brandSlug });
  if (products.length === 0) return null;

  return {
    brandName: getBrandName(products, brandSlug),
    comparableCount: getComparableCount(products),
    descriptor,
    products,
  };
}

export async function generateMetadata({
  params,
}: MarcaCategoriaPageProps): Promise<Metadata> {
  const { brandSlug, slug } = await params;
  const data = await getPageData(slug, brandSlug);

  if (!data) {
    return { title: "Página no encontrada" };
  }

  const minPrice = Math.min(...data.products.map((product) => product.price));
  const title = `${data.descriptor.name} ${data.brandName} — Comparador de precios`;
  const description = `Compará ${data.descriptor.name.toLowerCase()} ${data.brandName} en Argentina desde ${formatCurrencyARS(minPrice)}. ${data.products.length} producto${data.products.length === 1 ? "" : "s"} real${data.products.length === 1 ? "" : "es"}${data.comparableCount > 0 ? `, ${data.comparableCount} comparado${data.comparableCount === 1 ? "" : "s"} en 2+ tiendas` : ""}.`;
  const canonical = getAbsoluteUrl(`/categoria/${slug}/marca/${brandSlug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "PrecioRadar",
      locale: "es_AR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function MarcaCategoriaPage({
  params,
}: MarcaCategoriaPageProps) {
  const { brandSlug, slug } = await params;
  const data = await getPageData(slug, brandSlug);

  if (!data) {
    notFound();
  }

  const minPrice = Math.min(...data.products.map((product) => product.price));
  const canonical = getAbsoluteUrl(`/categoria/${slug}/marca/${brandSlug}`);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${data.descriptor.name} ${data.brandName}`,
    description: `Comparador de precios de ${data.descriptor.name.toLowerCase()} ${data.brandName} en Argentina.`,
    url: canonical,
    inLanguage: "es-AR",
    isPartOf: {
      "@type": "WebSite",
      name: "PrecioRadar",
      url: getSiteUrl(),
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: data.products.slice(0, 20).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getAbsoluteUrl(`/producto/${product.slug}`),
        item: {
          "@type": "Product",
          name: product.name,
          brand: { "@type": "Brand", name: data.brandName },
          url: getAbsoluteUrl(`/producto/${product.slug}`),
          offers: product.comparable
            ? {
                "@type": "AggregateOffer",
                lowPrice: String(product.price),
                offerCount: product.storeCount,
                priceCurrency: "ARS",
              }
            : {
                "@type": "Offer",
                price: String(product.price),
                priceCurrency: "ARS",
              },
        },
      })),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: getSiteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: data.descriptor.name,
        item: getAbsoluteUrl(`/categoria/${slug}`),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: data.brandName,
        item: canonical,
      },
    ],
  };

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />

      <Container className="space-y-8">
        <nav className="text-sm text-slate-500">
          <Link className="hover:text-slate-900" href="/">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link className="hover:text-slate-900" href={`/categoria/${slug}`}>
            {data.descriptor.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">{data.brandName}</span>
        </nav>

        <section>
          <Badge variant="brand">Marca</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            {data.descriptor.name} {data.brandName}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Compará precios reales de {data.descriptor.name.toLowerCase()}{" "}
            {data.brandName} entre tiendas argentinas, con prioridad para
            productos disponibles en 2 o más tiendas.
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {data.products.length} producto{data.products.length === 1 ? "" : "s"}
            {data.comparableCount > 0
              ? ` · ${data.comparableCount} comparado${data.comparableCount === 1 ? "" : "s"} en 2+ tiendas`
              : ""}{" "}
            · Desde {formatCurrencyARS(minPrice)}
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.products.map((product) => (
            <Link key={product.slug} href={`/producto/${product.slug}`}>
              <Card className="h-full p-5 transition hover:border-blue-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                {product.comparable ? (
                  <span className="mb-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    {product.storeCount} tiendas
                  </span>
                ) : null}
                <h2 className="line-clamp-2 text-base font-semibold leading-6 text-slate-950">
                  {product.name}
                </h2>
                <p className="mt-2 text-xs text-slate-500">{product.storeName}</p>
                <p className="mt-4 text-2xl font-bold text-slate-950">
                  {formatCurrencyARS(product.price)}
                </p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  {product.recommendationLabel}
                </p>
              </Card>
            </Link>
          ))}
        </section>

        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-xl font-semibold text-slate-950">
            Otras categorías
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {mvpCategoryDescriptors
              .filter((descriptor) => descriptor.slug !== slug)
              .map((descriptor) => (
                <Link
                  className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  href={`/categoria/${descriptor.slug}`}
                  key={descriptor.slug}
                >
                  {descriptor.name}
                </Link>
              ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
