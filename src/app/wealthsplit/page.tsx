"use client";

import dynamic from "next/dynamic";
import type { CSSProperties, ComponentType } from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, CreditCard, BarChart2, Zap, PieChart, Users, Receipt, Wallet } from "lucide-react";
import MarketTicker from "@/components/MarketTicker";
import { ParticleCard, GlobalSpotlight } from "@/components/MagicBento";
import { getInvestmentStore, getPortfolioGain, getTranchesGroupedByMonth } from "@/lib/investmentStore";
import { DEMO_USER_ID } from "@/lib/demoUser";
import { cardAccent } from "@/lib/cardDisplay";

const GROUP_MEMBERS = [
  { id: 'u1', name: 'Arjun', avatar: 'AJ', owes:  128.5,  cardSuggestion: 'Amex Gold'      },
  { id: 'u2', name: 'Priya', avatar: 'PR', owes: -45.0,   cardSuggestion: 'Chase Sapphire' },
  { id: 'u3', name: 'Zara',  avatar: 'ZK', owes:  92.3,   cardSuggestion: 'Citi Double'    },
];

const BREAKEVEN_CARDS = [
  { name: "Amex Gold", fee: 250, monthlyEarnings: 120, months: 2.1, pct: 100 },
  { name: "Chase Sapphire", fee: 95, monthlyEarnings: 29.5, months: 3.2, pct: 31 },
  { name: "Capital Venture", fee: 95, monthlyEarnings: 38, months: 2.5, pct: 26 },
  { name: "Citi Double", fee: 0, monthlyEarnings: 22, months: 0, pct: 100 },
  { name: "Discover it", fee: 0, monthlyEarnings: 14, months: 0, pct: 100 },
];

type OverviewMetric = {
  label: string;
  value: number;
  color: string;
  accent: string;
  glowColor: string;
  money?: boolean;
};

type RewardsTransaction = {
  amount: number;
  estimatedValue: number;
  createdAt: string;
};

type MonthlyOverviewPoint = {
  month: string;
  rewards: number;
  spend: number;
  investments: number;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function buildMonthlyOverviewData(
  transactions: RewardsTransaction[],
  tranches: { amount: number; date: string }[]
): MonthlyOverviewPoint[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const key = monthKey(date);
    const rewards = transactions
      .filter((t) => t.createdAt.startsWith(key))
      .reduce((sum, t) => sum + t.estimatedValue, 0);
    const spend = transactions
      .filter((t) => t.createdAt.startsWith(key))
      .reduce((sum, t) => sum + t.amount, 0);
    const investments = tranches
      .filter((t) => t.date.startsWith(key))
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      month: date.toLocaleString("default", { month: "short" }),
      rewards: Number(rewards.toFixed(2)),
      spend: Number(spend.toFixed(2)),
      investments: Number(investments.toFixed(2)),
    };
  });
}

type SplitItem = { id: string; description: string; total: number; splits: { name: string; amount: number; paid: boolean }[] };
type EChartTooltipParam = { seriesName: string; value: number };
type EChartsProps = { option: unknown; style?: CSSProperties; className?: string };
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false }) as ComponentType<EChartsProps>;

const GROUP_EXPENSES: SplitItem[] = [
  {
    id: "e1",
    description: "Dinner at Nobu",
    total: 386,
    splits: [
      { name: "You", amount: 128.67, paid: true },
      { name: "Arjun", amount: 128.67, paid: false },
      { name: "Priya", amount: 128.66, paid: true },
    ],
  },
  {
    id: "e2",
    description: "Airbnb — Miami trip",
    total: 1200,
    splits: [
      { name: "You", amount: 400, paid: true },
      { name: "Arjun", amount: 400, paid: false },
      { name: "Zara", amount: 400, paid: false },
    ],
  },
  {
    id: "e3",
    description: "Grocery run",
    total: 142,
    splits: [
      { name: "You", amount: 47.33, paid: true },
      { name: "Priya", amount: 47.33, paid: false },
      { name: "Zara", amount: 47.34, paid: true },
    ],
  },
];

type ApiCard = { id: string; cardName: string; cardIssuer: string; cardNetwork: string; annualFee: number | null; pointValuation: number | null; isCashback: boolean; rewardRates: Record<string, number> };
type LinkedCardMeta = { cardId: string; plaidMask?: string; cardName?: string; cardIssuer?: string };

const METRIC_ICONS: Record<string, ComponentType<{ size?: number; color?: string; className?: string }>> = {
  "Rewards This Month": TrendingUp,
  "Tracked Spend": CreditCard,
  "Invested This Month": BarChart2,
  "Portfolio Gain": PieChart,
  "Logged Swipes": Zap,
};

const bentoCardStyle = (glowColor: string): CSSProperties => ({
  "--glow-color": glowColor,
  aspectRatio: "unset",
  minHeight: "unset",
  borderRadius: "16px",
} as CSSProperties);

const hoverSpring = { y: -3, scale: 1.02, transition: { type: "spring" as const, stiffness: 700, damping: 30 } };

// Section container style — no ParticleCard so inner charts/overflow aren't clipped
const sectionClass = "p-6 rounded-2xl bg-white/[0.03] border border-white/8";

export default function WealthSplitPage() {
  const bentoRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "investments" | "splits" | "cards">("overview");
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const [apiCards, setApiCards] = useState<ApiCard[]>([]);
  const [linkedMeta, setLinkedMeta] = useState<Record<string, LinkedCardMeta>>({});
  const [rewardSummary, setRewardSummary] = useState<{
    totalEarned: number;
    totalPoints: number;
    totalSpend: number;
    cards: Record<string, { totalEarned: number; totalPoints: number; totalSpend: number }>;
    transactions: RewardsTransaction[];
  }>({ totalEarned: 0, totalPoints: 0, totalSpend: 0, cards: {}, transactions: [] });

  useEffect(() => {
    fetch(`/api/rewards?userId=${DEMO_USER_ID}`, { cache: "no-store" })
      .then(r => r.json())
      .then(setApiCards)
      .catch(() => {});
    fetch(`/api/plaid/linked-cards?userId=${DEMO_USER_ID}`, { cache: "no-store" })
      .then(r => r.json())
      .then((data: { linkedCards?: LinkedCardMeta[] }) => {
        setLinkedMeta(Object.fromEntries((data.linkedCards ?? []).map(c => [c.cardId, c])));
      })
      .catch(() => {});
    fetch(`/api/rewards/summary?userId=${DEMO_USER_ID}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => setRewardSummary({
        totalEarned: data.totalEarned ?? 0,
        totalPoints: data.totalPoints ?? 0,
        totalSpend: data.totalSpend ?? 0,
        cards: data.cards ?? {},
        transactions: data.transactions ?? [],
      }))
      .catch(() => {});
  }, []);

  const totalCashback    = rewardSummary.totalEarned;
  const totalPoints      = rewardSummary.totalPoints;
  const investmentStore  = getInvestmentStore();
  const portfolioGain    = getPortfolioGain();

  const monthlyOverviewData = useMemo(
    () => buildMonthlyOverviewData(rewardSummary.transactions, investmentStore.tranches),
    [rewardSummary.transactions, investmentStore.tranches]
  );

  const currentMonthKey      = monthKey(new Date());
  const currentMonthRewards  = rewardSummary.transactions.filter(t => t.createdAt.startsWith(currentMonthKey)).reduce((s, t) => s + t.estimatedValue, 0);
  const currentMonthSpend    = rewardSummary.transactions.filter(t => t.createdAt.startsWith(currentMonthKey)).reduce((s, t) => s + t.amount, 0);
  const currentMonthInvested = investmentStore.tranches.filter(t => t.date.startsWith(currentMonthKey)).reduce((s, t) => s + t.amount, 0);
  const swipeCount           = rewardSummary.transactions.length;

  const overviewMetrics: OverviewMetric[] = [
    { label: "Rewards This Month", value: currentMonthRewards,  color: "#4ade80", accent: "#4ade80", glowColor: "74, 222, 128",  money: true  },
    { label: "Tracked Spend",      value: currentMonthSpend,    color: "#60a5fa", accent: "#60a5fa", glowColor: "96, 165, 250",  money: true  },
    { label: "Invested This Month",value: currentMonthInvested, color: "#a78bfa", accent: "#a78bfa", glowColor: "167, 139, 250", money: true  },
    { label: "Portfolio Gain",     value: portfolioGain, color: portfolioGain >= 0 ? "#4ade80" : "#f87171", accent: portfolioGain >= 0 ? "#4ade80" : "#f87171", glowColor: portfolioGain >= 0 ? "74, 222, 128" : "248, 113, 113", money: true },
    { label: "Logged Swipes",      value: swipeCount,           color: "#facc15", accent: "#facc15", glowColor: "250, 204, 21",  money: false },
  ];

  const SNAPSHOT_CARDS = [
    { label: "Total Cashback (All Time)", value: `$${totalCashback.toLocaleString()}`,           color: "#4ade80", glowColor: "74, 222, 128"  },
    { label: "Total Points Banked",       value: totalPoints.toLocaleString(),                   color: "#60a5fa", glowColor: "96, 165, 250"  },
    { label: "Avg Return Rate",           value: "2.8%",                                         color: "#a78bfa", glowColor: "167, 139, 250" },
    { label: "Money Spent on Cards",      value: `$${rewardSummary.totalSpend.toLocaleString()}`, color: "#facc15", glowColor: "250, 204, 21"  },
  ];

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <MarketTicker />
      <GlobalSpotlight gridRef={bentoRef} glowColor="120, 160, 255" spotlightRadius={360} />

      <div className="pt-4 pb-6 px-4">
        <div ref={bentoRef} className="bento-section max-w-6xl mx-auto min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 mb-8 p-1 bg-white/5 rounded-xl w-fit flex-wrap">
            {(["overview", "investments", "splits", "cards"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                  activeTab === tab ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
                }`}
              >
                {tab === "overview" ? "Overview" : tab === "investments" ? "Investments" : tab === "splits" ? "Group Splits" : "Cards"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

                {/* Metric cards */}
                <div className="grid lg:grid-cols-5 gap-3">
                  {overviewMetrics.map((item, i) => {
                    const Icon = METRIC_ICONS[item.label] ?? TrendingUp;
                    return (
                      <motion.div key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 * i }} whileHover={hoverSpring}>
                        <ParticleCard className="magic-bento-card magic-bento-card--border-glow" style={bentoCardStyle(item.glowColor)} glowColor={item.glowColor} particleCount={5} enableTilt={false}>
                          <div className="p-4">
                            <div className="h-px mb-4 rounded-full" style={{ background: `linear-gradient(90deg, ${item.accent}, transparent)` }} />
                            <div className="flex items-center justify-between mb-3">
                              <Icon size={14} color={item.accent} />
                              <span className="text-[9px] text-white/30 uppercase tracking-widest font-medium">{item.label}</span>
                            </div>
                            <p className="text-xl font-bold" style={{ color: item.color, fontFamily: "var(--font-display)" }}>
                              {item.money ? `${item.value < 0 ? "-" : "+"}$${Math.abs(item.value).toFixed(2)}` : item.value.toLocaleString()}
                            </p>
                          </div>
                        </ParticleCard>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Monthly chart */}
                <div className={sectionClass}>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="h-px w-16 mb-2 rounded-full" style={{ background: "linear-gradient(90deg, #60a5fa, transparent)" }} />
                      <h3 className="font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>Monthly Activity</h3>
                      <p className="text-xs text-white/40">Rewards + Spend + Investments</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-400" /><span className="text-white/40">Rewards</span></span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400" /><span className="text-white/40">Spend</span></span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400" /><span className="text-white/40">Investments</span></span>
                    </div>
                  </div>
                  <div className="chart-host">
                    <ReactECharts
                      option={{
                        backgroundColor: "transparent",
                        grid: { left: "3%", right: "4%", bottom: "3%", top: "10%", containLabel: true },
                        xAxis: { type: "category", data: monthlyOverviewData.map(d => d.month), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11 } },
                        yAxis: { type: "value", axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "rgba(255,255,255,0.3)", fontSize: 11, formatter: (v: number) => `$${v}` }, splitLine: { lineStyle: { color: "rgba(255,255,255,0.06)", type: "dashed" } } },
                        tooltip: { backgroundColor: "rgba(26,26,46,0.95)", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, textStyle: { color: "white", fontSize: 12 }, formatter: (params: EChartTooltipParam | EChartTooltipParam[]) => Array.isArray(params) ? params.map(p => `${p.seriesName}: $${p.value}`).join("<br/>") : `${params.seriesName}: $${params.value}` },
                        legend: { show: false },
                        series: [
                          { name: "Rewards",     type: "bar", data: monthlyOverviewData.map(d => d.rewards),     itemStyle: { color: "#4ade80", borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 100,       emphasis: { itemStyle: { shadowColor: "rgba(74,222,128,0.5)",  shadowBlur: 10 } } },
                          { name: "Spend",       type: "bar", data: monthlyOverviewData.map(d => d.spend),       itemStyle: { color: "#60a5fa", borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 100 + 200, emphasis: { itemStyle: { shadowColor: "rgba(96,165,250,0.5)",  shadowBlur: 10 } } },
                          { name: "Investments", type: "bar", data: monthlyOverviewData.map(d => d.investments), itemStyle: { color: "#a78bfa", borderRadius: [4, 4, 0, 0] }, animationDelay: (i: number) => i * 100 + 400, emphasis: { itemStyle: { shadowColor: "rgba(167,139,250,0.5)", shadowBlur: 10 } } },
                        ],
                        animationEasing: "elasticOut",
                        animationDuration: 1500,
                      }}
                      className="chart-panel"
                      style={{ height: "100%", width: "100%" }}
                    />
                  </div>
                </div>

                {/* Breakeven tracker */}
                <div className={sectionClass}>
                  <div className="h-px w-16 mb-3 rounded-full" style={{ background: "linear-gradient(90deg, #facc15, transparent)" }} />
                  <h3 className="font-semibold text-white mb-1" style={{ fontFamily: "var(--font-display)" }}>Annual Fee Breakeven Tracker</h3>
                  <p className="text-xs text-white/40 mb-5">How fast your rewards pay off each card&apos;s annual fee</p>
                  <div className="space-y-4">
                    {BREAKEVEN_CARDS.map((card, i) => (
                      <motion.div key={card.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i }} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">{card.name}</span>
                            {card.fee === 0 && <span className="text-[10px] bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded-full">No Fee</span>}
                          </div>
                          <div className="text-right">
                            {card.fee > 0
                              ? <span className="text-sm text-white/60"><span className="text-yellow-400 font-semibold">{card.months} months</span> to breakeven</span>
                              : <span className="text-sm text-green-400 font-semibold">Always profitable</span>
                            }
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${card.pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * i }}
                            className={`h-full rounded-full ${card.fee === 0 ? "bg-green-400" : card.months <= 2 ? "bg-gradient-to-r from-green-400 to-emerald-400" : card.months <= 4 ? "bg-gradient-to-r from-yellow-400 to-orange-400" : "bg-gradient-to-r from-red-400 to-pink-400"}`}
                          />
                        </div>
                        {card.fee > 0 && <p className="text-[10px] text-white/30">${card.fee} annual fee · ${card.monthlyEarnings}/mo earned</p>}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Total wealth snapshot */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {SNAPSHOT_CARDS.map((s) => (
                    <motion.div key={s.label} whileHover={hoverSpring}>
                      <ParticleCard className="magic-bento-card magic-bento-card--border-glow" style={bentoCardStyle(s.glowColor)} glowColor={s.glowColor} particleCount={4} enableTilt={false}>
                        <div className="p-4">
                          <div className="h-px mb-3 rounded-full" style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }} />
                          <p className="text-2xl font-bold" style={{ color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</p>
                          <p className="text-xs text-white/40 mt-1">{s.label}</p>
                        </div>
                      </ParticleCard>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── INVESTMENTS ── */}
            {activeTab === "investments" && (
              <motion.div key="investments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                {(() => {
                  const groups = getTranchesGroupedByMonth();
                  if (groups.length === 0) {
                    return (
                      <motion.div whileHover={hoverSpring}>
                        <ParticleCard className="magic-bento-card magic-bento-card--border-glow" style={bentoCardStyle("167, 139, 250")} glowColor="167, 139, 250" particleCount={3} enableTilt={false}>
                          <div className="p-8 text-center">
                            <div className="h-px w-12 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #a78bfa, transparent)" }} />
                            <p className="text-white/30 text-sm mb-1">No investments logged yet.</p>
                            <p className="text-white/20 text-xs">After generating a portfolio in RewardVest, tap &quot;I Invested This&quot; to track it here.</p>
                          </div>
                        </ParticleCard>
                      </motion.div>
                    );
                  }
                  return groups.map((group, gi) => {
                    const gain = group.currentValue - group.total;
                    return (
                      <motion.div key={group.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 * gi }} whileHover={hoverSpring}>
                        <ParticleCard className="magic-bento-card magic-bento-card--border-glow" style={bentoCardStyle("167, 139, 250")} glowColor="167, 139, 250" particleCount={5} enableTilt={false}>
                          <div className="p-6">
                            <div className="h-px mb-5 rounded-full" style={{ background: "linear-gradient(90deg, #a78bfa, transparent)" }} />
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>{group.label}</h3>
                                <p className="text-xs text-white/40">{group.tranches.length} tranche{group.tranches.length !== 1 ? "s" : ""}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-purple-400" style={{ fontFamily: "var(--font-display)" }}>${group.currentValue.toFixed(2)}</p>
                                <p className="text-xs" style={{ color: gain >= 0 ? "#4ade80" : "#f87171" }}>
                                  {gain >= 0 ? "+" : "−"}${Math.abs(gain).toFixed(2)} ({gain >= 0 ? "+" : "−"}{group.total > 0 ? Math.abs((gain / group.total) * 100).toFixed(2) : "0.00"}%)
                                </p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              {group.tranches.map((t) => {
                                const tv    = t.amount * Math.pow(1 + t.blendedReturn / 100, (Date.now() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24 * 365));
                                const tGain = tv - t.amount;
                                return (
                                  <div key={t.id} className="p-3 rounded-xl bg-white/5 border border-white/8">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <span className="text-sm font-semibold text-white">${t.amount.toFixed(2)}</span>
                                        <span className="text-xs text-white/40 ml-2">invested {t.date}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-sm font-bold text-purple-400">${tv.toFixed(2)}</span>
                                        <span className="text-xs ml-1.5" style={{ color: tGain >= 0 ? "#4ade80" : "#f87171" }}>
                                          {tGain >= 0 ? "+" : "−"}${Math.abs(tGain).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {t.allocations.map((a) => (
                                        <span key={a.ticker} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">{a.ticker} {a.pct}%</span>
                                      ))}
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">{t.blendedReturn.toFixed(1)}% blended</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/8 flex justify-between text-xs text-white/40">
                              <span>Total invested: <span className="text-white/60 font-medium">${group.total.toFixed(2)}</span></span>
                              <span>Current value: <span className="text-purple-400 font-medium">${group.currentValue.toFixed(2)}</span></span>
                            </div>
                          </div>
                        </ParticleCard>
                      </motion.div>
                    );
                  });
                })()}
              </motion.div>
            )}

            {/* ── SPLITS ── */}
            {activeTab === "splits" && (
              <motion.div key="splits" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

                {/* Balance Summary */}
                <div className={sectionClass}>
                  <div className="h-px w-16 mb-3 rounded-full" style={{ background: "linear-gradient(90deg, #a78bfa, transparent)" }} />
                  <div className="flex items-center gap-2 mb-5">
                    <Users size={14} className="text-purple-400" />
                    <h3 className="font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>Balance Summary</h3>
                  </div>
                  <div className="grid lg:grid-cols-3 gap-4">
                    {GROUP_MEMBERS.map((m, i) => {
                      const glowColor = m.owes > 0 ? "248, 113, 113" : "74, 222, 128";
                      const accent    = m.owes > 0 ? "#f87171" : "#4ade80";
                      return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }} whileHover={hoverSpring}>
                          <ParticleCard className="magic-bento-card magic-bento-card--border-glow" style={bentoCardStyle(glowColor)} glowColor={glowColor} particleCount={4} enableTilt={false}>
                            <div className="p-4">
                              <div className="h-px mb-4 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold shrink-0">
                                  {m.avatar}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">{m.name}</p>
                                  <p className="text-[10px] text-white/40">Suggested: {m.cardSuggestion}</p>
                                </div>
                              </div>
                              <p className="text-xl font-bold" style={{ color: accent, fontFamily: "var(--font-display)" }}>
                                {m.owes > 0 ? "owes you" : "you owe"} ${Math.abs(m.owes).toFixed(2)}
                              </p>
                              <button className="mt-3 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-all">
                                Send Reminder
                              </button>
                            </div>
                          </ParticleCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Expense list */}
                <div className={sectionClass}>
                  <div className="h-px w-16 mb-3 rounded-full" style={{ background: "linear-gradient(90deg, #60a5fa, transparent)" }} />
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Receipt size={14} className="text-blue-400" />
                      <h3 className="font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>Group Expenses</h3>
                    </div>
                    <button className="text-xs text-green-400 border border-green-400/30 px-3 py-1.5 rounded-lg hover:bg-green-400/10 transition-all">
                      + Add Expense
                    </button>
                  </div>
                  <div className="space-y-3">
                    {GROUP_EXPENSES.map((exp, i) => {
                      const settled   = settledIds.has(exp.id);
                      const glowColor = settled ? "255, 255, 255" : "96, 165, 250";
                      return (
                        <motion.div key={exp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} whileHover={settled ? undefined : hoverSpring}>
                          <ParticleCard
                            className="magic-bento-card magic-bento-card--border-glow"
                            style={{ ...bentoCardStyle(glowColor), opacity: settled ? 0.45 : 1 } as CSSProperties}
                            glowColor={glowColor}
                            particleCount={settled ? 0 : 4}
                            enableTilt={false}
                          >
                            <div className="p-4">
                              {!settled && <div className="h-px mb-3 rounded-full" style={{ background: "linear-gradient(90deg, #60a5fa, transparent)" }} />}
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <p className="text-sm font-semibold text-white">{exp.description}</p>
                                  <p className="text-xs text-white/40">Total: <span style={{ fontFamily: "var(--font-display)" }}>${exp.total.toFixed(2)}</span></p>
                                </div>
                                {!settled
                                  ? <button onClick={() => setSettledIds(s => new Set([...s, exp.id]))} className="text-xs text-green-400 border border-green-400/30 px-3 py-1 rounded-lg hover:bg-green-400/10 transition-all">Settle</button>
                                  : <span className="text-xs text-white/30">✓ Settled</span>
                                }
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {exp.splits.map(split => (
                                  <div key={split.name} className={`px-3 py-1.5 rounded-full text-xs border ${split.paid ? "bg-green-400/10 border-green-400/20 text-green-400" : "bg-red-400/10 border-red-400/20 text-red-400"}`}>
                                    {split.name}: ${split.amount.toFixed(2)} {split.paid ? "✓" : "pending"}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </ParticleCard>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── CARDS ── */}
            {activeTab === "cards" && (
              <motion.div key="cards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                {apiCards.length === 0 && (
                  <motion.div whileHover={hoverSpring}>
                    <ParticleCard className="magic-bento-card magic-bento-card--border-glow" style={bentoCardStyle("74, 222, 128")} glowColor="74, 222, 128" particleCount={3} enableTilt={false}>
                      <div className="p-8 text-center">
                        <div className="h-px w-12 mx-auto mb-4 rounded-full" style={{ background: "linear-gradient(90deg, transparent, #4ade80, transparent)" }} />
                        <Wallet size={24} className="text-white/20 mx-auto mb-2" />
                        <p className="text-white/30 text-sm">No cards linked yet.</p>
                        <p className="text-white/20 text-xs mt-1">Add a card via SmartSwipe to see it here.</p>
                      </div>
                    </ParticleCard>
                  </motion.div>
                )}
                {apiCards.map((card, i) => {
                  const fee    = card.annualFee ?? 0;
                  const pv     = card.pointValuation ?? 1;
                  const pts    = rewardSummary.cards[card.id]?.totalPoints ?? 0;
                  const spend  = rewardSummary.cards[card.id]?.totalSpend ?? 0;
                  const linked = linkedMeta[card.id];
                  const last4  = linked?.plaidMask ?? "0000";
                  const accentHex = cardAccent(card.id);
                  return (
                    <motion.div key={card.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }} whileHover={hoverSpring}>
                      <ParticleCard className="magic-bento-card magic-bento-card--border-glow" style={bentoCardStyle("74, 222, 128")} glowColor="74, 222, 128" particleCount={5} enableTilt={false}>
                        <div className="p-5">
                          <div className="h-px mb-4 rounded-full" style={{ background: `linear-gradient(90deg, ${accentHex}, transparent)` }} />
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accentHex }} />
                                <p className="text-base font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                                  {linked?.cardIssuer ?? card.cardIssuer} {linked?.cardName ?? card.cardName}
                                </p>
                                {fee === 0 && <span className="text-[10px] bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full">No Fee</span>}
                              </div>
                              <p className="text-xs text-white/40">••••{last4} · {card.cardNetwork}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-400" style={{ fontFamily: "var(--font-display)" }}>
                                ${(rewardSummary.cards[card.id]?.totalEarned ?? 0).toLocaleString()}
                              </p>
                              <p className="text-xs text-white/40">total earned</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-3 lg:grid-cols-6 gap-2">
                            {Object.entries(card.rewardRates).map(([cat, rate]) => (
                              <div key={cat} className="p-2 rounded-lg bg-white/5 text-center">
                                <p className="text-sm font-bold text-white">{rate}x</p>
                                <p className="text-[10px] text-white/40 capitalize">{cat}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 flex gap-4 text-xs text-white/40">
                            {fee > 0 && <span>${fee}/yr fee</span>}
                            {pts > 0 && <span>{pts.toLocaleString()} pts (${((pts * pv) / 100).toFixed(0)} value)</span>}
                            <span>${spend.toLocaleString()} spent</span>
                            {card.isCashback && <span>Flat cashback</span>}
                          </div>
                        </div>
                      </ParticleCard>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
