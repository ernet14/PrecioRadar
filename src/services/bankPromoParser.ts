// Parser heurístico para "carga asistida" de promos bancarias (Etapa 13/bot).
// Toma texto pegado desde la web de un banco y pre-completa un borrador para que
// el admin confirme. NO scrapea ni usa IA: solo regex + lista de entidades
// conocidas. Siempre hay que revisar el resultado antes de guardar.

export type ParsedBankPromoDraft = {
  entity: string;
  entitySlug: string;
  promoType: "percentage" | "refund" | "installments";
  discountPct: number | null;
  maxAmount: number | null;
  installments: number | null;
  dayOfWeek: number[];
  paymentType: string;
  notes: string;
};

// Bancos y billeteras AR cubiertos inicialmente (Etapa 13).
const KNOWN_ENTITIES = [
  "Banco Nación",
  "Banco Galicia",
  "Banco Macro",
  "Banco Santander",
  "Santander",
  "BBVA",
  "ICBC",
  "Banco Comafi",
  "Banco Credicoop",
  "Banco Supervielle",
  "Banco Ciudad",
  "Banco Columbia",
  "Bancor",
  "Mercado Pago",
  "Ualá",
  "Personal Pay",
  "Naranja X",
  "MODO",
];

const DAY_PATTERNS: { day: number; pattern: RegExp }[] = [
  { day: 0, pattern: /\bdomingos?\b/i },
  { day: 1, pattern: /\blunes\b/i },
  { day: 2, pattern: /\bmartes\b/i },
  { day: 3, pattern: /\bmi[eé]rcoles\b/i },
  { day: 4, pattern: /\bjueves\b/i },
  { day: 5, pattern: /\bviernes\b/i },
  { day: 6, pattern: /\bs[aá]bados?\b/i },
];

export function slugifyEntity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "$30.000" / "30.000" → 30000 (punto = separador de miles; ignora decimales).
function parseArsAmount(raw: string): number | null {
  const digits = raw.replace(/\./g, "").replace(/,.*/, "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number.parseInt(digits, 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function detectEntity(text: string): string | null {
  const lower = text.toLowerCase();
  // Match más largo primero ("Banco Santander" antes que "Santander").
  const sorted = [...KNOWN_ENTITIES].sort((a, b) => b.length - a.length);
  for (const entity of sorted) {
    if (lower.includes(entity.toLowerCase())) return entity;
  }
  return null;
}

function detectPaymentType(text: string): string {
  const lower = text.toLowerCase();
  if (/\bmodo\b/.test(lower)) return "modo";
  if (/cr[eé]dito/.test(lower)) return "credito";
  if (/d[eé]bito/.test(lower)) return "debito";
  if (/prepaga?/.test(lower)) return "prepago";
  return "cualquiera";
}

export function parseBankPromoText(text: string): ParsedBankPromoDraft {
  const entity = detectEntity(text) ?? "";

  const installmentsMatch = text.match(/(\d{1,2})\s*cuotas/i);
  const installments = installmentsMatch ? Number.parseInt(installmentsMatch[1], 10) : null;

  const isInstallments = /cuotas\s+sin\s+inter[eé]s/i.test(text) || (installments !== null && /cuotas/i.test(text) && !/%/.test(text));
  const isRefund = /reintegro|devoluci[oó]n|cashback/i.test(text);
  const promoType = isInstallments ? "installments" : isRefund ? "refund" : "percentage";

  const pctMatch = text.match(/(\d{1,3})\s*%/);
  const discountPct = pctMatch ? Math.min(100, Number.parseInt(pctMatch[1], 10)) : null;

  const capMatch = text.match(/(?:tope|hasta|m[aá]ximo)[^\d$]*\$?\s*([\d.,]+)/i);
  const maxAmount = capMatch ? parseArsAmount(capMatch[1]) : null;

  const dayOfWeek = /todos\s+los\s+d[ií]as/i.test(text)
    ? []
    : DAY_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ day }) => day);

  return {
    entity,
    entitySlug: entity ? slugifyEntity(entity) : "",
    promoType,
    discountPct: promoType === "installments" ? null : discountPct,
    maxAmount,
    installments,
    dayOfWeek,
    paymentType: detectPaymentType(text),
    notes: text.trim().slice(0, 500),
  };
}
