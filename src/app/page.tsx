import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { SearchForm } from "@/components/search/SearchForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { mvpCategories } from "@/data/categories";
import { formatCurrencyARS } from "@/lib/utils";
import { getMockProductDetailBySlug } from "@/services/productService";

const searchExamples = [
  "Samsung A55",
  "RTX 5070",
  "notebook Lenovo",
  "taladro",
  "TV 55",
];

export const metadata: Metadata = {
  title: "Comparador de precios con historial y alertas",
  description:
    "Compara precios en Argentina, revisa historial de productos y crea alertas para comprar cuando el precio conviene.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "PrecioRadar",
    description:
      "Comparador de precios en Argentina con historial, alertas y recomendaciones.",
    type: "website",
    url: "/",
  },
};

const benefits = [
  {
    title: "Compará precios entre tiendas",
    description:
      "Ves ofertas agrupadas por producto para elegir con menos ruido y más contexto.",
    kicker: "Comparacion",
  },
  {
    title: "Revisá historial de precios",
    description:
      "El historial ayuda a entender si el precio actual está cerca de una buena referencia.",
    kicker: "Historial",
  },
  {
    title: "Creá alertas",
    description:
      "Seguí ofertas y recibí avisos internos cuando una condición de compra se cumple.",
    kicker: "Alertas",
  },
  {
    title: "Detectá ofertas reales",
    description:
      "La recomendación simple separa precios convenientes de promociones poco claras.",
    kicker: "Confianza",
  },
];

const categoryDetails = [
  {
    query: "celular",
    description: "Modelos, variantes y ofertas por tienda.",
  },
  {
    query: "notebook",
    description: "Equipos para trabajo, estudio y uso diario.",
  },
  {
    query: "rtx 5070",
    description: "Hardware y componentes para comparar mejor.",
  },
  {
    query: "tv 55",
    description: "Pantallas, pulgadas y precios disponibles.",
  },
  {
    query: "auriculares",
    description: "Audio personal y accesorios populares.",
  },
  {
    query: "playstation",
    description: "Consolas, videojuegos y productos gamer.",
  },
  {
    query: "lavarropas",
    description: "Electrodomésticos con historial demo.",
  },
  {
    query: "taladro",
    description: "Herramientas para comparar por precio.",
  },
];

const steps = [
  {
    title: "Buscá",
    description:
      "Ingresá un producto o pegá un link para encontrar resultados comparables.",
  },
  {
    title: "Compará",
    description:
      "Revisá tiendas, precios, historial y recomendación antes de decidir.",
  },
  {
    title: "Seguí y recibí alertas",
    description:
      "Guardá ofertas específicas y dejá que PrecioRadar te avise cuando convenga mirar.",
  },
];

const featuredProductSlugs = [
  "samsung-galaxy-a55-5g-256gb",
  "notebook-lenovo-ideapad-slim-5-ryzen-7",
  "smart-tv-samsung-crystal-uhd-55",
  "taladro-inalambrico-bosch-gsr-120-li",
];

const featuredProducts = featuredProductSlugs
  .map((slug) => getMockProductDetailBySlug(slug))
  .filter((product) => product !== null);

function getProductInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function ProductImage({
  imageUrl,
  name,
}: {
  imageUrl?: string | null;
  name: string;
}) {
  if (imageUrl) {
    return (
      <div
        aria-label={name}
        className="h-36 rounded-lg border border-slate-100 bg-white bg-contain bg-center bg-no-repeat"
        role="img"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
    );
  }

  return (
    <div className="flex h-36 items-center justify-center rounded-lg border border-slate-100 bg-slate-100 text-2xl font-bold text-slate-500">
      {getProductInitials(name)}
    </div>
  );
}

export default function Home() {
  const heroProduct = featuredProducts[0];
  const heroOffers = heroProduct?.offers.slice(0, 3) ?? [];

  return (
    <main className="bg-[#f4f7fb] text-slate-950">
      <section className="bg-slate-950 text-white">
        <Container className="py-12 md:py-18">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-center">
            <div className="min-w-0">
              <Badge className="border-blue-400/40 bg-blue-400/10 text-blue-100">
                Argentina · ARS · Beta abierta
              </Badge>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Comprá con más contexto: precio real, historial y alertas
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Hoy comparamos precios reales de MercadoLibre y sumamos más
                tiendas todas las semanas. Mientras tanto, te mostramos un catálogo
                demo para que veas cómo funcionará el comparador.
              </p>

              <Card
                id="buscar"
                className="mt-8 border-white/10 bg-white p-4 shadow-[0_28px_70px_rgba(15,23,42,0.35)]"
              >
                <SearchForm
                  buttonClassName="bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600"
                  helperText="Buscador MVP con productos demo identificados."
                  id="home-search"
                  inputClassName="border-slate-200 bg-slate-50 focus:border-blue-500 focus:ring-blue-100"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {searchExamples.map((example) => (
                    <Link
                      className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      href={`/buscar?q=${encodeURIComponent(example)}`}
                      key={example}
                    >
                      {example}
                    </Link>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="border-white/10 bg-white p-5 text-slate-950 shadow-[0_28px_70px_rgba(15,23,42,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Vista marketplace
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">
                    Comparación clara por tienda
                  </h2>
                </div>
                <Badge variant="neutral">Catálogo demo</Badge>
              </div>
              <div className="mt-5 rounded-lg bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">
                  {heroProduct?.name ?? "Producto demo"}
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-950">
                  Desde{" "}
                  {heroProduct
                    ? formatCurrencyARS(heroProduct.bestOffer.price)
                    : "$0"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {heroProduct
                    ? `${heroProduct.offers.length} ofertas disponibles`
                    : "Ofertas demo disponibles"}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {heroOffers.map((offer) => (
                  <div
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
                    key={offer.externalId}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">
                        {offer.storeName}
                      </p>
                      <p className="text-xs font-medium text-slate-500">
                        Actualizado demo
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-950">
                      {formatCurrencyARS(offer.price)}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                href={
                  heroProduct ? `/producto/${heroProduct.slug}` : "/buscar?q=a55"
                }
              >
                Ver comparación
              </Link>
            </Card>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => (
              <Card
                className="p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
                key={benefit.title}
              >
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {benefit.kicker}
                </span>
                <h2 className="mt-4 text-lg font-bold text-slate-950">
                  {benefit.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {benefit.description}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section id="categorias" className="py-12">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="brand" className="bg-blue-50 text-blue-700">
                Categorías populares
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Explorá productos para comparar
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              El MVP prioriza categorías donde precio, historial y alertas
              aportan una decisión de compra más confiable.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mvpCategories.map((category, index) => {
              const detail = categoryDetails[index];

              return (
                <Link
                  className="group block"
                  href={`/buscar?q=${encodeURIComponent(detail.query)}`}
                  key={category}
                >
                  <Card className="h-full p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-[0_22px_50px_rgba(37,99,235,0.10)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-slate-950">
                      {category}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {detail.description}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="neutral">Catálogo demo</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                Productos destacados para comparar
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Catálogo de demostración mientras sumamos tiendas reales.
                Las búsquedas en MercadoLibre ya devuelven precios actuales.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              href="/buscar?q=a55"
            >
              Ver resultados demo
            </Link>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <Card
                className="overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
                key={product.slug}
              >
                <div className="p-4">
                  <ProductImage imageUrl={product.imageUrl} name={product.name} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-base font-bold leading-6 text-slate-950">
                        {product.name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {product.offers.length} ofertas · mejor tienda{" "}
                        {product.bestOffer.storeName}
                      </p>
                    </div>
                    <Badge variant="success" className="shrink-0">
                      Demo
                    </Badge>
                  </div>
                  <p className="mt-5 text-sm font-semibold text-slate-500">
                    Desde
                  </p>
                  <p className="text-2xl font-bold text-slate-950">
                    {formatCurrencyARS(product.bestOffer.price)}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {product.recommendation.label}
                  </p>
                  <Link
                    className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    href={`/producto/${product.slug}`}
                  >
                    Ver comparación
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section id="como-funciona" className="bg-white py-14">
        <Container>
          <div className="max-w-2xl">
            <Badge variant="neutral">Cómo funciona</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              Tres pasos para comprar con más contexto
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <Card className="p-6 shadow-none" key={step.title}>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {step.description}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <Card className="grid gap-6 bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:grid-cols-[0.8fr_1.2fr] md:p-8">
            <div>
              <Badge className="border-emerald-300/30 bg-emerald-300/10 text-emerald-100">
                Confianza
              </Badge>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">
                Transparencia antes de comprar
              </h2>
            </div>
            <div className="grid gap-3 text-sm leading-6 text-slate-300 sm:grid-cols-2">
              <p>Los precios pueden cambiar en la tienda externa.</p>
              <p>La compra se realiza fuera de PrecioRadar.</p>
              <p>Algunos enlaces pueden generar comisión sin costo extra.</p>
              <p>Los datos demo están identificados durante el desarrollo MVP.</p>
            </div>
          </Card>
        </Container>
      </section>
    </main>
  );
}
