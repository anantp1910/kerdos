"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/MarketTicker";
import { USER_CARDS } from "@/lib/userCards";
import { getLinkedCardIds } from "@/lib/linkedCards";

const CATEGORIES = [
  { id: "dining",        label: "Dining",       icon: "🍽️" },
  { id: "groceries",    label: "Groceries",     icon: "🛒" },
  { id: "travel",       label: "Travel",        icon: "✈️" },
  { id: "gas",          label: "Gas",           icon: "⛽" },
  { id: "entertainment",label: "Entertainment", icon: "🎬" },
  { id: "other",        label: "Other",         icon: "🛍️" },
];

type ApiCard = {
  id: string;
  cardKey: string;
  cardName: string;
  cardIssuer: string;
  cardNetwork: string;
  annualFee: number;
  pointValuation: number;
  isCashback: boolean;
  baseSpendEarnCurrency: string;
  rewardRates: Record<string, number>;
};

type CardResult = { card: ApiCard; score: number; rate: number };

function rankCards(cards: ApiCard[], category: string, amount: number): CardResult[] {
  return cards.map(card => {
    const rate = card.rewardRates[category] ?? card.rewardRates["other"] ?? 1;
    const score = card.isCashback
      ? (rate / 100) * amount
      : (rate / 100) * (card.pointValuation ?? 1) * amount;
    return { card, score, rate };
  }).sort((a, b) => b.score - a.score);
}

export default function SmartSwipePage() {
  const [cards,         setCards]         = useState<ApiCard[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [amount,        setAmount]        = useState("");
  const [merchant,      setMerchant]      = useState("");
  const [category,      setCategory]      = useState("dining");
  const [results,       setResults]       = useState<CardResult[] | null>(null);
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [linkedCardIds, setLinkedCardIds] = useState<string[] | null>(null);

  const parsedAmount = parseFloat(amount) || 0;
  const barMax = results?.[0]?.score ?? 1;

  // Cards filtered to only Plaid-linked ones (or all if none linked)
  const activeCards = linkedCardIds
    ? cards.filter(c => linkedCardIds.includes(c.id))
    : cards;

  useEffect(() => {
    fetch("/api/rewards")
      .then(r => r.json())
      .then(setCards)
      .finally(() => setLoading(false));
    setLinkedCardIds(getLinkedCardIds());
  }, []);

  const analyze = () => {
    if (parsedAmount <= 0 || !activeCards.length) return;
    setIsAnalyzing(true);
    setResults(null);
    setTimeout(() => {
      setResults(rankCards(activeCards, category, parsedAmount));
      setIsAnalyzing(false);
    }, 600);
  };

  const reset = () => { setResults(null); setAmount(""); setMerchant(""); };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <MarketTicker />

      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs font-bold text-green-400 tracking-widest">SMARTSWIPE</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Best Card Recommender</h1>
          <p className="text-white/40 mt-2 text-lg">Enter a purchase — we rank every card instantly.</p>
          {loading
            ? <p className="text-xs text-white/20 mt-2">Loading live reward rates...</p>
            : linkedCardIds
              ? <p className="text-xs text-green-400 mt-2">Ranking {activeCards.length} linked card{activeCards.length !== 1 ? "s" : ""} via Plaid</p>
              : <p className="text-xs text-white/20 mt-2">Ranking all 5 cards · <a href="/" className="underline hover:text-white/40 transition-colors">Connect via Plaid</a> to use only yours</p>
          }
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* Left — inputs */}
          <div className="space-y-4">

            {/* Amount */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/8"
            >
              <label className="block text-[10px] text-white/40 tracking-[3px] font-bold mb-3">TRANSACTION AMOUNT</label>
              <div className="flex items-center gap-2">
                <span className="text-4xl text-white/30 font-bold">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 bg-transparent text-5xl font-bold text-white focus:outline-none placeholder-white/10"
                  placeholder="0.00"
                  min="0"
                />
              </div>
            </motion.div>

            {/* Merchant */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/8"
            >
              <label className="block text-[10px] text-white/40 tracking-[3px] font-bold mb-3">MERCHANT (OPTIONAL)</label>
              <input
                type="text"
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
                className="w-full bg-transparent text-white focus:outline-none placeholder-white/20 text-base border-b border-white/10 pb-2"
                placeholder="e.g. Nobu, Whole Foods, Delta..."
              />
            </motion.div>

            {/* Category */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl bg-white/[0.03] border border-white/8"
            >
              <label className="block text-[10px] text-white/40 tracking-[3px] font-bold mb-3">PURCHASE CATEGORY</label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setResults(null); }}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-200 ${
                      category === cat.id
                        ? "bg-green-400/10 border-green-400/50 text-green-400"
                        : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs font-semibold">{cat.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Analyze button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
              whileHover={{ scale: parsedAmount > 0 ? 1.02 : 1 }}
              whileTap={{ scale: parsedAmount > 0 ? 0.97 : 1 }}
              onClick={analyze}
              disabled={parsedAmount <= 0 || isAnalyzing || loading || activeCards.length === 0}
              className="w-full py-5 rounded-2xl font-bold text-lg transition-all duration-200 disabled:cursor-not-allowed bg-green-400 hover:bg-green-300 text-black disabled:bg-white/5 disabled:text-white/20"
            >
              {isAnalyzing ? "Analyzing..." : loading ? "Loading rates..." : "Analyze My Cards →"}
            </motion.button>

          </div>

          {/* Right — results */}
          <div>
            <AnimatePresence mode="wait">
              {results ? (
                <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

                  {/* Winner */}
                  <div className="p-6 rounded-2xl border border-green-400/25 bg-gradient-to-br from-green-400/10 to-cyan-400/5">
                    <p className="text-[10px] font-bold text-green-400 tracking-[3px] mb-4">⚡ BEST CARD</p>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-2xl font-bold text-white">{results[0].card.cardIssuer}</p>
                        <p className="text-sm text-white/50 mt-0.5">{results[0].card.cardName}</p>
                        <p className="text-4xl font-bold text-green-400 mt-3">${results[0].score.toFixed(2)}</p>
                        <p className="text-xs text-white/40 mt-1">
                          {results[0].rate}x on {CATEGORIES.find(c => c.id === category)?.label} · ••••{USER_CARDS[results[0].card.id]?.last4}
                        </p>
                        <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-green-400/15 border border-green-400/20">
                          <span className="text-xs font-bold text-green-400">
                            +${(results[0].score - results[results.length - 1].score).toFixed(2)} vs worst card
                          </span>
                        </div>
                      </div>
                      <div className="w-24 h-14 rounded-xl bg-white/5 border border-green-400/20 flex flex-col justify-end p-2">
                        <p className="text-[9px] text-white/40 font-semibold">{results[0].card.cardNetwork}</p>
                        <p className="text-xs text-white font-bold mt-0.5">••••{USER_CARDS[results[0].card.id]?.last4}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ranked list */}
                  <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8 space-y-4">
                    <p className="text-[10px] font-bold text-white/40 tracking-[3px]">ALL CARDS RANKED</p>
                    {results.map((r, i) => (
                      <motion.div key={r.card.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? "bg-green-400 text-black" : "bg-white/10 text-white/40"}`}>
                              {i + 1}
                            </span>
                            <span className="text-sm text-white/80">
                              {r.card.cardIssuer} <span className="text-white/40">{r.card.cardName}</span>
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold ${i === 0 ? "text-green-400" : "text-white/50"}`}>
                              ${r.score.toFixed(2)}
                            </span>
                            <span className="text-xs text-white/25 ml-1">{r.rate}x</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(r.score / barMax) * 100}%` }}
                            transition={{ duration: 0.6, delay: 0.1 * i }}
                            className={`h-full rounded-full ${i === 0 ? "bg-gradient-to-r from-green-400 to-cyan-400" : "bg-white/15"}`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* AI insight */}
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-xs font-bold text-blue-400 mb-1">🤖 CardIQ Insight</p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      Using <strong className="text-white">{results[0].card.cardIssuer} {results[0].card.cardName}</strong> earns{" "}
                      <strong className="text-green-400">${results[0].score.toFixed(2)}</strong> on this ${parsedAmount.toFixed(2)}{" "}
                      {CATEGORIES.find(c => c.id === category)?.label.toLowerCase()} purchase —{" "}
                      <strong className="text-white">${(results[0].score - results[results.length - 1].score).toFixed(2)} more</strong> than your worst card.
                    </p>
                  </div>

                  <button onClick={reset} className="w-full py-3 text-sm text-white/30 hover:text-white/60 transition-colors">
                    ← New Analysis
                  </button>

                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-white/10 text-center p-8"
                >
                  <div className="text-5xl mb-4">💳</div>
                  <p className="text-white/30 text-sm">Enter an amount and category, then click Analyze.</p>
                  <div className="mt-8 flex gap-2">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        className="w-16 h-10 rounded-lg bg-white/5 border border-white/10"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
