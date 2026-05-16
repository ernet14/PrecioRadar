import type { Metadata } from "next";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CookieBanner } from "@/components/legal/CookieBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrecioRadar",
  description: "Compr\u00e1 al mejor precio con historial y alertas",
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
