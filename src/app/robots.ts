import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/alertas",
          "/auth",
          "/api/",
          "/login",
          "/notificaciones",
          "/registro",
          "/tracked-products",
        ],
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
  };
}
