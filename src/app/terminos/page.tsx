import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terminos | PrecioRadar",
  description:
    "Terminos basicos de uso de PrecioRadar para comparacion de precios, alertas y enlaces externos.",
};

const sections = [
  {
    title: "Uso del servicio",
    body: [
      "PrecioRadar es una herramienta para comparar precios, revisar historial y crear alertas. No vende productos directamente.",
      "La compra se realiza en la tienda externa elegida por el usuario y esta sujeta a sus condiciones comerciales, stock, envio, garantia y medios de pago.",
    ],
  },
  {
    title: "Precios e informacion",
    body: [
      "Los precios pueden cambiar sin aviso en las tiendas externas. Antes de comprar, verifica precio final, cuotas, envio, impuestos, stock y condiciones en la tienda.",
      "Durante el MVP pueden existir datos demo o datos incompletos. La interfaz debe identificarlos cuando correspondan.",
    ],
  },
  {
    title: "Alertas y notificaciones",
    body: [
      "Las alertas ayudan a detectar condiciones de precio, pero no garantizan disponibilidad, reserva de precio ni exactitud absoluta.",
      "PrecioRadar puede limitar la cantidad de alertas gratuitas, pausar funciones o modificar reglas para mantener estable el servicio.",
    ],
  },
  {
    title: "Cuentas y reportes",
    body: [
      "El usuario debe usar datos reales para su cuenta y no intentar afectar el funcionamiento del servicio.",
      "Los reportes de errores, productos o precios pueden revisarse desde el panel admin para mejorar la calidad del comparador.",
    ],
  },
  {
    title: "Enlaces afiliados",
    body: [
      "Algunos enlaces externos pueden generar una comision para PrecioRadar sin costo adicional para el usuario.",
      "La existencia de una comision no reemplaza la necesidad de comparar y verificar la oferta en la tienda final.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <LegalPage
      badge="Terminos"
      description="Condiciones basicas para usar PrecioRadar como comparador, sistema de seguimiento y alertas de precio."
      sections={sections}
      title="Terminos y condiciones"
    />
  );
}
