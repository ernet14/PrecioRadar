const defaultSiteUrl = "https://www.precio-radar.com";

export function getSiteUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || defaultSiteUrl;

  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${pathname}`;
  } catch {
    return defaultSiteUrl;
  }
}

export function getAbsoluteUrl(path = "/") {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.trim();

  if (!normalizedPath || normalizedPath === "/") {
    return siteUrl;
  }

  return `${siteUrl}/${normalizedPath.replace(/^\/+/, "")}`;
}
