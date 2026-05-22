// Lee el contenido de un link de promo bancaria (best-effort) para que el
// parser saque los datos sin tanto trabajo manual. NO usa IA. Seguridad:
// allowlist de hosts de bancos/billeteras AR + bloqueo de IPs privadas + solo
// http(s) + timeout. Muchas páginas de banco son SPA (poco texto en el HTML
// crudo); por eso también levantamos las meta descripciones y, si no hay nada
// útil, el caller cae al texto pegado.

const BANK_PROMO_HOSTS = [
  "bbva.com.ar",
  "galicia.ar",
  "galicia.com.ar",
  "bancogalicia.com",
  "macro.com.ar",
  "santander.com.ar",
  "bna.com.ar",
  "icbc.com.ar",
  "comafi.com.ar",
  "bancocredicoop.coop",
  "supervielle.com.ar",
  "bancociudad.com.ar",
  "bancocolumbia.com.ar",
  "bancor.com.ar",
  "mercadopago.com.ar",
  "mercadopago.com",
  "uala.com.ar",
  "personalpay.com.ar",
  "naranjax.com",
  "modo.com.ar",
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

const FETCH_TIMEOUT_MS = 7000;
const MAX_TEXT_LENGTH = 24_000;

export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)"'<>]+/i);
  return match ? match[0] : null;
}

export function isAllowedBankUrl(input: string): boolean {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (blockedHostPatterns.some((pattern) => pattern.test(hostname))) return false;

  return BANK_PROMO_HOSTS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`),
  );
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

export function htmlToText(html: string): string {
  // Meta descripciones (útiles en SPAs donde el body viene casi vacío).
  const metas: string[] = [];
  const metaRegex = /<meta[^>]+(?:name|property)=["'](?:description|og:description|og:title)["'][^>]*content=["']([^"']+)["']/gi;
  for (const match of html.matchAll(metaRegex)) {
    if (match[1]) metas.push(match[1]);
  }

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities([...metas, body].join(" "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export type BankPromoFetchResult =
  | { status: "ok"; text: string }
  | { status: "not_allowed" }
  | { status: "error"; reason: string };

export async function fetchBankPromoText(url: string): Promise<BankPromoFetchResult> {
  if (!isAllowedBankUrl(url)) return { status: "not_allowed" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "PrecioRadar/1.0 (+https://www.precio-radar.com)",
      },
    });

    if (!response.ok) return { status: "error", reason: `HTTP ${response.status}` };

    const contentType = response.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|xml/i.test(contentType)) {
      return { status: "error", reason: "Contenido no es HTML/texto." };
    }

    const html = await response.text();
    const text = htmlToText(html);
    if (text.length < 40) return { status: "error", reason: "El link no expuso texto legible (posible SPA)." };

    return { status: "ok", text };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error && error.name === "AbortError" ? "Timeout al leer el link." : "No se pudo leer el link.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
