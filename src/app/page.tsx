import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CommercialEventBanner } from "@/components/commercial/CommercialEventBanner";
import { Container } from "@/components/layout/Container";
import { SearchForm } from "@/components/search/SearchForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { mvpCategoryDescriptors } from "@/data/categories";
import { formatCurrencyARS } from "@/lib/utils";
import { getWeeklyFeaturedForHome } from "@/services/weeklyFeaturedService";

export const revalidate = 3600;

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
    shortDescription: "Ofertas agrupadas por producto.",
    kicker: "Comparacion",
    chip: "Comparación",
  },
  {
    title: "Revisá historial de precios",
    description:
      "El historial ayuda a entender si el precio actual está cerca de una buena referencia.",
    shortDescription: "Mirá si el precio actual conviene.",
    kicker: "Historial",
    chip: "Historial",
  },
  {
    title: "Creá alertas",
    description:
      "Seguí ofertas y recibí avisos internos cuando una condición de compra se cumple.",
    shortDescription: "Avisos cuando baja el precio.",
    kicker: "Alertas",
    chip: "Alertas",
  },
  {
    title: "Detectá ofertas reales",
    description:
      "La recomendación simple separa precios convenientes de promociones poco claras.",
    shortDescription: "Separá ofertas reales de las dudosas.",
    kicker: "Confianza",
    chip: "Ofertas reales",
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
      <div className="relative h-28 overflow-hidden rounded-lg border border-slate-100 bg-white sm:h-36">
        <Image
          alt={name}
          className="object-contain"
          fill
          sizes="(max-width: 768px) 50vw, 280px"
          src={imageUrl}
        />
      </div>
    );
  }

  return (
    <div className="flex h-28 items-center justify-center rounded-lg border border-slate-100 bg-slate-100 text-2xl font-bold text-slate-500 sm:h-36">
      {getProductInitials(name)}
    </div>
  );
}

export default async function Home() {
  const featured = await getWeeklyFeaturedForHome();
  const featuredProducts = featured.products;
  const heroProduct = featuredProducts[0];
  const heroPeerProducts = featuredProducts.slice(1, 4);
  const sourceIsWeekly = featured.source === "weekly";
  const hasRealProducts = sourceIsWeekly && featuredProducts.some((p) => !p.isDemo);
  const featuredBadgeLabel = hasRealProducts ? "Datos reales" : "Catálogo demo";
  const featuredCopy = hasRealProducts
    ? "Productos con las mejores señales de precio de la semana."
    : "Catálogo de demostración mientras sumamos más fuentes reales. Los datos demo quedan identificados.";

  return (
    <main className="bg-section-soft text-slate-950">
      <CommercialEventBanner />
      <section className="relative overflow-hidden bg-hero-premium text-white">
        {/* Capa: grid técnico tenue */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-hero-grid opacity-60"
        />
        {/* Capa: ondas de radar (rotación 60s) */}
        <svg
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 size-[640px] opacity-[0.22] hero-radar-spin md:-right-24 lg:right-[-6rem] lg:top-[-6rem]"
          viewBox="0 0 400 400"
          fill="none"
        >
          <defs>
            <radialGradient id="radarFade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="sweep" x1="50%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {[60, 110, 160, 200].map((r) => (
            <circle
              key={r}
              cx="200"
              cy="200"
              r={r}
              stroke="rgba(148,163,217,0.45)"
              strokeWidth="1"
            />
          ))}
          <line
            x1="200"
            y1="200"
            x2="400"
            y2="200"
            stroke="rgba(148,163,217,0.25)"
            strokeWidth="1"
          />
          <line
            x1="200"
            y1="200"
            x2="0"
            y2="200"
            stroke="rgba(148,163,217,0.25)"
            strokeWidth="1"
          />
          <line
            x1="200"
            y1="0"
            x2="200"
            y2="400"
            stroke="rgba(148,163,217,0.25)"
            strokeWidth="1"
          />
          {/* Sweep cone */}
          <path
            d="M200,200 L400,200 A200,200 0 0,0 340,60 Z"
            fill="url(#sweep)"
            opacity="0.7"
          />
          <circle cx="200" cy="200" r="6" fill="#34d399" />
          <circle
            cx="200"
            cy="200"
            r="14"
            fill="none"
            stroke="#34d399"
            strokeOpacity="0.4"
            strokeWidth="1"
          />
        </svg>
        {/* Capa: halo respirando */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-1/4 top-1/3 size-[420px] rounded-full bg-indigo-500/30 blur-3xl hero-glow-breathe"
        />
        {/* Partículas */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-[18%] top-[40%] size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.9)] hero-particle"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-[55%] top-[20%] size-1 rounded-full bg-indigo-200 shadow-[0_0_10px_rgba(165,180,252,0.9)] hero-particle hero-particle-delay-1"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-[8%] top-[70%] size-1 rounded-full bg-violet-200 shadow-[0_0_10px_rgba(196,181,253,0.9)] hero-particle hero-particle-delay-2"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
        />

        <Container className="relative py-12 sm:py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_440px] lg:items-center">
            <div className="min-w-0">
              <div className="hero-fade-in">
                <Badge className="border-indigo-300/40 bg-indigo-400/10 text-indigo-100">
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                  />
                  Argentina · ARS · Beta en construcción
                </Badge>
              </div>
              <h1 className="hero-fade-in hero-fade-in-delay-1 mt-4 max-w-4xl text-3xl font-bold tracking-tight text-white sm:mt-6 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
                Comprá con más contexto:{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
                  precio real, historial y alertas
                </span>
              </h1>
              <p className="hero-fade-in hero-fade-in-delay-2 mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:mt-5 sm:text-lg sm:leading-8">
                Estamos construyendo un comparador con precios de fuentes
                integradas, historial y alertas. Las promos bancarias se
                publican solo cuando tienen fuente y vigencia verificable.
              </p>

              <div className="hero-fade-in hero-fade-in-delay-3">
                <Card
                  id="buscar"
                  className="mt-5 border-white/10 bg-white p-4 shadow-[0_28px_70px_-12px_rgba(8,11,30,0.6)] sm:mt-8"
                >
                  <SearchForm
                    helperText="Buscador MVP. Los datos demo están identificados."
                    id="home-search"
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {searchExamples.map((example) => (
                      <Link
                        className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                        href={`/buscar?q=${encodeURIComponent(example)}`}
                        key={example}
                      >
                        {example}
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>

              <dl className="hero-fade-in hero-fade-in-delay-4 mt-6 grid max-w-xl grid-cols-3 gap-4 text-sm text-slate-300 sm:mt-8">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-200">
                    Productos
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-white">+1.000</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-200">
                    Tiendas
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-white">5+</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-200">
                    Sin costo
                  </dt>
                  <dd className="mt-1 text-xl font-bold text-white">100%</dd>
                </div>
              </dl>
            </div>

            {/* Composición flotante: card principal + tags + mini card */}
            <div className="relative hidden min-h-[460px] lg:block">
              {/* Tag "Mejor precio" arriba izq */}
              <div className="hero-float hero-fade-in hero-fade-in-delay-2 absolute -left-2 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur-md">
                <svg
                  aria-hidden
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Mejor precio
              </div>

              {/* Tag -18% arriba derecha */}
              <div className="hero-float hero-float-delay-2 hero-fade-in hero-fade-in-delay-3 absolute right-6 top-0 z-10 rounded-xl border border-emerald-300/40 bg-gradient-to-br from-emerald-500/25 to-emerald-500/10 px-3 py-2 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-200">
                  Ahorro
                </p>
                <p className="text-2xl font-bold text-emerald-100">−18%</p>
              </div>

              {/* Card principal: producto */}
              <Card className="hero-float hero-float-delay-1 hero-fade-in hero-fade-in-delay-3 relative mt-12 border-white/10 bg-white p-5 text-slate-950 shadow-[0_28px_70px_-12px_rgba(8,11,30,0.75)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Vista marketplace
                    </p>
                    <h2 className="mt-2 text-lg font-bold text-slate-950">
                      {hasRealProducts
                        ? "Precios reales disponibles"
                        : "Comparación clara por tienda"}
                    </h2>
                  </div>
                  <Badge variant={hasRealProducts ? "success" : "neutral"}>
                    {hasRealProducts ? "Datos reales" : "Catálogo demo"}
                  </Badge>
                </div>
                <div className="mt-5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-500">
                    {heroProduct?.name ?? "Producto demo"}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    Desde{" "}
                    {heroProduct
                      ? formatCurrencyARS(heroProduct.price)
                      : "$0"}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      {heroProduct ? heroProduct.storeName : "Ofertas demo"}
                    </p>
                    {/* Sparkline historial */}
                    <svg
                      aria-hidden
                      className="text-emerald-500"
                      height="22"
                      viewBox="0 0 100 22"
                      width="90"
                    >
                      <polyline
                        fill="none"
                        points="0,16 12,12 24,15 36,8 48,11 60,6 72,9 84,4 100,7"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 space-y-2.5">
                  {heroPeerProducts.slice(0, 2).map((product) => (
                    <Link
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50/50"
                      href={`/producto/${product.slug}`}
                      key={product.slug}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">
                          {product.name}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          {product.storeName}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-slate-950">
                        {formatCurrencyARS(product.price)}
                      </p>
                    </Link>
                  ))}
                </div>
                <Link
                  className="group/cta relative mt-5 inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.55)] transition hover:-translate-y-0.5 hover:from-indigo-500 hover:to-indigo-700 hover:shadow-[0_16px_32px_-10px_rgba(79,70,229,0.7)]"
                  href={
                    heroProduct ? `/producto/${heroProduct.slug}` : "/buscar?q=a55"
                  }
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover/cta:translate-x-full"
                  />
                  Ver comparación
                </Link>
              </Card>

              {/* Card flotante "Alerta activa" */}
              <div className="hero-float hero-float-delay-3 hero-fade-in hero-fade-in-delay-4 absolute -bottom-2 -left-6 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur-md shadow-[0_18px_40px_-12px_rgba(8,11,30,0.65)]">
                <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <svg
                    aria-hidden
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-200">
                    Alerta activa
                  </p>
                  <p className="text-sm font-bold text-white">Avisame si baja</p>
                </div>
              </div>

              {/* Tag historial 90d */}
              <div className="hero-float hero-fade-in hero-fade-in-delay-4 absolute -right-2 bottom-10 z-10 inline-flex items-center gap-2 rounded-full border border-indigo-300/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-100 backdrop-blur-md">
                <svg
                  aria-hidden
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M3 17l5-6 4 4 8-10" />
                </svg>
                Historial 90 días
              </div>
            </div>
          </div>
        </Container>

        {/* Sombra inferior para suavizar la transicion */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f4f6fb]/0"
        />
      </section>

      <section className="py-6 sm:py-16">
        <Container>
          {/* Mobile: franja compacta de chips, cerca del hero */}
          <div className="flex flex-wrap gap-2 sm:hidden">
            {benefits.map((benefit) => (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                key={benefit.title}
              >
                <span
                  aria-hidden
                  className="inline-block size-1.5 rounded-full bg-emerald-500"
                />
                {benefit.chip}
              </span>
            ))}
          </div>

          {/* Desktop: cards amplias */}
          <div className="hidden grid-cols-2 gap-4 sm:grid xl:grid-cols-4">
            {benefits.map((benefit) => (
              <Card
                className="p-6 transition hover:-translate-y-0.5 hover:border-indigo-200"
                key={benefit.title}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                  <span
                    aria-hidden
                    className="inline-block size-1.5 rounded-full bg-emerald-500"
                  />
                  {benefit.kicker}
                </span>
                <h2 className="mt-4 text-lg font-bold leading-snug text-slate-950">
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

      <section className="py-8 sm:py-16">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant={hasRealProducts ? "success" : "neutral"}>
                {featuredBadgeLabel}
              </Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:mt-4 sm:text-4xl">
                Detectadas por PrecioRadar
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                {featuredCopy}
              </p>
              <p className="mt-1 hidden text-xs text-slate-400 sm:block">
                Selección actualizada semanalmente según precios, historial y señales de oportunidad.
              </p>
            </div>
            <Link
              className="hidden h-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 sm:inline-flex"
              href="/buscar?q=galaxy+a55"
            >
              Ver más productos →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <Card
                className="group overflow-hidden transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_22px_50px_-15px_rgba(79,70,229,0.25)]"
                key={product.slug}
              >
                <div className="p-3 sm:p-4">
                  <div className="relative">
                    <ProductImage imageUrl={product.imageUrl} name={product.name} />
                    <Badge
                      variant={!product.isDemo ? "success" : "neutral"}
                      className="absolute right-2 top-2 shadow-sm"
                    >
                      {!product.isDemo ? "Real" : "Datos en seguimiento"}
                    </Badge>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-slate-950 sm:mt-4 sm:text-base">
                    {product.name}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                    {product.storeName}
                  </p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-1 border-t border-slate-100 pt-3 sm:mt-4 sm:pt-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 sm:text-xs">
                        Desde
                      </p>
                      <p className="text-lg font-bold tracking-tight text-slate-950 sm:text-2xl">
                        {formatCurrencyARS(product.price)}
                      </p>
                    </div>
                    {product.recommendationLabel ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:px-2.5 sm:py-1 sm:text-[11px]">
                        {product.recommendationLabel}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.55)] transition hover:from-indigo-500 hover:to-indigo-700 sm:mt-5 sm:h-11"
                    href={`/producto/${product.slug}`}
                  >
                    <span className="sm:hidden">Comparar</span>
                    <span className="hidden sm:inline">Ver comparación</span>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section id="categorias" className="py-8 sm:py-16">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="brand">Categorías populares</Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:mt-4 sm:text-4xl">
                Explorá productos para comparar
              </h2>
            </div>
            <p className="hidden max-w-xl text-sm leading-6 text-slate-600 sm:block">
              El MVP prioriza categorías donde precio, historial y alertas
              aportan una decisión de compra más confiable.
            </p>
          </div>

          {/* Mobile: chips deslizables horizontalmente */}
          <div className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:hidden [&::-webkit-scrollbar]:hidden">
            {mvpCategoryDescriptors.map((descriptor) => (
              <Link
                className="inline-flex h-9 shrink-0 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                href={`/categoria/${descriptor.slug}`}
                key={descriptor.slug}
              >
                {descriptor.name}
              </Link>
            ))}
          </div>

          {/* Desktop: cards visuales */}
          <div className="mt-10 hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            {mvpCategoryDescriptors.map((descriptor, index) => (
              <Link
                className="group block"
                href={`/categoria/${descriptor.slug}`}
                key={descriptor.slug}
              >
                <Card className="h-full p-6 transition group-hover:-translate-y-1 group-hover:border-indigo-200 group-hover:shadow-[0_22px_50px_-15px_rgba(79,70,229,0.25)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.55)]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-950">
                    {descriptor.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {descriptor.description}
                  </p>
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 opacity-0 transition group-hover:opacity-100">
                    Explorar
                    <span aria-hidden>→</span>
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section id="como-funciona" className="bg-white py-12 sm:py-20">
        <Container>
          <div className="max-w-2xl">
            <Badge variant="neutral">Cómo funciona</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Tres pasos para comprar con más contexto
            </h2>
          </div>

          <div className="relative mt-6 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
            <div
              aria-hidden
              className="absolute left-6 top-12 hidden h-px w-[calc(100%-3rem)] bg-gradient-to-r from-indigo-200 via-violet-200 to-emerald-200 md:block"
            />
            {steps.map((step, index) => (
              <div className="relative flex gap-4 md:block" key={step.title}>
                <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.55)] sm:h-12 sm:w-12">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-950 sm:mt-5 sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 sm:mt-3 sm:text-base sm:leading-7">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-10 sm:py-16">
        <Container>
          <Card className="relative grid gap-6 overflow-hidden border-white/10 bg-hero-glow p-6 text-white sm:p-8 md:grid-cols-[0.8fr_1.2fr] md:p-10">
            <div>
              <Badge className="border-emerald-300/30 bg-emerald-300/10 text-emerald-100">
                Confianza
              </Badge>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                Transparencia antes de comprar
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Información clara sobre cómo trabajamos y de dónde vienen los
                precios.
              </p>
            </div>
            <ul className="grid gap-3 text-sm leading-6 text-slate-200 sm:grid-cols-2">
              {[
                "Los precios pueden cambiar en la tienda externa.",
                "La compra se realiza fuera de PrecioRadar.",
                "Los datos demo están identificados durante el desarrollo MVP.",
              ].map((line) => (
                <li className="flex items-start gap-2" key={line}>
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Container>
      </section>
    </main>
  );
}
