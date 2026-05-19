import {
  getProviderErrorMessage,
  recordProviderLog,
} from "@/services/providerLogService";
import {
  readMercadoLibreAuth,
  writeMercadoLibreAuth,
  type MercadoLibreAuthRecord,
} from "@/lib/mercadolibre/authStorage";

const tokenOauthUrl = "https://api.mercadolibre.com/oauth/token";
const authorizationBaseUrl = "https://auth.mercadolibre.com.ar/authorization";
const refreshBufferMs = 10 * 60 * 1000;
const requestTimeoutMs = 5000;

type TokenPayload = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  mlUserId: string;
  scope: string | null;
};

function isPlaceholder(value: string) {
  return value.startsWith("[") && value.endsWith("]");
}

function getCredentials() {
  const clientId = process.env.MERCADOLIBRE_CLIENT_ID ?? "";
  const clientSecret = process.env.MERCADOLIBRE_CLIENT_SECRET ?? "";
  const redirectUri = process.env.MERCADOLIBRE_REDIRECT_URI ?? "";

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    isPlaceholder(clientId) ||
    isPlaceholder(clientSecret) ||
    isPlaceholder(redirectUri)
  ) {
    return null;
  }
  return { clientId, clientSecret, redirectUri };
}

export function getOAuthCredentials() {
  return getCredentials();
}

export function buildAuthorizationUrl(state: string) {
  const creds = getCredentials();
  if (!creds) return null;

  const url = new URL(authorizationBaseUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", creds.clientId);
  url.searchParams.set("redirect_uri", creds.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

function parseTokenResponse(data: unknown): TokenPayload | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const accessToken = typeof raw.access_token === "string" ? raw.access_token : null;
  const refreshToken = typeof raw.refresh_token === "string" ? raw.refresh_token : null;
  const expiresIn = typeof raw.expires_in === "number" ? raw.expires_in : 21600;
  const userIdValue = raw.user_id;
  const mlUserId =
    typeof userIdValue === "string"
      ? userIdValue
      : typeof userIdValue === "number"
        ? String(userIdValue)
        : null;
  const scope = typeof raw.scope === "string" ? raw.scope : null;

  if (!accessToken || !refreshToken || !mlUserId) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    mlUserId,
    scope,
  };
}

async function postToTokenEndpoint(
  body: URLSearchParams,
  action: string,
): Promise<TokenPayload | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(tokenOauthUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      const snippet =
        bodyText.length > 200 ? `${bodyText.slice(0, 197)}...` : bodyText;
      await recordProviderLog({
        action,
        errorMessage: `HTTP ${response.status} en token endpoint${snippet ? ` — ${snippet}` : ""}`,
        provider: "mercadolibre",
        status: "failed",
        storeSlug: "mercadolibre",
      });
      return null;
    }

    const json = (await response.json()) as unknown;
    const parsed = parseTokenResponse(json);

    if (!parsed) {
      await recordProviderLog({
        action,
        errorMessage: "Respuesta OAuth de MercadoLibre incompleta.",
        provider: "mercadolibre",
        status: "failed",
        storeSlug: "mercadolibre",
      });
      return null;
    }

    await recordProviderLog({
      action,
      provider: "mercadolibre",
      status: "success",
      storeSlug: "mercadolibre",
    });
    return parsed;
  } catch (error) {
    await recordProviderLog({
      action,
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

export async function exchangeCodeForTokens(code: string): Promise<TokenPayload | null> {
  const creds = getCredentials();
  if (!creds) return null;

  const tokens = await postToTokenEndpoint(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      redirect_uri: creds.redirectUri,
    }),
    "oauth.codeExchange",
  );

  if (!tokens) return null;

  const stored = await writeMercadoLibreAuth(tokens);
  if (!stored) {
    await recordProviderLog({
      action: "oauth.codeExchange",
      errorMessage: "No se pudo persistir el token de MercadoLibre en la DB.",
      provider: "mercadolibre",
      status: "failed",
      storeSlug: "mercadolibre",
    });
    return null;
  }

  return tokens;
}

async function refreshTokens(record: MercadoLibreAuthRecord): Promise<TokenPayload | null> {
  const creds = getCredentials();
  if (!creds) return null;

  const tokens = await postToTokenEndpoint(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: record.refreshToken,
    }),
    "oauth.refresh",
  );

  if (!tokens) return null;

  await writeMercadoLibreAuth(tokens);
  return tokens;
}

export async function getMercadoLibreToken(): Promise<string | null> {
  const staticToken = process.env.MERCADOLIBRE_ACCESS_TOKEN;
  if (staticToken && !isPlaceholder(staticToken)) {
    return staticToken;
  }

  const record = await readMercadoLibreAuth();
  if (!record) {
    return null;
  }

  const expiresAtMs = record.expiresAt.getTime();
  if (Date.now() < expiresAtMs - refreshBufferMs) {
    return record.accessToken;
  }

  const refreshed = await refreshTokens(record);
  return refreshed?.accessToken ?? null;
}
