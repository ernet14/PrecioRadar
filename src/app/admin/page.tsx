import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireAdmin } from "@/lib/supabase/auth";
import { formatDate } from "@/lib/utils";
import {
  getAdminOverview,
  type AdminOverview,
} from "@/services/adminService";

type SummaryCardProps = {
  description: string;
  label: string;
  value: string;
};

type AdminSection = {
  count: number;
  description: string;
  label: string;
  status: string;
};

const numberFormatter = new Intl.NumberFormat("es-AR");
const reportReasonLabels: Record<string, string> = {
  broken_link: "Link roto",
  incorrect_price: "Precio incorrecto",
  other: "Otro problema",
  suspicious_offer: "Oferta sospechosa",
  wrong_product_match: "Producto mal relacionado",
};

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function getCountValue(overview: AdminOverview, value: number) {
  return overview.status === "ready" ? formatCount(value) : "-";
}

function SummaryCard({ description, label, value }: SummaryCardProps) {
  return (
    <Card className="border-slate-200 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </Card>
  );
}

function AdminSectionCard({ count, description, label, status }: AdminSection) {
  return (
    <Card className="flex h-full flex-col justify-between border-slate-200 p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">{label}</h2>
          <Badge variant="neutral">{formatCount(count)}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <p className="mt-5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
        {status}
      </p>
    </Card>
  );
}

function getSections(overview: AdminOverview): AdminSection[] {
  const counts = overview.counts;

  return [
    {
      count: counts.products,
      description: "Catalogo agrupado disponible para busqueda y comparacion.",
      label: "Productos",
      status: "Lectura de productos preparada",
    },
    {
      count: counts.offers,
      description: "Ofertas puntuales por tienda vinculadas a productos.",
      label: "Ofertas",
      status: "Sin edicion avanzada en esta etapa",
    },
    {
      count: counts.stores,
      description: "Tiendas y providers disponibles para el MVP.",
      label: "Tiendas",
      status: "Activacion futura preparada",
    },
    {
      count: counts.categories,
      description: "Categorias iniciales del marketplace.",
      label: "Categorias",
      status: "Estructura de categorias lista",
    },
    {
      count: counts.users,
      description: "Usuarios sincronizados desde Supabase Auth.",
      label: "Usuarios",
      status: "Rol admin protegido por metadata",
    },
    {
      count: counts.searches,
      description: "Consultas recientes registradas para detectar demanda.",
      label: "Busquedas populares",
      status: "Top visible en este panel",
    },
    {
      count: counts.clicks,
      description: "Clicks registrados hacia ofertas y afiliados.",
      label: "Clicks",
      status: "Preparado para etapa afiliados",
    },
    {
      count: counts.alerts,
      description: "Alertas creadas por usuarios del MVP.",
      label: "Alertas",
      status: "Solo resumen operativo",
    },
    {
      count: counts.reports,
      description: "Reportes enviados por usuarios sobre productos u ofertas.",
      label: "Reportes",
      status: "Preparado para reportar problema",
    },
    {
      count: counts.affiliateLinks,
      description: "Links afiliados configurados por tienda o producto.",
      label: "Afiliados",
      status: "Sin priorizar comision sobre precio",
    },
    {
      count: counts.providerErrors,
      description: "Errores o estados no exitosos de providers.",
      label: "Errores de providers",
      status: "Monitoreo basico activo",
    },
  ];
}

export default async function AdminPage() {
  const user = await requireAdmin();
  const overview = await getAdminOverview();
  const counts = overview.counts;

  return (
    <main className="bg-[#f4f7fb] py-10 text-slate-950">
      <Container className="space-y-8">
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-[0_24px_60px_rgba(15,23,42,0.22)]">
          <div className="border-b border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-blue-100 md:px-8">
            Panel interno
          </div>
          <div className="px-6 py-8 md:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <Badge className="border-blue-400/40 bg-blue-400/10 text-blue-100">
                  Admin &middot; MVP
                </Badge>
                <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                  Admin PrecioRadar
                </h1>
                <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                  Vista operativa simple para revisar datos clave sin habilitar
                  edicion avanzada todavia.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-sm text-slate-200">
                <p className="font-semibold text-white">Acceso permitido</p>
                <p className="mt-2 break-all">{user.email}</p>
                <p className="mt-3 text-xs leading-5 text-slate-300">
                  El rol admin se valida desde metadata de Supabase.
                </p>
              </div>
            </div>
          </div>
        </section>

        {overview.status !== "ready" ? (
          <Card className="border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 shadow-none">
            <span className="font-semibold">Panel con datos no disponibles.</span>{" "}
            {overview.reason}
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            description="Productos agrupados disponibles."
            label="Productos"
            value={getCountValue(overview, counts.products)}
          />
          <SummaryCard
            description="Ofertas por tienda cargadas."
            label="Ofertas"
            value={getCountValue(overview, counts.offers)}
          />
          <SummaryCard
            description="Alertas creadas por usuarios."
            label="Alertas"
            value={getCountValue(overview, counts.alerts)}
          />
          <SummaryCard
            description="Usuarios sincronizados."
            label="Usuarios"
            value={getCountValue(overview, counts.users)}
          />
          <SummaryCard
            description="Clicks hacia tiendas."
            label="Clicks"
            value={getCountValue(overview, counts.clicks)}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {getSections(overview).map((section) => (
            <AdminSectionCard key={section.label} {...section} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Busquedas populares
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Top calculado sobre las ultimas busquedas registradas.
                </p>
              </div>
              <Badge variant="neutral">
                {getCountValue(overview, counts.searches)}
              </Badge>
            </div>

            {overview.popularSearches.length > 0 ? (
              <div className="mt-5 divide-y divide-slate-100">
                {overview.popularSearches.map((search) => (
                  <div
                    className="flex items-center justify-between gap-4 py-3"
                    key={search.query}
                  >
                    <p className="min-w-0 truncate text-sm font-semibold text-slate-950">
                      {search.query}
                    </p>
                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {formatCount(search.count)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Todavia no hay busquedas registradas para mostrar.
              </p>
            )}
          </Card>

          <Card className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Reportes recientes
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Problemas enviados desde el detalle de producto.
                </p>
              </div>
              <Badge variant="neutral">
                {getCountValue(overview, counts.reports)}
              </Badge>
            </div>

            {overview.recentReports.length > 0 ? (
              <div className="mt-5 divide-y divide-slate-100">
                {overview.recentReports.map((report) => (
                  <div className="py-3" key={report.id}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-950">
                        {reportReasonLabels[report.reason] ?? report.reason}
                      </p>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {report.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                      {report.productName ?? "Producto sin asociar"}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      {formatDate(report.createdAt)}
                    </p>
                    <Link
                      className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                      href={`/admin/reportes/${report.id}`}
                    >
                      Abrir reporte
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Todavia no hay reportes para revisar.
              </p>
            )}
          </Card>

          <Card className="border-slate-200 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Errores de providers
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ultimos estados no exitosos registrados por adapters.
                </p>
              </div>
              <Badge variant={counts.providerErrors > 0 ? "neutral" : "success"}>
                {getCountValue(overview, counts.providerErrors)}
              </Badge>
            </div>

            {overview.providerErrors.length > 0 ? (
              <div className="mt-5 divide-y divide-slate-100">
                {overview.providerErrors.map((providerError) => (
                  <div
                    className="py-3"
                    key={`${providerError.provider}-${providerError.action}-${providerError.createdAt.toISOString()}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-950">
                        {providerError.provider} &middot; {providerError.action}
                      </p>
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                        {providerError.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {providerError.errorMessage ??
                        "Sin detalle de error registrado."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No hay errores recientes de providers.
              </p>
            )}
          </Card>
        </section>
      </Container>
    </main>
  );
}
