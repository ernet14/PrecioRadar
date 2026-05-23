function removeAccents(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeProductName(name: string) {
  return removeAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(text: string) {
  return normalizeProductName(text).replace(/\s+/g, "-");
}

// Largo mínimo de un token para considerarlo SKU del fabricante. Pedimos >= 6
// para quedarnos con identificadores específicos de variante ("82XQ00TCAR",
// "55UP7750PSB") y descartar familias/medidas cortas ("A55", "128GB") que
// agruparían productos DISTINTOS (ej. 128GB vs 256GB).
const MIN_CANONICAL_TOKEN_LENGTH = 6;

// Token de modelo/SKU "fuerte": mezcla letras y dígitos. Es lo más confiable
// para identificar el MISMO producto entre tiendas que lo nombran distinto.
// Devuelve el más largo (el más específico) o null si no hay ninguno.
function getStrongModelToken(text: string): string | null {
  let best: string | null = null;

  for (const token of normalizeProductName(text).split(" ")) {
    if (token.length < MIN_CANONICAL_TOKEN_LENGTH) continue;
    if (!/[a-z]/.test(token) || !/[0-9]/.test(token)) continue;
    if (!best || token.length > best.length) best = token;
  }

  return best;
}

// --- Celulares: clave por marca + modelo + almacenamiento (tolera color) ---
// Para teléfonos el EAN suele ser por-variante (cada color su propio EAN) y
// muchas tiendas no lo exponen, así que agrupar por EAN FRAGMENTA: el mismo
// modelo aparece en 5 tiendas pero con 5 EANs distintos → 0 comparables.
// Acá derivamos una clave a nivel "modelo + capacidad" ignorando solo el color,
// que sí agrupa el mismo teléfono entre tiendas. Mantiene distintas las
// capacidades (128 != 256), coherente con la regla de precisión sobre cobertura.

// Palabras que delatan un accesorio/wearable, NO un teléfono: si aparecen,
// no derivamos clave de celular (evita agrupar fundas/relojes con el teléfono).
const PHONE_ACCESSORY_WORDS = new Set([
  "funda", "fundas", "vidrio", "templado", "protector", "protectores", "cable",
  "cargador", "auricular", "auriculares", "buds", "repuesto", "repuestos",
  "pantalla", "modulo", "bateria", "bandeja", "soporte", "carcasa", "case",
  "cover", "film", "glass", "holster", "smartwatch", "watch", "reloj", "tablet",
  "tab", "parlante", "fit", "fit3",
]);

// Capacidades de almacenamiento plausibles (GB). RAM (3/4/6/8/12) queda afuera
// para no confundir "128GB 8GB" (storage 128, ram 8).
const PHONE_STORAGE_GB = new Set([16, 32, 64, 128, 256, 512, 1024]);

function getPhoneStorage(normalized: string): string | null {
  let bestGb = 0;
  // Formato "256/8gb" (almacenamiento/RAM con el sufijo "gb" solo en la RAM):
  // tras normalizar queda "256 8gb", así que el almacenamiento (256) no lleva
  // su propio "gb" y el patrón de abajo no lo vería. Capturamos el primer
  // número de un par "<storage> <ram>gb" cuando es una capacidad plausible.
  for (const match of normalized.matchAll(/(\d{1,4})\s+\d{1,3}\s?gb\b/g)) {
    const value = Number(match[1]);
    if (PHONE_STORAGE_GB.has(value) && value > bestGb) bestGb = value;
  }
  for (const match of normalized.matchAll(/(\d{1,4})\s?(gb|tb)/g)) {
    const value = Number(match[1]);
    if (match[2] === "tb") return `${value}tb`;
    if (PHONE_STORAGE_GB.has(value) && value > bestGb) bestGb = value;
  }
  return bestGb > 0 ? String(bestGb) : null;
}

function detectPhoneBrand(haystack: string): "samsung" | "motorola" | "xiaomi" | "apple" | null {
  if (/\bsamsung\b/.test(haystack)) return "samsung";
  if (/\bmotorola\b|\bmoto\b/.test(haystack)) return "motorola";
  if (/\bxiaomi\b|\bredmi\b|\bpoco\b/.test(haystack)) return "xiaomi";
  if (/\bapple\b|\biphone\b/.test(haystack)) return "apple";
  return null;
}

// Modelo por marca a partir de los tokens del nombre normalizado. Devuelve un
// token estable ("a55", "s24-ultra", "g24", "edge-50-fusion", "redmi-note-13",
// "iphone-15-pro-max") o null si no se reconoce con confianza.
function getPhoneModelToken(
  brand: "samsung" | "motorola" | "xiaomi" | "apple",
  tokens: string[],
): string | null {
  const after = (i: number) => tokens[i + 1] ?? "";
  const withSuffix = (base: string, allowed: string[], i: number) =>
    allowed.includes(after(i)) ? `${base}-${after(i)}` : base;

  if (brand === "samsung") {
    const i = tokens.findIndex((t) => /^(a|s|m|f|j)\d{1,3}[a-z]?$/.test(t));
    if (i >= 0) return withSuffix(tokens[i], ["ultra", "plus", "fe", "pro", "edge"], i);
    const n = tokens.indexOf("note");
    if (n >= 0 && /^\d{1,3}$/.test(after(n))) {
      return withSuffix(`note${after(n)}`, ["ultra", "plus"], n + 1);
    }
    return null;
  }

  if (brand === "motorola") {
    const e = tokens.indexOf("edge");
    if (e >= 0 && /^\d{1,3}$/.test(after(e))) {
      return withSuffix(`edge-${after(e)}`, ["fusion", "neo", "pro", "ultra"], e + 1);
    }
    const r = tokens.indexOf("razr");
    if (r >= 0 && /^\d{1,3}$/.test(after(r))) return `razr${after(r)}`;
    const g = tokens.findIndex((t) => /^(g|e|c)\d{1,3}$/.test(t));
    if (g >= 0) return withSuffix(tokens[g], ["power", "play", "plus", "neo"], g);
    return null;
  }

  if (brand === "xiaomi") {
    const rn = tokens.indexOf("redmi");
    if (rn >= 0 && after(rn) === "note" && /^\d{1,3}$/.test(tokens[rn + 2] ?? "")) {
      return withSuffix(`redmi-note-${tokens[rn + 2]}`, ["pro"], rn + 2);
    }
    if (rn >= 0 && /^\d{1,3}[a-z]?$/.test(after(rn))) {
      return withSuffix(`redmi-${after(rn)}`, ["pro", "power"], rn + 1);
    }
    const p = tokens.indexOf("poco");
    if (p >= 0 && /^[a-z]\d{1,2}$/.test(after(p))) return withSuffix(`poco-${after(p)}`, ["pro"], p + 1);
    return null;
  }

  // apple
  const ip = tokens.indexOf("iphone");
  if (ip >= 0 && /^\d{1,2}$/.test(after(ip))) {
    if (after(ip + 1) === "pro" && tokens[ip + 3] === "max") return `iphone-${after(ip)}-pro-max`;
    return withSuffix(`iphone-${after(ip)}`, ["pro", "plus", "mini"], ip + 1);
  }
  return null;
}

export function getPhoneCanonicalKey(input: { name: string; brand?: string | null }): string | null {
  const normalized = normalizeProductName(input.name);
  const tokens = normalized.split(" ");
  if (tokens.some((t) => PHONE_ACCESSORY_WORDS.has(t))) return null;

  const brand = detectPhoneBrand(`${normalizeProductName(input.brand ?? "")} ${normalized}`);
  if (!brand) return null;

  const model = getPhoneModelToken(brand, tokens);
  if (!model) return null;

  const storage = getPhoneStorage(normalized);
  if (!storage) return null; // sin capacidad confiable: que decida el EAN.

  return `phone-${brand}-${model}-${storage}`;
}

// Normaliza un código de barras (EAN-8/UPC-12/EAN-13/GTIN-14). Devuelve solo
// dígitos si el largo es plausible y no es todo ceros; si no, null.
export function normalizeEan(ean: string | null | undefined): string | null {
  if (!ean) return null;

  const digits = ean.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  if (/^0+$/.test(digits)) return null;

  return digits;
}

// Clave canónica cross-store, por prioridad:
//   1) Celular reconocido → marca+modelo+almacenamiento (el EAN por-variante
//      fragmentaría, ver getPhoneCanonicalKey).
//   2) Código de barras (EAN/GTIN) — el identificador más confiable para el resto.
//   3) Marca + SKU fuerte del fabricante (token alfanumérico largo).
//   4) null (sin agrupar) — preferimos precisión sobre cobertura.
export function getCanonicalProductKey(input: {
  name: string;
  brand?: string | null;
  ean?: string | null;
}): string | null {
  const phone = getPhoneCanonicalKey(input);
  if (phone) return phone;

  const ean = normalizeEan(input.ean);
  if (ean) return `ean-${ean}`;

  const token = getStrongModelToken(input.name);

  if (!token) return null;

  const brandSlug = input.brand ? slugify(input.brand) : "";

  return brandSlug ? `${brandSlug}-${token}` : token;
}
