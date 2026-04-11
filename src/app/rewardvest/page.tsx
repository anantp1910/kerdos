"use client";

import { useState, useEffect } from "react";
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
import { USER_CARDS } from "@/lib/userCards";

const STOCK_TICKERS = [
  { ticker: 'VOO',  name: 'Vanguard S&P 500',   price: 498.32, changePct:  0.65 },
  { ticker: 'QQQ',  name: 'Invesco Nasdaq 100',  price: 432.18, changePct:  1.27 },
  { ticker: 'SPY',  name: 'SPDR S&P 500',        price: 521.67, changePct:  0.56 },
  { ticker: 'VTI',  name: 'Vanguard Total Mkt',  price: 242.53, changePct: -0.36 },
  { ticker: 'ARKK', name: 'ARK Innovation',      price: 47.83,  changePct:  2.62 },
  { ticker: 'BND',  name: 'Vanguard Bond',       price: 73.14,  changePct: -0.16 },
];

const PORTFOLIO_SPLIT = [
  { name: "VOO", pct: 60, color: "#4ade80", description: "Vanguard S&P 500 ETF" },
  { name: "QQQ", pct: 25, color: "#60a5fa", description: "Invesco Nasdaq 100" },
  { name: "Cash Reserve", pct: 15, color: "#a78bfa", description: "High-yield savings" },
];

const CHART_DATA = [
  { month: "Nov", value: 210 },
  { month: "Dec", value: 248 },
  { month: "Jan", value: 275 },
  { month: "Feb", value: 292 },
  { month: "Mar", value: 318 },
  { month: "Apr", value: 340 },
];

const AI_INSIGHTS = [
  "VOO has outperformed 94% of actively managed funds over the past 10 years — ideal anchor for your rewards.",
  "QQQ's tech concentration matches your spending pattern: high dining/entertainment = lifestyle-driven income.",
  "Maintaining 15% cash reserve gives flexibility to buy dips without liquidating positions.",
  "At your current earning rate of $340/mo, compounding at 7% annual return = $48,200 in 10 years.",
];

const COLOR_MAP: Record<string, string> = {
  amex: '#60a5fa', chase: '#a78bfa', citi: '#22d3ee', discover: '#fb923c', capital: '#4ade80',
};

export default function RewardVestPage() {
  const [aiInsight, setAiInsight] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [apiCards, setApiCards] = useState<{ id: string; cardName: string }[]>([]);

  useEffect(() => {
    fetch("/api/rewards")
      .then(r => r.json())
      .then(setApiCards)
      .catch(() => {});
  }, []);

  const totalEarned = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);
  const thisMonth = 340;

  const handleGenerate = () => {
    setIsGenerating(true);
    setShowPortfolio(false);
    setTimeout(() => {
      setIsGenerating(false);
      setShowPortfolio(true);
      setAiInsight(Math.floor(Math.random() * AI_INSIGHTS.length));
    }, 2200);
  };

  // Auto-show on mount
  useEffect(() => {
    const t = setTimeout(() => setShowPortfolio(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <MarketTicker />

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
              { label: "Projected Annual", value: "$4,080", sub: "at current rate", color: "text-purple-400" },
              { label: "10-Year Growth", value: "$48,200", sub: "at 7% return", color: "text-yellow-400" },
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
            {/* Left col — Chart + AI */}
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
                    <p className="text-2xl font-bold text-green-400">$340</p>
                    <p className="text-xs text-green-400">↑ 7% vs last month</p>
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
                    Market Open
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {STOCK_TICKERS.map((s, i) => (
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
                      <p className="text-lg font-bold text-white">${s.price}</p>
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
            </div>

            {/* Right col — Portfolio */}
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
                    <h3 className="font-semibold text-white mb-1">
                      Suggested Portfolio
                    </h3>
                    <p className="text-xs text-white/40 mb-6">
                      For your $340 in rewards this month
                    </p>

                    {/* Donut */}
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <PieChart width={180} height={180}>
                          <Pie
                            data={PORTFOLIO_SPLIT}
                            cx={90}
                            cy={90}
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="pct"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {PORTFOLIO_SPLIT.map((entry, i) => (
                              <Cell key={i} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                        </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-xl font-bold text-white">$340</p>
                          <p className="text-[10px] text-white/40">to invest</p>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-3">
                      {PORTFOLIO_SPLIT.map((p) => (
                        <div key={p.name} className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-sm flex-shrink-0"
                            style={{ background: p.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-white">
                                {p.name}
                              </span>
                              <span className="text-sm font-bold text-white">
                                ${((p.pct / 100) * thisMonth).toFixed(0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-0.5">
                              <span className="text-[10px] text-white/40 truncate">
                                {p.description}
                              </span>
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: p.color }}
                              >
                                {p.pct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className="h-64 rounded-2xl border border-dashed border-white/10 flex items-center justify-center"
                  >
                    <p className="text-white/30 text-sm">
                      Generate a portfolio split ↑
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* AI Insight */}
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
                    <p className="text-sm text-white/60 leading-relaxed">
                      {AI_INSIGHTS[aiInsight]}
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
      </div>
    </div>
  );
}
