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
} from "recharts";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/MarketTicker";
import { CARDS, STOCK_TICKERS, type StockData } from "@/lib/mockData";

const ALLOCATION_COLORS = ["#4ade80", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171"];

const CHART_DATA = [
  { month: "Nov", value: 210 },
  { month: "Dec", value: 248 },
  { month: "Jan", value: 275 },
  { month: "Feb", value: 292 },
  { month: "Mar", value: 318 },
  { month: "Apr", value: 340 },
];

const MONTHLY_EARNINGS = CHART_DATA.map((d) => d.value);

interface Allocation {
  ticker: string;
  percentage: number;
  rationale: string;
  description: string;
}

interface AIAdvice {
  allocations: Allocation[];
  summary: string;
  projectedAnnualReturn: number;
  insights: string[];
}

export default function RewardVestPage() {
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Market data state
  const [marketData, setMarketData] = useState<StockData[]>(STOCK_TICKERS);
  const [marketLoading, setMarketLoading] = useState(true);

  const totalEarned = CARDS.reduce((s, c) => s + c.totalEarned, 0);
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
        // If empty, STOCK_TICKERS mock data stays as fallback
      } catch {
        // Silently fall back to mock data
      } finally {
        setMarketLoading(false);
      }
    }
    fetchMarket();
  }, []);

  // Auto-show default portfolio on mount (mock until AI generates)
  useEffect(() => {
    const t = setTimeout(() => setShowPortfolio(true), 600);
    return () => clearTimeout(t);
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
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <MarketTicker data={marketData} />

      <div className="pt-24 pb-16 px-6">
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Per-card breakdown */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/8">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
                  Earnings by Card
                </h3>
                <div className="space-y-3">
                  {CARDS.map((card) => (
                    <div key={card.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background:
                              card.color === "amex"
                                ? "#60a5fa"
                                : card.color === "chase"
                                ? "#a78bfa"
                                : card.color === "citi"
                                ? "#22d3ee"
                                : card.color === "discover"
                                ? "#fb923c"
                                : "#4ade80",
                          }}
                        />
                        <span className="text-xs text-white/60 truncate">
                          {card.name}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-white">
                        ${card.totalEarned.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
