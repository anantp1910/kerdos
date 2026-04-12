"use client";

import React, { useRef } from "react";
import dynamic from "next/dynamic";
import type { CSSProperties, ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  TrendingUp, Wallet, LineChart, ArrowUpRight, Zap,
  Sparkles, CreditCard, DollarSign, PieChart,
} from "lucide-react";
import MarketTicker from "@/components/MarketTicker";
import { ParticleCard, GlobalSpotlight } from "@/components/MagicBento";
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

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

const STOCK_TICKERS: StockData[] = [
  { ticker: "VOO", name: "Vanguard S&P 500",     price: 498.32, change: 3.21,  changePct: 0.65  },
  { ticker: "QQQ", name: "Invesco Nasdaq 100",   price: 432.18, change: 5.44,  changePct: 1.27  },
  { ticker: "VTI", name: "Vanguard Total Market",price: 242.53, change: -0.87, changePct: -0.36 },
  { ticker: "BND", name: "Vanguard Bond",        price: 73.14,  change: -0.12, changePct: -0.16 },
  { ticker: "JPM", name: "JPMorgan Chase",       price: 224.56, change: 1.84,  changePct: 0.83  },
];

const DEFAULT_ALLOCATIONS: Allocation[] = [
  { ticker: "VOO",  percentage: 60, rationale: "Broad market exposure", description: "Vanguard S&P 500 ETF",      annualReturn: 8.5 },
  { ticker: "QQQ",  percentage: 25, rationale: "Growth tilt",           description: "Invesco Nasdaq 100 ETF",   annualReturn: 12  },
  { ticker: "CASH", percentage: 15, rationale: "Liquidity buffer",      description: "High-yield cash reserve",  annualReturn: 4.5 },
];

const ALLOCATION_COLORS = ["#00c805", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171"];

type EChartsProps = {
  option: unknown;
  style?: CSSProperties;
  className?: string;
  onChartReady?: (chart: { resize(): void }) => void;
};
const ReactECharts = dynamic(
  () => import("echarts-for-react"),
  { ssr: false }
) as ComponentType<EChartsProps>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMonthlyChart(transactions: RewardTransaction[]) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date     = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const value    = transactions
      .filter(t => t.createdAt.startsWith(monthKey))
      .reduce((s, t) => s + t.estimatedValue, 0);
    return { month: date.toLocaleString("default", { month: "short" }), value: Number(value.toFixed(2)) };
  });
}

// ── Shared style tokens (matching SmartSwipe / homepage) ──────────────────────

const cardBase: CSSProperties = {
  background:          "rgba(255,255,255,0.04)",
  border:              "1px solid rgba(255,255,255,0.1)",
  backdropFilter:      "blur(20px)",
  WebkitBackdropFilter:"blur(20px)",
  borderRadius:        20,
  position:            "relative",
  overflow:            "hidden",
};

const glassStrong: CSSProperties = {
  background:          "rgba(10,10,10,0.82)",
  border:              "1px solid rgba(255,255,255,0.11)",
  backdropFilter:      "blur(28px)",
  WebkitBackdropFilter:"blur(28px)",
  borderRadius:        20,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RewardVestPage() {
  const bentoRef = useRef<HTMLDivElement>(null);

  const [rewardSummary, setRewardSummary] = useState<RewardSummary>({
    totalEarned: 0, totalPoints: 0, totalSpend: 0, cards: {}, transactions: [],
  });
  const [rewardCards,         setRewardCards]         = useState<RewardCard[]>([]);
  const [aiAdvice,            setAiAdvice]            = useState<AIAdvice | null>(null);
  const [isGenerating,        setIsGenerating]        = useState(false);
  const [isInvesting,         setIsInvesting]         = useState(false);
  const [showPortfolio,       setShowPortfolio]       = useState(false);
  const [investmentConfirmed, setInvestmentConfirmed] = useState(false);
  const [aiError,             setAiError]             = useState<string | null>(null);
  const [marketData,          setMarketData]          = useState<StockData[]>(STOCK_TICKERS);
  const [marketLoading,       setMarketLoading]       = useState(true);
  const [marketClock,         setMarketClock]         = useState(() => getMarketClock());
  const [livePortfolioValue,  setLivePortfolioValue]  = useState(0);
  const [portfolioGain,       setPortfolioGain]       = useState(0);

  const chartData        = useMemo(() => buildMonthlyChart(rewardSummary.transactions), [rewardSummary.transactions]);
  const thisMonth        = chartData[chartData.length - 1]?.value ?? 0;
  const totalEarned      = rewardSummary.totalEarned;
  const uninvestedBalance = getUninvestedBalance(thisMonth);
  const displayAllocations = aiAdvice?.allocations ?? DEFAULT_ALLOCATIONS;
  const projectedReturn  = aiAdvice?.projectedAnnualReturn ?? 7;
  const projectedAnnual  = thisMonth * 12;
  const tenYearGrowth    = Math.round(
    projectedReturn === 0
      ? thisMonth * 12 * 10
      : thisMonth * 12 * ((Math.pow(1 + projectedReturn / 100, 10) - 1) / (projectedReturn / 100))
  );
  const marketStatusLabel = getMarketStatusLabel(marketClock);
  const marketStatusColor = marketClock.isOpen ? "var(--green)" : "#fbbf24";
  const gainRgb           = portfolioGain >= 0 ? "0,200,5" : "248,113,113";

  // Stat strip config — same structure as homepage Band 3
  const STAT_CARDS = [
    {
      label: "This Month",
      value: `$${thisMonth.toFixed(2)}`,
      delta: thisMonth > 0 ? `+$${thisMonth.toFixed(2)}` : "$0.00",
      sub:   "earned",
      icon:  TrendingUp,
      rgb:   "0,200,5",
    },
    {
      label: "Available",
      value: `$${uninvestedBalance.toFixed(2)}`,
      delta: uninvestedBalance > 0 ? "ready to deploy" : "fully invested",
      sub:   "to invest",
      icon:  Wallet,
      rgb:   "96,165,250",
    },
    {
      label: "Portfolio",
      value: `$${livePortfolioValue.toFixed(2)}`,
      delta: portfolioGain >= 0 ? `+$${portfolioGain.toFixed(2)}` : `-$${Math.abs(portfolioGain).toFixed(2)}`,
      sub:   marketStatusLabel,
      icon:  LineChart,
      rgb:   gainRgb,
    },
    {
      label: "Proj. Annual",
      value: `$${projectedAnnual.toLocaleString()}`,
      delta: `${projectedReturn}% est.`,
      sub:   "at current rate",
      icon:  ArrowUpRight,
      rgb:   "167,139,250",
    },
    {
      label: "10-Year",
      value: `$${tenYearGrowth.toLocaleString()}`,
      delta: `${projectedReturn}% compounded`,
      sub:   "projected growth",
      icon:  Zap,
      rgb:   "251,191,36",
    },
  ] as const;

  // ── Data fetching ─────────────────────────────────────────────────────────

  const refreshRewards = useCallback(async () => {
    const [summary, cards] = await Promise.all([
      fetch(`/api/rewards/summary?userId=${DEMO_USER_ID}`, { cache: "no-store" }).then(r => r.json()),
      fetch(`/api/rewards?userId=${DEMO_USER_ID}`,         { cache: "no-store" }).then(r => r.json()),
    ]);
    setRewardSummary({
      totalEarned:  summary.totalEarned  ?? 0,
      totalPoints:  summary.totalPoints  ?? 0,
      totalSpend:   summary.totalSpend   ?? 0,
      cards:        summary.cards        ?? {},
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
      } catch { /* fallback stays */ } finally {
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

  // ── Actions ───────────────────────────────────────────────────────────────

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
          totalRewards:      totalEarned,
          monthlyEarnings:   chartData.map(p => p.value),
          investmentAmount:  uninvestedBalance,
          riskTolerance:     "moderate",
        }),
      });
      const json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error ?? "Failed to generate advice");
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
      const allocations: InvestmentAllocation[] = displayAllocations.map(a => ({
        ticker: a.ticker, pct: a.percentage, annualReturn: a.annualReturn ?? projectedReturn,
      }));
      const blendedReturn = allocations.reduce((s, a) => s + a.annualReturn * (a.pct / 100), 0);
      logInvestment(uninvestedBalance, allocations, blendedReturn);
      setLivePortfolioValue(getPortfolioValue());
      setPortfolioGain(getPortfolioGain());
      setInvestmentConfirmed(true);
    } finally {
      setIsInvesting(false);
    }
  }, [displayAllocations, projectedReturn, uninvestedBalance]);

  const rewardBreakdown = rewardCards
    .map(card => ({
      id:     card.id,
      label:  `${card.cardIssuer ?? ""} ${card.cardName ?? ""}`.trim() || card.id,
      earned: rewardSummary.cards[card.id]?.totalEarned ?? 0,
      points: rewardSummary.cards[card.id]?.totalPoints ?? 0,
    }))
    .filter(c => c.earned > 0 || c.points > 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ position: "relative", zIndex: 1 }}>

      <MarketTicker />
      <GlobalSpotlight gridRef={bentoRef} glowColor="0,200,5" spotlightRadius={380} />

      <div ref={bentoRef} style={{ padding: "16px 28px 48px", maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Stat strip — homepage Band 3 cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
          {STAT_CARDS.map(({ label, value, delta, sub, icon: Icon, rgb }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ delay: 0.04 * i, type: "spring", stiffness: 700, damping: 28 }}
              style={{ cursor: "pointer" }}
            >
              <ParticleCard
                className="magic-bento-card magic-bento-card--border-glow"
                style={{ ...cardBase, padding: "14px 18px", aspectRatio: "auto", minHeight: "auto",
                  display: "flex", flexDirection: "column", gap: 4,
                  ["--glow-color" as string]: rgb } as CSSProperties}
                glowColor={rgb}
                enableTilt={false}
                clickEffect={true}
                enableMagnetism={false}
                particleCount={6}
              >
                {/* Accent bar */}
                <div style={{
                  position: "absolute", top: 0, left: 18, right: 18, height: 2,
                  background: `linear-gradient(to right, rgba(${rgb},0.75), rgba(${rgb},0.1))`,
                  borderRadius: "0 0 4px 4px",
                }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon size={12} color={`rgba(${rgb},0.9)`} strokeWidth={2} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                    letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                    {label}
                  </span>
                </div>
                <span style={{ fontSize: "clamp(18px, 1.9vw, 26px)", fontWeight: 800, lineHeight: 1.1,
                  letterSpacing: "-0.02em", fontFamily: "var(--font-display)", color: "#fff" }}>
                  {value}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: `rgba(${rgb},0.9)`, fontFamily: "var(--font-display)" }}>
                  {delta}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-display)" }}>
                  {sub}
                </span>
                {label === "Portfolio" && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: marketStatusColor, fontFamily: "var(--font-display)" }}>
                    {marketStatusLabel}
                  </span>
                )}
              </ParticleCard>
            </motion.div>
          ))}
        </div>

        {/* ── Main grid: charts left, sidebar right ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>

          {/* Left — graph cards (untouched wrappers) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              style={{ ...glassStrong, overflow: "hidden" }}
            >
              <LiquidityDominanceChart marketRegime={aiAdvice?.marketRegime ?? null} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              style={{ ...glassStrong, overflow: "hidden" }}
            >
              <PortfolioLandscapeChart
                allocations={displayAllocations}
                marketData={marketData}
                investableAmount={uninvestedBalance}
                marketStatusLabel={marketLoading ? "Loading..." : marketStatusLabel}
              />
            </motion.div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── Portfolio donut card ── */}
            <AnimatePresence mode="wait">
              {showPortfolio ? (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                <ParticleCard
                  className="magic-bento-card magic-bento-card--border-glow"
                  style={{ ...cardBase, padding: "22px 22px 18px", aspectRatio: "auto", minHeight: "auto",
                    ["--glow-color" as string]: "0,200,5" } as CSSProperties}
                  glowColor="0,200,5"
                  enableTilt={false}
                  clickEffect={true}
                  enableMagnetism={false}
                  particleCount={8}
                >
                  {/* Green accent bar */}
                  <div style={{
                    position: "absolute", top: 0, left: 18, right: 18, height: 2,
                    background: "linear-gradient(to right, rgba(0,200,5,0.75), rgba(0,200,5,0.1))",
                    borderRadius: "0 0 4px 4px",
                  }} />

                  {/* Ambient glow */}
                  <div style={{
                    position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
                    width: 180, height: 180, borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(0,200,5,0.07) 0%, transparent 70%)",
                    pointerEvents: "none",
                  }} />

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <PieChart size={12} color="rgba(0,200,5,0.9)" strokeWidth={2} />
                        <p style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
                          textTransform: "uppercase", color: "rgba(255,255,255,0.5)",
                          fontFamily: "var(--font-display)",
                        }}>
                          Portfolio Split
                        </p>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                        ${uninvestedBalance.toFixed(2)}
                      </p>
                    </div>
                    {aiAdvice && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
                        color: "rgba(0,200,5,0.9)", background: "rgba(0,200,5,0.1)",
                        border: "1px solid rgba(0,200,5,0.22)", borderRadius: 20, padding: "3px 10px",
                      }}>
                        AI Generated
                      </span>
                    )}
                  </div>

                  {/* Donut */}
                  <div style={{ position: "relative", width: "100%", height: 220 }}>
                    <ReactECharts
                      option={{
                        backgroundColor: "transparent",
                        tooltip: {
                          trigger: "item",
                          backgroundColor: "rgba(10,10,10,0.92)",
                          borderColor: "rgba(255,255,255,0.1)",
                          textStyle: { color: "#fff", fontSize: 12 },
                          formatter: (p: { name: string; value: number; percent: number }) =>
                            `<b>${p.name}</b><br/>$${((p.value / 100) * uninvestedBalance).toFixed(2)} &nbsp;<span style="color:rgba(255,255,255,0.5)">${p.percent}%</span>`,
                        },
                        series: [{
                          type: "pie", radius: ["52%", "78%"], center: ["50%", "50%"],
                          label: { show: false },
                          emphasis: { scale: true, scaleSize: 6, itemStyle: { shadowBlur: 20, shadowColor: "rgba(0,0,0,0.5)" } },
                          data: displayAllocations.map((a, i) => ({
                            value: a.percentage, name: a.ticker,
                            itemStyle: {
                              color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
                              borderRadius: 4, borderWidth: 2, borderColor: "rgba(0,0,0,0)",
                            },
                          })),
                        }],
                      }}
                      style={{ width: "100%", height: "100%" }}
                      onChartReady={(chart) => { setTimeout(() => chart.resize(), 0); }}
                    />
                    {/* Center overlay */}
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>Investable</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
                        ${uninvestedBalance.toFixed(0)}
                      </p>
                      <p style={{ fontSize: 10, color: "rgba(0,200,5,0.7)", fontWeight: 600, marginTop: 1 }}>
                        {projectedReturn}% est. return
                      </p>
                    </div>
                  </div>

                  {/* Allocation rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16, marginBottom: 18 }}>
                    {displayAllocations.map((a, i) => (
                      <div key={a.ticker}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <div style={{ width: 7, height: 7, borderRadius: 2, background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "var(--font-display)" }}>{a.ticker}</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.description}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}>
                            {a.percentage}%
                          </span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${a.percentage}%` }}
                            transition={{ delay: 0.3 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                            style={{ height: "100%", borderRadius: 2, background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons — SmartSwipe style */}
                  <motion.button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    whileHover={!isGenerating ? { scale: 1.015, boxShadow: "0 0 32px rgba(0,200,5,0.28)" } : {}}
                    whileTap={!isGenerating ? { scale: 0.97 } : {}}
                    style={{
                      width: "100%", height: 42, borderRadius: 12, marginBottom: 8,
                      border: "1px solid rgba(0,200,5,0.45)",
                      background: isGenerating ? "rgba(0,200,5,0.06)" : "rgba(0,200,5,0.12)",
                      color: isGenerating ? "rgba(0,200,5,0.4)" : "var(--green)",
                      fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 900,
                      letterSpacing: "0.18em", textTransform: "uppercase",
                      cursor: isGenerating ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.2s",
                    }}
                  >
                    <Zap size={11} strokeWidth={2.5} />
                    {isGenerating ? "Analyzing signals..." : "Generate AI Split"}
                  </motion.button>

                  <motion.button
                    onClick={handleInvest}
                    disabled={isInvesting || uninvestedBalance <= 0}
                    whileHover={(!isInvesting && uninvestedBalance > 0) ? { scale: 1.015 } : {}}
                    whileTap={(!isInvesting && uninvestedBalance > 0) ? { scale: 0.97 } : {}}
                    style={{
                      width: "100%", height: 42, borderRadius: 12,
                      border: "1px solid rgba(96,165,250,0.28)",
                      background: "rgba(96,165,250,0.07)",
                      color: "#60a5fa",
                      fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 800,
                      letterSpacing: "0.14em", textTransform: "uppercase",
                      cursor: (isInvesting || uninvestedBalance <= 0) ? "not-allowed" : "pointer",
                      opacity: (isInvesting || uninvestedBalance <= 0) ? 0.45 : 1,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.2s",
                    }}
                  >
                    <DollarSign size={11} strokeWidth={2.5} />
                    {isInvesting ? "Logging..." : investmentConfirmed ? "Investment Logged ✓" : "I Invested This"}
                  </motion.button>
                </ParticleCard>
                </motion.div>

              ) : (
                <motion.div
                  key="empty"
                  style={{
                    ...cardBase,
                    border: "1px dashed rgba(255,255,255,0.1)",
                    height: 200,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                  }}
                >
                  <PieChart size={24} color="rgba(255,255,255,0.1)" strokeWidth={1.5} />
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-display)" }}>
                    {isGenerating ? "Analyzing market signals..." : "No portfolio split yet"}
                  </p>
                  <motion.button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    whileHover={!isGenerating ? { scale: 1.02, boxShadow: "0 0 24px rgba(0,200,5,0.18)" } : {}}
                    style={{
                      padding: "9px 22px", borderRadius: 10,
                      border: "1px solid rgba(0,200,5,0.4)",
                      background: "rgba(0,200,5,0.1)",
                      color: "var(--green)",
                      fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 900,
                      letterSpacing: "0.16em", textTransform: "uppercase",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                    }}
                  >
                    <Zap size={10} strokeWidth={2.5} />
                    Generate AI Split
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── AI Insight card ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 700, damping: 28 }}
            >
            <ParticleCard
              className="magic-bento-card magic-bento-card--border-glow"
              style={{ ...cardBase, padding: "18px 20px", aspectRatio: "auto", minHeight: "auto",
                ["--glow-color" as string]: "128,236,255" } as CSSProperties}
              glowColor="128,236,255"
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
              particleCount={6}
            >
              {/* Cyan accent bar */}
              <div style={{
                position: "absolute", top: 0, left: 18, right: 18, height: 2,
                background: "linear-gradient(to right, rgba(128,236,255,0.55), rgba(128,236,255,0.06))",
                borderRadius: "0 0 4px 4px",
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Sparkles size={12} color="rgba(128,236,255,0.85)" strokeWidth={2} />
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)",
                }}>
                  AI Insight
                </span>
              </div>

              <p style={{ fontSize: 12, lineHeight: 1.68, color: "rgba(255,255,255,0.62)" }}>
                {aiAdvice?.summary ?? "RewardVest takes the exact value logged in SmartSwipe and allocates only the uninvested portion into a suggested micro-portfolio."}
              </p>

              {aiAdvice?.insights?.length ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
                  {aiAdvice.insights.slice(0, 3).map(insight => (
                    <p key={insight} style={{ fontSize: 11, color: "rgba(255,255,255,0.36)", lineHeight: 1.5 }}>· {insight}</p>
                  ))}
                </div>
              ) : null}

              {aiError && (
                <p style={{ marginTop: 10, fontSize: 11, color: "#f87171", fontFamily: "var(--font-display)" }}>
                  {aiError}
                </p>
              )}
              {investmentConfirmed && (
                <p style={{ marginTop: 10, fontSize: 11, color: "rgba(0,200,5,0.8)", fontFamily: "var(--font-display)" }}>
                  Investment tranche logged into WealthSplit.
                </p>
              )}
            </ParticleCard>
            </motion.div>

            {/* ── Earnings by Card ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2, scale: 1.01 }}
              transition={{ delay: 0.24, type: "spring", stiffness: 700, damping: 28 }}
            >
            <ParticleCard
              className="magic-bento-card magic-bento-card--border-glow"
              style={{ ...cardBase, padding: "18px 20px", aspectRatio: "auto", minHeight: "auto",
                ["--glow-color" as string]: "167,139,250" } as CSSProperties}
              glowColor="167,139,250"
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
              particleCount={6}
            >
              {/* Purple accent bar */}
              <div style={{
                position: "absolute", top: 0, left: 18, right: 18, height: 2,
                background: "linear-gradient(to right, rgba(167,139,250,0.55), rgba(167,139,250,0.06))",
                borderRadius: "0 0 4px 4px",
              }} />

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <CreditCard size={12} color="rgba(167,139,250,0.9)" strokeWidth={2} />
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)",
                  letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)",
                }}>
                  Earnings by Card
                </span>
              </div>

              {rewardBreakdown.length === 0 ? (
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-display)" }}>
                  Log a swipe in SmartSwipe to see earnings here.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {rewardBreakdown.map((card, i) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.28 + i * 0.04 }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                        padding: "10px 14px", borderRadius: 12,
                        background: "rgba(255,255,255,0.025)",
                        border: "1px solid rgba(255,255,255,0.055)",
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      {/* mini left accent */}
                      <div style={{
                        position: "absolute", left: 0, top: 8, bottom: 8, width: 2,
                        background: "rgba(167,139,250,0.5)", borderRadius: "0 2px 2px 0",
                      }} />
                      <div style={{ minWidth: 0, paddingLeft: 4 }}>
                        <p style={{
                          fontSize: 12, fontWeight: 700, color: "#fff",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          fontFamily: "var(--font-display)",
                        }}>
                          {card.label}
                        </p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                          {card.points.toLocaleString()} pts
                        </p>
                      </div>
                      <span style={{
                        fontSize: 15, fontWeight: 800, color: "rgba(0,200,5,0.9)",
                        whiteSpace: "nowrap", fontFamily: "var(--font-display)",
                      }}>
                        ${card.earned.toFixed(2)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </ParticleCard>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
