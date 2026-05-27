import type { InputType } from "@/types";

const allowedSearchHosts = [
  "mercadolibre.com.ar",
  "mercadolibre.com",
  "mercadolibre.com.uy",
  "mercadolibre.com.mx",
  "mercadolibre.com.br",
  "mercadolibre.com.co",
  "mercadolibre.com.pe",
  "mercadolibre.com.cl",
  "fravega.com",
  "musimundo.com",
  "cetrogar.com.ar",
  "megatone.net",
  "tiendamia.com",
  "temu.com",
];

const allowedAffiliateHosts = [
  "amazon.com",
  "amazon.com.br",
  "awin1.com",
  "awin.com",
  "cj.com",
  "impact.com",
  "impactradius.com",
  "linksynergy.com",
  "rakutenadvertising.com",
  "shein.com",
];

const allowedImageHosts = [
  ...allowedSearchHosts,
  "mlstatic.com",
  "vtexassets.com",
  "vteximg.com.br",
  "fravega.com",
  "images.fravega.com",
];

const blockedHostPatterns = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /\.internal$/i,
  /\.local$/i,
];

export function parseHttpUrl(input: string) {
  const trimmedInput = input.trim();

  try {
    const url = new URL(trimmedInput);
    return isSafeProtocol(url.protocol) ? url : null;
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

function isSafeProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

export function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function isBlockedHost(hostname: string) {
  return blockedHostPatterns.some((pattern) => pattern.test(normalizeHostname(hostname)));
}

function isAllowedHost(hostname: string, allowedHosts: string[]) {
  const normalized = normalizeHostname(hostname);

  if (isBlockedHost(normalized)) return false;

  return allowedHosts.some(
    (allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`),
  );
}

export function isAllowedSearchUrl(input: string) {
  const parsedUrl = parseHttpUrl(input);

  if (!parsedUrl) return false;

  return isAllowedHost(parsedUrl.hostname, allowedSearchHosts);
}

export function isAllowedOutboundUrl(input: string) {
  const parsedUrl = parseHttpUrl(input);

  if (!parsedUrl) return false;

  return (
    isAllowedHost(parsedUrl.hostname, allowedSearchHosts) ||
    isAllowedHost(parsedUrl.hostname, allowedAffiliateHosts)
  );
}

export function isAllowedImageUrl(input: string) {
  const parsedUrl = parseHttpUrl(input);

  if (!parsedUrl) return false;

  return isAllowedHost(parsedUrl.hostname, allowedImageHosts);
}

export function isMercadoLibreUrl(url: string) {
  const parsedUrl = parseHttpUrl(url);

  if (!parsedUrl) {
    return false;
  }

  const hostname = normalizeHostname(parsedUrl.hostname);

  if (isBlockedHost(hostname)) return false;

  return (
    hostname === "mercadolibre.com.ar" ||
    hostname.endsWith(".mercadolibre.com.ar") ||
    hostname === "mercadolibre.com" ||
    hostname.endsWith(".mercadolibre.com")
  );
}

export function detectInputType(input: string): InputType {
  const parsedUrl = parseHttpUrl(input);

  if (!parsedUrl) {
    return "text";
  }

  if (isBlockedHost(parsedUrl.hostname.toLowerCase())) {
    return "text";
  }

  return isMercadoLibreUrl(parsedUrl.toString()) ? "mercadolibre_url" : "url";
}
