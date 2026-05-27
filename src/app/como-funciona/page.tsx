import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Cómo funciona PrecioRadar",
  description:
    "Conoce cómo PrecioRadar guarda historial, compara cambios y muestra una señal simple para ayudarte a decidir antes de comprar.",
  alternates: { canonical: "/como-funciona" },
  openGraph: {
    title: "Cómo funciona PrecioRadar",
    description:
      "Analizamos precios, guardamos historial y te damos una señal simple para ayudarte a decidir mejor antes de comprar.",
    type: "website",
    url: "/como-funciona",
  },
};

const steps = [
  {
    title: "Relevamos precios",
    text: "Tomamos precios reales de productos publicados en tiendas y marketplaces compatibles. La idea no es mostrar un número suelto, sino entender cómo se mueve ese precio en el tiempo.",
    icon: "01",
  },
  {
    title: "Construimos historial",
    text: "Cada vez que detectamos un precio, lo guardamos. Con el paso de los días, PrecioRadar puede comparar el precio actual contra valores anteriores.",
    icon: "02",
  },
  {
    title: "Comparamos el precio actual",
    text: "El sistema analiza si el precio de hoy está por debajo, cerca o por encima de su comportamiento reciente.",
    icon: "03",
  },
  {
    title: "Te damos una señal simple",
    text: "En vez de llenarte de datos difíciles, te mostramos una señal clara: Excelente precio, Buen precio, Precio normal, Caro o Conviene esperar.",
    icon: "04",
  },
  {
    title: "Te avisamos si baja",
    text: "Si seguís un producto o creás una alerta, PrecioRadar puede avisarte cuando detecta una baja o una oportunidad interesante.",
    icon: "05",
  },
];

const flow = [
  "Tiendas y publicaciones",
  "PrecioRadar guarda precios",
  "Se arma historial",
  "Se compara el precio actual",
  "Se muestra una recomendación simple",
];

const exampleHistory = [
  { label: "Hace 30 días", price: "$85.000", height: "h-24" },
  { label: "Hace 15 días", price: "$79.000", height: "h-20" },
  { label: "Hoy", price: "$68.000", height: "h-14" },
];

function CheckIcon() {
  return (
    <svg
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function ComoFuncionaPage() {
  return (
    <main className="bg-section-soft text-slate-950">
      <section className="border-b border-slate-200/80 bg-white">
        <Container className="grid gap-8 py-12 md:grid-cols-[minmax(0,1fr)_360px] md:items-center md:py-16">
          <div>
            <Badge variant="brand">Cómo funciona</Badge>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Cómo funciona PrecioRadar
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Analizamos precios, guardamos historial y te damos una señal
              simple para ayudarte a decidir mejor antes de comprar.
            </p>
          </div>

          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-500">
              Producto de ejemplo
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">
              Auriculares Bluetooth
            </h2>
            <div className="mt-5 flex items-end gap-3 rounded-xl border border-slate-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-4">
              {exampleHistory.map((item) => (
                <div className="flex min-w-0 flex-1 flex-col items-center" key={item.label}>
                  <div
                    className={`${item.height} w-full rounded-t-lg bg-gradient-to-b from-indigo-500 to-emerald-500`}
                  />
                  <p className="mt-2 text-center text-xs font-semibold text-slate-500">
                    {item.label}
                  </p>
                  <p className="text-sm font-bold text-slate-950">{item.price}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
                <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-white">
                  <CheckIcon />
                </span>
                Buen precio
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Está por debajo de su precio reciente, por eso PrecioRadar lo
                marca como una oportunidad interesante.
              </p>
            </div>
          </Card>
        </Container>
      </section>

      <section className="py-12 md:py-16">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((step) => (
              <Card className="p-5" key={step.title}>
                <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-sm font-bold text-white shadow-[0_8px_20px_-8px_rgba(79,70,229,0.55)]">
                  {step.icon}
                </div>
                <h2 className="mt-4 text-base font-bold leading-snug text-slate-950">
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {step.text}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-12 md:py-16">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="neutral">El recorrido</Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
                De un precio suelto a una decisión con contexto
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-slate-600">
              PrecioRadar ordena la información para que puedas mirar menos
              números y entender mejor la oportunidad.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-5">
            {flow.map((item, index) => (
              <div className="relative" key={item}>
                <Card className="h-full p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-600">
                    Paso {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                    {item}
                  </p>
                </Card>
                {index < flow.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-indigo-300 md:block"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-12 md:py-16">
        <Container className="grid gap-5 md:grid-cols-2">
          <Card className="p-6">
            <Badge variant="success">Transparencia</Badge>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
              Transparencia ante todo
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Cuando no tenemos historial suficiente, lo aclaramos. PrecioRadar
              no promete adivinar el futuro: te ayuda a comprar con más contexto
              y menos impulso.
            </p>
          </Card>

          <Card className="p-6">
            <Badge variant="brand">Utilidad</Badge>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
              ¿Por qué esto sirve?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Muchos descuentos parecen buenos, pero no siempre lo son. Al
              comparar el precio actual contra su historial, podés ver mejor si
              una oferta realmente conviene o si es solo marketing.
            </p>
          </Card>
        </Container>
      </section>

      <section className="pb-16">
        <Container>
          <Card className="relative overflow-hidden border-white/10 bg-hero-glow p-7 text-white md:p-9">
            <div className="max-w-2xl">
              <Badge className="border-emerald-300/30 bg-emerald-300/10 text-emerald-100">
                Empezá ahora
              </Badge>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Probá buscar un producto
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Buscá un producto y mirá si su precio actual realmente
                conviene.
              </p>
              <Link
                className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                href="/buscar"
              >
                Buscar precios
              </Link>
            </div>
          </Card>
        </Container>
      </section>
    </main>
  );
}
