import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Confirmación de suscripción",
  description: "Estado de tu suscripción al newsletter de PrecioRadar.",
  alternates: { canonical: "/newsletter/confirmacion" },
};

type ConfirmationStatus =
  | "confirmed"
  | "already_confirmed"
  | "invalid"
  | "not_found"
  | "unavailable"
  | "error";

const statusCopy: Record<
  ConfirmationStatus,
  { badge: string; title: string; body: string }
> = {
  confirmed: {
    badge: "Suscripción activa",
    title: "¡Listo! Tu suscripción quedó confirmada",
    body: "Te vamos a avisar cuando publiquemos las próximas ofertas reales en MercadoLibre.",
  },
  already_confirmed: {
    badge: "Ya estabas suscripto",
    title: "Tu email ya estaba confirmado",
    body: "No hace falta hacer nada. Si querés dejar de recibir emails, escribinos a privacidad@precioradar.com.ar.",
  },
  invalid: {
    badge: "Link inválido",
    title: "El link de confirmación no es válido",
    body: "Pedí un nuevo email desde la página principal y volvé a intentar.",
  },
  not_found: {
    badge: "Link expirado",
    title: "No encontramos esa suscripción",
    body: "El token ya fue usado o expiró. Pedí un nuevo email de confirmación desde la página principal.",
  },
  unavailable: {
    badge: "Servicio caído",
    title: "No pudimos confirmar ahora mismo",
    body: "Nuestro backend no está respondiendo. Intentá de nuevo en unos minutos.",
  },
  error: {
    badge: "Error",
    title: "Ocurrió un problema al confirmar",
    body: "Probá de nuevo y, si persiste, escribinos a privacidad@precioradar.com.ar.",
  },
};

type ConfirmacionPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

function normalizeStatus(value: string | string[] | undefined): ConfirmationStatus {
  const single = Array.isArray(value) ? value[0] : value;
  if (
    single === "confirmed" ||
    single === "already_confirmed" ||
    single === "invalid" ||
    single === "not_found" ||
    single === "unavailable" ||
    single === "error"
  ) {
    return single;
  }
  return "invalid";
}

export default async function NewsletterConfirmacionPage({
  searchParams,
}: ConfirmacionPageProps) {
  const params = await searchParams;
  const status = normalizeStatus(params.status);
  const copy = statusCopy[status];

  return (
    <main className="bg-slate-50 py-12 text-slate-950">
      <Container className="max-w-2xl">
        <Card className="p-8 text-center">
          <Badge variant="neutral">{copy.badge}</Badge>
          <h1 className="mt-5 text-3xl font-semibold text-slate-950">
            {copy.title}
          </h1>
          <p className="mt-3 leading-7 text-slate-600">{copy.body}</p>
          <Link
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/"
          >
            Volver al inicio
          </Link>
        </Card>
      </Container>
    </main>
  );
}
