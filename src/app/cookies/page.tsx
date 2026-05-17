import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Politica de cookies",
  description:
    "Qué cookies usa PrecioRadar, para qué sirven y cómo administrar tu preferencia.",
  alternates: { canonical: "/cookies" },
};

const sections = [
  {
    title: "¿Qué son las cookies?",
    body: [
      "Las cookies son pequeños archivos de texto que los sitios web guardan en tu navegador para recordar información entre visitas.",
      "PrecioRadar usa exclusivamente cookies propias. No usamos cookies de publicidad comportamental ni de rastreo entre sitios.",
    ],
  },
  {
    title: "Cookies que usamos",
    body: [
      "Cookie de sesión de autenticación (sb-* / supabase-auth): cookie necesaria para mantenerte autenticado/a mientras usás el servicio. La genera Supabase al iniciar sesión. Sin esta cookie no podés acceder a tu cuenta, alertas ni seguimientos.",
      "Cookie de preferencia de consentimiento (pr_cookie_consent): guarda tu elección sobre el uso de cookies (aceptado o rechazado). Expira en 1 año. Es la única cookie que guardamos antes de que inicies sesión.",
      "Ninguna de estas cookies contiene información publicitaria ni se comparte con redes de publicidad.",
    ],
  },
  {
    title: "Cookies de terceros",
    body: [
      "PrecioRadar no instala cookies de Google Analytics, Facebook Pixel ni ningún otro proveedor de seguimiento o publicidad.",
      "Vercel, como proveedor de hosting, puede registrar datos técnicos a nivel de servidor (IP, user agent) como parte normal del servicio, pero no instala cookies en tu navegador.",
    ],
  },
  {
    title: "Cómo gestionar tus preferencias",
    body: [
      "Al ingresar por primera vez al sitio, verás un banner para aceptar o rechazar el uso de cookies no esenciales.",
      "Si rechazás, solo se usarán las cookies estrictamente necesarias para el funcionamiento del servicio (sesión de autenticación).",
      "Podés cambiar tu preferencia en cualquier momento borrando la cookie pr_cookie_consent desde la configuración de tu navegador (Configuración → Privacidad → Cookies del sitio → precioradar.com.ar).",
      "También podés deshabilitar todas las cookies desde tu navegador, pero esto puede impedir que funciones como el login y las alertas operen correctamente.",
    ],
  },
  {
    title: "Contacto",
    body: [
      "Para consultas sobre cookies o privacidad escribinos a privacidad@precioradar.com.ar",
      "Fecha de vigencia: 15 de mayo de 2026.",
    ],
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      badge="Cookies"
      description="Qué cookies usa PrecioRadar, para qué sirven y cómo administrar tu preferencia de privacidad."
      sections={sections}
      title="Política de cookies"
    />
  );
}
