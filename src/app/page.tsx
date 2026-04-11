"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/MarketTicker";
import HealthOrb from "@/components/HealthOrb";
import PlaidConnect from "@/components/PlaidConnect";
import { USER_CARDS } from "@/lib/userCards";
import { getLinkedCardIds } from "@/lib/linkedCards";

const RECENT_TRANSACTIONS = [
  { id: 't1', cardId: 'amex-gold',      merchant: 'Nobu Restaurant',  date: 'Apr 10', category: 'dining',        amount: 148.5,  cashback: 11.88 },
  { id: 't2', cardId: 'amex-gold',      merchant: 'Whole Foods',      date: 'Apr 9',  category: 'groceries',     amount: 89.32,  cashback: 7.15  },
  { id: 't3', cardId: 'chase-sapphire', merchant: 'Delta Airlines',   date: 'Apr 8',  category: 'travel',        amount: 420.0,  cashback: 43.05 },
  { id: 't4', cardId: 'discover-it',    merchant: 'Shell Station',    date: 'Apr 7',  category: 'gas',           amount: 62.4,   cashback: 6.24  },
  { id: 't5', cardId: 'discover-it',    merchant: 'AMC Theaters',     date: 'Apr 6',  category: 'entertainment', amount: 34.0,   cashback: 3.4   },
];

const FEATURES = [
  {
    href: "/smartswipe",
    icon: "💳",
    title: "SmartSwipe",
    subtitle: "Best Card Recommender",
    description:
      "Before any purchase, know exactly which card earns you the most — cashback, points, and avios ranked instantly.",
    color: "from-green-500/20 to-emerald-500/10",
    border: "border-green-500/20 hover:border-green-400/50",
    accent: "text-green-400",
    stat: "+$847 earned this month",
  },
  {
    href: "/rewardvest",
    icon: "📈",
    title: "RewardVest",
    subtitle: "AI Investment Advisor",
    description:
      "Stop letting rewards sit idle. Turn every dollar of cashback into a smart micro-portfolio with live market signals.",
    color: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/20 hover:border-blue-400/50",
    accent: "text-blue-400",
    stat: "$340 ready to invest",
  },
  {
    href: "/wealthsplit",
    icon: "⚖️",
    title: "WealthSplit",
    subtitle: "Financial Command Center",
    description:
      "Splitwise meets Bloomberg. See your total savings, card fee breakeven, and group expenses — all in one view.",
    color: "from-purple-500/20 to-pink-500/10",
    border: "border-purple-500/20 hover:border-purple-400/50",
    accent: "text-purple-400",
    stat: "3.2 months to breakeven",
  },
];

const STATS = [
  { label: "Total Cashback This Month", value: "$340", change: "+12%", up: true },
  { label: "Rewards Earned (All Time)", value: "$4,970", change: "+$340", up: true },
  { label: "Card Fee Breakeven", value: "3.2 mo", change: "Chase Sapphire", up: true },
  { label: "Net Gain vs Debit", value: "$847", change: "this month", up: true },
];

export default function HomePage() {
  const [cardNames,     setCardNames]     = useState<Record<string, string>>({});
  const [linkedCardIds, setLinkedCardIds] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/rewards")
      .then(r => r.json())
      .then((cards: { id: string; cardName: string }[]) => {
        const map: Record<string, string> = {};
        cards.forEach(c => { map[c.id] = c.cardName; });
        setCardNames(map);
      })
      .catch(() => {});
    // Load linked cards from localStorage
    setLinkedCardIds(getLinkedCardIds());
  }, []);

  const totalPoints   = Object.values(USER_CARDS).reduce((s, c) => s + c.pointsBalance, 0);
  const totalCashback = Object.values(USER_CARDS).reduce((s, c) => s + c.totalEarned, 0);
  const cardCount     = linkedCardIds ? linkedCardIds.length : Object.keys(USER_CARDS).length;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <MarketTicker />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Ambient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left — text */}
            <div className="flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-medium mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {cardCount} card{cardCount !== 1 ? "s" : ""} linked · AI active
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-5xl lg:text-6xl font-bold text-white leading-tight"
              >
                Your AI-Powered
                <br />
                <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  Credit Card Brain
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-6 text-lg text-white/50 max-w-xl"
              >
                Swipe smart. Invest smarter. Track everything. CardIQ turns 5
                credit cards into one financial flywheel.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start"
              >
                <Link
                  href="/smartswipe"
                  className="px-6 py-3 bg-green-400 hover:bg-green-300 text-black font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-green-400/20"
                >
                  Start SmartSwiping →
                </Link>
                <Link
                  href="/wealthsplit"
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all duration-200"
                >
                  View Dashboard
                </Link>
                <PlaidConnect
                  onComplete={(mappings) => {
                    setLinkedCardIds(mappings.map(m => m.cardId));
                  }}
                />
              </motion.div>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mt-10 flex gap-8 justify-center lg:justify-start"
              >
                <div>
                  <p className="text-2xl font-bold text-white">
                    {totalPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">Total Points</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-white">
                    ${totalCashback.toLocaleString()}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">Total Earned</p>
                </div>
                <div className="w-px bg-white/10" />
                <div>
                  <p className="text-2xl font-bold text-white">{cardCount}</p>
                  <p className="text-xs text-white/40 mt-0.5">Linked Cards</p>
                </div>
              </motion.div>
            </div>

            {/* Right — Orb */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <HealthOrb score={87} />
              <div className="text-center">
                <p className="text-sm text-white/60">Optimization Score</p>
                <p className="text-xs text-green-400 mt-1">
                  ↑ 12 pts from last month
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-6 py-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="text-center lg:text-left"
            >
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              <p
                className={`text-xs mt-0.5 font-medium ${
                  stat.up ? "text-green-400" : "text-red-400"
                }`}
              >
                {stat.change}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white">The Flywheel</h2>
            <p className="text-white/40 mt-2">
              Three features. One financial brain.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * i }}
              >
                <Link href={f.href}>
                  <div
                    className={clsx(
                      "group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer h-full",
                      `bg-gradient-to-br ${f.color}`,
                      f.border
                    )}
                  >
                    <div className="text-4xl mb-4">{f.icon}</div>
                    <h3 className={`text-xl font-bold mb-1 ${f.accent}`}>
                      {f.title}
                    </h3>
                    <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">
                      {f.subtitle}
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {f.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-xs text-white/30 bg-white/5 px-3 py-1 rounded-full">
                        {f.stat}
                      </span>
                      <span className={`text-sm font-medium ${f.accent} group-hover:translate-x-1 transition-transform`}>
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent transactions */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            <span className="text-sm text-white/30">This week</span>
          </div>

          <div className="space-y-2">
            {RECENT_TRANSACTIONS.map((tx, i) => {
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                      {
                        {
                          dining: "🍽️",
                          groceries: "🛒",
                          travel: "✈️",
                          gas: "⛽",
                          entertainment: "🎬",
                          other: "🛍️",
                        }[tx.category]
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{tx.merchant}</p>
                      <p className="text-xs text-white/40">{tx.date} · {cardNames[tx.cardId] ?? tx.cardId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      -${tx.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-400">
                      +${tx.cashback.toFixed(2)} back
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function clsx(...args: (string | boolean | undefined | null)[]) {
  return args.filter(Boolean).join(" ");
}
