// Etapa 14 — Diversificación de afiliados.
// Encapsula, por programa, cómo se arma el link de afiliado y de qué env sale el
// tag/ID. La UI y el tracking no conocen los detalles de cada programa: piden
// el link a este servicio. Agregar un programa nuevo es agregar una entrada acá.

export type AffiliateProgram =
  | "mercadolibre"
  | "amazon"
  | "awin"
  | "impact"
  | "cj"
  | "rakuten"
  | "temu"
  | "shein"
  | "none";

export const KNOWN_AFFILIATE_PROGRAMS: AffiliateProgram[] = [
  "mercadolibre",
  "amazon",
  "awin",
  "impact",
  "cj",
  "rakuten",
  "temu",
  "shein",
];

const DEFAULT_PROGRAM: AffiliateProgram = "mercadolibre";

export function normalizeAffiliateProgram(value?: string | null): AffiliateProgram {
  if (!value) return DEFAULT_PROGRAM;

  const normalized = value.toLowerCase().trim();

  return (KNOWN_AFFILIATE_PROGRAMS as string[]).includes(normalized)
    ? (normalized as AffiliateProgram)
    : "none";
}

// Programas cuyo link de afiliado es simplemente un parámetro sobre la URL del
// producto. El nombre del parámetro varía por programa.
const QUERY_PARAM_TAG: Partial<Record<AffiliateProgram, string>> = {
  mercadolibre: "custom_id",
  amazon: "tag",
  temu: "subId",
  shein: "aff_id",
};

// Programas basados en deeplink (awin, impact, cj, rakuten): la URL de afiliado
// vive en un host propio del programa y se carga manualmente como AffiliateLink.
// No se puede derivar automáticamente desde la URL del producto.

const PROGRAM_ENV_VAR: Partial<Record<AffiliateProgram, string>> = {
  mercadolibre: "MERCADOLIBRE_AFFILIATE_TAG",
  amazon: "AMAZON_AFFILIATE_TAG",
  awin: "AWIN_AFFILIATE_ID",
  impact: "IMPACT_AFFILIATE_TAG",
  cj: "CJ_AFFILIATE_TAG",
  rakuten: "RAKUTEN_AFFILIATE_TAG",
  temu: "TEMU_AFFILIATE_TAG",
  shein: "SHEIN_AFFILIATE_TAG",
};

/** Tag/ID de afiliado configurado por env para un programa, o undefined. */
export function getProgramAffiliateTag(program: AffiliateProgram): string | undefined {
  const key = PROGRAM_ENV_VAR[program];

  if (!key) return undefined;

  return process.env[key]?.trim() || undefined;
}

/** True si el programa soporta auto-tagging de la URL del producto. */
export function supportsAutoTagging(program: AffiliateProgram): boolean {
  return Boolean(QUERY_PARAM_TAG[program]);
}

/**
 * Construye la URL de afiliado para programas con tagging por query param.
 * Devuelve null si el programa requiere deeplink manual, falta el tag, o la
 * URL del producto es inválida.
 */
export function buildProgramAffiliateUrl({
  program,
  productUrl,
  tag,
}: {
  program: AffiliateProgram;
  productUrl: string;
  tag?: string | null;
}): string | null {
  const cleanTag = tag?.trim();

  if (!cleanTag) return null;

  const paramName = QUERY_PARAM_TAG[program];

  if (!paramName) return null;

  try {
    const url = new URL(productUrl);
    url.searchParams.set(paramName, cleanTag);
    return url.toString();
  } catch {
    return null;
  }
}
