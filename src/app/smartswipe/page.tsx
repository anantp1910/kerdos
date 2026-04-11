"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import MarketTicker from "@/components/MarketTicker";
import { getLinkedCardIds } from "@/lib/linkedCards";

const CATEGORIES = [
  { id: "dining",        label: "Dining",       icon: "🍽️" },
  { id: "groceries",     label: "Groceries",    icon: "🛒" },
  { id: "travel",        label: "Travel",       icon: "✈️" },
  { id: "gas",           label: "Gas",          icon: "⛽" },
  { id: "entertainment", label: "Entertainment",icon: "🎬" },
  { id: "other",         label: "Other",        icon: "🛍️" },
];

type ApiCard = {
  id: string; cardKey: string; cardName: string; cardIssuer: string;
  cardNetwork: string; annualFee: number; pointValuation: number;
  isCashback: boolean; baseSpendEarnCurrency: string;
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

  const activeCards = linkedCardIds
    ? cards.filter(c => linkedCardIds.includes(c.id))
    : cards;

  useEffect(() => {
    fetch("/api/rewards")
      .then(r => r.json())
      .then(setCards)
      .catch(() => setCards([]))
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

  const best = results?.[0];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <div className="px-4 pt-12 pb-3">
        <span className="text-[10px] font-bold tracking-widest" style={{ color: "var(--green)" }}>SMARTSWIPE</span>
        <h1 className="text-2xl font-bold text-white mt-1">Best Card Recommender</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>
          {loading
            ? "Loading live reward rates..."
            : linkedCardIds
              ? `${activeCards.length} linked card${activeCards.length !== 1 ? "s" : ""} via Plaid`
              : "Enter a purchase — we rank every card instantly."}
        </p>
      </div>

      <MarketTicker />

      <div className="px-4 pt-4 space-y-3 pb-6">

        {/* Amount input */}
        <div className="fid-card px-4 py-4">
          <p className="text-xs mb-2 font-semibold" style={{ color: "var(--text-2)" }}>AMOUNT</p>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-light" style={{ color: "var(--text-2)" }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-3xl font-bold text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Merchant input */}
        <div className="fid-card px-4 py-4">
          <p className="text-xs mb-2 font-semibold" style={{ color: "var(--text-2)" }}>MERCHANT (optional)</p>
          <input
            type="text"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            placeholder="e.g. Nobu, Whole Foods, Delta..."
            className="w-full bg-transparent text-sm text-white focus:outline-none"
            style={{ caretColor: "var(--green)" }}
          />
        </div>

        {/* Category grid */}
        <div className="fid-card p-4">
          <p className="text-xs mb-3 font-semibold" style={{ color: "var(--text-2)" }}>CATEGORY</p>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all"
                style={{
                  background: category === cat.id ? "var(--green-dim)" : "var(--surface-2)",
                  borderColor: category === cat.id ? "var(--green)" : "transparent",
                }}
              >
                <span className="text-xl">{cat.icon}</span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: category === cat.id ? "var(--green)" : "var(--text-2)" }}
                >
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={parsedAmount <= 0 || isAnalyzing || loading}
          className="w-full py-4 rounded-2xl text-black font-bold text-base transition-all disabled:opacity-40"
          style={{ background: "var(--green)" }}
        >
          {isAnalyzing ? "Analyzing..." : "Find Best Card →"}
        </button>

        {/* Results */}
        <AnimatePresence>
          {results && best && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Winner */}
              <div className="fid-card p-4" style={{ borderLeft: "3px solid var(--green)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} color="var(--green)" />
                  <span className="text-xs font-bold tracking-widest" style={{ color: "var(--green)" }}>
                    BEST CARD
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold text-white">{best.card.cardIssuer}</p>
                    <p className="text-sm" style={{ color: "var(--text-2)" }}>{best.card.cardName}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-2)" }}>
                      {best.rate}x on {category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: "var(--green)" }}>
                      ${best.score.toFixed(2)}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-2)" }}>earned back</p>
                  </div>
                </div>
              </div>

              {/* All cards ranked */}
              <div className="fid-card p-4">
                <p className="text-xs font-bold mb-4" style={{ color: "var(--text-2)" }}>ALL CARDS RANKED</p>
                <div className="space-y-4">
                  {results.map((r, i) => (
                    <motion.div
                      key={r.card.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                            style={{
                              background: i === 0 ? "var(--green)" : "var(--surface-2)",
                              color: i === 0 ? "#000" : "var(--text-2)",
                            }}
                          >
                            {i + 1}
                          </span>
                          <div>
                            <span className="text-sm text-white font-medium">{r.card.cardIssuer}</span>
                            <span className="text-xs ml-1" style={{ color: "var(--text-2)" }}>
                              {r.card.cardName}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: i === 0 ? "var(--green)" : "var(--text-2)" }}
                          >
                            ${r.score.toFixed(2)}
                          </span>
                          <span className="text-xs ml-1" style={{ color: "var(--text-3)" }}>
                            ({r.rate}x)
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(r.score / barMax) * 100}%` }}
                          transition={{ duration: 0.5, delay: i * 0.06 }}
                          className="h-full rounded-full"
                          style={{ background: i === 0 ? "var(--green)" : "var(--surface-3)" }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* AI insight */}
              <div className="fid-card p-4">
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-2)" }}>
                  AI INSIGHT
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-2)" }}>
                  Using{" "}
                  <span className="text-white font-semibold">
                    {best.card.cardIssuer} {best.card.cardName}
                  </span>{" "}
                  earns{" "}
                  <span style={{ color: "var(--green)" }} className="font-semibold">
                    ${best.score.toFixed(2)}
                  </span>{" "}
                  —{" "}
                  <span className="text-white font-semibold">
                    ${(best.score - (results[results.length - 1]?.score ?? 0)).toFixed(2)} more
                  </span>{" "}
                  than your worst card.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
