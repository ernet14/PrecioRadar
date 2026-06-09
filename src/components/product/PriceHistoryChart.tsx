"use client";

import { useMemo, useState } from "react";
import { formatCurrencyARS, formatDate } from "@/lib/utils";
import type {
  PriceHistoryPoint,
  PriceHistoryRangeDays,
  PriceHistoryStats,
} from "@/services/priceHistoryService";

type PriceHistoryChartProps = {
  currentPrice: number;
  history: PriceHistoryPoint[];
  initialStats: PriceHistoryStats;
};

type ChartPoint = PriceHistoryPoint & {
  label: string;
};

const ranges: Array<{ label: string; value: PriceHistoryRangeDays }> = [
  { label: "7 días", value: 7 },
  { label: "30 días", value: 30 },
  { label: "90 días", value: 90 },
];

function getRangeHistory(
  history: PriceHistoryPoint[],
  rangeDays: PriceHistoryRangeDays,
) {
  if (history.length === 0) {
    return [];
  }

  const sortedHistory = [...history].sort((left, right) =>
    left.recordedAt.localeCompare(right.recordedAt),
  );
  const latestTime = new Date(
    sortedHistory[sortedHistory.length - 1].recordedAt,
  ).getTime();
  const minTime = latestTime - (rangeDays - 1) * 24 * 60 * 60 * 1000;

  return sortedHistory.filter(
    (point) => new Date(point.recordedAt).getTime() >= minTime,
  );
}

function calculateStats(
  history: PriceHistoryPoint[],
  currentPrice: number,
  fallbackStats: PriceHistoryStats,
): PriceHistoryStats {
  if (history.length === 0) {
    return fallbackStats;
  }

  const prices = history.map((point) => point.price);
  const firstPrice = prices[0];

  return {
    currentPrice,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    averagePrice:
      prices.reduce((total, price) => total + price, 0) / prices.length,
    variationPercent:
      firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : null,
    pointsCount: history.length,
    isSufficient: history.length >= 7,
    lastUpdatedAt: history[history.length - 1].recordedAt,
  };
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "Sin datos";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

function createChartGeometry(history: ChartPoint[]) {
  if (history.length === 0) {
    return {
      areaPoints: "",
      linePoints: "",
    };
  }

  const prices = history.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;
  const points = history.map((point, index) => {
    const x = history.length === 1 ? 50 : (index / (history.length - 1)) * 100;
    const y = 88 - ((point.price - minPrice) / range) * 72;

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return {
    areaPoints: `0,100 ${points.join(" ")} 100,100`,
    linePoints: points.join(" "),
  };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

export function PriceHistoryChart({
  currentPrice,
  history,
  initialStats,
}: PriceHistoryChartProps) {
  const [rangeDays, setRangeDays] = useState<PriceHistoryRangeDays>(30);
  const rangeHistory = useMemo(
    () => getRangeHistory(history, rangeDays),
    [history, rangeDays],
  );
  const stats = useMemo(
    () => calculateStats(rangeHistory, currentPrice, initialStats),
    [currentPrice, initialStats, rangeHistory],
  );
  const chartData: ChartPoint[] = useMemo(
    () =>
      rangeHistory.map((point) => ({
        ...point,
        label: formatDate(point.recordedAt),
      })),
    [rangeHistory],
  );
  const chartGeometry = useMemo(
    () => createChartGeometry(chartData),
    [chartData],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-normal text-blue-700">
            Evolución del precio
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">
            Historial de precio
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Precio mínimo diario registrado.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
          {ranges.map((range) => (
            <button
              className={`h-11 rounded-md px-3 text-sm font-semibold transition ${
                rangeDays === range.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
              key={range.value}
              onClick={() => setRangeDays(range.value)}
              type="button"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Mínimo" value={formatCurrencyARS(stats.minPrice)} />
        <StatCard label="Máximo" value={formatCurrencyARS(stats.maxPrice)} />
        <StatCard
          label="Promedio"
          value={formatCurrencyARS(stats.averagePrice)}
        />
        <StatCard label="Variación" value={formatPercent(stats.variationPercent)} />
      </div>

      {stats.isSufficient ? (
        <div className="h-80 w-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{formatCurrencyARS(stats.maxPrice)}</span>
              <span>{formatCurrencyARS(stats.minPrice)}</span>
            </div>
            <div className="relative mt-3 min-h-0 flex-1 overflow-hidden rounded-lg bg-slate-50">
              <svg
                aria-label="Gráfico de historial de precio"
                className="h-full w-full"
                preserveAspectRatio="none"
                role="img"
                viewBox="0 0 100 100"
              >
                <defs>
                  <linearGradient id="priceHistoryFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity="0.28" />
                    <stop offset="95%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line stroke="#e2e8f0" strokeWidth="0.5" x1="0" x2="100" y1="25" y2="25" />
                <line stroke="#e2e8f0" strokeWidth="0.5" x1="0" x2="100" y1="50" y2="50" />
                <line stroke="#e2e8f0" strokeWidth="0.5" x1="0" x2="100" y1="75" y2="75" />
                <polygon fill="url(#priceHistoryFill)" points={chartGeometry.areaPoints} />
                <polyline
                  fill="none"
                  points={chartGeometry.linePoints}
                  stroke="#059669"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{chartData[0]?.label}</span>
              <span>{chartData[chartData.length - 1]?.label}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Recolectando datos. Volvé en unos días para ver la evolución del precio.
        </div>
      )}

      <p className="text-sm text-slate-500">
        Última actualización: {formatDate(stats.lastUpdatedAt)}
      </p>
    </div>
  );
}
