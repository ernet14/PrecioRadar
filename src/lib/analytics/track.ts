// Capa fina sobre gtag para enviar eventos a GA4 (y, vía conversiones importadas,
// a Google Ads). gtag solo existe si el usuario aceptó analytics en el banner de
// cookies (ver GoogleAnalytics.tsx), así que esto es no-op sin consentimiento.
// Fire-and-forget: nunca rompe la UI ni bloquea la navegación.

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

export type TrackParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export function trackEvent(name: string, params: TrackParams = {}): void {
  if (typeof window === "undefined") return;

  const gtag = window.gtag;
  if (typeof gtag !== "function") return;

  // Descarta undefined/null para no ensuciar los parámetros en GA4.
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) clean[key] = value;
  }

  try {
    gtag("event", name, { transport_type: "beacon", ...clean });
  } catch {
    // Silencioso a propósito: la medición nunca debe afectar al usuario.
  }
}
