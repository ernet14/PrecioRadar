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

// Clave canónica cross-store: marca + SKU del fabricante. Permite agrupar el
// mismo producto aunque cada tienda use un título distinto. Devuelve null
// (sin agrupar) cuando no hay un SKU confiable, para NO mezclar productos
// diferentes — preferimos precisión sobre cobertura.
export function getCanonicalProductKey(input: {
  name: string;
  brand?: string | null;
}): string | null {
  const token = getStrongModelToken(input.name);

  if (!token) return null;

  const brandSlug = input.brand ? slugify(input.brand) : "";

  return brandSlug ? `${brandSlug}-${token}` : token;
}
