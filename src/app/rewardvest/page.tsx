"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  ReferenceLine,
} from "recharts";
import MarketTicker from "@/components/MarketTicker";
import { USER_CARDS } from "@/lib/userCards";

interface StockData {
  ticker: string;
  name: string;
  price: number;
  change?: number;
  changePct: number;
}

const STOCK_TICKERS: StockData[] = [
  { ticker: 'VOO',  name: 'Vanguard S&P 500',   price: 498.32, change:  3.21, changePct:  0.65 },
  { ticker: 'QQQ',  name: 'Invesco Nasdaq 100',  price: 432.18, change:  5.44, changePct:  1.27 },
  { ticker: 'SPY',  name: 'SPDR S&P 500',        price: 521.67, change:  2.89, changePct:  0.56 },
  { ticker: 'VTI',  name: 'Vanguard Total Mkt',  price: 242.53, change: -0.87, changePct: -0.36 },
  { ticker: 'ARKK', name: 'ARK Innovation',      price: 47.83,  change:  1.22, changePct:  2.62 },
  { ticker: 'BND',  name: 'Vanguard Bond',       price: 73.14,  change: -0.12, changePct: -0.16 },
];

const ALLOCATION_COLORS = ["#4ade80", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171"];

const CHART_DATA = [
  { month: "Nov", value: 210 },
  { month: "Dec", value: 248 },
  { month: "Jan", value: 275 },
  { month: "Feb", value: 292 },
  { month: "Mar", value: 318 },
  { month: "Apr", value: 80 },
];

const MONTHLY_EARNINGS = CHART_DATA.map((d) => d.value);

interface Allocation {
  ticker: string;
  percentage: number;
  rationale: string;
  description: string;
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

const COLOR_MAP: Record<string, string> = {
  amex: '#60a5fa', chase: '#a78bfa', citi: '#22d3ee', discover: '#fb923c', capital: '#4ade80',
};

export default function RewardVestPage() {
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [apiCards, setApiCards] = useState<{ id: string; cardName: string }[]>([]);

  // Market data state
  const [marketData, setMarketData] = useState<StockData[]>(STOCK_TICKERS);
  const [marketLoading, setMarketLoading] = useState(true);

  // NQ microstructure analysis state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nqBars, setNqBars] = useState<any[]>([]);
  const [nqDate, setNqDate] = useState<string>("");
  const [nqDates, setNqDates] = useState<string[]>([]);

  const totalEarned = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);
  const thisMonth = CHART_DATA[CHART_DATA.length - 1].value;

  // Fetch live market data on mount
  useEffect(() => {
    async function fetchMarket() {
      try {
        const res = await fetch("/api/market");
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setMarketData(json.data);
        }
      } catch {
        // Silently fall back to mock data
      } finally {
        setMarketLoading(false);
      }
    }
    fetchMarket();
  }, []);

  // Fetch live card data from Plaid/rewards API
  useEffect(() => {
    fetch("/api/rewards")
      .then(r => r.json())
      .then(setApiCards)
      .catch(() => {});
  }, []);

  // Fetch NQ microstructure data
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
      } catch {
        // silently skip
      }
    }
    fetchNQ();
  }, []);

  // Simulate live market ticks for the dashboard UI
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData((prev) => 
        prev.map((stock) => {
          // Add small random noise to simulate a live Bloomberg feed
          const volatility = stock.ticker === 'ARKK' || stock.ticker === 'QQQ' ? 0.0015 : 0.0005;
          const randomMove = 1 + (Math.random() * volatility * 2 - volatility);
          const newPrice = stock.price * randomMove;
          const originalStartPrice = stock.price - stock.change;
          const newChange = newPrice - originalStartPrice;
          const newChangePct = (newChange / originalStartPrice) * 100;
          
          return {
            ...stock,
            price: newPrice,
            change: newChange,
            changePct: newChangePct
          };
        })
      );
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Auto-show default portfolio on mount (mock until AI generates)
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
          monthlyEarnings: MONTHLY_EARNINGS,
          riskTolerance: "moderate",
        }),
      });

      const json = await res.json();

      if (json.error) {
        setAiError(json.error);
        setShowPortfolio(true);
        return;
      }

      setAiAdvice(json.data);
      setShowPortfolio(true);
    } catch {
      setAiError("Failed to reach AI service. Showing default portfolio.");
      setShowPortfolio(true);
    } finally {
      setIsGenerating(false);
    }
  }, [totalEarned]);

  // Derive display data — use AI response if available, else defaults
  const displayAllocations: Allocation[] = aiAdvice?.allocations ?? [
    { ticker: "VOO", percentage: 60, rationale: "Broad market exposure via S&P 500", description: "Vanguard S&P 500 ETF" },
    { ticker: "QQQ", percentage: 25, rationale: "Tech-heavy growth exposure", description: "Invesco Nasdaq 100" },
    { ticker: "CASH", percentage: 15, rationale: "Liquidity reserve for dip buying", description: "High-yield savings reserve" },
  ];

  const displayInsights: string[] = aiAdvice?.insights ?? [
    "VOO has outperformed 94% of actively managed funds over the past 10 years — ideal anchor for your rewards.",
    "At your current earning rate of $340/mo, compounding at 7% annual return = $48,200 in 10 years.",
    "Maintaining 15% cash reserve gives flexibility to buy dips without liquidating positions.",
  ];

  const projectedReturn = aiAdvice?.projectedAnnualReturn ?? 7;
  const projectedAnnual = thisMonth * 12;
  const tenYearGrowth = Math.round(
    thisMonth * 12 * ((Math.pow(1 + projectedReturn / 100, 10) - 1) / (projectedReturn / 100))
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <span className="text-[10px] font-bold tracking-widest" style={{ color: "#5ac8fa" }}>INVEST</span>
        <h1 className="text-2xl font-bold text-white mt-1">AI Investment Advisor</h1>
      </div>
      <MarketTicker data={marketData} />

      <div className="pt-4 pb-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/20 text-blue-400 text-xs font-medium mb-4">
              📈 RewardVest
            </div>
            <h1 className="text-4xl font-bold text-white">
              AI Investment Advisor
            </h1>
            <p className="text-white/40 mt-2 text-lg">
              Your rewards aren&apos;t just points — they&apos;re investable capital.
            </p>
          </motion.div>

          {/* Top stats bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "This Month", value: `$${thisMonth}`, sub: "earned in rewards", color: "text-green-400" },
              { label: "Total Earned", value: `$${totalEarned.toLocaleString()}`, sub: "all time", color: "text-blue-400" },
              { label: "Projected Annual", value: `$${projectedAnnual.toLocaleString()}`, sub: "at current rate", color: "text-purple-400" },
              { label: "10-Year Growth", value: `$${tenYearGrowth.toLocaleString()}`, sub: `at ${projectedReturn}% return`, color: "text-yellow-400" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/8"
              >
                <p className="text-xs text-white/40 mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-white/30 mt-0.5">{s.sub}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left col — Chart + Market + Generate */}
            <div className="lg:col-span-2 space-y-6">
              {/* Earnings chart */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/8"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-white">Rewards Earned</h3>
                    <p className="text-xs text-white/40">6-month trend</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">${thisMonth}</p>
                    <p className="text-xs text-green-400">
                      ↑ {Math.round(((CHART_DATA[CHART_DATA.length - 1].value - CHART_DATA[CHART_DATA.length - 2].value) / CHART_DATA[CHART_DATA.length - 2].value) * 100)}% vs last month
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={CHART_DATA}>
                    <defs>
                      <linearGradient id="rewardGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        color: "white",
                        fontSize: "12px",
                      }}
                      formatter={(v) => [`$${v}`, "Rewards"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#4ade80"
                      strokeWidth={2}
                      fill="url(#rewardGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Live market feed */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/8"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Live Market</h3>
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {marketLoading ? "Loading..." : "Market Open"}
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {marketData.map((s, i) => (
                    <motion.div
                      key={s.ticker}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * i }}
                      className="p-3 rounded-xl bg-white/5 border border-white/8 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{s.ticker}</span>
                        <span
                          className="text-xs font-medium"
                          style={{ color: s.changePct >= 0 ? "#4ade80" : "#f87171" }}
                        >
                          {s.changePct >= 0 ? "▲" : "▼"}{" "}
                          {Math.abs(s.changePct).toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-lg font-bold text-white">${s.price.toFixed(2)}</p>
                      <p className="text-[10px] text-white/30 truncate">{s.name}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* AI Generate button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 text-white font-bold text-lg transition-all duration-200"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-3">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    AI Analyzing Market Signals...
                  </span>
                ) : (
                  "🤖 Generate AI Investment Split →"
                )}
              </motion.button>

              {/* AI Error message */}
              {aiError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {aiError}
                </motion.div>
              )}
            </div>

            {/* Right col — Portfolio + Insights + Card Breakdown */}
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {showPortfolio ? (
                  <motion.div
                    key="portfolio"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 rounded-2xl bg-gradient-to-b from-blue-500/10 to-purple-500/5 border border-blue-400/20"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-white">
                        {aiAdvice ? "AI Portfolio" : "Suggested Portfolio"}
                      </h3>
                      {aiAdvice && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
                          AI Generated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mb-6">
                      For your ${thisMonth} in rewards this month
                    </p>

                    {/* Donut */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <PieChart width={180} height={180}>
                          <Pie
                            data={displayAllocations}
                            cx={90}
                            cy={90}
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="percentage"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {displayAllocations.map((_, i) => (
                              <Cell
                                key={i}
                                fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]}
                                stroke="transparent"
                              />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-xl font-bold text-white">${thisMonth}</p>
                          <p className="text-[10px] text-white/40">to invest</p>
                        </div>
                      </div>
                    </div>

                    {/* Market regime badge */}
                    {aiAdvice?.marketRegime && (
                      <div className="mb-4 space-y-3">
                        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                          <p className="text-[10px] text-white/40 mb-1">Market Conditions</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white capitalize">
                              {aiAdvice.marketRegime.regime === "bullish" ? "📈" : aiAdvice.marketRegime.regime === "defensive" ? "🛡️" : "⚖️"} {aiAdvice.marketRegime.regime}
                            </span>
                            <span className="text-[10px] text-white/40">
                              {aiAdvice.marketRegime.volatility} volatility
                            </span>
                          </div>
                        </div>

                        {aiAdvice.marketRegime.bloombergPrediction && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg bg-black border border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.1)] relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-mono text-orange-400">⚡ BLOOMBERG BQUANT™</p>
                              <p className="text-[10px] font-mono text-orange-400/60">Score: {aiAdvice.marketRegime.bquantScore}</p>
                            </div>
                            <p className="text-xs font-mono text-orange-100 leading-relaxed">
                              {aiAdvice.marketRegime.bloombergPrediction}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* Breakdown */}
                    <div className="space-y-3">
                      {displayAllocations.map((p, i) => {
                        const dollarAmount = ((p.percentage / 100) * thisMonth).toFixed(0);
                        return (
                          <div key={p.ticker} className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-sm flex-shrink-0"
                              style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-white">
                                  {p.ticker}
                                </span>
                                <span className="text-sm font-bold text-white">
                                  ${dollarAmount}
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[10px] text-white/40 truncate">
                                  {p.description}
                                </span>
                                <span
                                  className="text-[10px] font-medium"
                                  style={{ color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                                >
                                  {p.percentage}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className="h-64 rounded-2xl border border-dashed border-white/10 flex items-center justify-center"
                  >
                    <p className="text-white/30 text-sm">
                      {isGenerating ? "Analyzing..." : "Generate a portfolio split ↑"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Insight / Summary */}
              <AnimatePresence mode="wait">
                {showPortfolio && (
                  <motion.div
                    key="insight"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20"
                  >
                    <p className="text-xs text-blue-400 font-medium mb-2">
                      🤖 AI Insight
                    </p>
                    {aiAdvice?.summary ? (
                      <p className="text-sm text-white/60 leading-relaxed mb-3">
                        {aiAdvice.summary}
                      </p>
                    ) : null}
                    <p className="text-sm text-white/60 leading-relaxed">
                      {displayInsights[0]}
                    </p>
                    {aiAdvice?.threshold && thisMonth < aiAdvice.threshold && (
                      <p className="text-xs text-white/40 mt-3 pt-3 border-t border-blue-500/20">
                        💡 Tip: Reach ${aiAdvice.threshold} to unlock the full recommended allocation.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Per-card breakdown */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
                  Earnings by Card
                </h3>
                <div className="space-y-3">
                  {apiCards.map((card) => {
                    const uc = USER_CARDS[card.id];
                    return (
                      <div key={card.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLOR_MAP[uc?.color ?? ''] ?? '#fff' }} />
                          <span className="text-xs text-white/60 truncate">{card.cardName}</span>
                        </div>
                        <span className="text-xs font-semibold text-white">${(uc?.totalEarned ?? 0).toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bloomberg Microstructure Analysis ─────────────────── */}
        {nqBars.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            {/* Header + date picker */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-400/10 border border-orange-400/20 text-orange-400 text-xs font-mono font-medium mb-2">
                  ⚡ BLOOMBERG MICROSTRUCTURE
                </div>
                <h2 className="text-2xl font-bold text-white">NQ Futures — Order Flow Analysis</h2>
                <p className="text-xs text-white/40 mt-1">1-min bars · {nqBars.length} bars · RTH session</p>
              </div>
              <select
                value={nqDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-orange-400/50"
              >
                {nqDates.slice().reverse().map(d => (
                  <option key={d} value={d} className="bg-[#0f0f0f]">{d}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-6">

              {/* 1. Price + VWAP + Bands */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-sm">Price vs VWAP</h3>
                    <p className="text-[10px] text-white/40">Close · VWAP · ±1σ / ±2σ bands</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-white inline-block" />Price</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block" />VWAP</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400/20 inline-block rounded" />±1σ</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-400/10 inline-block rounded" />±2σ</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={nqBars} margin={{ top: 5, right: 5, bottom: 5, left: 50 }}>
                    <XAxis dataKey="t" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={29} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#fff" }} />
                    <Area dataKey="vwap_upper2" fill="rgba(96,165,250,0.07)" stroke="none" />
                    <Area dataKey="vwap_lower2" fill="rgba(96,165,250,0.07)" stroke="none" />
                    <Area dataKey="vwap_upper1" fill="rgba(96,165,250,0.15)" stroke="none" />
                    <Area dataKey="vwap_lower1" fill="rgba(96,165,250,0.15)" stroke="none" />
                    <Line type="monotone" dataKey="vwap" stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="close" stroke="#fff" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* 2. Cumulative Delta */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="mb-4">
                    <h3 className="font-semibold text-white text-sm">Cumulative Delta</h3>
                    <p className="text-[10px] text-white/40">Buy pressure minus sell pressure · session total</p>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={nqBars} margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
                      <XAxis dataKey="t" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={29} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                      <Area
                        type="monotone"
                        dataKey="session_cum_delta"
                        stroke="none"
                        fill="url(#deltaGrad)"
                      />
                      <Line type="monotone" dataKey="session_cum_delta" stroke="#4ade80" strokeWidth={1.5} dot={false} />
                      <defs>
                        <linearGradient id="deltaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* 3. Buy vs Sell Volume */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="mb-4">
                    <h3 className="font-semibold text-white text-sm">Buy vs Sell Volume</h3>
                    <p className="text-[10px] text-white/40">Green = aggressor buys · Red = aggressor sells</p>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={nqBars} margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
                      <XAxis dataKey="t" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={29} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                      <Bar dataKey="buy_vol" fill="#4ade80" opacity={0.7} />
                      <Bar dataKey="sell_vol" fill="#f87171" opacity={0.7} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* 4. RSI */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="mb-4">
                    <h3 className="font-semibold text-white text-sm">RSI (14)</h3>
                    <p className="text-[10px] text-white/40">Overbought &gt;70 · Oversold &lt;30</p>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={nqBars} margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
                      <XAxis dataKey="t" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={29} />
                      <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                      <ReferenceLine y={70} stroke="rgba(248,113,113,0.5)" strokeDasharray="3 3" label={{ value: "70", fill: "rgba(248,113,113,0.7)", fontSize: 9 }} />
                      <ReferenceLine y={30} stroke="rgba(74,222,128,0.5)" strokeDasharray="3 3" label={{ value: "30", fill: "rgba(74,222,128,0.7)", fontSize: 9 }} />
                      <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" />
                      <Area type="monotone" dataKey="rsi_14" stroke="#a78bfa" strokeWidth={1.5} fill="rgba(167,139,250,0.1)" dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* 5. Absorption Signal */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="mb-4">
                    <h3 className="font-semibold text-white text-sm">Absorption Signal</h3>
                    <p className="text-[10px] text-white/40">+1 = bullish absorption · −1 = bearish absorption</p>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <ComposedChart data={nqBars} margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
                      <XAxis dataKey="t" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} interval={29} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                      <ReferenceLine y={0.3} stroke="rgba(74,222,128,0.3)" strokeDasharray="3 3" />
                      <ReferenceLine y={-0.3} stroke="rgba(248,113,113,0.3)" strokeDasharray="3 3" />
                      <Bar dataKey="absorption" fill="#fbbf24" opacity={0.6} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
