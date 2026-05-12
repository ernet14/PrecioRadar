import { Card } from "@/components/ui/Card";

const messages: Record<
  string,
  { className: string; description: string; title: string }
> = {
  created: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    description: "Gracias. Guardamos el reporte para revisarlo desde admin.",
    title: "Reporte enviado",
  },
  error: {
    className: "border-rose-200 bg-rose-50 text-rose-950",
    description: "No pudimos guardar el reporte. Proba de nuevo mas tarde.",
    title: "Reporte no enviado",
  },
  invalid: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    description: "Falta elegir un tipo de problema valido.",
    title: "Reporte incompleto",
  },
  "not-found": {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    description: "No encontramos el producto u oferta para asociar el reporte.",
    title: "Producto no encontrado",
  },
  unavailable: {
    className: "border-amber-200 bg-amber-50 text-amber-950",
    description: "La base de datos no esta configurada para guardar reportes.",
    title: "Reportes no disponibles",
  },
};

export function ReportFeedback({ status }: { status?: string }) {
  if (!status || !messages[status]) {
    return null;
  }

  const message = messages[status];

  return (
    <Card className={`p-4 text-sm leading-6 shadow-none ${message.className}`}>
      <p className="font-semibold">{message.title}</p>
      <p className="mt-1">{message.description}</p>
    </Card>
  );
}
