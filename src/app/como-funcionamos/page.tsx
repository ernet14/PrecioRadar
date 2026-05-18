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
      "Hoy comparamos productos publicados en MercadoLibre Argentina usando su API oficial. Cada búsqueda real consulta la API en el momento y muestra el precio devuelto por la tienda.",
      "Las cards de \"catálogo demo\" que aparecen en la home son un set fijo de productos de demostración para mostrar cómo se verá el comparador cuando sumemos más tiendas.",
      "Los providers de Frávega, Musimundo, Cetrogar, Megatone, TiendaMia y Temu están planificados pero todavía no integrados; no aparecen como tiendas comparadas hasta que devuelvan datos reales.",
    ],
  },
  {
    title: "Con qué frecuencia se actualizan",
    body: [
      "Las búsquedas en MercadoLibre consultan la API en cada pedido del usuario, así que el precio mostrado es el del momento de la búsqueda.",
      "El catálogo demo tiene precios fijos para mostrar el flujo del comparador y está identificado con badges \"Catálogo demo\" siempre que aparece.",
      "Cuando habilitemos el cron de snapshots de precio (etapa siguiente del roadmap), vamos a guardar una captura cada 4 horas para construir el historial real.",
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
      "Provider activo: MercadoLibre Argentina (vía API oficial con token OAuth).",
      "Catálogo demo: productos fijos identificados con badge \"Catálogo demo\" que sirven para mostrar el flujo del comparador.",
      "Próximamente: planeamos sumar tiendas de retail argentino (Frávega, Musimundo, Cetrogar, Megatone) y supermercados (Coto, Carrefour, Día, Jumbo). Las activamos cuando la integración esté validada, no antes.",
    ],
  },
  {
    title: "Qué hacemos cuando no tenemos certeza",
    body: [
      "No mostramos recomendaciones de compra basadas en datos sintéticos. Si no hay historial real suficiente, decimos \"Sin historial verificado\" y dejamos la decisión al usuario.",
      "No marcamos como \"oferta\" un precio cuando no podemos validarlo contra historial real.",
      "Si detectamos que un precio subió fuerte antes de un evento comercial (Hot Sale, CyberMonday), planeamos marcarlo como \"Oferta inflada\". Esta detección se activa cuando el historial real tenga la cobertura suficiente.",
    ],
  },
  {
    title: "Reportá un problema",
    body: [
      "Si ves un precio mal, una recomendación que no encaja o una tienda que aparece sin estar realmente activa, escribinos. Cada feedback nos ayuda a evitar que el comparador mienta.",
      "Contacto: usá el botón \"Reportar\" dentro de cada producto, o escribí a privacidad@precioradar.com.ar para temas legales y de datos.",
    ],
  },
];

export default function ComoFuncionamosPage() {
  return (
    <LegalPage
      badge="Transparencia"
      title="Cómo funcionamos"
      description="PrecioRadar está en beta. Esta página explica de dónde salen los precios que mostramos, cómo construimos el historial y por qué a veces decimos 'Sin historial verificado' en vez de inventar una recomendación."
      sections={sections}
    />
  );
}
