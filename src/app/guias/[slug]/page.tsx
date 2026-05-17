import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import { getAllGuideSlugs, getGuideBySlug, guides } from "@/content/guides";
import { getAllMockProductSlugs } from "@/services/productService";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site";

const siteUrl = getSiteUrl();

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) return { title: "Guia no encontrada" };

  const canonicalUrl = getAbsoluteUrl(`/guias/${slug}`);

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: canonicalUrl,
      siteName: "PrecioRadar",
      locale: "es_AR",
      type: "article",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description },
  };
}

function buildJsonLd(guide: ReturnType<typeof getGuideBySlug>) {
  if (!guide) return [];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    author: { "@type": "Organization", name: "PrecioRadar" },
    publisher: {
      "@type": "Organization",
      name: "PrecioRadar",
      url: siteUrl,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": getAbsoluteUrl(`/guias/${guide.slug}`) },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Guías", item: getAbsoluteUrl("/guias") },
      { "@type": "ListItem", position: 3, name: guide.title, item: getAbsoluteUrl(`/guias/${guide.slug}`) },
    ],
  };

  return [articleSchema, breadcrumbSchema];
}

export default async function GuiaPage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) notFound();

  const jsonLd = buildJsonLd(guide);
  const relatedGuides = guides.filter((g) => guide.relatedGuideSlugs.includes(g.slug));
  const productSlugs = getAllMockProductSlugs();
  const relatedProducts = guide.relatedProductSlugs.filter((s) => productSlugs.includes(s));

  return (
    <main className="bg-slate-50 py-10 text-slate-950">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <Container className="space-y-10">
        <nav className="flex gap-2 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-blue-700">Inicio</Link>
          <span>/</span>
          <Link href="/guias" className="hover:text-blue-700">Guías</Link>
          <span>/</span>
          <span className="text-slate-950">{guide.category}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
          <article className="space-y-8">
            <header>
              <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {guide.category}
              </span>
              <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                {guide.title}
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600">{guide.description}</p>
              <p className="mt-3 text-xs font-medium text-slate-400">
                Actualizado el {guide.updatedAt} · {guide.readingMinutes} min de lectura
              </p>
            </header>

            <div className="space-y-8">
              {guide.sections.map((section, i) => (
                <section key={i}>
                  <h2 className="text-xl font-semibold text-slate-950">{section.heading}</h2>
                  <p className="mt-3 leading-7 text-slate-600">{section.body}</p>
                </section>
              ))}
            </div>

            {relatedProducts.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
                <h2 className="text-lg font-semibold text-slate-950">
                  Compará precios de los productos de esta guía
                </h2>
                <ul className="mt-4 space-y-2">
                  {relatedProducts.map((productSlug) => (
                    <li key={productSlug}>
                      <Link
                        href={`/producto/${productSlug}`}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        Ver precios → /producto/{productSlug}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/buscar"
                  className="mt-4 inline-flex items-center text-sm font-semibold text-blue-700 hover:underline"
                >
                  Buscar más productos →
                </Link>
              </div>
            )}
          </article>

          <aside className="space-y-6">
            <Card className="p-5">
              <h3 className="text-base font-semibold text-slate-950">
                Alertas de precio gratis
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Te avisamos cuando baje el precio del producto que estás buscando.
              </p>
              <Link
                href="/buscar"
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Buscar un producto
              </Link>
            </Card>

            <Card className="p-5">
              <h3 className="text-base font-semibold text-slate-950">
                Ofertas verificadas por email
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Recibí las mejores bajadas de precio de la semana, verificadas con historial real.
              </p>
              <NewsletterForm source="guide-sidebar" />
            </Card>

            {relatedGuides.length > 0 && (
              <Card className="p-5">
                <h3 className="text-base font-semibold text-slate-950">Guías relacionadas</h3>
                <ul className="mt-4 space-y-3">
                  {relatedGuides.map((related) => (
                    <li key={related.slug}>
                      <Link
                        href={`/guias/${related.slug}`}
                        className="text-sm font-semibold text-blue-700 hover:underline"
                      >
                        {related.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">{related.readingMinutes} min</p>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/guias"
                  className="mt-4 block text-sm font-semibold text-slate-500 hover:text-blue-700"
                >
                  Ver todas las guías →
                </Link>
              </Card>
            )}
          </aside>
        </div>
      </Container>
    </main>
  );
}
