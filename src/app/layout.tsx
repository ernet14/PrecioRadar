import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CookieBanner } from "@/components/legal/CookieBanner";
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
  },
  applicationName: "PrecioRadar",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-AR" className="h-full">
      <body className="min-h-full antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
        <CookieBanner />
      </body>
    </html>
  );
}
