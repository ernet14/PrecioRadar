export type BnaDollarRate = {
  buy: number;
  date: string; // YYYY-MM-DD
  sell: number;
  source: "bna";
};

const BNA_HISTORICAL_URL = "https://www.bna.com.ar/Cotizador/HistoricoPrincipales";

function toBnaDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function buildBnaHistoricalUrl(date: string) {
  const url = new URL(BNA_HISTORICAL_URL);
  url.searchParams.set("id", "billetes");
  url.searchParams.set("fecha", toBnaDate(date));
  url.searchParams.set("filtroDolar", "1");
  return url.toString();
}

export function parseArsNumber(raw: string): number | null {
  const normalized = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBnaDollarHistoricalHtml(html: string, date: string): BnaDollarRate | null {
  const text = stripTags(html);
  const match = text.match(/D[oó]lar\s+U\.?S\.?A\.?\s+([\d.,]+)\s+([\d.,]+)/i);
  if (!match) return null;

  const buy = parseArsNumber(match[1]);
  const sell = parseArsNumber(match[2]);
  if (buy === null || sell === null) return null;

  return { buy, date, sell, source: "bna" };
}

export function eachIsoDate(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];

  const dates: string[] = [];
  for (let ms = start; ms <= end; ms += 24 * 60 * 60 * 1000) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}

export async function fetchBnaDollarRate(date: string): Promise<BnaDollarRate | null> {
  const response = await fetch(buildBnaHistoricalUrl(date), {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "PrecioRadar/1.0 (+https://www.precio-radar.com)",
    },
  });

  if (!response.ok) return null;
  return parseBnaDollarHistoricalHtml(await response.text(), date);
}
