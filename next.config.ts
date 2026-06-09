import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : null;
  } catch {
    return null;
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "object-src 'none'",
  [
    "script-src 'self' 'unsafe-inline'",
    process.env.NODE_ENV !== "production" ? "'unsafe-eval'" : "",
    "https://*.vercel-insights.com",
    "https://*.vercel-analytics.com",
    "https://va.vercel-scripts.com",
    "https://*.sentry.io",
    "https://www.googletagmanager.com",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : "",
    "https://api.mercadolibre.com",
    "https://*.vercel-insights.com",
    "https://*.vercel-analytics.com",
    "https://*.ingest.sentry.io",
    "https://*.sentry.io",
    "https://www.googletagmanager.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
  ]
    .filter(Boolean)
    .join(" "),
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
]
  .join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: noIndexHeaders,
      },
    ];
  },
  images: {
    // CDNs conocidos de tiendas y feeds permitidos. Evita que next/image actúe
    // como proxy abierto hacia cualquier host HTTPS.
    remotePatterns: [
      { protocol: "https", hostname: "http2.mlstatic.com" },
      { protocol: "https", hostname: "*.vtexassets.com" },
      { protocol: "https", hostname: "*.vteximg.com.br" },
      { protocol: "https", hostname: "images.fravega.com" },
      { protocol: "https", hostname: "*.fravega.com" },
      { protocol: "https", hostname: "*.cetrogar.com.ar" },
      { protocol: "https", hostname: "*.naldo.com.ar" },
      { protocol: "https", hostname: "*.oncity.com" },
      { protocol: "https", hostname: "*.carrefour.com.ar" },
      { protocol: "https", hostname: "*.coppel.com.ar" },
      { protocol: "https", hostname: "*.jumbo.com.ar" },
      { protocol: "https", hostname: "*.vea.com.ar" },
      { protocol: "https", hostname: "*.supermercadosdia.com.ar" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  sourcemaps: { disable: true },
});
