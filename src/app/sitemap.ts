import type { MetadataRoute } from "next";
import { getAllMockProductSlugs } from "@/services/productService";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://precioradar.com.ar";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: siteUrl, changeFrequency: "daily", priority: 1 },
  { url: `${siteUrl}/buscar`, changeFrequency: "daily", priority: 0.8 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const productSlugs = getAllMockProductSlugs();

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${siteUrl}/producto/${slug}`,
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  return [...staticRoutes, ...productRoutes];
}
