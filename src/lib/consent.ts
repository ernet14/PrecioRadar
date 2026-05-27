// Consentimiento de cookies compartido entre el banner y los scripts gateados
// (p. ej. Google Analytics). La preferencia vive en una cookie de primera parte.

export const CONSENT_COOKIE = "pr_cookie_consent";
export const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

// Evento de window que dispara el banner al guardar, para que los consumidores
// (GA) reaccionen sin recargar la página.
export const CONSENT_EVENT = "pr-consent-change";

export type ConsentValue = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export function readConsent(): ConsentValue | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`),
  );
  if (!match) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function storeConsent(value: ConsentValue) {
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${CONSENT_COOKIE}=${encoded}; max-age=${CONSENT_MAX_AGE}; path=/; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }));
}
