import type { MetadataRoute } from "next";
import { getAllMockProductSlugs } from "@/services/productService";
import { getAllGuideSlugs } from "@/content/guides";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://precioradar.com.ar";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: siteUrl, changeFrequency: "daily", priority: 1 },
  { url: `${siteUrl}/buscar`, changeFrequency: "daily", priority: 0.8 },
  { url: `${siteUrl}/guias`, changeFrequency: "weekly", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const productSlugs = getAllMockProductSlugs();
  const guideSlugs = getAllGuideSlugs();

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: `${siteUrl}/producto/${slug}`,
    changeFrequency: "hourly",
    priority: 0.9,
  }));

  const guideRoutes: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: `${siteUrl}/guias/${slug}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes, ...guideRoutes];
}
