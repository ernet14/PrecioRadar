import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Documentación de la API",
  description:
    "Referencia de la API de PrecioRadar: autenticación, endpoints de búsqueda y de precios por producto, límites por plan y códigos de error.",
  alternates: { canonical: getAbsoluteUrl("/api-docs") },
};

const BASE = getSiteUrl();

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p className="flex flex-wrap items-center gap-2 font-mono text-sm">
        <span className="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
          {method}
        </span>
        <span className="text-slate-950">{path}</span>
      </p>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

const ERRORS: { code: string; reason: string; when: string }[] = [
  { code: "401", reason: "missing_api_key", when: "No mandaste la clave en ningún header." },
  { code: "401", reason: "invalid_api_key", when: "La clave no existe, está inactiva o fue revocada." },
  { code: "404", reason: "product_not_found", when: "El slug no corresponde a un producto real con ofertas." },
  { code: "429", reason: "rate_limit_exceeded", when: "Superaste el límite diario de tu plan." },
  { code: "503", reason: "database_unavailable", when: "Servicio de datos temporalmente no disponible." },
];

export default function ApiDocsPage() {
  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:p-8">
          <p className="text-sm font-semibold text-emerald-200">API v1 · referencia</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Documentación de la API
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
            REST sobre HTTPS, respuestas en JSON. Cada respuesta incluye el{" "}
            <code className="text-emerald-200">tier</code> con el que se resolvió.
            ¿Todavía no tenés clave?{" "}
            <Link className="font-semibold text-white underline" href="/api-planes">
              Mirá los planes
            </Link>
            .
          </p>
        </section>

        <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-bold tracking-tight">Autenticación</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Toda petición necesita tu API key (formato{" "}
            <code className="rounded bg-slate-100 px-1">pr_live_…</code>). Mandala
            como Bearer token o en el header <code className="rounded bg-slate-100 px-1">x-api-key</code>.
            Nunca la expongas en el front-end ni la subas al repo.
          </p>
          <div className="mt-4">
            <CodeBlock>{`# Authorization: Bearer
curl -H "Authorization: Bearer pr_live_xxx" \\
  ${BASE}/api/v1/products?q=notebook

# x-api-key
curl -H "x-api-key: pr_live_xxx" \\
  ${BASE}/api/v1/products?q=notebook`}</CodeBlock>
          </div>
        </Card>

        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Endpoints</h2>

          <Endpoint method="GET" path="/api/v1/products">
            <p className="text-sm leading-6 text-slate-600">
              Busca productos reales con al menos una oferta disponible.
              Parámetros: <code className="rounded bg-slate-100 px-1">q</code> (texto, opcional)
              y <code className="rounded bg-slate-100 px-1">limit</code> (1–50, default 20).
            </p>
            <CodeBlock>{`curl -H "Authorization: Bearer pr_live_xxx" \\
  "${BASE}/api/v1/products?q=smart%20tv%2055&limit=5"

{
  "tier": "PRO",
  "status": "ok",
  "query": "smart tv 55",
  "count": 1,
  "results": [
    {
      "slug": "smart-tv-55-...",
      "name": "Smart TV 55\\" ...",
      "brand": "Samsung",
      "category": "Televisores",
      "bestPrice": 749999,
      "currency": "ARS",
      "offerCount": 3
    }
  ]
}`}</CodeBlock>
          </Endpoint>

          <Endpoint method="GET" path="/api/v1/products/{slug}">
            <p className="text-sm leading-6 text-slate-600">
              Devuelve el detalle de precios de un producto: mejor precio,
              ofertas por tienda, estadísticas e historial. La profundidad del
              historial depende de tu plan (<code className="rounded bg-slate-100 px-1">historyDays</code>).
            </p>
            <CodeBlock>{`curl -H "Authorization: Bearer pr_live_xxx" \\
  ${BASE}/api/v1/products/smart-tv-55-samsung

{
  "tier": "PRO",
  "slug": "smart-tv-55-samsung",
  "name": "Smart TV 55\\" Samsung",
  "brand": "Samsung",
  "model": "AU7000",
  "category": "Televisores",
  "bestPrice": 749999,
  "currency": "ARS",
  "offerCount": 3,
  "offers": [
    { "store": "Tienda A", "storeSlug": "tienda-a", "price": 749999,
      "currency": "ARS", "available": true, "url": "https://..." }
  ],
  "stats": { "averagePrice": 812000, "minPrice": 749999, "maxPrice": 899000,
    "variationPercent": -7.6, "pointsCount": 42, "isSufficient": true },
  "historyDays": 365,
  "history": [
    { "recordedAt": "2026-01-10T12:00:00.000Z", "price": 880000,
      "currency": "ARS", "store": "Tienda A" }
  ]
}`}</CodeBlock>
          </Endpoint>
        </section>

        <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-bold tracking-tight">Límites y plan</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            El límite diario y la profundidad de historial dependen de tu plan
            (ver <Link className="font-semibold text-indigo-700 hover:underline" href="/api-planes">planes</Link>).
            Las respuestas correctas incluyen el header{" "}
            <code className="rounded bg-slate-100 px-1">X-RateLimit-Remaining</code> con
            las llamadas que te quedan en el día. Al pasarte, recibís un{" "}
            <code className="rounded bg-slate-100 px-1">429</code>.
          </p>
        </Card>

        <Card className="border-slate-200 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-bold tracking-tight">Errores</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Los errores devuelven un JSON con la forma{" "}
            <code className="rounded bg-slate-100 px-1">{`{ "error": "<motivo>" }`}</code> y
            el código HTTP correspondiente.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-semibold">HTTP</th>
                  <th className="py-2 pr-4 font-semibold">error</th>
                  <th className="py-2 font-semibold">Cuándo</th>
                </tr>
              </thead>
              <tbody>
                {ERRORS.map((row) => (
                  <tr className="border-b border-slate-100" key={`${row.code}-${row.reason}`}>
                    <td className="py-2 pr-4 font-mono font-semibold text-slate-950">{row.code}</td>
                    <td className="py-2 pr-4 font-mono text-slate-700">{row.reason}</td>
                    <td className="py-2 text-slate-600">{row.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
          Solo servimos productos reales (sin demos). ¿Listo para integrar?{" "}
          <Link className="font-semibold text-indigo-700 hover:underline" href="/api-planes">
            Elegí un plan y pedí tu API key
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}
