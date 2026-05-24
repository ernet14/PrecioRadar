import type { PriceIndexResult } from "@/services/priceIndexService";

export type FxRatePoint = {
  date: string; // YYYY-MM-DD
  rate: number;
};

export type PassThroughLagResult = {
  beta: number | null;
  correlation: number | null;
  fxChangePct: number | null;
  lagDays: number;
  matchedDays: number;
  priceChangePct: number | null;
  status: "ready" | "insufficient_data" | "no_fx_move";
};

export type PassThroughResult = {
  baseDate: string | null;
  latestDate: string | null;
  lags: PassThroughLagResult[];
  priceDays: number;
};

function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pctChange(from: number, to: number) {
  if (from <= 0) return null;
  return ((to / from) - 1) * 100;
}

function toDateMs(date: string) {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function addDays(date: string, days: number) {
  const ms = toDateMs(date);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function pearson(left: number[], right: number[]) {
  if (left.length !== right.length || left.length < 2) return null;

  const avgLeft = left.reduce((sum, value) => sum + value, 0) / left.length;
  const avgRight = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;

  for (let i = 0; i < left.length; i++) {
    const l = left[i] - avgLeft;
    const r = right[i] - avgRight;
    numerator += l * r;
    leftSquares += l * l;
    rightSquares += r * r;
  }

  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator > 0 ? numerator / denominator : null;
}

function getDailyLogReturns(points: Array<{ value: number }>) {
  const returns: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].value;
    const curr = points[i].value;
    if (prev > 0 && curr > 0) returns.push(Math.log(curr / prev));
  }
  return returns;
}

function normalizeFxSeries(points: FxRatePoint[]) {
  const deduped = new Map<string, number>();
  for (const point of points) {
    if (!point.date || !Number.isFinite(point.rate) || point.rate <= 0) continue;
    deduped.set(point.date, point.rate);
  }
  return new Map([...deduped.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function computeLag(
  priceIndex: PriceIndexResult,
  fxByDate: Map<string, number>,
  lagDays: number,
): PassThroughLagResult {
  const paired = priceIndex.points
    .map((point) => {
      const fxDate = addDays(point.date, -lagDays);
      const fx = fxDate ? fxByDate.get(fxDate) : undefined;
      return fx ? { date: point.date, fx, value: point.index } : null;
    })
    .filter((point): point is { date: string; fx: number; value: number } => point !== null);

  if (paired.length < 3) {
    return {
      beta: null,
      correlation: null,
      fxChangePct: null,
      lagDays,
      matchedDays: paired.length,
      priceChangePct: null,
      status: "insufficient_data",
    };
  }

  const priceChange = pctChange(paired[0].value, paired.at(-1)!.value);
  const fxChange = pctChange(paired[0].fx, paired.at(-1)!.fx);

  if (priceChange === null || fxChange === null || Math.abs(fxChange) < 0.01) {
    return {
      beta: null,
      correlation: null,
      fxChangePct: fxChange === null ? null : round(fxChange, 2),
      lagDays,
      matchedDays: paired.length,
      priceChangePct: priceChange === null ? null : round(priceChange, 2),
      status: "no_fx_move",
    };
  }

  const priceReturns = getDailyLogReturns(paired.map((point) => ({ value: point.value })));
  const fxReturns = getDailyLogReturns(paired.map((point) => ({ value: point.fx })));
  const correlation = pearson(priceReturns, fxReturns);

  return {
    beta: round(priceChange / fxChange, 4),
    correlation: correlation === null ? null : round(correlation, 4),
    fxChangePct: round(fxChange, 2),
    lagDays,
    matchedDays: paired.length,
    priceChangePct: round(priceChange, 2),
    status: "ready",
  };
}

export function computePassThrough(
  priceIndex: PriceIndexResult,
  fxSeries: FxRatePoint[],
  lags = [0, 1, 3, 7, 14],
): PassThroughResult {
  const fxByDate = normalizeFxSeries(fxSeries);

  return {
    baseDate: priceIndex.baseDate,
    latestDate: priceIndex.latestDate,
    lags: lags.map((lagDays) => computeLag(priceIndex, fxByDate, lagDays)),
    priceDays: priceIndex.days,
  };
}

export function parseFxCsv(raw: string): FxRatePoint[] {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const [first, ...rest] = lines;
  const firstCells = first.split(",").map((cell) => cell.trim().toLowerCase());
  const hasHeader = firstCells.includes("date") || firstCells.includes("fecha");
  const rows = hasHeader ? rest : lines;
  const dateIndex = hasHeader
    ? firstCells.findIndex((cell) => cell === "date" || cell === "fecha")
    : 0;
  const rateIndex = hasHeader
    ? firstCells.findIndex((cell) => ["rate", "cotizacion", "precio", "value", "valor"].includes(cell))
    : 1;

  if (dateIndex < 0 || rateIndex < 0) return [];

  return rows
    .map((line) => {
      const cells = line.split(",").map((cell) => cell.trim());
      const date = cells[dateIndex];
      const rate = Number(cells[rateIndex]?.replace(/\./g, "").replace(",", "."));
      return { date, rate };
    })
    .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isFinite(point.rate) && point.rate > 0);
}
