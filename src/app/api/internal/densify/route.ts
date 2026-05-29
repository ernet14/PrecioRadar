import {
  authorizeCronRequest,
  cronUnauthorizedResponse,
  noStoreHeaders,
} from "@/lib/cronAuth";
import { runDensifyBatch } from "@/services/densifyService";
import {
  ALL_DENSIFY_QUERIES,
  DENSIFY_TARGET_CATEGORIES,
} from "@/data/densifyQueries";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Cantidad de queries por tanda semanal. Acotado para no pasar el maxDuration:
// ~30 queries × (~13-16 tiendas en paralelo, timeout 6s) ≈ ~180s + persistencia.
const DEFAULT_BATCH = 30;

function getWeekNumber(now = new Date()): number {
  return Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
}

function parseIntParam(url: URL, name: string): number | null {
  const value = url.searchParams.get(name);
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// Toma una ventana rotativa de queries (con wraparound) para que cada corrida
// semanal cubra una parte distinta del catálogo y, en varias semanas, lo recorra
// completo mientras refresca lo existente.
function selectRotatingQueries(offset: number, limit: number): string[] {
  const total = ALL_DENSIFY_QUERIES.length;
  if (total === 0) return [];
  const start = ((offset % total) + total) % total;
  const window: string[] = [];
  for (let i = 0; i < Math.min(limit, total); i += 1) {
    window.push(ALL_DENSIFY_QUERIES[(start + i) % total]);
  }
  return window;
}

async function handle(request: Request) {
  const authorization = authorizeCronRequest(request);
  if (authorization.status !== 200) {
    return cronUnauthorizedResponse(authorization);
  }

  const url = new URL(request.url);
  const limit = parseIntParam(url, "limit") ?? DEFAULT_BATCH;
  const offset = parseIntParam(url, "offset") ?? getWeekNumber() * DEFAULT_BATCH;

  const queries = selectRotatingQueries(offset, limit);

  const result = await runDensifyBatch({
    queries,
    targetCategories: DENSIFY_TARGET_CATEGORIES,
    apply: true,
    maxGroups: 80,
  });

  const httpStatus =
    result.status === "database_unavailable" ? 503 : result.status === "error" ? 500 : 200;

  return Response.json(
    { ...result, offset, limit, totalQueries: ALL_DENSIFY_QUERIES.length },
    { headers: noStoreHeaders, status: httpStatus },
  );
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
