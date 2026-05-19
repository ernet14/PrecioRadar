import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { getMercadoLibreToken } from "@/lib/mercadolibre/oauth";

export const dynamic = "force-dynamic";

const apiBaseUrl = "https://api.mercadolibre.com";
const requestTimeoutMs = 5000;

type ProbeResult = {
  ok: boolean;
  status: number | null;
  durationMs: number;
  responseSnippet: string | null;
  resultCount?: number;
};

function maskToken(token: string | null): string {
  if (!token) return "absent";
  if (token.length <= 8) return "[short-token]";
  return `${token.slice(0, 4)}…${token.slice(-4)} (len=${token.length})`;
}

async function probe(path: string, token: string | null): Promise<ProbeResult> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "PrecioRadar/1.0 (+https://precioradar.com.ar)",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers,
      signal: controller.signal,
    });
    const durationMs = Math.round(performance.now() - startedAt);
    const bodyText = await response.text().catch(() => "");
    const responseSnippet = bodyText
      ? bodyText.length > 300
        ? `${bodyText.slice(0, 297)}...`
        : bodyText
      : null;

    let resultCount: number | undefined;
    try {
      const parsed = JSON.parse(bodyText);
      if (parsed && Array.isArray(parsed.results)) {
        resultCount = parsed.results.length;
      }
    } catch {
      // body no es JSON, ignorar
    }

    return {
      durationMs,
      ok: response.ok,
      responseSnippet,
      resultCount,
      status: response.status,
    };
  } catch (error) {
    return {
      durationMs: Math.round(performance.now() - startedAt),
      ok: false,
      responseSnippet: error instanceof Error ? error.message : String(error),
      status: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function handleProbe(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "samsung galaxy a55";
  const siteId = url.searchParams.get("site") ?? process.env.MERCADOLIBRE_SITE_ID ?? "MLA";
  const itemId = url.searchParams.get("item") ?? "MLA1483802608";

  const searchPath = `/sites/${encodeURIComponent(siteId)}/search?${new URLSearchParams(
    { limit: "1", q: query },
  ).toString()}`;
  const itemPath = `/items/${encodeURIComponent(itemId)}`;

  const token = await getMercadoLibreToken();

  const [searchPublic, searchBearer, itemPublic, itemBearer] = await Promise.all([
    probe(searchPath, null),
    token ? probe(searchPath, token) : Promise.resolve(null),
    probe(itemPath, null),
    token ? probe(itemPath, token) : Promise.resolve(null),
  ]);

  return Response.json(
    {
      env: {
        siteId,
        clientIdConfigured: Boolean(process.env.MERCADOLIBRE_CLIENT_ID),
        clientSecretConfigured: Boolean(process.env.MERCADOLIBRE_CLIENT_SECRET),
        staticAccessTokenConfigured: Boolean(process.env.MERCADOLIBRE_ACCESS_TOKEN),
      },
      probes: {
        search: {
          path: searchPath,
          query,
          public: searchPublic,
          bearer: searchBearer,
        },
        item: {
          path: itemPath,
          itemId,
          public: itemPublic,
          bearer: itemBearer,
        },
      },
      token: {
        obtained: Boolean(token),
        masked: maskToken(token),
      },
    },
    { headers: noStoreHeaders },
  );
}

export async function GET(request: Request) {
  return handleProbe(request);
}

export async function POST(request: Request) {
  return handleProbe(request);
}
