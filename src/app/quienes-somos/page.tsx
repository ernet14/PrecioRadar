import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { getAbsoluteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "PrecioRadar es un comparador de precios independiente hecho en Argentina. Nuestra misión: mostrar precios honestos, con historial real y sin inflar ofertas.",
  alternates: { canonical: getAbsoluteUrl("/quienes-somos") },
};

const sections = [
  {
    title: "Qué es PrecioRadar",
    body: [
      "PrecioRadar es un comparador de precios independiente, hecho en Argentina, para ayudar a las personas a comprar mejor. Mostramos el precio de un producto en distintas tiendas, su historial y una recomendación basada en datos reales, no en marketing.",
      "No vendemos productos: somos un comparador. La compra siempre se hace en la tienda enlazada, que es la única responsable de la operación, el stock y la postventa.",
    ],
  },
  {
    title: "Por qué existimos",
    body: [
      "Cada Hot Sale y CyberMonday se repite la misma historia: tiendas que inflan el precio semanas antes para anunciar un descuento que no es real. Queremos darte las herramientas para detectarlo en segundos.",
      "Por eso construimos un historial real de precios y un detector de ofertas que compara el precio actual contra el promedio de los últimos 60 días. Si una 'oferta' está por encima de su precio habitual, te lo decimos.",
    ],
  },
  {
    title: "Nuestro compromiso: el comparador honesto",
    body: [
      "Nunca mostramos una recomendación sin datos reales que la sostengan. Si no tenemos suficiente historial de un producto, lo decimos claramente en vez de inventar un veredicto.",
      "El mejor precio real siempre se muestra primero. Hoy no monetizamos con enlaces de afiliado; si en el futuro lo hiciéramos, lo aclararíamos de forma visible y nunca priorizaríamos una oferta por la comisión que deje.",
      "Estamos en beta y sumamos tiendas todas las semanas. Preferimos crecer despacio y con datos confiables antes que prometer más de lo que podemos sostener.",
    ],
  },
  {
    title: "Quién está detrás",
    body: [
      "PrecioRadar es un proyecto independiente de un equipo chico, sin inversores que condicionen qué precios mostramos. Eso nos permite responderle solo al usuario.",
      "¿Tenés una propuesta, encontraste un error o querés sumar tu tienda? Escribinos a privacidad@precio-radar.com y te respondemos.",
    ],
  },
];

export default function QuienesSomosPage() {
  return (
    <LegalPage
      badge="Sobre nosotros"
      title="Quiénes somos"
      description="Un comparador de precios independiente, hecho en Argentina, con una sola regla: mostrar precios honestos."
      sections={sections}
    />
  );
}
