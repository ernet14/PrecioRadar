import { Card } from "@/components/ui/Card";

const trackingMessages: Record<string, { title: string; message: string }> = {
  tracked: {
    title: "Oferta agregada a seguimiento",
    message: "La oferta se agrego a tu dashboard.",
  },
  "already-tracked": {
    title: "Ya seguis esta oferta",
    message: "Esta oferta ya estaba en tu lista.",
  },
  limit: {
    title: "Llegaste al limite de 2 ofertas seguidas",
    message: "El plan gratis permite seguir hasta 2 ofertas.",
  },
  untracked: {
    title: "Oferta eliminada",
    message: "Dejaste de seguir esta oferta.",
  },
  "not-tracked": {
    title: "No estaba seguida",
    message: "La oferta ya no estaba en tu lista.",
  },
  "not-found": {
    title: "Producto no encontrado",
    message: "No pudimos identificar el producto demo para seguirlo.",
  },
  unavailable: {
    title: "Seguimiento no disponible",
    message:
      "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.",
  },
  error: {
    title: "No pudimos actualizar el seguimiento",
    message: "Intenta nuevamente en unos segundos.",
  },
};

export function TrackingFeedback({ status }: { status?: string }) {
  const feedback = status ? trackingMessages[status] : null;

  if (!feedback) {
    return null;
  }

  return (
    <Card className="border-emerald-100 bg-emerald-50 p-5 shadow-none">
      <p className="text-sm font-semibold text-emerald-950">{feedback.title}</p>
      <p className="mt-2 text-sm leading-6 text-emerald-900/80">
        {feedback.message}
      </p>
    </Card>
  );
}
