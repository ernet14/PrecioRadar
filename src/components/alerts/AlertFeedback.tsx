import { Card } from "@/components/ui/Card";

const alertMessages: Record<string, { title: string; message: string }> = {
  created: {
    title: "Alerta creada",
    message: "La alerta quedo activa para este producto.",
  },
  limit: {
    title: "Limite de 3 alertas alcanzado",
    message: "Pausa o elimina una alerta activa para crear o reactivar otra.",
  },
  paused: {
    title: "Alerta pausada",
    message: "La alerta queda guardada y no cuenta como activa.",
  },
  reactivated: {
    title: "Alerta reactivada",
    message: "La alerta vuelve a quedar activa.",
  },
  deleted: {
    title: "Alerta eliminada",
    message: "La alerta fue eliminada de tu cuenta.",
  },
  "not-found": {
    title: "Alerta no encontrada",
    message: "No pudimos encontrar esa alerta en tu cuenta.",
  },
  invalid: {
    title: "No pudimos crear la alerta",
    message: "Revisa el precio objetivo o el porcentaje ingresado.",
  },
  unavailable: {
    title: "Alertas no disponibles",
    message:
      "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.",
  },
  error: {
    title: "No pudimos actualizar la alerta",
    message: "Intenta nuevamente en unos segundos.",
  },
};

export function AlertFeedback({ status }: { status?: string }) {
  const feedback = status ? alertMessages[status] : null;

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
