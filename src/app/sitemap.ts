import type { MetadataRoute } from "next";
import { getAllMockProductSlugs } from "@/services/productService";
import { getAllGuideSlugs } from "@/content/guides";
import { mvpCategoryDescriptors } from "@/data/categories";
import { getAbsoluteUrl } from "@/lib/seo/site";

const lastModified = new Date();

const staticRoutes: MetadataRoute.Sitemap = [
  { url: getAbsoluteUrl(), changeFrequency: "daily", lastModified, priority: 1 },
  { url: getAbsoluteUrl("/buscar"), changeFrequency: "daily", lastModified, priority: 0.8 },
  { url: getAbsoluteUrl("/promos-hoy"), changeFrequency: "daily", lastModified, priority: 0.86 },
  { url: getAbsoluteUrl("/guias"), changeFrequency: "weekly", lastModified, priority: 0.7 },
  { url: getAbsoluteUrl("/como-funcionamos"), changeFrequency: "monthly", lastModified, priority: 0.5 },
  { url: getAbsoluteUrl("/privacidad"), changeFrequency: "yearly", lastModified, priority: 0.3 },
  { url: getAbsoluteUrl("/terminos"), changeFrequency: "yearly", lastModified, priority: 0.3 },
  { url: getAbsoluteUrl("/cookies"), changeFrequency: "yearly", lastModified, priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const productSlugs = getAllMockProductSlugs();
  const guideSlugs = getAllGuideSlugs();

  const productRoutes: MetadataRoute.Sitemap = productSlugs.map((slug) => ({
    url: getAbsoluteUrl(`/producto/${slug}`),
    changeFrequency: "hourly",
    lastModified,
    priority: 0.9,
  }));

  const guideRoutes: MetadataRoute.Sitemap = guideSlugs.map((slug) => ({
    url: getAbsoluteUrl(`/guias/${slug}`),
    changeFrequency: "weekly",
    lastModified,
    priority: 0.8,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = mvpCategoryDescriptors.map(
    (descriptor) => ({
      url: getAbsoluteUrl(`/categoria/${descriptor.slug}`),
      changeFrequency: "daily",
      lastModified,
      priority: 0.85,
    }),
  );

  return [...staticRoutes, ...categoryRoutes, ...productRoutes, ...guideRoutes];
}
