import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { BetaBanner } from "@/components/layout/BetaBanner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CookieBanner } from "@/components/legal/CookieBanner";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { getSiteUrl } from "@/lib/seo/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "PrecioRadar",
    template: "%s | PrecioRadar",
  },
  description:
    "Compara precios en Argentina con historial, alertas y recomendaciones para detectar ofertas reales.",
  alternates: {
    canonical: "/",
    languages: {
      "es-AR": "/",
      "x-default": "/",
    },
  },
  applicationName: "PrecioRadar",
  appleWebApp: {
    capable: true,
    title: "PrecioRadar",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "PrecioRadar",
    description:
      "Comparador de precios en Argentina con historial, alertas y recomendaciones.",
    locale: "es_AR",
    siteName: "PrecioRadar",
    type: "website",
    url: "/",
  },
  robots: {
    follow: true,
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    title: "PrecioRadar",
    description:
      "Compara precios en Argentina con historial, alertas y recomendaciones.",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className="h-full">
      <body className="min-h-full antialiased">
        <a
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-indigo-400"
          href="#main-content"
        >
          Saltar al contenido
        </a>
        <div className="flex min-h-screen flex-col">
          <BetaBanner />
          <Header />
          <div className="flex-1" id="main-content" tabIndex={-1}>
            {children}
          </div>
          <Footer />
        </div>
        <CookieBanner />
        <ServiceWorkerRegistrar />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
