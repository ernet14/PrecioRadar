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
  validFrom: Date | null;
  validUntil: Date | null;
  notes: string;
};

function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Bancos y billeteras AR con sus alias (la web suele usar nombres cortos o
// comerciales, p. ej. "Francés" = BBVA). El match es sobre texto sin acentos.
const ENTITY_ALIASES: { entity: string; aliases: string[] }[] = [
  { entity: "BBVA", aliases: ["bbva", "banco frances", "frances"] },
  { entity: "Banco Nación", aliases: ["banco nacion", "banco de la nacion", "bna"] },
  { entity: "Banco Galicia", aliases: ["banco galicia", "galicia"] },
  { entity: "Banco Macro", aliases: ["banco macro", "macro"] },
  { entity: "Banco Santander", aliases: ["banco santander", "santander rio", "santander"] },
  { entity: "ICBC", aliases: ["icbc"] },
  { entity: "Banco Comafi", aliases: ["banco comafi", "comafi"] },
  { entity: "Banco Credicoop", aliases: ["banco credicoop", "credicoop"] },
  { entity: "Banco Supervielle", aliases: ["banco supervielle", "supervielle"] },
  { entity: "Banco Ciudad", aliases: ["banco ciudad"] },
  { entity: "Banco Columbia", aliases: ["banco columbia"] },
  { entity: "Bancor", aliases: ["bancor", "banco de cordoba"] },
  { entity: "Brubank", aliases: ["brubank"] },
  { entity: "Mercado Pago", aliases: ["mercado pago", "mercadopago"] },
  { entity: "Ualá", aliases: ["uala"] },
  { entity: "Personal Pay", aliases: ["personal pay", "personalpay"] },
  { entity: "Naranja X", aliases: ["naranja x", "naranjax", "naranja"] },
  { entity: "MODO", aliases: ["modo"] },
];

const DAY_INDEX: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const MONTH_INDEX: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

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
  const norm = removeAccents(text.toLowerCase());
  // Alias más largo primero ("banco santander" antes que "santander").
  const flat = ENTITY_ALIASES.flatMap((entry) =>
    entry.aliases.map((alias) => ({ entity: entry.entity, alias: removeAccents(alias) })),
  ).sort((a, b) => b.alias.length - a.alias.length);

  for (const { entity, alias } of flat) {
    if (new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(norm)) {
      return entity;
    }
  }
  return null;
}

// Detecta días: rangos ("lunes a viernes"), fin de semana, "todos los días" y
// días sueltos. Devuelve índices 0=Dom..6=Sáb; [] = todos los días.
function detectDays(text: string): number[] {
  const norm = removeAccents(text.toLowerCase());
  if (/todos\s+los\s+dias/.test(norm)) return [];

  const days = new Set<number>();

  if (/fin(?:es)?\s+de\s+semana/.test(norm)) {
    days.add(0);
    days.add(6);
  }

  const daynames = Object.keys(DAY_INDEX).join("|");
  const rangeRe = new RegExp(`\\b(${daynames})s?\\s+a\\s+(${daynames})s?\\b`, "g");

  for (const match of norm.matchAll(rangeRe)) {
    const from = DAY_INDEX[match[1]];
    const to = DAY_INDEX[match[2]];
    if (from === undefined || to === undefined) continue;
    if (from <= to) {
      for (let day = from; day <= to; day += 1) days.add(day);
    } else {
      for (let day = from; day <= 6; day += 1) days.add(day);
      for (let day = 0; day <= to; day += 1) days.add(day);
    }
  }

  for (const [name, index] of Object.entries(DAY_INDEX)) {
    if (new RegExp(`\\b${name}s?\\b`).test(norm)) days.add(index);
  }

  return Array.from(days).sort((a, b) => a - b);
}

// Contextos para no confundir el % del beneficio con tasas financieras.
const RATE_CONTEXT = /\b(tna|tea|tem|cft|cftea)\b|inter[eé]s anual|costo financiero|financiaci[oó]n/i;
const BENEFIT_CONTEXT = /descuento|reintegro|ahorro|devoluci[oó]n|cashback|bonificaci[oó]n|\boff\b/i;

// Elige el porcentaje del beneficio: descarta los que están en contexto de tasa
// (TNA/TEA/CFT) y prioriza los cercanos a palabras de beneficio; a igual score,
// el más alto (suele ser el descuento principal).
function findDiscountPct(text: string): number | null {
  let best: number | null = null;
  let bestScore = -1;

  for (const match of text.matchAll(/(\d{1,3})(?:[.,]\d+)?\s*(?:%|por\s*ciento)/gi)) {
    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value) || value <= 0 || value > 100) continue;

    const index = match.index ?? 0;
    // Ventana ANGOSTA pegada al número para descartar tasas (TNA/TEA/CFT): así un
    // "CFT 120%" lejano no envenena a un "25% de descuento" legítimo.
    const rateWindow = text.slice(Math.max(0, index - 25), index + 8);
    if (RATE_CONTEXT.test(rateWindow)) continue;

    // Ventana ANCHA para el beneficio: "descuento" puede ir antes o después.
    const benefitWindow = text.slice(Math.max(0, index - 50), index + 40);
    const score = BENEFIT_CONTEXT.test(benefitWindow) ? 2 : 1;
    if (score > bestScore || (score === bestScore && best !== null && value > best)) {
      bestScore = score;
      best = value;
    }
  }

  return best;
}

// Tope/reintegro máximo: exige el signo $ para no agarrar "30" de "30%".
// Bidireccional: la keyword puede ir antes ("tope de $8.000") o después
// ("$8.000 de tope por mes").
function findMaxAmount(text: string): number | null {
  const keyword = "tope|reintegro|m[aá]ximo|l[ií]mite|devoluci[oó]n|hasta|por mes|por operaci[oó]n";

  const before = text.match(
    new RegExp(`(?:${keyword})[^$]{0,40}\\$\\s?([\\d.]{3,})`, "i"),
  );
  if (before) {
    const amount = parseArsAmount(before[1]);
    if (amount) return amount;
  }

  const after = text.match(
    new RegExp(`\\$\\s?([\\d.]{3,})[^.$]{0,30}?(?:${keyword})`, "i"),
  );
  return after ? parseArsAmount(after[1]) : null;
}

function detectPaymentType(text: string): string {
  const lower = text.toLowerCase();
  if (/\bmodo\b/.test(lower)) return "modo";
  if (/cr[eé]dito/.test(lower)) return "credito";
  if (/d[eé]bito/.test(lower)) return "debito";
  if (/prepaga?/.test(lower)) return "prepago";
  return "cualquiera";
}

function normalizeYear(rawYear: string | undefined, fallbackYear: number) {
  if (!rawYear) return fallbackYear;
  const year = Number.parseInt(rawYear, 10);
  if (!Number.isFinite(year)) return fallbackYear;
  return year < 100 ? 2000 + year : year;
}

function dateAtStartOfDay(year: number, monthIndex: number, day: number) {
  const date = new Date(year, monthIndex, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateAtEndOfDay(year: number, monthIndex: number, day: number) {
  const date = new Date(year, monthIndex, day, 23, 59, 59, 999);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseNumericDate(
  day: string,
  month: string,
  year: string | undefined,
  fallbackYear: number,
  endOfDay: boolean,
) {
  const parsedDay = Number.parseInt(day, 10);
  const parsedMonth = Number.parseInt(month, 10) - 1;
  const parsedYear = normalizeYear(year, fallbackYear);

  if (
    !Number.isFinite(parsedDay) ||
    !Number.isFinite(parsedMonth) ||
    parsedDay < 1 ||
    parsedDay > 31 ||
    parsedMonth < 0 ||
    parsedMonth > 11
  ) {
    return null;
  }

  return endOfDay
    ? dateAtEndOfDay(parsedYear, parsedMonth, parsedDay)
    : dateAtStartOfDay(parsedYear, parsedMonth, parsedDay);
}

function detectValidityRange(
  text: string,
  referenceDate = new Date(),
): { validFrom: Date | null; validUntil: Date | null } {
  const fallbackYear = referenceDate.getFullYear();
  const numericRange = text.match(
    /(?:del|desde(?:\s+el)?)\s+(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\s+(?:al|hasta(?:\s+el)?)\s+(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/i,
  );

  if (numericRange) {
    const startYear = numericRange[3] ?? numericRange[6];
    const endYear = numericRange[6] ?? numericRange[3];
    return {
      validFrom: parseNumericDate(
        numericRange[1],
        numericRange[2],
        startYear,
        fallbackYear,
        false,
      ),
      validUntil: parseNumericDate(
        numericRange[4],
        numericRange[5],
        endYear,
        fallbackYear,
        true,
      ),
    };
  }

  const writtenRange = removeAccents(text.toLowerCase()).match(
    /(?:del|desde(?: el)?)\s+(\d{1,2})\s+(?:al|hasta(?: el)?)\s+(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{2,4}))?/,
  );

  if (writtenRange) {
    const monthIndex = MONTH_INDEX[writtenRange[3]];
    const year = normalizeYear(writtenRange[4], fallbackYear);

    if (monthIndex !== undefined) {
      return {
        validFrom: dateAtStartOfDay(year, monthIndex, Number.parseInt(writtenRange[1], 10)),
        validUntil: dateAtEndOfDay(year, monthIndex, Number.parseInt(writtenRange[2], 10)),
      };
    }
  }

  const until = text.match(
    /(?:hasta|vigente hasta|valida? hasta|vence(?: el)?)\s+(?:el\s+)?(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?/i,
  );

  if (until) {
    return {
      validFrom: null,
      validUntil: parseNumericDate(
        until[1],
        until[2],
        until[3],
        fallbackYear,
        true,
      ),
    };
  }

  return { validFrom: null, validUntil: null };
}

export function parseBankPromoText(
  text: string,
  referenceDate = new Date(),
): ParsedBankPromoDraft {
  const entity = detectEntity(text) ?? "";

  const installmentsMatch = text.match(/(\d{1,2})\s*(?:cuotas|pagos)/i);
  const installments = installmentsMatch ? Number.parseInt(installmentsMatch[1], 10) : null;

  const discountPct = findDiscountPct(text);
  const maxAmount = findMaxAmount(text);

  const isInstallments =
    /(?:cuotas|pagos)\s+sin\s+inter[eé]s/i.test(text) ||
    (installments !== null && discountPct === null);
  const isRefund = /reintegro|devoluci[oó]n|cashback/i.test(text);
  const promoType = isInstallments ? "installments" : isRefund ? "refund" : "percentage";

  const dayOfWeek = detectDays(text);
  const validity = detectValidityRange(text, referenceDate);

  return {
    entity,
    entitySlug: entity ? slugifyEntity(entity) : "",
    promoType,
    discountPct: promoType === "installments" ? null : discountPct,
    maxAmount,
    installments,
    dayOfWeek,
    paymentType: detectPaymentType(text),
    validFrom: validity.validFrom,
    validUntil: validity.validUntil,
    notes: text.trim().slice(0, 500),
  };
}
