// Serializa datos para embeber en <script type="application/ld+json"> de forma segura.
// JSON.stringify NO escapa `<`, `>`, `&` ni los separadores de línea Unicode, así que un
// string controlado por el usuario (p. ej. el cuerpo de una reseña) podría incluir
// `</script>` y romper la etiqueta → XSS almacenado. Escapamos esos caracteres a su
// equivalente \uXXXX, que es JSON válido pero inerte en HTML.
const UNICODE_LINE_SEPARATORS = new RegExp("[\\u2028\\u2029]", "g");

export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(UNICODE_LINE_SEPARATORS, (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
}
