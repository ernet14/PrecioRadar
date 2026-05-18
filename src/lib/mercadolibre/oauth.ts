import {
  getProviderErrorMessage,
  recordProviderLog,
} from "@/services/providerLogService";

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

const tokenOauthUrl = "https://api.mercadolibre.com/oauth/token";
const refreshBufferMs = 10 * 60 * 1000;
const requestTimeoutMs = 5000;

let cachedToken: TokenCache | null = null;

function isPlaceholder(value: string) {
  return value.startsWith("[") && value.endsWith("]");
}

function getCredentials() {
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID ?? "";
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET ?? "";

  if (!clientId || !clientSecret || isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
    return null;
  }

  return { clientId, clientSecret };
}

async function fetchNewToken(clientId: string, clientSecret: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(tokenOauthUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      await recordProviderLog({
        action: "oauth.fetchToken",
        errorMessage: `HTTP ${response.status} al obtener token de MercadoLibre.`,
        provider: "mercadolibre",
        status: "failed",
        storeSlug: "mercadolibre",
      });
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const accessToken = typeof data.access_token === "string" ? data.access_token : null;

    if (!accessToken) {
      await recordProviderLog({
        action: "oauth.fetchToken",
        errorMessage: "MercadoLibre devolvio respuesta OAuth sin access_token.",
        provider: "mercadolibre",
        status: "failed",
        storeSlug: "mercadolibre",
      });
      return null;
    }

    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
    cachedToken = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    await recordProviderLog({
      action: "oauth.tokenRefreshed",
      provider: "mercadolibre",
      status: "success",
      storeSlug: "mercadolibre",
    });

    return cachedToken.accessToken;
  } catch (error) {
    await recordProviderLog({
      action: "oauth.fetchToken",
      errorMessage: getProviderErrorMessage(error),
      provider: "mercadolibre",
      status: "failed",
      storeSlug: "mercadolibre",
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getMercadoLibreToken(): Promise<string | null> {
  const staticToken = process.env.MERCADOLIBRE_ACCESS_TOKEN;
  if (staticToken && !isPlaceholder(staticToken)) {
    return staticToken;
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - refreshBufferMs) {
    return cachedToken.accessToken;
  }

  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  return fetchNewToken(credentials.clientId, credentials.clientSecret);
}
