"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { CSSProperties, ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MarketTicker from "@/components/MarketTicker";
import LiquidityDominanceChart from "@/components/invest/LiquidityDominanceChart";
import PortfolioLandscapeChart from "@/components/invest/PortfolioLandscapeChart";
import { DEMO_USER_ID } from "@/lib/demoUser";
import {
  getPortfolioGain,
  getPortfolioValue,
  getUninvestedBalance,
  logInvestment,
  type InvestmentAllocation,
} from "@/lib/investmentStore";
import { getMarketClock, getMarketStatusLabel } from "@/lib/marketHours";

type RewardTransaction = {
  id: string;
  cardId: string;
  estimatedValue: number;
  createdAt: string;
};

type RewardSummary = {
  totalEarned: number;
  totalPoints: number;
  totalSpend: number;
  cards: Record<string, { totalEarned: number; totalPoints: number; totalSpend: number }>;
  transactions: RewardTransaction[];
};

type RewardCard = {
  id: string;
  cardName: string | null;
  cardIssuer: string | null;
  imageUrl?: string | null;
};

type StockData = {
  ticker: string;
  name: string;
  price: number;
  change?: number;
  changePct: number;
};

type Allocation = {
  ticker: string;
  percentage: number;
  rationale: string;
  description: string;
  annualReturn?: number;
};

type MarketRegime = {
  regime: "bullish" | "defensive" | "mixed";
  description: string;
  volatility: "low" | "medium" | "high";
  bloombergPrediction?: string;
  bquantScore?: number;
};

type AIAdvice = {
  allocations: Allocation[];
  summary: string;
  projectedAnnualReturn: number;
  insights: string[];
  marketRegime: MarketRegime;
  threshold: number;
};

const STOCK_TICKERS: StockData[] = [
  { ticker: "VOO", name: "Vanguard S&P 500", price: 498.32, change: 3.21, changePct: 0.65 },
  { ticker: "QQQ", name: "Invesco Nasdaq 100", price: 432.18, change: 5.44, changePct: 1.27 },
  { ticker: "VTI", name: "Vanguard Total Market", price: 242.53, change: -0.87, changePct: -0.36 },
  { ticker: "BND", name: "Vanguard Bond", price: 73.14, change: -0.12, changePct: -0.16 },
  { ticker: "JPM", name: "JPMorgan Chase", price: 224.56, change: 1.84, changePct: 0.83 },
];

const DEFAULT_ALLOCATIONS: Allocation[] = [
  { ticker: "VOO", percentage: 60, rationale: "Broad market exposure", description: "Vanguard S&P 500 ETF", annualReturn: 8.5 },
  { ticker: "QQQ", percentage: 25, rationale: "Growth tilt", description: "Invesco Nasdaq 100 ETF", annualReturn: 12 },
  { ticker: "CASH", percentage: 15, rationale: "Liquidity buffer", description: "High-yield cash reserve", annualReturn: 4.5 },
];

const ALLOCATION_COLORS = ["#00c805", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171"];
type EChartsProps = { option: unknown; style?: CSSProperties; className?: string; onChartReady?: (chart: { resize(): void }) => void };
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false }) as ComponentType<EChartsProps>;

function buildMonthlyChart(transactions: RewardTransaction[]) {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const value = transactions
      .filter((transaction) => transaction.createdAt.startsWith(monthKey))
      .reduce((sum, transaction) => sum + transaction.estimatedValue, 0);

    return {
      month: date.toLocaleString("default", { month: "short" }),
      value: Number(value.toFixed(2)),
    };
  });
}

export default function RewardVestPage() {
  const [rewardSummary, setRewardSummary] = useState<RewardSummary>({
    totalEarned: 0,
    totalPoints: 0,
    totalSpend: 0,
    cards: {},
    transactions: [],
  });
  const [rewardCards, setRewardCards] = useState<RewardCard[]>([]);
  const [aiAdvice, setAiAdvice] = useState<AIAdvice | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInvesting, setIsInvesting] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [investmentConfirmed, setInvestmentConfirmed] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<StockData[]>(STOCK_TICKERS);
  const [marketLoading, setMarketLoading] = useState(true);
  const [marketClock, setMarketClock] = useState(() => getMarketClock());
  const [livePortfolioValue, setLivePortfolioValue] = useState(0);
  const [portfolioGain, setPortfolioGain] = useState(0);

  const chartData = useMemo(() => buildMonthlyChart(rewardSummary.transactions), [rewardSummary.transactions]);
  const thisMonth = chartData[chartData.length - 1]?.value ?? 0;
  const totalEarned = rewardSummary.totalEarned;
  const uninvestedBalance = getUninvestedBalance(thisMonth);
  const displayAllocations = aiAdvice?.allocations ?? DEFAULT_ALLOCATIONS;
  const projectedReturn = aiAdvice?.projectedAnnualReturn ?? 7;
  const projectedAnnual = thisMonth * 12;
  const tenYearGrowth = Math.round(
    projectedReturn === 0
      ? thisMonth * 12 * 10
      : thisMonth * 12 * ((Math.pow(1 + projectedReturn / 100, 10) - 1) / (projectedReturn / 100))
  );
  const marketStatusLabel = getMarketStatusLabel(marketClock);
  const marketStatusColor = marketClock.isOpen ? "var(--green)" : "#fbbf24";

  const glass = {
    background: "rgba(14,14,14,0.68)",
    border: "1px solid rgba(255,255,255,0.09)",
    backdropFilter: "blur(22px)",
    WebkitBackdropFilter: "blur(22px)",
    borderRadius: 18,
  } satisfies React.CSSProperties;

  const glassStrong = {
    background: "rgba(10,10,10,0.82)",
    border: "1px solid rgba(255,255,255,0.11)",
    backdropFilter: "blur(28px)",
    WebkitBackdropFilter: "blur(28px)",
    borderRadius: 20,
  } satisfies React.CSSProperties;

  const labelStyle = "text-[10px] font-bold tracking-widest uppercase" as const;

  const refreshRewards = useCallback(async () => {
    const [summary, cards] = await Promise.all([
      fetch(`/api/rewards/summary?userId=${DEMO_USER_ID}`, { cache: "no-store" }).then((response) => response.json()),
      fetch(`/api/rewards?userId=${DEMO_USER_ID}`, { cache: "no-store" }).then((response) => response.json()),
    ]);

    setRewardSummary({
      totalEarned: summary.totalEarned ?? 0,
      totalPoints: summary.totalPoints ?? 0,
      totalSpend: summary.totalSpend ?? 0,
      cards: summary.cards ?? {},
      transactions: summary.transactions ?? [],
    });
    setRewardCards(cards ?? []);
  }, []);

  useEffect(() => {
    refreshRewards().catch(() => {});
    setLivePortfolioValue(getPortfolioValue());
    setPortfolioGain(getPortfolioGain());
    const timer = setTimeout(() => setShowPortfolio(true), 500);
    return () => clearTimeout(timer);
  }, [refreshRewards]);

  useEffect(() => {
    const tick = () => setMarketClock(getMarketClock());
    tick();
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchMarket() {
      try {
        const response = await fetch("/api/market");
        const json = await response.json();
        if (json.data?.length) setMarketData(json.data);
      } catch {
        // fallback stays in place
      } finally {
        setMarketLoading(false);
      }
    }

    fetchMarket();
    const interval = setInterval(fetchMarket, marketClock.isOpen ? 60000 : 900000);
    return () => clearInterval(interval);
  }, [marketClock.isOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLivePortfolioValue(getPortfolioValue());
      setPortfolioGain(getPortfolioGain());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setShowPortfolio(false);
    setAiError(null);
    setInvestmentConfirmed(false);

    try {
      const response = await fetch("/api/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalRewards: totalEarned,
          monthlyEarnings: chartData.map((point) => point.value),
          investmentAmount: uninvestedBalance,
          riskTolerance: "moderate",
        }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error ?? "Failed to generate advice");
      }
      setAiAdvice(json.data as AIAdvice);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Failed to generate portfolio");
    } finally {
      setShowPortfolio(true);
      setIsGenerating(false);
    }
  }, [chartData, totalEarned, uninvestedBalance]);

  const handleInvest = useCallback(async () => {
    if (uninvestedBalance <= 0) return;

    setIsInvesting(true);
    try {
      const allocations: InvestmentAllocation[] = displayAllocations.map((allocation) => ({
        ticker: allocation.ticker,
        pct: allocation.percentage,
        annualReturn: allocation.annualReturn ?? projectedReturn,
      }));
      const blendedReturn = allocations.reduce((sum, allocation) => sum + allocation.annualReturn * (allocation.pct / 100), 0);
      logInvestment(uninvestedBalance, allocations, blendedReturn);
      setLivePortfolioValue(getPortfolioValue());
      setPortfolioGain(getPortfolioGain());
      setInvestmentConfirmed(true);
    } finally {
      setIsInvesting(false);
    }
  }, [displayAllocations, projectedReturn, uninvestedBalance]);

  const rewardBreakdown = rewardCards
    .map((card) => ({
      id: card.id,
      label: `${card.cardIssuer ?? ""} ${card.cardName ?? ""}`.trim() || card.id,
      earned: rewardSummary.cards[card.id]?.totalEarned ?? 0,
      points: rewardSummary.cards[card.id]?.totalPoints ?? 0,
    }))
    .filter((card) => card.earned > 0 || card.points > 0);

  return (
    <div className="min-h-screen" style={{ position: "relative", zIndex: 1 }}>

      {/* ── Header ── */}
      <div style={{ padding: "32px 28px 0" }}>
        <p className={labelStyle} style={{ color: "rgba(0,200,5,0.8)", marginBottom: 4 }}>RewardVest</p>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: 0, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          AI Investment Advisor
        </h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 4 }}>
          SmartSwipe rewards flow directly into your investable balance
        </p>
      </div>

      <MarketTicker />

      <div style={{ padding: "20px 28px 48px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Stat strip ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "This Month", value: `$${thisMonth.toFixed(2)}`, sub: "earned", color: "rgba(0,200,5,0.9)" },
            { label: "Available to Invest", value: `$${uninvestedBalance.toFixed(2)}`, sub: "uninvested", color: "#60a5fa" },
            {
              label: "Portfolio Value",
              value: `$${livePortfolioValue.toFixed(2)}`,
              sub: portfolioGain >= 0 ? `+$${portfolioGain.toFixed(2)} gain` : `-$${Math.abs(portfolioGain).toFixed(2)} loss`,
              hint: marketStatusLabel,
              color: portfolioGain >= 0 ? "rgba(0,200,5,0.9)" : "#f87171",
            },
            { label: "Projected Annual", value: `$${projectedAnnual.toLocaleString()}`, sub: "at current rate", color: "#a78bfa" },
            { label: "10-Year Growth", value: `$${tenYearGrowth.toLocaleString()}`, sub: `at ${projectedReturn}% return`, color: "#fbbf24" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, type: "spring", stiffness: 380, damping: 28 }}
              style={{ ...glass, padding: "16px 18px" }}
            >
              <p className={labelStyle} style={{ color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>{stat.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: stat.color, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                {stat.value}
              </p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{stat.sub}</p>
              {"hint" in stat && stat.hint && (
                <p style={{ fontSize: 10, color: marketStatusColor, fontWeight: 700, marginTop: 6 }}>{stat.hint}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 340px", gap: 16, alignItems: "start" }}>

          {/* Left — Liquidity chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            style={{ ...glassStrong, overflow: "hidden" }}
          >
            <LiquidityDominanceChart marketRegime={aiAdvice?.marketRegime ?? null} />
          </motion.div>

          {/* Centre — Portfolio landscape */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            style={{ ...glassStrong, overflow: "hidden" }}
          >
            <PortfolioLandscapeChart
              allocations={displayAllocations}
              marketData={marketData}
              investableAmount={uninvestedBalance}
              marketStatusLabel={marketLoading ? "Loading..." : marketStatusLabel}
            />
          </motion.div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Portfolio / donut */}
            <AnimatePresence mode="wait">
              {showPortfolio ? (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  style={{ ...glass, padding: "20px 20px 16px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                      {aiAdvice ? "AI Portfolio" : "Suggested Portfolio"}
                    </p>
                    {aiAdvice && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0,200,5,0.8)", background: "rgba(0,200,5,0.1)", border: "1px solid rgba(0,200,5,0.2)", borderRadius: 20, padding: "2px 8px" }}>
                        AI
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
                    Investing ${uninvestedBalance.toFixed(2)} of rewards
                  </p>

                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                    <ReactECharts
                      option={{
                        backgroundColor: "transparent",
                        tooltip: { trigger: "item" },
                        series: [{
                          type: "pie",
                          radius: ["48%", "72%"],
                          label: { show: false },
                          data: displayAllocations.map((a, i) => ({
                            value: a.percentage,
                            name: a.ticker,
                            itemStyle: { color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] },
                          })),
                        }],
                      }}
                      className="chart-panel-sm"
                      style={{ width: "100%", height: "100%" }}
                      onChartReady={(chart) => { setTimeout(() => chart.resize(), 0); }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                    {displayAllocations.map((a, i) => (
                      <div key={a.ticker} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length], flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{a.ticker}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>${((a.percentage / 100) * uninvestedBalance).toFixed(0)}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 1 }}>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}>{a.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    style={{ width: "100%", padding: "11px 0", borderRadius: 12, background: "rgba(0,200,5,0.9)", color: "#000", fontSize: 13, fontWeight: 800, border: "none", cursor: isGenerating ? "not-allowed" : "pointer", opacity: isGenerating ? 0.5 : 1, marginBottom: 8 }}
                  >
                    {isGenerating ? "Generating..." : "Generate AI Split"}
                  </button>
                  <button
                    onClick={handleInvest}
                    disabled={isInvesting || uninvestedBalance <= 0}
                    style={{ width: "100%", padding: "11px 0", borderRadius: 12, background: "rgba(96,165,250,0.08)", color: "#60a5fa", fontSize: 13, fontWeight: 700, border: "1px solid rgba(96,165,250,0.25)", cursor: (isInvesting || uninvestedBalance <= 0) ? "not-allowed" : "pointer", opacity: (isInvesting || uninvestedBalance <= 0) ? 0.5 : 1 }}
                  >
                    {isInvesting ? "Logging..." : investmentConfirmed ? "Investment Logged ✓" : "I Invested This"}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  style={{ ...glass, height: 240, display: "flex", alignItems: "center", justifyContent: "center", borderStyle: "dashed" }}
                >
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    {isGenerating ? "Analyzing market signals..." : "Generate a portfolio split"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Insight */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              style={{ ...glass, padding: "18px 20px" }}
            >
              <p className={labelStyle} style={{ color: "rgba(255,255,255,0.32)", marginBottom: 8 }}>AI Insight</p>
              <p style={{ fontSize: 12, lineHeight: 1.65, color: "rgba(255,255,255,0.68)" }}>
                {aiAdvice?.summary ?? "RewardVest uses the exact value you have logged from SmartSwipe, then allocates only the uninvested portion into a suggested micro-portfolio."}
              </p>
              {aiAdvice?.insights?.length ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {aiAdvice.insights.slice(0, 3).map((insight) => (
                    <p key={insight} style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>{insight}</p>
                  ))}
                </div>
              ) : null}
              {aiError && <p style={{ marginTop: 10, fontSize: 11, color: "#f87171" }}>{aiError}</p>}
              {investmentConfirmed && <p style={{ marginTop: 10, fontSize: 11, color: "rgba(0,200,5,0.8)" }}>Investment tranche logged into WealthSplit.</p>}
            </motion.div>

            {/* Earnings by card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              style={{ ...glass, padding: "18px 20px" }}
            >
              <p className={labelStyle} style={{ color: "rgba(255,255,255,0.32)", marginBottom: 12 }}>Earnings by Card</p>
              {rewardBreakdown.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>No logged rewards yet. Log a swipe in SmartSwipe first.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {rewardBreakdown.map((card) => (
                    <div key={card.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.label}</p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{card.points.toLocaleString()} pts</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(0,200,5,0.9)", whiteSpace: "nowrap" }}>${card.earned.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}

