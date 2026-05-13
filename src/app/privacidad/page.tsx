import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacidad | PrecioRadar",
  description:
    "Politica de privacidad basica de PrecioRadar para usuarios del MVP.",
};

const sections = [
  {
    title: "Datos que usamos",
    body: [
      "PrecioRadar puede usar tu email de cuenta, productos u ofertas que seguis, alertas creadas, reportes enviados y notificaciones internas generadas por el producto.",
      "Durante el MVP algunos productos, precios e historiales pueden ser datos demo identificados en la interfaz.",
    ],
  },
  {
    title: "Para que los usamos",
    body: [
      "Usamos estos datos para permitir login, seguimiento de ofertas, creacion de alertas, notificaciones internas, mejora de resultados y administracion basica del servicio.",
      "Tambien podemos usar informacion agregada para entender busquedas populares, productos seguidos y problemas reportados.",
    ],
  },
  {
    title: "Servicios externos",
    body: [
      "La autenticacion y base de datos se apoyan en Supabase. Los emails transaccionales pueden enviarse con un proveedor externo configurado por PrecioRadar.",
      "Cuando haces click en una tienda externa, la compra ocurre fuera de PrecioRadar y queda sujeta a las politicas de esa tienda.",
    ],
  },
  {
    title: "Afiliados y enlaces",
    body: [
      "Algunos enlaces pueden generar una comision para PrecioRadar sin costo extra para vos.",
      "Esa comision no deberia cambiar el precio final informado por la tienda, pero el precio real siempre debe verificarse antes de comprar.",
    ],
  },
  {
    title: "Contacto y cambios",
    body: [
      "Esta politica es una base inicial para el MVP y puede cambiar cuando el producto incorpore tiendas reales, mas proveedores o nuevas funciones.",
      "Si necesitas consultar o pedir baja de datos, contacta al responsable del proyecto por el canal publicado por PrecioRadar.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <LegalPage
      badge="Privacidad"
      description="Resumen simple de como PrecioRadar trata datos de cuenta, seguimientos, alertas y reportes durante el MVP."
      sections={sections}
      title="Politica de privacidad"
    />
  );
}
