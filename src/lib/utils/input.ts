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

function isSafeProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

function isBlockedHost(hostname: string) {
  return blockedHostPatterns.some((pattern) => pattern.test(hostname));
}

export function isAllowedSearchUrl(input: string) {
  const parsedUrl = parseUrl(input);

  if (!parsedUrl) return false;
  if (!isSafeProtocol(parsedUrl.protocol)) return false;

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  if (isBlockedHost(hostname)) return false;

  return allowedSearchHosts.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
  );
}

export function isMercadoLibreUrl(url: string) {
  const parsedUrl = parseUrl(url);

  if (!parsedUrl) {
    return false;
  }

  if (!isSafeProtocol(parsedUrl.protocol)) return false;

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

  if (isBlockedHost(hostname)) return false;

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

  if (!isSafeProtocol(parsedUrl.protocol)) {
    return "text";
  }

  if (isBlockedHost(parsedUrl.hostname.toLowerCase())) {
    return "text";
  }

  return isMercadoLibreUrl(parsedUrl.toString()) ? "mercadolibre_url" : "url";
}
