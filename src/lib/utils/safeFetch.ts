type UrlValidator = (url: string) => boolean;

export async function fetchWithAllowedRedirects(
  url: string,
  isAllowedUrl: UrlValidator,
  init: RequestInit = {},
  maxRedirects = 3,
): Promise<Response | null> {
  let currentUrl = url;

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    if (!isAllowedUrl(currentUrl)) return null;

    const response = await fetch(currentUrl, {
      ...init,
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;

      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return null;
      }
      continue;
    }

    if (!isAllowedUrl(response.url || currentUrl)) return null;
    return response;
  }

  return null;
}
