import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cómo funcionamos",
  description:
    "Cómo PrecioRadar obtiene precios, construye el historial, decide cuándo mostrar recomendaciones y qué tiendas están activas hoy.",
  alternates: { canonical: "/como-funcionamos" },
};

const sections = [
  {
    title: "De dónde sacamos los precios",
    body: [
      "Tomamos precios de fuentes integradas al sistema y los guardamos como ofertas asociadas a productos concretos. Cuando una fuente no responde o no podemos normalizarla, no la usamos para recomendar.",
      "Las cards de catálogo demo, si aparecen, están identificadas como demo y no se mezclan con recomendaciones basadas en historial real.",
      "Sumamos tiendas y proveedores de forma gradual. Una tienda aparece como comparable solo cuando la integración devuelve datos reales y verificables.",
    ],
  },
  {
    title: "Con qué frecuencia se actualizan",
    body: [
      "El cron de precios actualiza ofertas reales de las fuentes activas y registra capturas para construir historial.",
      "El catálogo demo tiene precios fijos para mostrar el flujo del comparador y está identificado con badges \"Catálogo demo\" siempre que aparece.",
      "Si un proveedor falla repetidamente, el monitor lo bloquea temporalmente para evitar mostrar datos rotos como si fueran actuales.",
    ],
  },
  {
    title: "Cómo construimos el historial",
    body: [
      "El historial de precios se arma a partir de capturas reales tomadas por nuestro snapshotter periódico. Cada captura registra precio, stock y momento exacto en la base de datos.",
      "Para mostrar una recomendación (\"buen precio\", \"oferta inflada\", etc.) necesitamos al menos 14 puntos reales en los últimos 30 días. Mientras tanto, el producto aparece como \"Sin historial verificado\".",
      "Los gráficos de productos sin historial suficiente muestran un estado \"Recolectando datos\" en lugar de inventar una línea sintética.",
    ],
  },
  {
    title: "Qué tiendas están activas hoy",
    body: [
      "Las tiendas activas son las que tienen provider real habilitado y pasan los controles del monitor.",
      "Las promos bancarias se importan desde fuentes permitidas de bancos o billeteras y se publican solo si el bot detecta beneficio y vigencia vigente.",
      "Las fuentes nuevas se activan desde el admin y quedan registradas con su último estado: publicada, en revisión, bloqueada o con error.",
    ],
  },
  {
    title: "Qué hacemos cuando no tenemos certeza",
    body: [
      "No mostramos recomendaciones de compra basadas en datos sintéticos. Si no hay historial real suficiente, decimos \"Sin historial verificado\" y dejamos la decisión al usuario.",
      "No marcamos como \"oferta\" un precio cuando no podemos validarlo contra historial real.",
      "Si detectamos que un precio subió fuerte antes de un evento comercial (Hot Sale, CyberMonday), lo marcamos como riesgo de oferta inflada cuando el historial real tiene cobertura suficiente.",
    ],
  },
  {
    title: "Reportá un problema",
    body: [
      "Si ves un precio mal, una recomendación que no encaja o una tienda que aparece sin estar realmente activa, escribinos. Cada feedback nos ayuda a evitar que el comparador mienta.",
      "Contacto: usá el botón \"Reportar\" dentro de cada producto, o escribí a privacidad@precio-radar.com para temas legales y de datos.",
    ],
  },
];

export default function ComoFuncionamosPage() {
  return (
    <LegalPage
      badge="Transparencia"
      title="Cómo funcionamos"
      description="PrecioRadar está en beta y en construcción. Esta página explica de dónde salen los precios que mostramos, cómo construimos el historial y por qué a veces decimos 'Sin historial verificado' en vez de inventar una recomendación."
      sections={sections}
    />
  );
}
