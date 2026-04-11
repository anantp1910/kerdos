"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import MarketTicker from "@/components/MarketTicker";
import { USER_CARDS } from "@/lib/userCards";

const GROUP_MEMBERS = [
  { id: 'u1', name: 'Arjun', avatar: 'AJ', owes:  128.5,  cardSuggestion: 'Amex Gold'      },
  { id: 'u2', name: 'Priya', avatar: 'PR', owes: -45.0,   cardSuggestion: 'Chase Sapphire' },
  { id: 'u3', name: 'Zara',  avatar: 'ZK', owes:  92.3,   cardSuggestion: 'Citi Double'    },
];

const MONTHLY_DATA = [
  { month: "Nov", rewards: 210, savings: 580, investment: 48 },
  { month: "Dec", rewards: 290, savings: 640, investment: 72 },
  { month: "Jan", rewards: 245, savings: 590, investment: 55 },
  { month: "Feb", rewards: 310, savings: 710, investment: 88 },
  { month: "Mar", rewards: 318, savings: 695, investment: 95 },
  { month: "Apr", rewards: 340, savings: 720, investment: 112 },
];

const BREAKEVEN_CARDS = [
  { name: "Amex Gold", fee: 250, monthlyEarnings: 120, months: 2.1, pct: 100 },
  { name: "Chase Sapphire", fee: 95, monthlyEarnings: 29.5, months: 3.2, pct: 31 },
  { name: "Capital Venture", fee: 95, monthlyEarnings: 38, months: 2.5, pct: 26 },
  { name: "Citi Double", fee: 0, monthlyEarnings: 22, months: 0, pct: 100 },
  { name: "Discover it", fee: 0, monthlyEarnings: 14, months: 0, pct: 100 },
];

const NET_SCORE_ITEMS = [
  { label: "Cashback Earned", value: 340, color: "#4ade80", icon: "💳" },
  { label: "Savings vs Debit", value: 284, color: "#60a5fa", icon: "💰" },
  { label: "Investment Returns", value: 112, color: "#a78bfa", icon: "📈" },
  { label: "Card Fee Cost", value: -89, color: "#f87171", icon: "📋" },
  { label: "Signup Bonus Progress", value: 200, color: "#facc15", icon: "🎁" },
];

type SplitItem = { id: string; description: string; total: number; splits: { name: string; amount: number; paid: boolean }[] };

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

export default function WealthSplitPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "splits" | "cards">("overview");
  const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
  const [apiCards, setApiCards] = useState<ApiCard[]>([]);

  useEffect(() => {
    fetch("/api/rewards")
      .then(r => r.json())
      .then(setApiCards)
      .catch(() => {});
  }, []);

  const netScore      = NET_SCORE_ITEMS.reduce((s, i) => s + i.value, 0);
  const totalCashback = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);
  const totalPoints   = Object.values(USER_CARDS).reduce((s, c) => s + c.pointsBalance, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-3">
        <span className="text-[10px] font-bold tracking-widest" style={{ color: "#bf5af2" }}>SUMMARY</span>
        <h1 className="text-2xl font-bold text-white mt-1">Financial Command Center</h1>
      </div>
      <MarketTicker />

      <div className="pt-4 pb-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-400 text-xs font-medium mb-4">
              ⚖️ WealthSplit
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white">
                  Financial Command Center
                </h1>
                <p className="text-white/40 mt-2 text-lg">
                  Your complete picture: savings, rewards, investments, and splits.
                </p>
              </div>
              {/* Net score */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="hidden lg:flex flex-col items-center p-5 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-400/20"
              >
                <p className="text-xs text-white/40 uppercase tracking-widest mb-1">
                  Net Score
                </p>
                <p className="text-4xl font-bold text-green-400">
                  +${netScore}
                </p>
                <p className="text-xs text-white/40 mt-1">this month</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-white/5 rounded-xl w-fit">
            {(["overview", "splits", "cards"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                  activeTab === tab
                    ? "bg-white/15 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                {tab === "overview" ? "📊 Overview" : tab === "splits" ? "🤝 Group Splits" : "💳 Cards"}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Net breakdown */}
                <div className="grid lg:grid-cols-5 gap-3">
                  {NET_SCORE_ITEMS.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 * i }}
                      className="p-4 rounded-xl bg-white/[0.03] border border-white/8 text-center"
                    >
                      <div className="text-2xl mb-2">{item.icon}</div>
                      <p
                        className="text-xl font-bold"
                        style={{ color: item.color }}
                      >
                        {item.value < 0 ? "-" : "+"}$
                        {Math.abs(item.value)}
                      </p>
                      <p className="text-[10px] text-white/40 mt-1 leading-tight">
                        {item.label}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Monthly chart */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-white">Monthly Performance</h3>
                      <p className="text-xs text-white/40">Rewards + Savings + Investment Returns</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-green-400" />
                        <span className="text-white/40">Rewards</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-400" />
                        <span className="text-white/40">Savings</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-purple-400" />
                        <span className="text-white/40">Returns</span>
                      </span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={MONTHLY_DATA} barGap={4}>
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
                        formatter={(v, name) => [
                          `$${v}`,
                          String(name).charAt(0).toUpperCase() + String(name).slice(1),
                        ]}
                      />
                      <Bar dataKey="rewards" fill="#4ade80" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="savings" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="investment" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Breakeven tracker */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <h3 className="font-semibold text-white mb-1">
                    Annual Fee Breakeven Tracker
                  </h3>
                  <p className="text-xs text-white/40 mb-5">
                    How fast your rewards pay off each card&apos;s annual fee
                  </p>
                  <div className="space-y-4">
                    {BREAKEVEN_CARDS.map((card, i) => (
                      <motion.div
                        key={card.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 * i }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">{card.name}</span>
                            {card.fee === 0 && (
                              <span className="text-[10px] bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded-full">
                                No Fee
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            {card.fee > 0 ? (
                              <span className="text-sm text-white/60">
                                <span className="text-yellow-400 font-semibold">
                                  {card.months} months
                                </span>{" "}
                                to breakeven
                              </span>
                            ) : (
                              <span className="text-sm text-green-400 font-semibold">
                                Always profitable
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${card.pct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * i }}
                            className={`h-full rounded-full ${
                              card.fee === 0
                                ? "bg-green-400"
                                : card.months <= 2
                                ? "bg-gradient-to-r from-green-400 to-emerald-400"
                                : card.months <= 4
                                ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                                : "bg-gradient-to-r from-red-400 to-pink-400"
                            }`}
                          />
                        </div>
                        {card.fee > 0 && (
                          <p className="text-[10px] text-white/30">
                            ${card.fee} annual fee · ${card.monthlyEarnings}/mo earned
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Total wealth snapshot */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Cashback (All Time)", value: `$${totalCashback.toLocaleString()}`, color: "text-green-400" },
                    { label: "Total Points Banked", value: totalPoints.toLocaleString(), color: "text-blue-400" },
                    { label: "Avg Return Rate", value: "2.8%", color: "text-purple-400" },
                    { label: "Money Left on Table (saved)", value: "$0", color: "text-yellow-400" },
                  ].map((s) => (
                    <div key={s.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-white/40 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* SPLITS TAB */}
            {activeTab === "splits" && (
              <motion.div
                key="splits"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Who owes who */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <h3 className="font-semibold text-white mb-5">Balance Summary</h3>
                  <div className="grid lg:grid-cols-3 gap-4">
                    {GROUP_MEMBERS.map((m, i) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className={`p-4 rounded-xl border ${
                          m.owes > 0
                            ? "bg-red-500/5 border-red-400/20"
                            : "bg-green-500/5 border-green-400/20"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                            {m.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{m.name}</p>
                            <p className="text-[10px] text-white/40">
                              Suggested: {m.cardSuggestion}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`text-2xl font-bold ${
                            m.owes > 0 ? "text-red-400" : "text-green-400"
                          }`}
                        >
                          {m.owes > 0 ? "owes you" : "you owe"} $
                          {Math.abs(m.owes).toFixed(2)}
                        </p>
                        <button className="mt-3 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 transition-all">
                          Send Reminder
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Expense list */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-white">Group Expenses</h3>
                    <button className="text-xs text-green-400 border border-green-400/30 px-3 py-1.5 rounded-lg hover:bg-green-400/10 transition-all">
                      + Add Expense
                    </button>
                  </div>
                  <div className="space-y-4">
                    {GROUP_EXPENSES.map((exp, i) => {
                      const settled = settledIds.has(exp.id);
                      return (
                        <motion.div
                          key={exp.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 * i }}
                          className={`p-4 rounded-xl border transition-all ${
                            settled
                              ? "bg-white/[0.01] border-white/5 opacity-50"
                              : "bg-white/[0.03] border-white/10"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{exp.description}</p>
                              <p className="text-xs text-white/40">
                                Total: ${exp.total.toFixed(2)}
                              </p>
                            </div>
                            {!settled && (
                              <button
                                onClick={() =>
                                  setSettledIds((s) => new Set([...s, exp.id]))
                                }
                                className="text-xs text-green-400 border border-green-400/30 px-3 py-1 rounded-lg hover:bg-green-400/10 transition-all"
                              >
                                Settle
                              </button>
                            )}
                            {settled && (
                              <span className="text-xs text-white/30">✓ Settled</span>
                            )}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {exp.splits.map((split) => (
                              <div
                                key={split.name}
                                className={`px-3 py-1.5 rounded-full text-xs border ${
                                  split.paid
                                    ? "bg-green-400/10 border-green-400/20 text-green-400"
                                    : "bg-red-400/10 border-red-400/20 text-red-400"
                                }`}
                              >
                                {split.name}: ${split.amount.toFixed(2)}{" "}
                                {split.paid ? "✓" : "pending"}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* CARDS TAB */}
            {activeTab === "cards" && (
              <motion.div
                key="cards"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {apiCards.map((card, i) => {
                  const uc  = USER_CARDS[card.id];
                  const fee = card.annualFee ?? 0;
                  const pv  = card.pointValuation ?? 1;
                  const pts = uc?.pointsBalance ?? 0;
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.08 * i }}
                      className="p-5 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-base font-bold text-white">{card.cardIssuer} {card.cardName}</p>
                            {fee === 0 && (
                              <span className="text-[10px] bg-green-400/10 text-green-400 px-2 py-0.5 rounded-full">
                                No Annual Fee
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/40">
                            ••••{uc?.last4 ?? '0000'} · {card.cardNetwork}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-400">
                            ${(uc?.totalEarned ?? 0).toLocaleString()}
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
                        {card.isCashback && <span>Flat cashback</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
