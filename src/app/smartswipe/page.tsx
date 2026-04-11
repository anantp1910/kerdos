"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import MarketTicker from "@/components/MarketTicker";
import CreditCardDisplay from "@/components/CreditCardDisplay";
import { CATEGORIES, getRankedCards } from "@/lib/mockData";

export default function SmartSwipePage() {
  const [amount, setAmount] = useState("100");
  const [selectedCategory, setSelectedCategory] = useState("dining");
  const [merchant, setMerchant] = useState("");
  const [showResults, setShowResults] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const ranked = getRankedCards(selectedCategory, parsedAmount);
  const best = ranked[0];

  const handleAnalyze = () => {
    setShowResults(true);
  };

  const barMax = ranked[0]?.score ?? 1;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <MarketTicker />

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-medium mb-4">
              💳 SmartSwipe
            </div>
            <h1 className="text-4xl font-bold text-white">
              Best Card Recommender
            </h1>
            <p className="text-white/40 mt-2 text-lg">
              Tell us what you&apos;re buying — we&apos;ll tell you exactly which card to use.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left — Input panel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Amount input */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
                  Transaction Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-white/40">
                    $
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-4 text-2xl font-bold text-white focus:outline-none focus:border-green-400/50 transition-colors"
                    placeholder="0.00"
                    min="0"
                  />
                </div>
              </div>

              {/* Merchant input */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
                  Merchant (optional)
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-400/50 transition-colors placeholder-white/20"
                  placeholder="e.g. Nobu, Whole Foods, Delta..."
                />
              </div>

              {/* Category selector */}
              <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                <label className="block text-xs text-white/40 uppercase tracking-widest mb-3">
                  Purchase Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                        selectedCategory === cat.id
                          ? "bg-green-400/10 border-green-400/50 text-green-400"
                          : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-xs font-medium">{cat.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalyze}
                disabled={parsedAmount <= 0}
                className="w-full py-4 bg-green-400 hover:bg-green-300 disabled:bg-white/10 disabled:text-white/20 text-black font-bold text-lg rounded-2xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                Analyze My Cards →
              </motion.button>
            </motion.div>

            {/* Right — Results */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {showResults && parsedAmount > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Winner card */}
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-400/30">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-green-400 font-bold text-sm uppercase tracking-widest">
                          ⚡ Best Card for{" "}
                          {
                            CATEGORIES.find((c) => c.id === selectedCategory)
                              ?.label
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-3xl font-bold text-white">
                            {best.card.issuer}
                          </p>
                          <p className="text-lg text-white/60 mt-0.5">
                            {best.card.name}
                          </p>
                          <p className="text-green-400 text-2xl font-bold mt-3">
                            ${best.score.toFixed(2)}
                            <span className="text-sm text-white/40 font-normal ml-2">
                              back on this purchase
                            </span>
                          </p>
                          <p className="text-sm text-white/40 mt-1">
                            {best.rate}x rewards on{" "}
                            {
                              CATEGORIES.find(
                                (c) => c.id === selectedCategory
                              )?.label
                            }{" "}
                            · ••••{best.card.last4}
                          </p>
                        </div>
                        <CreditCardDisplay
                          card={best.card}
                          isBest
                          score={best.score}
                          rate={best.rate}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* All cards ranked */}
                    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/8">
                      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">
                        All Cards Ranked
                      </h3>
                      <div className="space-y-4">
                        {ranked.map((r, i) => (
                          <motion.div
                            key={r.card.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 * i }}
                            className="space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                                    i === 0
                                      ? "bg-green-400 text-black"
                                      : "bg-white/10 text-white/40"
                                  }`}
                                >
                                  {i + 1}
                                </span>
                                <span className="text-sm text-white/80">
                                  {r.card.issuer}{" "}
                                  <span className="text-white/40">
                                    {r.card.name}
                                  </span>
                                </span>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-sm font-semibold ${
                                    i === 0 ? "text-green-400" : "text-white/60"
                                  }`}
                                >
                                  ${r.score.toFixed(2)}
                                </span>
                                <span className="text-xs text-white/30 ml-1">
                                  ({r.rate}x)
                                </span>
                              </div>
                            </div>
                            {/* Bar */}
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${(r.score / barMax) * 100}%`,
                                }}
                                transition={{ duration: 0.6, delay: 0.1 * i }}
                                className={`h-full rounded-full ${
                                  i === 0
                                    ? "bg-gradient-to-r from-green-400 to-emerald-400"
                                    : "bg-white/20"
                                }`}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* AI summary */}
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <p className="text-xs text-blue-400 font-medium mb-1">
                        🤖 CardIQ Insight
                      </p>
                      <p className="text-sm text-white/60">
                        Using <strong className="text-white">{best.card.issuer} {best.card.name}</strong> for this $
                        {parsedAmount.toFixed(2)}{" "}
                        {CATEGORIES.find((c) => c.id === selectedCategory)?.label.toLowerCase()} purchase earns you{" "}
                        <strong className="text-green-400">
                          ${best.score.toFixed(2)}
                        </strong>{" "}
                        — that&apos;s{" "}
                        <strong className="text-white">
                          $
                          {(best.score - ranked[ranked.length - 1].score).toFixed(2)} more
                        </strong>{" "}
                        than your worst card.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-80 rounded-2xl border border-dashed border-white/10 text-center p-8"
                  >
                    <div className="text-5xl mb-4">💳</div>
                    <p className="text-white/40 text-sm">
                      Enter an amount and category, then click Analyze to see
                      which card maximizes your rewards.
                    </p>
                    {/* Preview cards floating */}
                    <div className="mt-8 flex gap-2 flex-wrap justify-center">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.3,
                          }}
                          className="w-16 h-10 rounded-lg bg-white/5 border border-white/10"
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* All cards preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <h2 className="text-xl font-bold text-white mb-6">Your Linked Cards</h2>
            <div className="flex flex-wrap gap-4">
              {ranked.map((r, i) => (
                <CreditCardDisplay
                  key={r.card.id}
                  card={r.card}
                  isBest={showResults && i === 0}
                  size="md"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
