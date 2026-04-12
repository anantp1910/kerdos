"use client";

import { useState, useEffect } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, DollarSign, Zap, Utensils, ShoppingCart, Plane, Fuel, Film, Tag, CheckCircle } from "lucide-react";
import { DEMO_USER_ID } from "@/lib/demoUser";
import { MenuItem, MenuContainer } from "@/components/ui/fluid-menu";

// ── Types (from backend) ──────────────────────────────────────────────────────

type CardResult = {
  cardId: string;
  cardKey: string;
  cardName: string | null;
  issuer: string | null;
  rate: number;
  estimatedValue: number;
  rewardCurrency: string;
  reason: string;
  source: "merchant" | "category";
};

type RecommendationResponse = {
  winner: CardResult | null;
  rankings: CardResult[];
  meta: { category: string; source: "merchant" | "category"; linkedCardCount: number };
};

type RewardsSummary = { totalEarned?: number; totalPoints?: number; totalSpend?: number };

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "dining",        label: "Dining",  icon: <Utensils     size={22} strokeWidth={1.5} color="#fff" />, emoji: "🍽️" },
  { id: "groceries",     label: "Grocery", icon: <ShoppingCart size={22} strokeWidth={1.5} color="#fff" />, emoji: "🛒" },
  { id: "travel",        label: "Travel",  icon: <Plane        size={22} strokeWidth={1.5} color="#fff" />, emoji: "✈️" },
  { id: "gas",           label: "Gas",     icon: <Fuel         size={22} strokeWidth={1.5} color="#fff" />, emoji: "⛽" },
  { id: "entertainment", label: "Entmt.",  icon: <Film         size={22} strokeWidth={1.5} color="#fff" />, emoji: "🎬" },
  { id: "other",         label: "Other",   icon: <Tag          size={22} strokeWidth={1.5} color="#fff" />, emoji: "🛍️" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

function ActiveIcon({ id }: { id: CategoryId }) {
  const GREEN = "rgba(0,200,5,0.9)";
  switch (id) {
    case "dining":        return <Utensils     size={22} strokeWidth={1.8} color={GREEN} />;
    case "groceries":     return <ShoppingCart size={22} strokeWidth={1.8} color={GREEN} />;
    case "travel":        return <Plane        size={22} strokeWidth={1.8} color={GREEN} />;
    case "gas":           return <Fuel         size={22} strokeWidth={1.8} color={GREEN} />;
    case "entertainment": return <Film         size={22} strokeWidth={1.8} color={GREEN} />;
    default:              return <Tag          size={22} strokeWidth={1.8} color={GREEN} />;
  }
}

const glass = {
  background: "rgba(18,18,18,0.72)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  borderRadius: 22,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SmartSwipePage() {
  const [loading,         setLoading]         = useState(true);
  const [amount,          setAmount]          = useState("");
  const [merchant,        setMerchant]        = useState("");
  const [category,        setCategory]        = useState<CategoryId>("dining");
  const [results,         setResults]         = useState<RecommendationResponse | null>(null);
  const [isAnalyzing,     setIsAnalyzing]     = useState(false);
  const [isLogging,       setIsLogging]       = useState(false);
  const [linkedCount,     setLinkedCount]     = useState(0);
  const [summary,         setSummary]         = useState<RewardsSummary>({});
  const [error,           setError]           = useState<string | null>(null);
  const [logMessage,      setLogMessage]      = useState<string | null>(null);
  const [loggedForResult, setLoggedForResult] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const activeCat    = CATEGORIES.find(c => c.id === category) ?? CATEGORIES[0];
  const rankingList  = results?.rankings ?? [];
  const best         = results?.winner ?? null;
  const barMax       = (rankingList[0]?.estimatedValue ?? 0) > 0 ? rankingList[0].estimatedValue : 1;

  async function refreshSummary() {
    const data = await fetch(`/api/rewards/summary?userId=${DEMO_USER_ID}`, { cache: "no-store" })
      .then(r => r.json()) as RewardsSummary;
    setSummary(data);
    return data;
  }

  useEffect(() => {
    fetch(`/api/plaid/linked-cards?userId=${DEMO_USER_ID}`, { cache: "no-store" })
      .then(r => r.json())
      .then((d: { linkedCards: { cardId: string }[] }) => setLinkedCount(d.linkedCards.length))
      .catch(() => {})
      .finally(() => setLoading(false));
    refreshSummary().catch(() => {});
  }, []);

  const analyze = async () => {
    if (parsedAmount <= 0) return;
    setIsAnalyzing(true);
    setResults(null);
    setError(null);
    setLogMessage(null);
    setLoggedForResult(false);
    try {
      const res = await fetch("/api/smartswipe/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: DEMO_USER_ID, amount: parsedAmount, merchant: merchant || undefined, category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Recommendation failed");
      setResults(data as RecommendationResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recommendation failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const logSwipe = async () => {
    if (!best || !results || loggedForResult) return;
    setIsLogging(true);
    setLogMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/smartswipe/log-swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          cardId: best.cardId,
          amount: parsedAmount,
          merchant: merchant || null,
          category: results.meta.category,
          estimatedValue: best.estimatedValue,
          rate: best.rate,
          rewardCurrency: best.rewardCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to log swipe");
      const next = await refreshSummary();
      setLoggedForResult(true);
      setLogMessage(`Logged! Total rewards: $${(next.totalEarned ?? 0).toFixed(2)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to log swipe");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <motion.div
      className="flex flex-col"
      style={{ paddingTop: 72, height: "100vh" }}
      initial={{ opacity: 0, filter: "blur(8px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex flex-1" style={{ padding: "24px 36px 0", minHeight: 0, gap: 24 }}>

        {/* ── LEFT ── */}
        <div className="flex flex-col" style={{ flex: 1, gap: 12, minHeight: 0 }}>

          {/* Amount */}
          <div style={{ ...glass, flex: 1, display: "flex", alignItems: "center", padding: "0 32px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 2, background: "linear-gradient(to right, rgba(0,200,5,0.7), rgba(0,200,5,0.06))", borderRadius: "0 0 4px 4px" }} />
            <div className="flex items-center gap-3" style={{ flexShrink: 0, minWidth: 140 }}>
              <DollarSign size={16} color="rgba(0,200,5,0.9)" strokeWidth={2.5} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>Amount</span>
            </div>
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)", marginRight: 32, flexShrink: 0 }} />
            <div className="flex items-baseline gap-1.5 flex-1 justify-end">
              <span style={{ fontSize: 34, fontWeight: 300, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-display)", lineHeight: 1 }}>$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && analyze()}
                placeholder="0.00"
                className="bg-transparent focus:outline-none"
                style={{ fontSize: 48, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "-0.02em", caretColor: "var(--green)", textAlign: "right", width: "8ch", lineHeight: 1 }}
              />
            </div>
          </div>

          {/* Merchant */}
          <div style={{ ...glass, flex: 1, display: "flex", alignItems: "center", padding: "0 32px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 2, background: "linear-gradient(to right, rgba(128,236,255,0.55), rgba(128,236,255,0.06))", borderRadius: "0 0 4px 4px" }} />
            <div className="flex items-center gap-3" style={{ flexShrink: 0, minWidth: 140 }}>
              <Search size={16} color="rgba(128,236,255,0.85)" strokeWidth={2.5} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>Merchant</span>
            </div>
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)", marginRight: 32, flexShrink: 0 }} />
            <input
              type="text"
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="Nobu, Whole Foods, Delta..."
              className="bg-transparent focus:outline-none flex-1"
              style={{ fontSize: 30, fontWeight: 700, color: "#fff", fontFamily: "var(--font-display)", caretColor: "var(--green)", textAlign: "right", lineHeight: 1 }}
            />
          </div>

          {/* Category */}
          <div style={{ ...glass, flex: 0.5, display: "flex", alignItems: "center", padding: "0 32px", paddingBottom: 20, position: "relative", overflow: "visible" }}>
            <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 2, background: "linear-gradient(to right, rgba(255,255,255,0.14), rgba(255,255,255,0.02))", borderRadius: "0 0 4px 4px" }} />
            <div className="flex items-center gap-3" style={{ flexShrink: 0, minWidth: 140 }}>
              <motion.span key={category} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.18 }} style={{ fontSize: 20, lineHeight: 1 }}>
                {activeCat.emoji}
              </motion.span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>Category</span>
            </div>
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.1)", marginRight: 28, flexShrink: 0 }} />
            <div style={{ position: "relative", flexShrink: 0 }}>
              <MenuContainer activeKey={category} direction="right">
                <MenuItem icon={<ActiveIcon id={activeCat.id} />} label={activeCat.label} isActive />
                {CATEGORIES.filter(c => c.id !== category).map(cat => (
                  <MenuItem key={cat.id} icon={cat.icon} label={cat.label} onClick={() => setCategory(cat.id as CategoryId)} />
                ))}
              </MenuContainer>
            </div>
          </div>

          {/* Analyze button */}
          <motion.button
            onClick={analyze}
            disabled={parsedAmount <= 0 || isAnalyzing}
            whileHover={parsedAmount > 0 ? { scale: 1.015, boxShadow: "0 0 32px rgba(0,200,5,0.28)" } : {}}
            whileTap={parsedAmount > 0 ? { scale: 0.97 } : {}}
            style={{
              flexShrink: 0, height: 48, borderRadius: 14,
              border: parsedAmount > 0 ? "1px solid rgba(0,200,5,0.45)" : "1px solid rgba(255,255,255,0.08)",
              background: parsedAmount > 0 ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
              color: parsedAmount > 0 ? "var(--green)" : "rgba(255,255,255,0.25)",
              fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em",
              textTransform: "uppercase", cursor: parsedAmount > 0 ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "background 0.2s, color 0.2s, border-color 0.2s",
            }}
          >
            <Zap size={12} strokeWidth={2.5} />
            {isAnalyzing ? "Analyzing..." : "Find Best Card"}
          </motion.button>
        </div>

        {/* ── RIGHT ── */}
        <div className="flex flex-col" style={{ flex: 1, minHeight: 0, gap: 12 }}>

          {/* Summary strip */}
          <div style={{ ...glass, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 52, borderRadius: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              {loading ? "Loading..." : linkedCount > 0 ? `${linkedCount} card${linkedCount !== 1 ? "s" : ""} linked` : "Demo mode"}
            </span>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-display)" }}>
                {(summary.totalPoints ?? 0).toLocaleString()} pts
              </span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--green)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
                ${(summary.totalEarned ?? 0).toFixed(2)}
              </span>
              <span style={{ fontSize: 10, color: "rgba(0,200,5,0.5)", fontFamily: "var(--font-display)" }}>earned</span>
            </div>
          </div>

          {/* Output card */}
          <div style={{ ...glass, flex: 1, minHeight: 0, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 2, background: "linear-gradient(to right, rgba(0,200,5,0.45), rgba(0,200,5,0.04))", borderRadius: "0 0 4px 4px" }} />

            {/* Empty */}
            {!results && !isAnalyzing && !error && (
              <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: 10 }}>
                <Zap size={26} color="rgba(255,255,255,0.08)" strokeWidth={1.5} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>
                  Enter an amount to analyze
                </span>
              </div>
            )}

            {/* Spinner */}
            {isAnalyzing && (
              <div className="flex-1 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                  style={{ width: 26, height: 26, borderRadius: "50%", border: "2px solid rgba(0,200,5,0.15)", borderTopColor: "var(--green)" }}
                />
              </div>
            )}

            {/* Error */}
            {error && !isAnalyzing && (
              <div className="flex-1 flex items-center justify-center" style={{ padding: 24 }}>
                <span style={{ fontSize: 12, color: "rgba(255,59,48,0.8)", fontFamily: "var(--font-display)", textAlign: "center" }}>{error}</span>
              </div>
            )}

            {/* Results */}
            {results && !isAnalyzing && (
              <div className="flex flex-col flex-1 min-h-0" style={{ padding: "20px 24px 16px" }}>

                <div className="flex items-center justify-between mb-3" style={{ flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                    {activeCat.emoji} {results.meta.category} · ${parsedAmount.toFixed(2)}
                    {results.meta.source === "merchant" && (
                      <span style={{ color: "rgba(128,236,255,0.6)", marginLeft: 6 }}>via merchant</span>
                    )}
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-display)" }}>
                    {rankingList.length} ranked
                  </span>
                </div>

                {/* Winner */}
                {best && (
                  <div style={{ flexShrink: 0, padding: "14px 18px", borderRadius: 14, background: "rgba(0,200,5,0.07)", border: "1px solid rgba(0,200,5,0.22)", marginBottom: 10 }}>
                    <div className="flex items-start justify-between">
                      <div style={{ minWidth: 0, flex: 1, marginRight: 12 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(0,200,5,0.65)", letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "var(--font-display)", marginBottom: 3 }}>Top Pick</p>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {best.cardName ?? best.cardKey}
                        </p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", fontFamily: "var(--font-display)", marginTop: 1 }}>
                          {best.issuer} · {best.rate}× {best.rewardCurrency}
                        </p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "var(--font-display)", marginTop: 2, fontStyle: "italic" }}>{best.reason}</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 26, fontWeight: 800, color: "var(--green)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                          ${best.estimatedValue.toFixed(2)}
                        </p>
                        <p style={{ fontSize: 10, color: "rgba(0,200,5,0.45)", fontFamily: "var(--font-display)", marginTop: 2 }}>earned</p>
                      </div>
                    </div>

                    {/* Log swipe */}
                    <motion.button
                      onClick={logSwipe}
                      disabled={isLogging || loggedForResult}
                      whileHover={!loggedForResult ? { scale: 1.02 } : {}}
                      whileTap={!loggedForResult ? { scale: 0.97 } : {}}
                      style={{
                        marginTop: 10, width: "100%", height: 34, borderRadius: 10,
                        border: loggedForResult ? "1px solid rgba(0,200,5,0.25)" : "1px solid rgba(0,200,5,0.4)",
                        background: loggedForResult ? "rgba(0,200,5,0.05)" : "rgba(0,200,5,0.1)",
                        color: loggedForResult ? "rgba(0,200,5,0.45)" : "var(--green)",
                        fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 800,
                        letterSpacing: "0.14em", textTransform: "uppercase",
                        cursor: loggedForResult ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        transition: "all 0.2s",
                      }}
                    >
                      <CheckCircle size={11} strokeWidth={2.5} />
                      {isLogging ? "Logging..." : loggedForResult ? "Swipe Logged" : "Log This Swipe"}
                    </motion.button>

                    <AnimatePresence>
                      {logMessage && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          style={{ fontSize: 10, color: "rgba(0,200,5,0.7)", fontFamily: "var(--font-display)", marginTop: 6, textAlign: "center" }}
                        >
                          {logMessage}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Rankings */}
                <div className="flex flex-col flex-1 min-h-0 overflow-auto" style={{ gap: 6 }}>
                  {rankingList.slice(1).map(({ cardKey, cardName, issuer, rate, estimatedValue, rewardCurrency }, i) => (
                    <div key={cardKey} style={{ flexShrink: 0, display: "flex", alignItems: "center", padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)", gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.22)", fontFamily: "var(--font-display)", width: 16, textAlign: "center", flexShrink: 0 }}>{i + 2}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.8)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cardName ?? cardKey}</p>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-display)" }}>{rate}× {rewardCurrency} · {issuer}</p>
                      </div>
                      <div style={{ width: 64, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ height: "100%", width: `${(estimatedValue / barMax) * 100}%`, background: "rgba(0,200,5,0.38)", borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)", fontFamily: "var(--font-display)", minWidth: 44, textAlign: "right", flexShrink: 0 }}>${estimatedValue.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: "16.67vh", flexShrink: 0 }} />
    </motion.div>
  );
}
