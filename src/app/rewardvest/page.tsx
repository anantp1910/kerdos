"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactECharts from 'echarts-for-react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import MarketTicker from "@/components/MarketTicker";
import { getMonthlyChart, getStore, getThisMonth } from "@/lib/rewardsStore";
import {
  logInvestment,
  getPortfolioValue,
  getPortfolioGain,
  getUninvestedBalance,
  type InvestmentAllocation,
} from "@/lib/investmentStore";
import { getMarketClock, getMarketStatusLabel } from "@/lib/marketHours";

interface StockData {
  ticker: string;
  name: string;
  price: number;
  change?: number;
  changePct: number;
}

const STOCK_TICKERS: StockData[] = [
  { ticker: "VOO",  name: "Vanguard S&P 500",  price: 498.32, change:  3.21, changePct:  0.65 },
  { ticker: "QQQ",  name: "Invesco Nasdaq 100", price: 432.18, change:  5.44, changePct:  1.27 },
  { ticker: "SPY",  name: "SPDR S&P 500",       price: 521.67, change:  2.89, changePct:  0.56 },
  { ticker: "VTI",  name: "Vanguard Total Mkt", price: 242.53, change: -0.87, changePct: -0.36 },
  { ticker: "ARKK", name: "ARK Innovation",     price: 47.83,  change:  1.22, changePct:  2.62 },
  { ticker: "BND",  name: "Vanguard Bond",      price: 73.14,  change: -0.12, changePct: -0.16 },
];

const ALLOCATION_COLORS = ["#00c805", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171"];

interface Allocation {
  ticker: string;
  percentage: number;
  rationale: string;
  description: string;
  annualReturn?: number;
}

interface MarketRegime {
  regime: "bullish" | "defensive" | "mixed";
  description: string;
  volatility: "low" | "medium" | "high";
  bloombergPrediction?: string;
  bquantScore?: number;
}

interface AIAdvice {
  allocations: Allocation[];
  summary: string;
  projectedAnnualReturn: number;
  insights: string[];
  marketRegime: MarketRegime;
  threshold: number;
}

const RETURN_RATES: Record<string, number> = {
  VOO: 8.5, QQQ: 12.0, VTI: 8.2, BND: 3.5,
  CASH: 4.5, ARKK: 15.0, GLD: 7.0, JEPI: 9.0,
};

function shadeHex(hex: string, multiplier: number) {
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  const segments = fullHex.match(/.{2}/g);
  if (!segments) return hex;

  const shaded = segments
    .map((segment) =>
      Math.max(0, Math.min(255, Math.round(parseInt(segment, 16) * multiplier)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("");

  return `#${shaded}`;
}

function formatMoneyTick(value: number) {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${Math.round(value)}`;
}

export default function RewardVestPage() {
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Rewards store
  const [chartData, setChartData] = useState<{ month: string; value: number }[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [thisMonth, setThisMonth] = useState(0);

  // Investment store
  const [portfolioGain, setPortfolioGain] = useState(0);
  const [uninvestedBalance, setUninvestedBalance] = useState(0);
  const [investmentConfirmed, setInvestmentConfirmed] = useState(false);
  const [livePortfolioValue, setLivePortfolioValue] = useState(0);

  // Market data
  const [marketData, setMarketData] = useState<StockData[]>(STOCK_TICKERS);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketClock, setMarketClock] = useState(() => getMarketClock());

  // NQ microstructure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nqBars, setNqBars] = useState<any[]>([]);
  const [nqDate, setNqDate] = useState<string>("");
  const [nqDates, setNqDates] = useState<string[]>([]);

  useEffect(() => {
    const monthly = getMonthlyChart();
    setChartData(monthly);
    setTotalEarned(getStore().totalEarned);
    const tm = getThisMonth();
    setThisMonth(tm);
    const pv = getPortfolioValue();
    const pg = getPortfolioGain();
    setPortfolioGain(pg);
    setLivePortfolioValue(pv);
    setUninvestedBalance(getUninvestedBalance(tm));
  }, []);

  useEffect(() => {
    const tick = () => setMarketClock(getMarketClock());
    tick();
    const interval = setInterval(tick, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchMarket() {
      try {
        const res = await fetch("/api/market");
        const json = await res.json();
        if (json.data && json.data.length > 0) setMarketData(json.data);
      } catch { /* fallback */ } finally {
        setMarketLoading(false);
      }
    }
    fetchMarket();
    const interval = setInterval(fetchMarket, marketClock.isOpen ? 60_000 : 15 * 60_000);
    return () => clearInterval(interval);
  }, [marketClock.isOpen]);

  useEffect(() => {
    async function fetchNQ() {
      try {
        const idxRes = await fetch("/api/nq-analysis?date=index");
        const idxJson = await idxRes.json();
        if (!idxJson.data?.length) return;
        const dates: string[] = idxJson.data.map((d: { date: string }) => d.date);
        setNqDates(dates);
        const latest = dates[dates.length - 1];
        const dayRes = await fetch(`/api/nq-analysis?date=${latest}`);
        const dayJson = await dayRes.json();
        setNqBars(dayJson.bars ?? []);
        setNqDate(dayJson.date ?? latest);
      } catch { /* skip */ }
    }
    fetchNQ();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!getMarketClock().isOpen) return;
      setMarketData((prev) =>
        prev.map((stock) => {
          const volatility = stock.ticker === "ARKK" || stock.ticker === "QQQ" ? 0.0015 : 0.0005;
          const randomMove = 1 + (Math.random() * volatility * 2 - volatility);
          const newPrice = stock.price * randomMove;
          const originalStartPrice = stock.price - (stock.change ?? 0);
          const newChange = newPrice - originalStartPrice;
          return { ...stock, price: newPrice, change: newChange, changePct: (newChange / originalStartPrice) * 100 };
        })
      );
    }, 4_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncPortfolio = () => {
      const nextValue = getPortfolioValue();
      setPortfolioGain(getPortfolioGain());
      setLivePortfolioValue(nextValue);
    };

    syncPortfolio();

    const tick = setInterval(syncPortfolio, 15_000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowPortfolio(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleDateChange = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/nq-analysis?date=${date}`);
      const json = await res.json();
      setNqBars(json.bars ?? []);
      setNqDate(json.date ?? date);
    } catch { /* ignore */ }
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setShowPortfolio(false);
    setAiError(null);
    try {
      const res = await fetch("/api/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalRewards: totalEarned,
          monthlyEarnings: [...chartData.slice(0, -1).map((d) => d.value), uninvestedBalance],
          riskTolerance: "moderate",
        }),
      });
      const json = await res.json();
      if (json.error) { setAiError(json.error); setShowPortfolio(true); return; }
      setAiAdvice(json.data);
      setShowPortfolio(true);
    } catch {
      setAiError("Failed to reach AI service. Showing default portfolio.");
      setShowPortfolio(true);
    } finally {
      setIsGenerating(false);
    }
  }, [totalEarned, chartData, uninvestedBalance]);

  const displayAllocations: Allocation[] = aiAdvice?.allocations ?? [
    { ticker: "VOO",  percentage: 60, rationale: "Broad market exposure via S&P 500", description: "Vanguard S&P 500 ETF" },
    { ticker: "QQQ",  percentage: 25, rationale: "Tech-heavy growth exposure",        description: "Invesco Nasdaq 100" },
    { ticker: "CASH", percentage: 15, rationale: "Liquidity reserve for dip buying",  description: "High-yield savings reserve" },
  ];

  const displayInsights: string[] = aiAdvice?.insights ?? [
    "VOO has outperformed 94% of actively managed funds over the past 10 years — ideal anchor for your rewards.",
    "At your current earning rate, compounding at 7% annual return builds serious wealth over 10 years.",
    "Maintaining 15% cash reserve gives flexibility to buy dips without liquidating positions.",
  ];

  const projectedReturn = aiAdvice?.projectedAnnualReturn ?? 7;
  const projectedAnnual = thisMonth * 12;
  const tenYearGrowth = Math.round(
    projectedReturn === 0
      ? thisMonth * 12 * 10
      : thisMonth * 12 * ((Math.pow(1 + projectedReturn / 100, 10) - 1) / (projectedReturn / 100))
  );
  const marketStatusLabel = getMarketStatusLabel(marketClock);
  const marketStatusColor = marketClock.isOpen ? "var(--green)" : "#fbbf24";
  const rewardTrendData = chartData.map((point, index) => ({
    ...point,
    cap: point.value * 1.05,
    shadow: point.value * 0.84,
    focus: index === chartData.length - 1 ? point.value : null,
  }));
  const projectionData = Array.from({ length: 121 }, (_, monthIndex) => {
    const monthlyRate = projectedReturn / 1200;
    const invested = Math.round(thisMonth * monthIndex);
    const portfolio = monthIndex === 0
      ? 0
      : monthlyRate === 0
      ? invested
      : Math.round(thisMonth * ((Math.pow(1 + monthlyRate, monthIndex) - 1) / monthlyRate));

    return {
      label: monthIndex % 12 === 0 ? `Y${monthIndex / 12}` : "",
      monthIndex,
      invested,
      portfolio,
      halo: portfolio * 1.02,
    };
  });

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
  };

  const innerCardStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
  };

  const labelStyle = "text-[10px] font-bold tracking-widest uppercase" as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-3">
        <span className={labelStyle} style={{ color: "var(--green)" }}>RewardVest</span>
        <h1 className="text-2xl font-bold text-white mt-0.5">AI Investment Advisor</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
          Bloomberg NQ · Real-time portfolio tracking
        </p>
      </div>
      <MarketTicker />

      <div className="px-4 pt-4 pb-6 max-w-6xl mx-auto">

        {/* ── Stats row ───────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: "This Month",          value: `$${thisMonth.toFixed(2)}`,             sub: "earned",                       color: "var(--green)" },
            { label: "Available to Invest", value: `$${uninvestedBalance.toFixed(2)}`,     sub: "uninvested",                   color: "#60a5fa"      },
            {
              label: "Portfolio Value",
              value: `$${livePortfolioValue.toFixed(2)}`,
              sub: portfolioGain >= 0 ? `+$${portfolioGain.toFixed(2)} gain` : `-$${Math.abs(portfolioGain).toFixed(2)} loss`,
              hint: marketStatusLabel,
              color: portfolioGain >= 0 ? "var(--green)" : "var(--red)",
            },
            { label: "Projected Annual",    value: `$${projectedAnnual.toLocaleString()}`, sub: "at current rate",              color: "#a78bfa"      },
            { label: "10-Year Growth",      value: `$${tenYearGrowth.toLocaleString()}`,   sub: `at ${projectedReturn}% return`, color: "#fbbf24"     },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="p-4"
              style={cardStyle}
            >
              <p className={`${labelStyle} mb-2`} style={{ color: "var(--text-2)" }}>{s.label}</p>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>{s.sub}</p>
              {"hint" in s && s.hint && (
                <p className="text-[10px] mt-2 font-semibold" style={{ color: marketStatusColor }}>
                  {s.hint}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Main grid ───────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Left col */}
          <div className="lg:col-span-2 space-y-4">

            {/* Rewards earned chart */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="p-5"
              style={cardStyle}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className={labelStyle} style={{ color: "var(--text-2)" }}>Rewards Earned</p>
                  <p className="text-sm font-semibold text-white mt-0.5">6-month trend, lifted into a live 3D surface</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "var(--green)" }}>${thisMonth.toFixed(2)}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>
                    {(() => {
                      const prev = chartData[chartData.length - 2]?.value ?? 0;
                      const curr = chartData[chartData.length - 1]?.value ?? 0;
                      if (prev === 0) return "No prior data";
                      const pct = Math.round(((curr - prev) / prev) * 100);
                      return `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last month`;
                    })()}
                  </p>
                </div>
              </div>
              <div className="chart-stage chart-stage-green">
                <motion.div
                  className="chart-sheen"
                  animate={{ x: ["-30%", "120%"] }}
                  transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="chart-tilt" style={{ height: 220 }}>
                  <ReactECharts
                    option={{
                      backgroundColor: 'transparent',
                      grid: {
                        left: '3%',
                        right: '4%',
                        bottom: '10%',
                        top: '10%',
                        containLabel: true
                      },
                      xAxis: {
                        type: 'category',
                        data: rewardTrendData.map(d => d.month),
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: {
                          color: 'var(--text-2)',
                          fontSize: 10
                        }
                      },
                      yAxis: {
                        type: 'value',
                        axisLine: { show: false },
                        axisTick: { show: false },
                        axisLabel: {
                          color: 'var(--text-2)',
                          fontSize: 10,
                          formatter: formatMoneyTick
                        },
                        splitLine: {
                          lineStyle: {
                            color: 'rgba(255,255,255,0.07)',
                            type: 'dashed'
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(7,12,10,0.92)',
                        borderColor: 'rgba(52,211,153,0.28)',
                        borderRadius: 14,
                        textStyle: {
                          color: 'white',
                          fontSize: 12
                        },
                        boxShadow: '0 18px 60px rgba(0,0,0,0.34)',
                        formatter: (params: any) => {
                          return `Rewards: $${Number(params.value).toFixed(2)}`;
                        }
                      },
                      series: [
                        {
                          name: 'Rewards',
                          type: 'line',
                          data: rewardTrendData.map(d => d.value),
                          smooth: true,
                          symbol: 'none',
                          lineStyle: {
                            color: '#5efc8d',
                            width: 3,
                            shadowColor: '#00c805',
                            shadowBlur: 10,
                            shadowOffsetY: 2
                          },
                          areaStyle: {
                            color: {
                              type: 'linear',
                              x: 0,
                              y: 0,
                              x2: 0,
                              y2: 1,
                              colorStops: [
                                { offset: 0, color: 'rgba(52,211,153,0.4)' },
                                { offset: 0.5, color: 'rgba(0,200,5,0.15)' },
                                { offset: 1, color: 'rgba(0,200,5,0.02)' }
                              ]
                            }
                          },
                          emphasis: {
                            focus: 'series',
                            lineStyle: {
                              shadowColor: '#00c805',
                              shadowBlur: 20
                            }
                          },
                          animationDuration: 2000,
                          animationEasing: 'cubicOut'
                        }
                      ]
                    }}
                    style={{ height: '100%', width: '100%' }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Live market feed */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-5"
              style={cardStyle}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className={labelStyle} style={{ color: "var(--text-2)" }}>Live Market</p>
                  <p className="text-sm font-semibold text-white mt-0.5">ETF watchlist</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: marketLoading ? "var(--text-2)" : marketStatusColor }}>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${marketClock.isOpen ? "animate-pulse" : ""}`}
                    style={{ background: marketLoading ? "var(--text-2)" : marketStatusColor }}
                  />
                  {marketLoading ? "Loading..." : marketClock.isOpen ? "Live" : "Closed"}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {marketData.map((s) => (
                  <div
                    key={s.ticker}
                    className="p-3 relative overflow-hidden"
                    style={{
                      ...innerCardStyle,
                      boxShadow: s.changePct >= 0
                        ? "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 30px rgba(0,200,5,0.08)"
                        : "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 30px rgba(255,59,48,0.08)",
                    }}
                  >
                    <div
                      className="absolute inset-x-0 bottom-0 h-16"
                      style={{
                        background: s.changePct >= 0
                          ? "linear-gradient(180deg, rgba(0,200,5,0), rgba(0,200,5,0.14))"
                          : "linear-gradient(180deg, rgba(255,59,48,0), rgba(255,59,48,0.14))",
                      }}
                    />
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white font-mono">{s.ticker}</span>
                      <span className="text-[11px] font-semibold" style={{ color: s.changePct >= 0 ? "var(--green)" : "var(--red)" }}>
                        {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-base font-bold text-white relative">${s.price.toFixed(2)}</p>
                    <p className="text-[10px] truncate mt-0.5 relative" style={{ color: "var(--text-2)" }}>{s.name}</p>
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        initial={false}
                        animate={{ width: `${Math.min(Math.max(Math.abs(s.changePct) * 16, 18), 100)}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 18 }}
                        style={{
                          background: s.changePct >= 0
                            ? "linear-gradient(90deg, #00c805, #5efc8d)"
                            : "linear-gradient(90deg, #ff3b30, #fb7185)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Generate button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-50"
              style={{ background: isGenerating ? "var(--surface-2)" : "var(--green)", color: isGenerating ? "var(--text-2)" : "#000" }}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-3">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="inline-block w-4 h-4 border-2 border-black/20 border-t-black rounded-full"
                  />
                  Analyzing Bloomberg signals...
                </span>
              ) : (
                "Generate AI Portfolio Split →"
              )}
            </motion.button>

            {aiError && (
              <div className="p-3 rounded-xl text-sm" style={{ background: "var(--red-dim)", border: "1px solid var(--red)", color: "var(--red)" }}>
                {aiError}
              </div>
            )}
          </div>

          {/* Right col */}
          <div className="space-y-4">

            {/* Portfolio card */}
            <AnimatePresence mode="wait">
              {showPortfolio ? (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="p-5"
                  style={cardStyle}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className={labelStyle} style={{ color: "var(--text-2)" }}>
                      {aiAdvice ? "AI Portfolio" : "Suggested Portfolio"}
                    </p>
                    {aiAdvice && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--green-dim)", color: "var(--green)" }}>
                        AI Generated
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white mb-5">
                    ${uninvestedBalance.toFixed(2)} available this month
                  </p>

                  {/* Donut */}
                  <div className="flex justify-center mb-5">
                    <div className="relative chart-orb-shell">
                      <PieChart width={210} height={190}>
                        <defs>
                          <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="22" stdDeviation="18" floodColor="#0b1020" floodOpacity="0.45" />
                          </filter>
                        </defs>
                        {[12, 9, 6, 3].map((offset) => (
                          <Pie
                            key={offset}
                            data={displayAllocations}
                            cx={105}
                            cy={92 + offset}
                            innerRadius={56}
                            outerRadius={88}
                            paddingAngle={2}
                            dataKey="percentage"
                            startAngle={90}
                            endAngle={-270}
                            stroke="transparent"
                            isAnimationActive={false}
                          >
                            {displayAllocations.map((_, i) => (
                              <Cell
                                key={`${offset}-${i}`}
                                fill={shadeHex(ALLOCATION_COLORS[i % ALLOCATION_COLORS.length], 0.48 + offset * 0.018)}
                              />
                            ))}
                          </Pie>
                        ))}
                        <Pie
                          data={displayAllocations}
                          cx={105}
                          cy={88}
                          innerRadius={56}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="percentage"
                          startAngle={90}
                          endAngle={-270}
                          filter="url(#donutGlow)"
                        >
                          {displayAllocations.map((_, i) => (
                            <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
                          ))}
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-xl font-bold text-white">${uninvestedBalance.toFixed(0)}</p>
                        <p className={`${labelStyle} mt-0.5`} style={{ color: "var(--text-2)" }}>to invest</p>
                      </div>
                    </div>
                  </div>

                  {/* Market regime */}
                  {aiAdvice?.marketRegime && (
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between p-3" style={innerCardStyle}>
                        <span className="text-xs font-medium text-white capitalize">
                          {aiAdvice.marketRegime.regime === "bullish" ? "📈" : aiAdvice.marketRegime.regime === "defensive" ? "🛡️" : "⚖️"} {aiAdvice.marketRegime.regime}
                        </span>
                        <span className={labelStyle} style={{ color: "var(--text-2)" }}>{aiAdvice.marketRegime.volatility} vol</span>
                      </div>

                      {aiAdvice.marketRegime.bquantScore !== undefined && (
                        <div className="p-3" style={innerCardStyle}>
                          <div className="flex items-center justify-between mb-2">
                            <p className={labelStyle} style={{ color: "var(--text-2)" }}>BQuant Score</p>
                            <p className="text-xs font-mono font-bold" style={{
                              color: aiAdvice.marketRegime.bquantScore >= 6.5 ? "var(--green)"
                                : aiAdvice.marketRegime.bquantScore <= 4 ? "var(--red)" : "#fbbf24"
                            }}>
                              {aiAdvice.marketRegime.bquantScore.toFixed(1)} / 10
                            </p>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${aiAdvice.marketRegime.bquantScore * 10}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{
                                background: aiAdvice.marketRegime.bquantScore >= 6.5
                                  ? "linear-gradient(90deg, var(--green), #22d3ee)"
                                  : aiAdvice.marketRegime.bquantScore <= 4
                                  ? "linear-gradient(90deg, var(--red), #fb923c)"
                                  : "linear-gradient(90deg, #fbbf24, #a78bfa)",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {aiAdvice.marketRegime.bloombergPrediction && (
                        <div className="p-3 relative overflow-hidden" style={{ background: "#0a0a0a", border: "1px solid #f97316aa", borderRadius: 10 }}>
                          <div className="absolute top-0 left-0 w-0.5 h-full" style={{ background: "#f97316" }} />
                          <div className="flex items-center justify-between mb-1.5 pl-2">
                            <p className="text-[10px] font-mono font-bold" style={{ color: "#f97316" }}>⚡ BLOOMBERG BQUANT™</p>
                            <p className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>Score: {aiAdvice.marketRegime.bquantScore}</p>
                          </div>
                          <p className="text-[11px] font-mono leading-relaxed pl-2" style={{ color: "#fed7aa" }}>
                            {aiAdvice.marketRegime.bloombergPrediction}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Allocation breakdown */}
                  <div className="space-y-3">
                    {(() => {
                      const maxRate = Math.max(...displayAllocations.map((p) => p.annualReturn ?? RETURN_RATES[p.ticker] ?? 5));
                      return displayAllocations.map((p, i) => {
                        const dollarAmount = ((p.percentage / 100) * uninvestedBalance).toFixed(0);
                        const rate = p.annualReturn ?? RETURN_RATES[p.ticker] ?? 5;
                        return (
                          <div key={p.ticker} className="flex items-start gap-3">
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-1" style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <span className="text-sm font-bold text-white">{p.ticker}</span>
                                <span className="text-sm font-bold text-white">${dollarAmount}</span>
                              </div>
                              <div className="flex justify-between items-center mt-0.5 mb-1.5">
                                <span className="text-[10px] truncate" style={{ color: "var(--text-2)" }}>{p.description}</span>
                                <span className="text-[10px] font-semibold ml-2 shrink-0" style={{ color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}>
                                  {p.percentage}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(rate / maxRate) * 100}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.08 }}
                                    className="h-full rounded-full"
                                    style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                                  />
                                </div>
                                <span className="text-[9px] shrink-0" style={{ color: "var(--text-3)" }}>{rate}%/yr</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* ✓ I Invested This */}
                  {aiAdvice && uninvestedBalance > 0 && (
                    <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
                      {investmentConfirmed ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                          style={{ background: "var(--green-dim)", border: "1px solid var(--green)", color: "var(--green)" }}
                        >
                          ✓ Investment logged — portfolio updated
                        </motion.div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const invAllocations: InvestmentAllocation[] = aiAdvice.allocations.map((a) => ({
                              ticker: a.ticker,
                              pct: a.percentage,
                              annualReturn: a.annualReturn ?? RETURN_RATES[a.ticker] ?? 5,
                            }));
                            const blended = invAllocations.reduce((s, a) => s + (a.pct / 100) * a.annualReturn, 0);
                            logInvestment(uninvestedBalance, invAllocations, blended);
                            const newPV = getPortfolioValue();
                            setPortfolioGain(getPortfolioGain());
                            setLivePortfolioValue(newPV);
                            setUninvestedBalance(0);
                            setInvestmentConfirmed(true);
                          }}
                          className="w-full py-3 rounded-xl text-sm font-bold transition-all"
                          style={{ background: "var(--green-dim)", border: "1px solid var(--green)", color: "var(--green)" }}
                        >
                          ✓ I Invested This — ${uninvestedBalance.toFixed(2)}
                        </motion.button>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="flex items-center justify-center"
                  style={{ ...cardStyle, height: 200 }}
                >
                  <p className="text-sm" style={{ color: "var(--text-2)" }}>
                    {isGenerating ? "Analyzing..." : "Generate a portfolio ↑"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI insight */}
            <AnimatePresence mode="wait">
              {showPortfolio && (
                <motion.div
                  key="insight"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5"
                  style={cardStyle}
                >
                  <p className={`${labelStyle} mb-3`} style={{ color: "var(--green)" }}>AI Insight</p>
                  {aiAdvice?.summary && (
                    <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-2)" }}>
                      {aiAdvice.summary}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                    {displayInsights[0]}
                  </p>
                  {aiAdvice?.threshold && thisMonth < aiAdvice.threshold && (
                    <p className="text-xs mt-3 pt-3" style={{ color: "var(--text-3)", borderTop: "1px solid var(--border)" }}>
                      💡 Reach ${aiAdvice.threshold} to unlock the full recommended allocation.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Earnings by card */}
            <div className="p-5" style={cardStyle}>
              <p className={`${labelStyle} mb-4`} style={{ color: "var(--text-2)" }}>Earnings by Card</p>
              <div className="space-y-3">
                {(() => {
                  const history = getStore().history;
                  const byCard: Record<string, { name: string; total: number }> = {};
                  for (const e of history) {
                    if (!byCard[e.cardId]) byCard[e.cardId] = { name: e.cardName, total: 0 };
                    byCard[e.cardId].total = Math.round((byCard[e.cardId].total + e.amount) * 100) / 100;
                  }
                  const entries = Object.entries(byCard);
                  if (entries.length === 0) {
                    return <p className="text-xs" style={{ color: "var(--text-3)" }}>No logged rewards yet — use SmartSwipe and tap &quot;Log to RewardVest&quot;.</p>;
                  }
                  return entries.sort((a, b) => b[1].total - a[1].total).map(([id, { name, total }], i) => (
                    <div key={id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                        <span className="text-xs truncate" style={{ color: "var(--text-2)" }}>{name}</span>
                      </div>
                      <span className="text-xs font-bold text-white">${total.toFixed(2)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bloomberg Microstructure ─────────────── */}
        {nqBars.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`${labelStyle} mb-1`} style={{ color: "#f97316" }}>⚡ Bloomberg Microstructure</p>
                <h2 className="text-lg font-bold text-white">NQ Futures — Order Flow</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>1-min bars · {nqBars.length} bars · RTH session</p>
              </div>
              <select
                value={nqDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs rounded-lg px-3 py-2 focus:outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "white" }}
              >
                {nqDates.slice().reverse().map((d) => (
                  <option key={d} value={d} style={{ background: "var(--surface)" }}>{d}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {/* 1. Price + VWAP */}
              <div className="p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className={labelStyle} style={{ color: "var(--text-2)" }}>Price vs VWAP</p>
                    <p className="text-sm font-semibold text-white mt-0.5">Close · VWAP · ±1σ / ±2σ bands</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px]" style={{ color: "var(--text-2)" }}>
                    <span className="flex items-center gap-1"><span className="w-3 h-px bg-white inline-block" /> Price</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-px bg-blue-400 inline-block" /> VWAP</span>
                  </div>
                </div>
                <div className="chart-stage chart-stage-blue">
                  <div className="chart-tilt" style={{ height: 220 }}>
                    <ReactECharts
                      option={{
                        backgroundColor: 'transparent',
                        grid: {
                          left: '3%',
                          right: '4%',
                          bottom: '8%',
                          top: '10%',
                          containLabel: true
                        },
                        xAxis: {
                          type: 'category',
                          data: nqBars.map(d => d.t),
                          axisLine: { show: false },
                          axisTick: { show: false },
                          axisLabel: {
                            color: 'var(--text-2)',
                            fontSize: 9,
                            interval: 29
                          }
                        },
                        yAxis: {
                          type: 'value',
                          axisLine: { show: false },
                          axisTick: { show: false },
                          axisLabel: {
                            color: 'var(--text-2)',
                            fontSize: 9
                          },
                          splitLine: {
                            lineStyle: {
                              color: 'rgba(255,255,255,0.06)',
                              type: 'dashed'
                            }
                          }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(7,12,18,0.92)',
                          borderColor: 'rgba(96,165,250,0.3)',
                          borderRadius: 14,
                          textStyle: {
                            color: 'white',
                            fontSize: 11
                          },
                          boxShadow: '0 18px 60px rgba(0,0,0,0.34)'
                        },
                        series: [
                          {
                            name: 'VWAP Upper 2σ',
                            type: 'line',
                            data: nqBars.map(d => d.vwap_upper2),
                            smooth: true,
                            symbol: 'none',
                            lineStyle: {
                              opacity: 0.3,
                              color: 'rgba(96,165,250,0.2)',
                              width: 0
                            },
                            areaStyle: {
                              color: 'rgba(96,165,250,0.08)'
                            },
                            animationDuration: 1500,
                            animationDelay: 0
                          },
                          {
                            name: 'VWAP Lower 2σ',
                            type: 'line',
                            data: nqBars.map(d => d.vwap_lower2),
                            smooth: true,
                            symbol: 'none',
                            lineStyle: {
                              opacity: 0.3,
                              color: 'rgba(96,165,250,0.2)',
                              width: 0
                            },
                            areaStyle: {
                              color: 'rgba(96,165,250,0.05)'
                            },
                            animationDuration: 1500,
                            animationDelay: 100
                          },
                          {
                            name: 'VWAP Upper 1σ',
                            type: 'line',
                            data: nqBars.map(d => d.vwap_upper1),
                            smooth: true,
                            symbol: 'none',
                            lineStyle: {
                              opacity: 0.5,
                              color: 'rgba(96,165,250,0.3)',
                              width: 0
                            },
                            areaStyle: {
                              color: 'rgba(96,165,250,0.14)'
                            },
                            animationDuration: 1500,
                            animationDelay: 200
                          },
                          {
                            name: 'VWAP Lower 1σ',
                            type: 'line',
                            data: nqBars.map(d => d.vwap_lower1),
                            smooth: true,
                            symbol: 'none',
                            lineStyle: {
                              opacity: 0.5,
                              color: 'rgba(96,165,250,0.3)',
                              width: 0
                            },
                            areaStyle: {
                              color: 'rgba(96,165,250,0.12)'
                            },
                            animationDuration: 1500,
                            animationDelay: 300
                          },
                          {
                            name: 'VWAP',
                            type: 'line',
                            data: nqBars.map(d => d.vwap),
                            smooth: true,
                            symbol: 'none',
                            lineStyle: {
                              color: '#60a5fa',
                              width: 1.8,
                              type: 'dashed',
                              dashOffset: 4
                            },
                            animationDuration: 2000,
                            animationDelay: 400
                          },
                          {
                            name: 'Price',
                            type: 'line',
                            data: nqBars.map(d => d.close),
                            smooth: true,
                            symbol: 'none',
                            lineStyle: {
                              color: '#ffffff',
                              width: 1.8,
                              shadowColor: '#ffffff',
                              shadowBlur: 8
                            },
                            animationDuration: 2000,
                            animationDelay: 500,
                            emphasis: {
                              lineStyle: {
                                shadowBlur: 15
                              }
                            }
                          }
                        ],
                        animationEasing: 'cubicOut'
                      }}
                      style={{ height: '100%', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* 2. Volume Z-Score */}
                <div className="p-5" style={cardStyle}>
                  <p className={`${labelStyle} mb-1`} style={{ color: "var(--text-2)" }}>Volume Z-Score</p>
                  <p className="text-sm font-semibold text-white mb-4">Institutional activity spikes</p>
                  <div className="chart-stage chart-stage-cyan">
                    <div className="chart-tilt" style={{ height: 180 }}>
                      <ReactECharts
                        option={{
                          backgroundColor: 'transparent',
                          grid: {
                            left: '3%',
                            right: '4%',
                            bottom: '8%',
                            top: '10%',
                            containLabel: true
                          },
                          xAxis: {
                            type: 'category',
                            data: nqBars.map(d => d.t),
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: {
                              color: 'var(--text-2)',
                              fontSize: 9,
                              interval: 29
                            }
                          },
                          yAxis: {
                            type: 'value',
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: {
                              color: 'var(--text-2)',
                              fontSize: 9
                            },
                            splitLine: {
                              lineStyle: {
                                color: 'rgba(255,255,255,0.05)',
                                type: 'dashed'
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(6,14,17,0.92)',
                            borderColor: 'rgba(34,211,238,0.28)',
                            borderRadius: 14,
                            textStyle: {
                              color: 'white',
                              fontSize: 11
                            }
                          },
                          series: [
                            {
                              name: 'Volume Z-Score',
                              type: 'bar',
                              data: nqBars.map(d => d.vol_zscore),
                              itemStyle: {
                                color: '#22d3ee',
                                opacity: 0.85,
                                borderRadius: [6, 6, 0, 0]
                              },
                              animationDelay: (idx: number) => idx * 50,
                              animationDuration: 1000,
                              emphasis: {
                                itemStyle: {
                                  shadowColor: '#22d3ee',
                                  shadowBlur: 10,
                                  opacity: 1
                                }
                              }
                            }
                          ],
                          animationEasing: 'elasticOut'
                        }}
                        style={{ height: '100%', width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Price vs EMA 9/20 */}
                <div className="p-5" style={cardStyle}>
                  <p className={`${labelStyle} mb-1`} style={{ color: "var(--text-2)" }}>Price vs EMA 9 / 20</p>
                  <p className="text-sm font-semibold text-white mb-4">Trend crossover signals</p>
                  <div className="chart-stage chart-stage-gold">
                    <div className="chart-tilt" style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={nqBars} margin={{ top: 14, right: 12, bottom: 8, left: 36 }}>
                          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 8" />
                          <XAxis dataKey="t" tick={{ fill: "var(--text-2)", fontSize: 9 }} axisLine={false} tickLine={false} interval={29} />
                          <YAxis tick={{ fill: "var(--text-2)", fontSize: 9 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                          <Tooltip contentStyle={{ background: "rgba(18,12,4,0.92)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 14, fontSize: 11 }} labelStyle={{ color: "white" }} />
                          <Line type="monotone" dataKey="ema_20" stroke="#60a5fa" strokeWidth={1.6} dot={false} strokeDasharray="4 2" />
                          <Line type="monotone" dataKey="ema_9" stroke="#fbbf24" strokeWidth={1.8} dot={false} />
                          <Line type="monotone" dataKey="close" stroke="#ffffff" strokeWidth={1.8} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[10px]" style={{ color: "var(--text-2)" }}>
                    <span className="flex items-center gap-1"><span className="w-3 h-px bg-white inline-block" /> Close</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-px bg-yellow-400 inline-block" /> EMA 9</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-px bg-blue-400 inline-block" /> EMA 20</span>
                  </div>
                </div>

                {/* 4. RSI */}
                <div className="p-5" style={cardStyle}>
                  <p className={`${labelStyle} mb-1`} style={{ color: "var(--text-2)" }}>RSI (14)</p>
                  <p className="text-sm font-semibold text-white mb-4">Overbought &gt;70 · Oversold &lt;30</p>
                  <div className="chart-stage chart-stage-violet">
                    <div className="chart-tilt" style={{ height: 180 }}>
                      <ReactECharts
                        option={{
                          backgroundColor: 'transparent',
                          grid: {
                            left: '3%',
                            right: '4%',
                            bottom: '8%',
                            top: '10%',
                            containLabel: true
                          },
                          xAxis: {
                            type: 'category',
                            data: nqBars.map(d => d.t),
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: {
                              color: 'var(--text-2)',
                              fontSize: 9,
                              interval: 29
                            }
                          },
                          yAxis: {
                            type: 'value',
                            domain: [0, 100],
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: {
                              color: 'var(--text-2)',
                              fontSize: 9
                            },
                            splitLine: {
                              lineStyle: {
                                color: 'rgba(255,255,255,0.05)',
                                type: 'dashed'
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(15,9,24,0.92)',
                            borderColor: 'rgba(167,139,250,0.3)',
                            borderRadius: 14,
                            textStyle: {
                              color: 'white',
                              fontSize: 11
                            },
                            formatter: (params: any) => {
                              const value = params.value;
                              let status = 'Neutral';
                              if (value > 70) status = 'Overbought';
                              else if (value < 30) status = 'Oversold';
                              return `RSI: ${value.toFixed(2)}<br/>Status: ${status}`;
                            }
                          },
                          visualMap: {
                            show: false,
                            dimension: 1,
                            pieces: [
                              { min: 0, max: 30, color: 'rgba(0,200,5,0.3)' },
                              { min: 30, max: 70, color: 'rgba(167,139,250,0.16)' },
                              { min: 70, max: 100, color: 'rgba(248,113,113,0.3)' }
                            ]
                          },
                          series: [
                            {
                              name: 'RSI (14)',
                              type: 'line',
                              data: nqBars.map(d => d.rsi_14),
                              smooth: true,
                              symbol: 'none',
                              lineStyle: {
                                color: '#a78bfa',
                                width: 1.8,
                                shadowColor: '#a78bfa',
                                shadowBlur: 6
                              },
                              areaStyle: {
                                color: {
                                  type: 'linear',
                                  x: 0,
                                  y: 0,
                                  x2: 0,
                                  y2: 1,
                                  colorStops: [
                                    { offset: 0, color: 'rgba(167,139,250,0.4)' },
                                    { offset: 1, color: 'rgba(167,139,250,0.05)' }
                                  ]
                                }
                              },
                              animationDuration: 2000,
                              animationEasing: 'cubicOut',
                              emphasis: {
                                lineStyle: {
                                  shadowBlur: 12
                                }
                              }
                            }
                          ],
                          markLine: {
                            silent: true,
                            data: [
                              {
                                yAxis: 70,
                                lineStyle: { color: '#f8717188', type: 'dashed' },
                                label: {
                                  show: true,
                                  position: 'end',
                                  formatter: '70',
                                  color: '#f8717199',
                                  fontSize: 9
                                }
                              },
                              {
                                yAxis: 30,
                                lineStyle: { color: '#00c80588', type: 'dashed' },
                                label: {
                                  show: true,
                                  position: 'end',
                                  formatter: '30',
                                  color: '#00c80599',
                                  fontSize: 9
                                }
                              },
                              {
                                yAxis: 50,
                                lineStyle: { color: 'rgba(255,255,255,0.12)' },
                                label: { show: false }
                              }
                            ]
                          }
                        }}
                        style={{ height: '100%', width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Absorption */}
                <div className="p-5" style={cardStyle}>
                  <p className={`${labelStyle} mb-1`} style={{ color: "var(--text-2)" }}>Absorption Signal</p>
                  <p className="text-sm font-semibold text-white mb-4">+1 bullish · −1 bearish absorption</p>
                  <div className="chart-stage chart-stage-orange">
                    <div className="chart-tilt" style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={nqBars} margin={{ top: 14, right: 12, bottom: 8, left: 28 }}>
                          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 8" />
                          <XAxis dataKey="t" tick={{ fill: "var(--text-2)", fontSize: 9 }} axisLine={false} tickLine={false} interval={29} />
                          <YAxis tick={{ fill: "var(--text-2)", fontSize: 9 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "rgba(24,12,5,0.92)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 14, fontSize: 11 }} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                          <ReferenceLine y={0.3} stroke="#00c80533" strokeDasharray="3 3" />
                          <ReferenceLine y={-0.3} stroke="#ff3b3033" strokeDasharray="3 3" />
                          <Bar dataKey="absorption" fill="#fbbf24" opacity={0.8} radius={[6, 6, 0, 0]} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 10-Year Projection ───────────────────── */}
        <AnimatePresence>
          {showPortfolio && thisMonth > 0 && (
            <motion.div
              key="projection"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 p-5"
              style={cardStyle}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className={`${labelStyle} mb-1`} style={{ color: "var(--text-2)" }}>10-Year Growth Projection</p>
                  <p className="text-sm font-semibold text-white">
                    ${thisMonth.toFixed(0)}/mo DCA · {projectedReturn}% annual return
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color: "#a78bfa" }}>${tenYearGrowth.toLocaleString()}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>at year 10</p>
                </div>
              </div>
              <div className="chart-stage chart-stage-violet">
                <motion.div
                  className="chart-sheen"
                  animate={{ x: ["-25%", "110%"] }}
                  transition={{ duration: 6.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="chart-tilt" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={projectionData}
                      margin={{ top: 18, right: 16, bottom: 10, left: 30 }}
                    >
                      <defs>
                        <linearGradient id="portfolioHalo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(192,132,252,0.34)" />
                          <stop offset="100%" stopColor="rgba(192,132,252,0)" />
                        </linearGradient>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c084fc" stopOpacity={0.9} />
                          <stop offset="55%" stopColor="#a78bfa" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 8" />
                      <XAxis dataKey="label" tick={{ fill: "var(--text-2)", fontSize: 10 }} axisLine={false} tickLine={false} interval={11} />
                      <YAxis tick={{ fill: "var(--text-2)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatMoneyTick} />
                      <Tooltip
                        contentStyle={{ background: "rgba(15,9,24,0.92)", border: "1px solid rgba(167,139,250,0.32)", borderRadius: 14, fontSize: 11, boxShadow: "0 18px 60px rgba(0,0,0,0.34)" }}
                        labelFormatter={(label, payload) => {
                          const monthIndex = payload?.[0]?.payload?.monthIndex ?? 0;
                          return `Month ${monthIndex}`;
                        }}
                        formatter={(v, name) => [`$${Number(v).toLocaleString()}`, name === "portfolio" ? "Portfolio Value" : "Total Invested"]}
                      />
                      <Area type="monotone" dataKey="halo" stroke="transparent" fill="url(#portfolioHalo)" isAnimationActive />
                      <Area type="monotone" dataKey="invested" stroke="#60a5fa" strokeWidth={1.3} strokeDasharray="4 2" fill="url(#investedGrad)" dot={false} isAnimationActive />
                      <Area type="monotone" dataKey="portfolio" stroke="#c084fc" strokeWidth={2.4} fill="url(#portfolioGrad)" dot={false} activeDot={{ r: 5, fill: "#ffffff", stroke: "#c084fc", strokeWidth: 2 }} isAnimationActive />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex items-center gap-5 mt-2 text-[10px]" style={{ color: "var(--text-2)" }}>
                <span className="flex items-center gap-1.5"><span className="w-4 h-px bg-purple-400 inline-block" /> Portfolio value</span>
                <span className="flex items-center gap-1.5"><span className="w-4 h-px bg-blue-400 inline-block" /> Total invested</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
