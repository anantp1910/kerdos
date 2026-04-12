"use client";

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
type EChartsProps = { option: unknown; style?: CSSProperties; className?: string };
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

  const cardStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "14px",
  };

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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <span className={labelStyle} style={{ color: "var(--green)" }}>RewardVest</span>
        <h1 className="text-2xl font-bold text-white mt-0.5">AI Investment Advisor</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
          Exact SmartSwipe rewards feed directly into your investable balance.
        </p>
      </div>
      <MarketTicker />

      <div className="px-4 pt-4 pb-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: "This Month", value: `$${thisMonth.toFixed(2)}`, sub: "earned", color: "var(--green)" },
            { label: "Available to Invest", value: `$${uninvestedBalance.toFixed(2)}`, sub: "uninvested", color: "#60a5fa" },
            {
              label: "Portfolio Value",
              value: `$${livePortfolioValue.toFixed(2)}`,
              sub: portfolioGain >= 0 ? `+$${portfolioGain.toFixed(2)} gain` : `-$${Math.abs(portfolioGain).toFixed(2)} loss`,
              hint: marketStatusLabel,
              color: portfolioGain >= 0 ? "var(--green)" : "var(--red)",
            },
            { label: "Projected Annual", value: `$${projectedAnnual.toLocaleString()}`, sub: "at current rate", color: "#a78bfa" },
            { label: "10-Year Growth", value: `$${tenYearGrowth.toLocaleString()}`, sub: `at ${projectedReturn}% return`, color: "#fbbf24" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              className="p-4"
              style={cardStyle}
            >
              <p className={`${labelStyle} mb-2`} style={{ color: "var(--text-2)" }}>{stat.label}</p>
              <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>{stat.sub}</p>
              {"hint" in stat && stat.hint && (
                <p className="text-[10px] mt-2 font-semibold" style={{ color: marketStatusColor }}>
                  {stat.hint}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <LiquidityDominanceChart marketRegime={aiAdvice?.marketRegime ?? null} />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PortfolioLandscapeChart
                allocations={displayAllocations}
                marketData={marketData}
                investableAmount={uninvestedBalance}
                marketStatusLabel={marketLoading ? "Loading..." : marketStatusLabel}
              />
            </motion.div>
          </div>

          <div className="space-y-4 min-w-0">
            <AnimatePresence mode="wait">
              {showPortfolio ? (
                <motion.div key="portfolio" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-5" style={cardStyle}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-white">{aiAdvice ? "AI Portfolio" : "Suggested Portfolio"}</h3>
                    {aiAdvice && <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: "var(--green)", borderColor: "rgba(74,222,128,0.25)" }}>AI Generated</span>}
                  </div>
                  <p className="text-xs mb-5" style={{ color: "var(--text-2)" }}>
                    Investing ${uninvestedBalance.toFixed(2)} of tracked reward value.
                  </p>
                  <div className="flex justify-center mb-5 min-w-0">
                    <ReactECharts
                      option={{
                        backgroundColor: "transparent",
                        tooltip: { trigger: "item" },
                        series: [{
                          type: "pie",
                          radius: ["48%", "72%"],
                          label: { show: false },
                          data: displayAllocations.map((allocation, index) => ({
                            value: allocation.percentage,
                            name: allocation.ticker,
                            itemStyle: { color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] },
                          })),
                        }],
                      }}
                      className="chart-panel-sm"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>
                  <div className="space-y-3">
                    {displayAllocations.map((allocation, index) => (
                      <div key={allocation.ticker} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-sm" style={{ background: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-white">{allocation.ticker}</span>
                            <span className="text-sm font-bold text-white">${((allocation.percentage / 100) * uninvestedBalance).toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            <span className="text-[10px] truncate" style={{ color: "var(--text-2)" }}>{allocation.description}</span>
                            <span className="text-[10px] font-medium" style={{ color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length] }}>{allocation.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="mt-5 w-full py-3 rounded-xl text-black font-semibold disabled:opacity-50"
                    style={{ background: "var(--green)" }}
                  >
                    {isGenerating ? "Generating..." : "Generate AI Investment Split"}
                  </button>
                  <button
                    onClick={handleInvest}
                    disabled={isInvesting || uninvestedBalance <= 0}
                    className="mt-3 w-full py-3 rounded-xl font-semibold disabled:opacity-50 border"
                    style={{ borderColor: "rgba(96,165,250,0.28)", color: "#60a5fa", background: "rgba(96,165,250,0.08)" }}
                  >
                    {isInvesting ? "Logging investment..." : investmentConfirmed ? "Investment Logged" : "I Invested This"}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="empty" className="h-64 rounded-2xl border border-dashed flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
                  <p style={{ color: "var(--text-2)" }}>{isGenerating ? "Analyzing market signals..." : "Generate a portfolio split"}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-5" style={cardStyle}>
              <p className={`${labelStyle} mb-2`} style={{ color: "var(--text-2)" }}>AI Insight</p>
              <p className="text-sm leading-relaxed text-white/75">{aiAdvice?.summary ?? "RewardVest uses the exact value you have logged from SmartSwipe, then allocates only the uninvested portion into a suggested micro-portfolio."}</p>
              {aiAdvice?.insights?.length ? (
                <div className="mt-4 space-y-2">
                  {aiAdvice.insights.slice(0, 3).map((insight) => (
                    <p key={insight} className="text-xs" style={{ color: "var(--text-2)" }}>{insight}</p>
                  ))}
                </div>
              ) : null}
              {aiError && <p className="mt-3 text-xs text-red-400">{aiError}</p>}
              {investmentConfirmed && <p className="mt-3 text-xs" style={{ color: "var(--green)" }}>Investment tranche logged into WealthSplit.</p>}
            </div>

            <div className="p-5" style={cardStyle}>
              <p className={`${labelStyle} mb-3`} style={{ color: "var(--text-2)" }}>Earnings by Card</p>
              {rewardBreakdown.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-2)" }}>No logged card rewards yet. Run SmartSwipe and log a swipe first.</p>
              ) : (
                <div className="space-y-3">
                  {rewardBreakdown.map((card) => (
                    <div key={card.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{card.label}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-2)" }}>{card.points.toLocaleString()} points</p>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--green)" }}>${card.earned.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

