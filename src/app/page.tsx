"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, useMotionValue, animate, AnimatePresence } from "framer-motion";
import { TrendingUp, Wallet, Star, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreditCard, { type CreditCardData } from "@/components/CreditCard";
import PlaidConnect from "@/components/PlaidConnect";
import { USER_CARDS } from "@/lib/userCards";
import { getLinkedCardIds, type LinkedCardMapping } from "@/lib/linkedCards";
import { getPortfolioGain } from "@/lib/investmentStore";
import { DEMO_USER_ID } from "@/lib/demoUser";

// Module-level cache — survives client-side navigation
let _cachedCards: CreditCardData[] | null = null;

const CARD_WIDTH = 270;
const CARD_GAP   = 20;
const CARD_STEP  = CARD_WIDTH + CARD_GAP;

const SPRING = { type: "spring" as const, stiffness: 420, damping: 38, mass: 1 };

export default function HomePage() {
  const [cards, setCards]         = useState<CreditCardData[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[] | null>(null);
  const [showPlaid, setShowPlaid] = useState(false);
  const [liveStats, setLiveStats] = useState<{
    lastCycleCashback: number;
    totalPoints: number;
    portfolioGain: number;
  } | null>(null);

  // Looping carousel via MotionValue
  const x         = useMotionValue(0);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Triple-render for infinite loop; re-derive when cards change
  const cards3x = useMemo(() => [...cards, ...cards, ...cards], [cards]);
  const setW    = useMemo(() => cards.length * CARD_STEP, [cards.length]);

  // Seed x to middle set once cards are loaded
  useEffect(() => {
    if (cards.length > 0) x.set(-setW);
  }, [cards.length, setW, x]);

  const loopCorrect = useCallback(() => {
    const cur = x.get();
    if (setW === 0) return;
    if (cur > -setW * 0.5)   x.set(cur - setW);
    if (cur < -setW * 1.5)   x.set(cur + setW);
  }, [x, setW]);

  const snapNearest = useCallback((vel = 0) => {
    loopCorrect();
    const raw     = x.get();
    const snapped = Math.round(raw / CARD_STEP) * CARD_STEP;
    animate(x, snapped, { ...SPRING, velocity: vel });
  }, [x, loopCorrect]);

  const stepBy = useCallback((delta: number) => {
    loopCorrect();
    const target = Math.round(x.get() / CARD_STEP - delta) * CARD_STEP;
    animate(x, target, SPRING);
  }, [x, loopCorrect]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    x.set(x.get() - e.deltaX - e.deltaY * 0.6);
    loopCorrect();
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => snapNearest(), 160);
  }, [x, loopCorrect, snapNearest]);

  const refreshCards = useCallback(async (bust = false) => {
    if (!bust && _cachedCards) {
      setCards(_cachedCards);
      return;
    }

    try {
      const apiCards: any[] = await fetch("/api/rewards").then(r => r.json());
      if (!Array.isArray(apiCards) || apiCards.length === 0) return;

      const base: CreditCardData[] = apiCards.map(c => ({
        id: c.id, issuer: c.cardIssuer ?? c.id, name: c.cardName ?? c.id,
        last4: USER_CARDS[c.id]?.last4 ?? "0000",
        network: c.cardNetwork ?? "",
        color: c.id,
        imageUrl: c.imageUrl ?? null,
        _cardKey: c.cardKey ?? c.id,
      } as any));
      setCards(base);

      const imageResults = await Promise.allSettled(
        apiCards.map(c =>
          fetch(`/api/rewards/image?cardKey=${c.cardKey ?? c.id}`)
            .then(r => r.json())
            .then((data: any) => {
              const item = Array.isArray(data) ? data[0] : data;
              return { id: c.id, imageUrl: item?.cardImageUrl ?? null };
            })
            .catch(() => ({ id: c.id, imageUrl: null }))
        )
      );

      const imageMap: Record<string, string> = {};
      for (const result of imageResults) {
        if (result.status === "fulfilled" && result.value.imageUrl) {
          imageMap[result.value.id] = result.value.imageUrl;
        }
      }

      const final = base.map(c => ({ ...c, imageUrl: imageMap[c.id] ?? (c as any).imageUrl }));
      _cachedCards = final;
      setCards(final);
    } catch {}
  }, []);

  useEffect(() => {
    setLinkedIds(getLinkedCardIds());
    refreshCards();

    // Fetch live stats from rewards summary
    fetch(`/api/rewards/summary?userId=${DEMO_USER_ID}`, { cache: "no-store" })
      .then(r => r.json())
      .then((data: {
        totalEarned?: number;
        totalPoints?: number;
        transactions?: { estimatedValue: number; createdAt: string }[];
      }) => {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
        const lastCycleCashback = (data.transactions ?? [])
          .filter(t => t.createdAt.startsWith(lastMonthKey))
          .reduce((s, t) => s + t.estimatedValue, 0);
        setLiveStats({
          lastCycleCashback,
          totalPoints: data.totalPoints ?? 0,
          portfolioGain: getPortfolioGain(),
        });
      })
      .catch(() => {});
  }, [refreshCards]);


  const gain = liveStats?.portfolioGain ?? 0;
  const STATS = [
    {
      label: "Cashback",
      value: liveStats ? `$${liveStats.lastCycleCashback.toFixed(2)}` : "—",
      delta: liveStats ? (liveStats.lastCycleCashback > 0 ? `+$${liveStats.lastCycleCashback.toFixed(2)}` : "$0.00") : "...",
      sub: "from last cycle",
      icon: Wallet,
      color: "var(--green)",
    },
    {
      label: "Points Earned",
      value: liveStats ? liveStats.totalPoints.toLocaleString() : "—",
      delta: liveStats ? `${liveStats.totalPoints.toLocaleString()} pts` : "...",
      sub: "total earned",
      icon: Star,
      color: "#80ecff",
    },
    {
      label: "Net Gain",
      value: liveStats ? `$${Math.abs(gain).toFixed(2)}` : "—",
      delta: liveStats ? `${gain >= 0 ? "+" : "-"}$${Math.abs(gain).toFixed(2)}` : "...",
      sub: "portfolio return",
      icon: TrendingUp,
      color: gain < 0 ? "var(--red, #f87171)" : "var(--green)",
    },
  ];

  return (
    <div className="overflow-hidden flex flex-col" style={{ height: "calc(100vh - 72px)" }}>

      {/* ── Band 1: Logo | Rewards ── */}
      <motion.div className="flex-1 flex flex-row min-h-0">

        {/* Left — invisible placeholder preserves layout space for the floating KerdosWordmark */}
        <div className="w-1/2 flex items-center pl-[10vw]">
          <div
            aria-hidden
            className="font-extrabold tracking-tighter leading-none select-none invisible"
            style={{ fontSize: "clamp(130px, 18vw, 220px)", fontFamily: "var(--font-display)" }}
          >
            Kerdos
          </div>
        </div>

        {/* Right — rewards */}
        <motion.div
          className="w-1/2 flex flex-col items-end justify-center gap-5 pr-[15vw]"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.13em", textTransform: "uppercase", fontFamily: "var(--font-display)", textAlign: "right" }}>
            Total Rewards Balance
          </p>
          <p className="font-extrabold tracking-tighter leading-none text-right"
            style={{ fontSize: "clamp(52px, 7vw, 88px)", fontFamily: "var(--font-display)", color: "var(--green)" }}>
            $1,187<span style={{ color: "rgba(0,200,5,0.38)" }}>.00</span>
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
            style={{ background: "var(--green-dim)", border: "1px solid rgba(0,200,5,0.18)" }}>
            <TrendingUp size={12} strokeWidth={2.5} color="var(--green)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-display)" }}>+12.4%</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.52)", fontFamily: "var(--font-display)" }}>this month</span>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Band 2: Cards Carousel ── */}
      <motion.div
        className="flex-1 flex flex-col justify-center min-h-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08 }}
      >
        {/* Header — bounded by same 10vw–85vw as Band 1 */}
        <div className="flex items-center justify-between mb-4 shrink-0" style={{ paddingLeft: "10vw", paddingRight: "15vw" }}>
          <span className="font-bold text-white" style={{ fontSize: 16, letterSpacing: "-0.01em", fontFamily: "var(--font-display)" }}>Your Cards</span>
          {linkedIds && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-display)", letterSpacing: "0.02em" }}>
              {linkedIds.length} linked via Plaid
            </span>
          )}
        </div>

        {/* Track — arrows on left/right, fade both sides */}
        <div className="relative flex-1 flex items-center min-h-0">

          {/* Left arrow */}
          <button
            onClick={() => stepBy(1)}
            className="absolute z-10 flex items-center justify-center rounded-full transition-all shrink-0"
            style={{
              left: "calc(10vw - 52px)",
              width: 40, height: 40,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              opacity: cards.length > 0 ? 1 : 0.35,
              cursor: cards.length > 0 ? "pointer" : "default",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            <ChevronLeft size={20} color="#fff" strokeWidth={2} />
          </button>

          {/* Right arrow */}
          <button
            onClick={() => stepBy(-1)}
            className="absolute z-10 flex items-center justify-center rounded-full transition-all shrink-0"
            style={{
              right: "calc(15vw - 52px)",
              width: 40, height: 40,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              opacity: cards.length > 0 ? 1 : 0.35,
              cursor: cards.length > 0 ? "pointer" : "default",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            <ChevronRight size={20} color="#fff" strokeWidth={2} />
          </button>

          <div
            className="overflow-hidden w-full flex items-center"
            onWheel={handleWheel}
            style={{
              paddingLeft: "10vw",
              paddingTop: 20,
              paddingBottom: 20,
              marginTop: -20,
              marginBottom: -20,
              cursor: "grab",
              maskImage: "linear-gradient(to right, transparent 10%, black 15%, black 78%, transparent 87%)",
              WebkitMaskImage: "linear-gradient(to right, transparent 10%, black 15%, black 78%, transparent 87%)",
            }}
          >
            <motion.div
              className="flex"
              style={{ gap: CARD_GAP, x }}
              drag="x"
              dragConstraints={{ left: -999999, right: 999999 }}
              dragElastic={0}
              dragMomentum={false}
              whileDrag={{ cursor: "grabbing" }}
              onDragEnd={(_, info) => {
                snapNearest(info.velocity.x);
              }}
            >
              {cards3x.map((card, i) => (
                <div
                  key={`${card.id}-${i}`}
                  className="shrink-0"
                  style={{ pointerEvents: "auto" }}
                >
                  <CreditCard card={card} width={CARD_WIDTH} />
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Add Card — centered below carousel, 1/3 card height */}
        <div className="flex justify-center shrink-0 mt-9">
          <motion.button
            onClick={() => setShowPlaid(true)}
            className="rounded-full flex items-center gap-2.5"
            whileHover={{ scale: 1.04, boxShadow: "0 0 36px rgba(0,200,5,0.32), inset 0 1px 0 rgba(0,200,5,0.25)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
              height: Math.round(CARD_WIDTH * 0.63 / 3) - 10,
              paddingLeft: 36,
              paddingRight: 36,
              background: "rgba(0,200,5,0.15)",
              border: "1px solid rgba(0,200,5,0.55)",
              color: "var(--green)",
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 0 24px rgba(0,200,5,0.18), inset 0 1px 0 rgba(0,200,5,0.2)",
              cursor: "pointer",
            }}
          >
            <Plus size={13} strokeWidth={3} />
            Add Card
          </motion.button>
        </div>

        {/* Plaid modal overlay */}
        <AnimatePresence>
          {showPlaid && (
            <motion.div
              key="plaid-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowPlaid(false); }}
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 24,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                style={{
                  width: "100%", maxWidth: 400,
                  background: "rgba(14,14,14,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 22,
                  padding: 28,
                  position: "relative",
                }}
              >
                {/* Close */}
                <button
                  onClick={() => setShowPlaid(false)}
                  style={{
                    position: "absolute", top: 16, right: 16,
                    background: "rgba(255,255,255,0.06)", border: "none",
                    borderRadius: "50%", width: 30, height: 30,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "rgba(255,255,255,0.5)",
                  }}
                >
                  <X size={14} />
                </button>

                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", color: "rgba(0,200,5,0.8)", textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--font-display)" }}>
                  Kerdos × Plaid
                </p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
                  Connect your cards
                </h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 22 }}>
                  Link your credit cards for personalised recommendations
                </p>

                <PlaidConnect
                  onComplete={(mappings: LinkedCardMapping[]) => {
                    setLinkedIds(mappings.map(m => m.cardId));
                    setShowPlaid(false);
                    _cachedCards = null;
                    refreshCards(true);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Band 3: Stats ── */}
      <motion.div
        className="flex-1 flex items-center gap-6 min-h-0"
        style={{ paddingLeft: "13vw", paddingRight: "12vw", paddingTop: "28px", paddingBottom: "36px" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        {STATS.map(({ label, value, delta, sub, icon: Icon, color }, i) => {
          const isGreen = color === "var(--green)";
          const rgb     = isGreen ? "0,200,5" : "128,236,255";
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.03, border: `1px solid rgba(${rgb},0.45)`, boxShadow: `0 12px 32px rgba(${rgb},0.12), 0 4px 12px rgba(0,0,0,0.3)` }}
              whileTap={{ scale: 0.98 }}
              transition={{ delay: 0.15 + i * 0.05, type: "spring", stiffness: 400, damping: 28 }}
              className="flex-1 flex flex-col items-center justify-center gap-1.5"
              style={{
                cursor: "pointer",
                maxHeight: "72%",
                padding: "12px 20px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: 20,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent top bar */}
              <div style={{
                position: "absolute", top: 0, left: 18, right: 18, height: 2,
                background: `linear-gradient(to right, rgba(${rgb},0.75), rgba(${rgb},0.1))`,
                borderRadius: "0 0 4px 4px",
              }} />

              {/* Label */}
              <div className="flex items-center gap-2">
                <Icon size={14} color={`rgba(${rgb},0.9)`} strokeWidth={2} />
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: "rgba(255,255,255,0.7)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}>
                  {label}
                </span>
              </div>

              {/* Value — dominant hero */}
              <span style={{
                fontSize: "clamp(32px, 3.8vw, 50px)",
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                fontFamily: "var(--font-display)",
                color: "#fff",
              }}>
                {value}
              </span>

              {/* Delta */}
              <span style={{
                fontSize: 17, fontWeight: 700,
                color,
                fontFamily: "var(--font-display)",
                letterSpacing: "0.02em",
              }}>
                {delta}
              </span>

              {/* Sub */}
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.02em",
              }}>
                {sub}
              </span>
            </motion.div>
          );
        })}
      </motion.div>

    </div>
  );
}
