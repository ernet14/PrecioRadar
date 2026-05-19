import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Politica de privacidad",
  description:
    "Cómo PrecioRadar recolecta, usa y protege tus datos personales según la Ley 25.326 de Argentina.",
  alternates: { canonical: "/privacidad" },
};

const sections = [
  {
    title: "Responsable del tratamiento",
    body: [
      "El responsable del tratamiento de datos personales es PrecioRadar, operado por Fernando Salinas, con domicilio en la República Argentina.",
      "Para consultas sobre privacidad, podés escribirnos a: privacidad@precio-radar.com",
      "Fecha de vigencia de esta política: 15 de mayo de 2026.",
    ],
  },
  {
    title: "Datos personales que recolectamos",
    body: [
      "Datos de cuenta: dirección de correo electrónico y contraseña (almacenada de forma cifrada por Supabase).",
      "Datos de uso: búsquedas realizadas (SearchLog), productos seguidos (TrackedProduct), alertas de precio configuradas (Alert), clicks en ofertas (ClickTracking) y reportes de problemas (ProductReport).",
      "Datos técnicos: dirección IP y user agent pueden quedar registrados por los proveedores de infraestructura (Vercel, Supabase) a nivel de servidor.",
      "No recolectamos datos sensibles según el art. 2 de la Ley 25.326.",
    ],
  },
  {
    title: "Finalidad del tratamiento",
    body: [
      "Permitir el registro, autenticación y gestión de tu cuenta.",
      "Mostrar productos seguidos, alertas activas y notificaciones en tu dashboard.",
      "Enviar notificaciones por email cuando una alerta de precio se dispara (requiere configuración de alertas).",
      "Mejorar los resultados de búsqueda y detección de categorías mediante análisis agregado y anónimo.",
      "Administrar reportes de problemas en precios, links o información incorrecta.",
      "Cumplir con obligaciones legales aplicables.",
    ],
  },
  {
    title: "Base legal del tratamiento",
    body: [
      "El tratamiento se realiza con tu consentimiento (art. 5, Ley 25.326), brindado al crear una cuenta o al utilizar el servicio.",
      "Para el envío de emails transaccionales (confirmación de registro, alertas de precio), la base legal es la ejecución del servicio solicitado.",
      "Los datos de uso anónimos y agregados se tratan en interés legítimo para mejorar el servicio, sin identificar usuarios individuales.",
    ],
  },
  {
    title: "Cesión y transferencia internacional de datos",
    body: [
      "PrecioRadar utiliza los siguientes servicios de terceros que pueden recibir o procesar datos personales:",
      "Supabase (Supabase Inc., Estados Unidos): base de datos y autenticación. Tus datos de cuenta y de uso se almacenan en sus servidores.",
      "Resend (Resend Inc., Estados Unidos): envío de emails transaccionales cuando configurás alertas.",
      "Vercel (Vercel Inc., Estados Unidos): hosting y procesamiento de las solicitudes web.",
      "Estos proveedores operan en Estados Unidos. Argentina los reconoce con nivel adecuado de protección solo en ciertos marcos; al usar el servicio aceptás esta transferencia internacional.",
      "No vendemos ni cedemos datos personales a terceros con fines comerciales.",
    ],
  },
  {
    title: "Plazo de retención",
    body: [
      "Datos de cuenta: se conservan mientras la cuenta esté activa y hasta 90 días después de la baja.",
      "Búsquedas (SearchLog): se conservan por 90 días y luego se purgan.",
      "Logs de errores técnicos (ProviderLog): se conservan por 30 días.",
      "Clicks y alertas: se conservan mientras la cuenta esté activa.",
      "Podés solicitar la eliminación anticipada de tus datos (ver derechos ARCO abajo).",
    ],
  },
  {
    title: "Derechos ARCO",
    body: [
      "Tenés derecho a Acceder a tus datos, Rectificarlos si son incorrectos, Cancelarlos (solicitar su eliminación) u Oponerte a ciertos tratamientos, de acuerdo con el art. 14 y ss. de la Ley 25.326.",
      "Para ejercer estos derechos, escribinos a privacidad@precio-radar.com indicando tu nombre, email de cuenta y la acción que querés realizar.",
      "Respondemos en un plazo máximo de 5 días hábiles para confirmar recepción y 15 días hábiles para resolver la solicitud, según el art. 14 de la Ley 25.326.",
      "Si considerás que no atendimos tu solicitud correctamente, podés presentar una denuncia ante la Agencia de Acceso a la Información Pública (AAIP) en www.argentina.gob.ar/aaip.",
    ],
  },
  {
    title: "Cookies y tecnologías similares",
    body: [
      "Usamos cookies propias de sesión para mantenerte autenticado/a. Estas cookies son necesarias para el funcionamiento del servicio.",
      "También guardamos tu preferencia de consentimiento de cookies (cookie pr_cookie_consent) por un año.",
      "No usamos cookies de rastreo de terceros ni publicidad comportamental.",
      "Podés ver el detalle completo en nuestra Política de Cookies (/cookies).",
    ],
  },
  {
    title: "Seguridad",
    body: [
      "Aplicamos medidas técnicas y organizativas para proteger tus datos: conexiones cifradas (HTTPS/TLS), almacenamiento cifrado de contraseñas, Row Level Security (RLS) en la base de datos y headers de seguridad HTTP.",
      "Ningún sistema es 100% seguro. Si detectás una vulnerabilidad, reportala a privacidad@precio-radar.com.",
    ],
  },
  {
    title: "Cambios en esta política",
    body: [
      "Podemos actualizar esta política cuando incorporemos nuevas funciones, proveedores o ante cambios legales.",
      "Te notificaremos por email si los cambios son materiales. La fecha de vigencia al inicio del documento siempre refleja la versión actual.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <LegalPage
      badge="Privacidad"
      description="Cómo recolectamos, usamos y protegemos tus datos según la Ley 25.326 de Protección de Datos Personales de Argentina."
      sections={sections}
      title="Política de privacidad"
    />
  );
}
