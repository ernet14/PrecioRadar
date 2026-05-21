import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terminos y condiciones",
  description:
    "Condiciones de uso de PrecioRadar: comparador de precios, alertas, enlaces externos y limitaciones del servicio.",
  alternates: { canonical: "/terminos" },
};

const sections = [
  {
    title: "Descripción del servicio",
    body: [
      "PrecioRadar es un comparador de precios en línea que muestra ofertas de tiendas externas, permite crear alertas de precio y seguir productos de interés.",
      "PrecioRadar no es una tienda: no vende productos, no procesa pagos y no interviene en las transacciones entre el usuario y las tiendas externas.",
      "La compra se realiza en la tienda elegida por el usuario y queda sujeta a sus condiciones comerciales, stock, envío, garantía, cuotas e impuestos.",
    ],
  },
  {
    title: "Exactitud de la información",
    body: [
      "Los precios, disponibilidad y condiciones de las ofertas se obtienen de fuentes externas y pueden cambiar sin previo aviso.",
      "PrecioRadar no garantiza que los precios mostrados sean los vigentes en el momento de la compra. Verificá siempre el precio final, las cuotas, el costo de envío y el stock directamente en la tienda antes de comprar.",
      "Algunas funciones pueden mostrar un estado 'Recolectando datos' cuando no hay información suficiente. No mostramos recomendaciones de compra sin datos reales que las respalden.",
    ],
  },
  {
    title: "Cuentas de usuario",
    body: [
      "Para usar funciones como alertas y seguimiento de productos necesitás crear una cuenta con un email válido.",
      "Sos responsable de mantener la confidencialidad de tu contraseña y de las actividades que ocurran bajo tu cuenta.",
      "PrecioRadar puede suspender cuentas que violen estos términos, intenten vulnerar el servicio o proporcionen información falsa.",
    ],
  },
  {
    title: "Alertas y notificaciones",
    body: [
      "Las alertas detectan variaciones de precio según la configuración del usuario, pero no garantizan disponibilidad del producto, reserva del precio ni exactitud absoluta.",
      "PrecioRadar puede limitar la cantidad de alertas gratuitas por cuenta para mantener estable el servicio.",
      "Las notificaciones por email dependen de que el servicio de correo esté correctamente configurado y de que los emails no queden en spam.",
    ],
  },
  {
    title: "Uso aceptable",
    body: [
      "Está prohibido usar PrecioRadar para scraping automatizado, pruebas de carga no autorizadas, intentos de acceso no autorizado o cualquier uso que perjudique el servicio o a otros usuarios.",
      "No está permitido usar el servicio para actividades ilegales según la legislación argentina.",
      "Reservamos el derecho de limitar el acceso a usuarios o IPs que generen tráfico abusivo.",
    ],
  },
  {
    title: "Propiedad intelectual",
    body: [
      "El código, diseño, marca y contenido propio de PrecioRadar son propiedad de sus creadores y no pueden reproducirse sin autorización.",
      "Los nombres, logos y marcas de las tiendas externas son propiedad de sus respectivos dueños. Su aparición en PrecioRadar es de carácter descriptivo e informativo, sin implicar afiliación salvo cuando se indique explícitamente.",
    ],
  },
  {
    title: "Enlaces a tiendas",
    body: [
      "PrecioRadar enlaza a las publicaciones originales de las tiendas externas, donde se realiza la compra. Actualmente no utilizamos enlaces de afiliado ni recibimos comisiones por esas compras.",
      "Si en el futuro incorporáramos enlaces de afiliado, lo informaríamos de forma visible y no afectaría los precios mostrados ni implicaría recomendación o garantía del producto o tienda. Siempre verificá la oferta antes de comprar.",
    ],
  },
  {
    title: "Limitación de responsabilidad",
    body: [
      "PrecioRadar brinda el servicio 'tal como está' y no garantiza disponibilidad continua, exactitud de los datos ni idoneidad para un fin particular.",
      "En la máxima medida permitida por la Ley 24.240 y la legislación aplicable, PrecioRadar no es responsable por daños derivados del uso de la información mostrada, decisiones de compra, fallas en la comunicación de alertas o interrupciones del servicio.",
    ],
  },
  {
    title: "Modificaciones",
    body: [
      "Podemos actualizar estos términos ante cambios en el servicio, legales o de negocio. Los cambios materiales se notificarán por email o mediante un aviso destacado en el sitio.",
      "La fecha de vigencia al inicio del documento refleja la versión actual. Continuar usando el servicio después de un cambio implica aceptación de los nuevos términos.",
      "Fecha de vigencia: 15 de mayo de 2026. Para consultas: privacidad@precio-radar.com",
    ],
  },
];

export default function TerminosPage() {
  return (
    <LegalPage
      badge="Términos"
      description="Condiciones de uso de PrecioRadar como comparador de precios, sistema de alertas y seguimiento de ofertas."
      sections={sections}
      title="Términos y condiciones"
    />
  );
}
