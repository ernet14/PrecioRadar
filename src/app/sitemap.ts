import type { MetadataRoute } from "next";
import {
  getIndexableProductSlugs,
  getIndexableBrandCategoryPages,
} from "@/services/productService";
import { getAllGuideSlugs } from "@/content/guides";
import { mvpCategoryDescriptors } from "@/data/categories";
import { getAbsoluteUrl } from "@/lib/seo/site";

const lastModified = new Date();
export const revalidate = 21600;

const staticRoutes: MetadataRoute.Sitemap = [
  { url: getAbsoluteUrl(), changeFrequency: "daily", lastModified, priority: 1 },
  { url: getAbsoluteUrl("/promos-hoy"), changeFrequency: "daily", lastModified, priority: 0.86 },
  { url: getAbsoluteUrl("/termometro"), changeFrequency: "daily", lastModified, priority: 0.84 },
  { url: getAbsoluteUrl("/indice"), changeFrequency: "daily", lastModified, priority: 0.7 },
  { url: getAbsoluteUrl("/guias"), changeFrequency: "weekly", lastModified, priority: 0.7 },
  { url: getAbsoluteUrl("/api-docs"), changeFrequency: "monthly", lastModified, priority: 0.6 },
  { url: getAbsoluteUrl("/api-planes"), changeFrequency: "monthly", lastModified, priority: 0.6 },
  { url: getAbsoluteUrl("/quienes-somos"), changeFrequency: "monthly", lastModified, priority: 0.5 },
  { url: getAbsoluteUrl("/como-funciona"), changeFrequency: "monthly", lastModified, priority: 0.7 },
  { url: getAbsoluteUrl("/privacidad"), changeFrequency: "yearly", lastModified, priority: 0.3 },
  { url: getAbsoluteUrl("/terminos"), changeFrequency: "yearly", lastModified, priority: 0.3 },
  { url: getAbsoluteUrl("/cookies"), changeFrequency: "yearly", lastModified, priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getIndexableProductSlugs();
  const brandCategoryPages = await getIndexableBrandCategoryPages();
  const guideSlugs = getAllGuideSlugs();

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: getAbsoluteUrl(`/producto/${product.slug}`),
    changeFrequency: product.comparable ? "hourly" : "daily",
    lastModified: product.lastModified,
    priority: product.comparable ? 0.9 : 0.65,
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

  const brandCategoryRoutes: MetadataRoute.Sitemap = brandCategoryPages.map(
    (page) => ({
      url: getAbsoluteUrl(`/categoria/${page.categorySlug}/marca/${page.brandSlug}`),
      changeFrequency: "daily",
      lastModified: page.lastModified,
      priority: page.comparableCount > 0 ? 0.82 : 0.72,
    }),
  );

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...brandCategoryRoutes,
    ...productRoutes,
    ...guideRoutes,
  ];
}
