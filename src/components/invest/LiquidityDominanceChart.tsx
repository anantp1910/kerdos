"use client";

import dynamic from "next/dynamic";
import type { CSSProperties, ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";

type EChartsProps = { option: unknown; style?: CSSProperties; className?: string };
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false }) as ComponentType<EChartsProps>;

type MarketRegime = {
  regime: "bullish" | "defensive" | "mixed";
  description: string;
  volatility: "low" | "medium" | "high";
  bloombergPrediction?: string;
  bquantScore?: number;
};

type NQBar = {
  t: string;
  open: number;
  high: number;
  low: number;
  close: number;
  rsi_14: number | null;
  absorption: number | null;
  vpin_20: number | null;
  buy_pressure: number | null;
  delta_pct: number | null;
  close_vs_poc?: number | null;
};

function weightedMovingAverage(values: number[], length: number) {
  return values.map((_, index) => {
    const start = Math.max(0, index - length + 1);
    const window = values.slice(start, index + 1);
    const weights = window.map((__, innerIndex) => innerIndex + 1);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    const weightedTotal = window.reduce((sum, value, innerIndex) => sum + value * weights[innerIndex], 0);
    return weightedTotal / weightTotal;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeDominance(bar: NQBar, regime: MarketRegime | null) {
  const base = 4.1;
  const rsiEffect = ((50 - (bar.rsi_14 ?? 50)) / 50) * 0.85;
  const absorptionEffect = -(bar.absorption ?? 0) * 0.7;
  const vpinEffect = ((bar.vpin_20 ?? 0.35) - 0.35) * 2.8;
  const deltaEffect = -((bar.delta_pct ?? 0) * 7);
  const pressureEffect = ((0.5 - (bar.buy_pressure ?? 0.5)) * 1.1);
  const pocEffect = -((bar.close_vs_poc ?? 0) * 0.18);
  const regimeBias =
    regime?.regime === "defensive"
      ? 0.25
      : regime?.regime === "bullish"
        ? -0.18
        : 0.06;

  return clamp(base + rsiEffect + absorptionEffect + vpinEffect + deltaEffect + pressureEffect + pocEffect + regimeBias, 2.4, 6.8);
}

function histogramColor(value: number, previous: number) {
  if (value >= 0) return value >= previous ? "#7CFF47" : "#3A9C23";
  return value <= previous ? "#FF4D2D" : "#A82712";
}

export default function LiquidityDominanceChart({
  marketRegime,
}: {
  marketRegime: MarketRegime | null;
}) {
  const [bars, setBars] = useState<NQBar[]>([]);
  const [latestDate, setLatestDate] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const indexResponse = await fetch("/api/nq-analysis?date=index", { cache: "no-store" });
        const indexJson = await indexResponse.json();
        const summaries = Array.isArray(indexJson.data) ? indexJson.data : [];
        const date = summaries[summaries.length - 1]?.date;
        if (!date) return;

        const barsResponse = await fetch(`/api/nq-analysis?date=${date}`, { cache: "no-store" });
        const barsJson = await barsResponse.json();
        if (!cancelled) {
          setLatestDate(barsJson.date ?? date);
          setBars(Array.isArray(barsJson.bars) ? barsJson.bars : []);
        }
      } catch {
        if (!cancelled) {
          setBars([]);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartState = useMemo(() => {
    if (!bars.length) {
      return null;
    }

    const dominanceRaw = bars.map((bar) => computeDominance(bar, marketRegime));
    const dominanceLine = weightedMovingAverage(dominanceRaw, 5);
    const histogramBase = weightedMovingAverage(dominanceLine, 4);
    const histogram = dominanceLine.map((value, index) => Number((value - histogramBase[index]).toFixed(3)));
    const histogramColors = histogram.map((value, index) => histogramColor(value, histogram[index - 1] ?? 0));
    const sessionLows = bars.map((bar) => bar.low);
    const sessionHighs = bars.map((bar) => bar.high);
    const dominanceMin = Math.min(...dominanceLine);
    const dominanceMax = Math.max(...dominanceLine);

    return {
      labels: bars.map((bar) => bar.t),
      candles: bars.map((bar) => [bar.open, bar.close, bar.low, bar.high]),
      dominanceLine: dominanceLine.map((value) => Number(value.toFixed(3))),
      histogram,
      histogramColors,
      visibleStart: Math.max(0, Math.round(((bars.length - Math.min(bars.length, 96)) / bars.length) * 100)),
      priceMin: Math.min(...sessionLows),
      priceMax: Math.max(...sessionHighs),
      dominanceMin,
      dominanceMax,
      lastValue: dominanceLine[dominanceLine.length - 1] ?? 0,
      lastHistogram: histogram[histogram.length - 1] ?? 0,
      priceClose: bars[bars.length - 1]?.close ?? 0,
    };
  }, [bars, marketRegime]);

  if (!chartState) {
    return (
      <div className="chart-stage chart-stage-violet chart-host p-5">
        <div className="text-sm text-white/70">Loading liquidity dominance...</div>
      </div>
    );
  }

  return (
    <div className="chart-stage chart-stage-violet chart-host p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-white/45">Liquidity Dominance</p>
          <p className="text-sm font-semibold text-white mt-1">
            NQ microstructure pressure transformed into a risk-on or cash-defense signal
          </p>
          <p className="text-[11px] text-white/45 mt-1">
            Latest session: {latestDate || "Unavailable"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#A34DFF]">{chartState.lastValue.toFixed(2)}</p>
          <p className="text-[11px] text-white/50">
            Hist {chartState.lastHistogram >= 0 ? "+" : ""}{chartState.lastHistogram.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="chart-panel h-[320px] sm:h-[340px]">
        <ReactECharts
          option={{
            animation: false,
            backgroundColor: "transparent",
            grid: [
              { left: 56, right: 22, top: 10, height: "48%" },
              { left: 56, right: 22, top: "60%", height: "17%" },
              { left: 56, right: 22, top: "81%", height: "12%" },
            ],
            axisPointer: {
              link: [{ xAxisIndex: "all" }],
              label: { backgroundColor: "#1d1f28" },
            },
            dataZoom: [
              {
                type: "inside",
                xAxisIndex: [0, 1, 2],
                start: chartState.visibleStart,
                end: 100,
                zoomLock: false,
              },
            ],
            tooltip: {
              trigger: "axis",
              backgroundColor: "rgba(10,12,18,0.95)",
              borderColor: "rgba(163,77,255,0.35)",
              textStyle: { color: "#f7f7f7" },
            },
            xAxis: [
              {
                type: "category",
                data: chartState.labels,
                boundaryGap: true,
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
                axisLabel: { show: false },
                splitLine: { show: true, lineStyle: { color: "rgba(255,255,255,0.05)" } },
              },
              {
                type: "category",
                gridIndex: 1,
                data: chartState.labels,
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
                axisLabel: { show: false },
                splitLine: { show: true, lineStyle: { color: "rgba(255,255,255,0.04)" } },
              },
              {
                type: "category",
                gridIndex: 2,
                data: chartState.labels,
                axisLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
                axisLabel: {
                  color: "rgba(255,255,255,0.5)",
                  interval: Math.max(0, Math.floor(chartState.labels.length / 8)),
                },
                splitLine: { show: true, lineStyle: { color: "rgba(255,255,255,0.04)" } },
              },
            ],
            yAxis: [
              {
                scale: true,
                min: Number((chartState.priceMin - (chartState.priceMax - chartState.priceMin) * 0.08).toFixed(2)),
                max: Number((chartState.priceMax + (chartState.priceMax - chartState.priceMin) * 0.08).toFixed(2)),
                axisLabel: {
                  color: "rgba(255,255,255,0.55)",
                  formatter: (value: number) => `$${value.toLocaleString()}`,
                },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)" } },
              },
              {
                gridIndex: 1,
                min: Number((chartState.dominanceMin - 0.22).toFixed(2)),
                max: Number((chartState.dominanceMax + 0.22).toFixed(2)),
                axisLabel: { color: "rgba(255,255,255,0.5)", formatter: (value: number) => value.toFixed(0) },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
              },
              {
                gridIndex: 2,
                min: (value: { min: number }) => Math.min(-0.5, value.min),
                max: (value: { max: number }) => Math.max(0.5, value.max),
                axisLabel: { color: "rgba(255,255,255,0.45)", formatter: (value: number) => value.toFixed(1) },
                splitLine: { lineStyle: { color: "rgba(255,255,255,0.05)" } },
              },
            ],
            series: [
              {
                type: "candlestick",
                data: chartState.candles,
                itemStyle: {
                  color: "#5DC0BC",
                  color0: "#F06D5D",
                  borderColor: "#5DC0BC",
                  borderColor0: "#F06D5D",
                },
              },
              {
                type: "line",
                xAxisIndex: 1,
                yAxisIndex: 1,
                data: chartState.dominanceLine,
                smooth: true,
                showSymbol: false,
                lineStyle: { width: 3, color: "#8D36FF" },
                areaStyle: {
                  color: {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: "rgba(141,54,255,0.28)" },
                      { offset: 1, color: "rgba(141,54,255,0.02)" },
                    ],
                  },
                },
              },
              {
                type: "bar",
                xAxisIndex: 2,
                yAxisIndex: 2,
                data: chartState.histogram.map((value, index) => ({
                  value,
                  itemStyle: { color: chartState.histogramColors[index] },
                })),
                barWidth: "70%",
              },
            ],
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
}
