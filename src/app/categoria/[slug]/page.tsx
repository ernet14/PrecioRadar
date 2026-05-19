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
import { formatCurrencyARS } from "@/lib/utils";
import { listMockProductsByCategory } from "@/services/productService";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site";

type CategoriaPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return mvpCategoryDescriptors.map((descriptor) => ({ slug: descriptor.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const descriptor = getCategoryDescriptorBySlug(slug);

  if (!descriptor) {
    return { title: "Categoría no encontrada" };
  }

  const products = listMockProductsByCategory(slug);
  const productCount = products.length;
  const minPrice = products.length
    ? Math.min(...products.map((product) => product.price))
    : null;

  const title = `${descriptor.name} — Comparador de precios`;
  const description = minPrice
    ? `${descriptor.description} Desde ${formatCurrencyARS(minPrice)} en ${productCount} producto${productCount === 1 ? "" : "s"} comparados.`
    : descriptor.description;
  const canonical = getAbsoluteUrl(`/categoria/${slug}`);

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

export default async function CategoriaPage({ params }: CategoriaPageProps) {
  const { slug } = await params;
  const descriptor = getCategoryDescriptorBySlug(slug);

  if (!descriptor) {
    notFound();
  }

  const products = listMockProductsByCategory(slug);
  const minPrice = products.length
    ? Math.min(...products.map((product) => product.price))
    : null;
  const canonical = getAbsoluteUrl(`/categoria/${slug}`);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: descriptor.name,
    description: descriptor.description,
    url: canonical,
    inLanguage: "es-AR",
    isPartOf: {
      "@type": "WebSite",
      url: getSiteUrl(),
      name: "PrecioRadar",
    },
    hasPart: products.slice(0, 10).map((product) => ({
      "@type": "Product",
      name: product.name,
      url: getAbsoluteUrl(`/producto/${product.slug}`),
      offers: {
        "@type": "Offer",
        priceCurrency: "ARS",
        price: String(product.price),
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: getSiteUrl() },
      { "@type": "ListItem", position: 2, name: "Categorías", item: getAbsoluteUrl("/#categorias") },
      { "@type": "ListItem", position: 3, name: descriptor.name, item: canonical },
    ],
  };

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Container className="space-y-8">
        <nav className="text-sm text-slate-500">
          <Link className="hover:text-slate-900" href="/">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">{descriptor.name}</span>
        </nav>

        <section>
          <Badge variant="brand">Categoría</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
            {descriptor.name}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            {descriptor.description}
          </p>
          {minPrice ? (
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {products.length} producto{products.length === 1 ? "" : "s"} comparados · Desde{" "}
              {formatCurrencyARS(minPrice)}
            </p>
          ) : null}
        </section>

        {products.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Link key={product.slug} href={`/producto/${product.slug}`}>
                <Card className="h-full p-5 transition hover:border-blue-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
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
        ) : (
          <Card className="border-dashed border-slate-300 bg-white p-8 text-center shadow-none">
            <p className="text-base font-semibold text-slate-950">
              Sin productos en esta categoría todavía
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Estamos sumando productos. Mientras tanto, podés{" "}
              <Link className="text-blue-700 hover:underline" href="/buscar">
                buscar en MercadoLibre
              </Link>{" "}
              o revisar otras categorías abajo.
            </p>
          </Card>
        )}

        <section className="border-t border-slate-200 pt-6">
          <h2 className="text-xl font-semibold text-slate-950">
            Otras categorías para comparar
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {mvpCategoryDescriptors
              .filter((descriptor2) => descriptor2.slug !== slug)
              .map((descriptor2) => (
                <Link
                  className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  href={`/categoria/${descriptor2.slug}`}
                  key={descriptor2.slug}
                >
                  {descriptor2.name}
                </Link>
              ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
