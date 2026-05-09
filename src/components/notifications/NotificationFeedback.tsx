import { Card } from "@/components/ui/Card";

const notificationMessages: Record<string, { title: string; message: string }> = {
  created: {
    title: "Notificacion creada",
    message: "Se creo al menos una notificacion interna por alertas cumplidas.",
  },
  none: {
    title: "No hay alertas cumplidas",
    message: "La evaluacion termino sin nuevas notificaciones.",
  },
  read: {
    title: "Notificacion marcada como leida",
    message: "Actualizamos el estado de tus notificaciones.",
  },
  "not-found": {
    title: "Notificacion no encontrada",
    message: "No pudimos encontrar esa notificacion en tu cuenta.",
  },
  unavailable: {
    title: "Notificaciones no disponibles",
    message:
      "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.",
  },
  error: {
    title: "No pudimos actualizar notificaciones",
    message: "Intenta nuevamente en unos segundos.",
  },
};

export function NotificationFeedback({ status }: { status?: string }) {
  const feedback = status ? notificationMessages[status] : null;

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
