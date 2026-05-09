import type { InputType } from "@/types";

function parseUrl(input: string) {
  const trimmedInput = input.trim();

  try {
    return new URL(trimmedInput);
  } catch {
    if (/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmedInput)) {
      try {
        return new URL(`https://${trimmedInput}`);
      } catch {
        return null;
      }
    }

    return null;
  }
}

export function isMercadoLibreUrl(url: string) {
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return false;
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  return (
    hostname === "mercadolibre.com.ar" ||
    hostname.endsWith(".mercadolibre.com.ar") ||
    hostname === "mercadolibre.com" ||
    hostname.endsWith(".mercadolibre.com")
  );
}

export function detectInputType(input: string): InputType {
  const parsedUrl = parseUrl(input);

  if (!parsedUrl) {
    return "text";
  }

  return isMercadoLibreUrl(parsedUrl.toString()) ? "mercadolibre_url" : "url";
}
