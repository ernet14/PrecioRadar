import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PrecioRadar — Comparador de precios Argentina",
    short_name: "PrecioRadar",
    description:
      "Compará precios en Argentina con historial real, alertas y detector de ofertas falsas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#4f46e5",
    lang: "es-AR",
    orientation: "portrait",
    categories: ["shopping", "finance"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
