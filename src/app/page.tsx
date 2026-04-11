"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight, Bell, Search, User } from "lucide-react";
import MarketTicker from "@/components/MarketTicker";

const INDEX_CARDS = [
  { label: "DJIA",    value: "40,657.56", change: "-26.00", pct: "-0.09%", up: false },
  { label: "NASDAQ",  value: "18,657.56", change: "+74.12", pct: "+0.19%", up: true  },
  { label: "S&P 500", value: "5,657.56",  change: "+8.25",  pct: "+0.15%", up: true  },
];

const NEWS = [
  {
    id: 1,
    source: "REUTERS",
    time: "2m",
    headline: "US STOCKS — Slide In Growth Stocks Pummel Nasdaq, Powell Testimony In Focus As Rate Outlook Shifts",
    tickers: [{ t: "MSFT", v: -1.25 }, { t: "AAPL", v: +1.25 }],
  },
  {
    id: 2,
    source: "BENZINGA",
    time: "2m",
    headline: "'Pentium Under Pressure As Market Shifts Toward AI-Centric Chip Designs' — Financial Times",
    tickers: [{ t: "MSFT", v: -1.25 }, { t: "AAPL", v: +1.25 }],
  },
  {
    id: 3,
    source: "REUTERS",
    time: "33m",
    headline: "Reuters Cites Filing: Aggressive Pivot Toward Proprietary AI Hardware Prompts Concerns About Supply Chain",
    tickers: [{ t: "MSFT", v: -1.25 }, { t: "AAPL", v: +1.25 }],
  },
];

export default function HomePage() {
  const [newsTab, setNewsTab] = useState<"top" | "portfolio">("top");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-black text-sm font-bold" style={{ background: "var(--green)" }}>
            K
          </div>
          <span className="text-base font-semibold text-white">Kerdos</span>
        </div>
        <div className="flex items-center gap-4">
          <Search size={20} color="var(--text-2)" />
          <Bell size={20} color="var(--text-2)" />
          <User size={20} color="var(--text-2)" />
        </div>
      </div>

      {/* Index ticker */}
      <MarketTicker />

      <div className="px-4 pt-4 space-y-4 pb-6">

        {/* Market index cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Markets open</span>
            <Link href="/wealthsplit" className="text-xs flex items-center gap-0.5" style={{ color: "var(--green)" }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {INDEX_CARDS.map((idx, i) => (
              <motion.div key={idx.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="fid-card p-3">
                <div className="flex items-center gap-1 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: idx.up ? "var(--green)" : "var(--red)" }} />
                  <span className="text-[10px] font-bold" style={{ color: "var(--text-2)" }}>{idx.label}</span>
                </div>
                <p className="text-sm font-bold text-white leading-tight">{idx.value}</p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: idx.up ? "var(--green)" : "var(--red)" }}>
                  {idx.change} ({idx.pct})
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/smartswipe",  label: "SmartSwipe", emoji: "💳" },
            { href: "/rewardvest",  label: "Invest",     emoji: "📈" },
            { href: "/wealthsplit", label: "Summary",    emoji: "⚖️"  },
          ].map((a) => (
            <Link key={a.href} href={a.href}>
              <div className="fid-card p-4 flex flex-col items-center gap-2 active:opacity-70 transition-opacity">
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Rewards snapshot */}
        <div className="fid-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">Rewards This Month</span>
            <Link href="/wealthsplit" className="text-xs" style={{ color: "var(--green)" }}>Details</Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Cashback", value: "$340" },
              { label: "Points",   value: "174,800" },
              { label: "Net Gain", value: "$847" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-2)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* News */}
        <div className="fid-card">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-sm font-semibold text-white">News</span>
            <button className="text-xs flex items-center gap-0.5" style={{ color: "var(--green)" }}>
              More topics <ChevronRight size={13} />
            </button>
          </div>
          <div className="px-4 pb-3">
            <div className="segment">
              <button className={`segment-btn ${newsTab === "top" ? "active" : ""}`} onClick={() => setNewsTab("top")}>Top News</button>
              <button className={`segment-btn ${newsTab === "portfolio" ? "active" : ""}`} onClick={() => setNewsTab("portfolio")}>Portfolio News</button>
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {NEWS.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }} className="px-4 py-3">
                <p className="text-[10px] mb-1.5 font-medium" style={{ color: "var(--text-3)" }}>{item.source} • {item.time}</p>
                <p className="text-sm text-white leading-snug mb-2">{item.headline}</p>
                <div className="flex gap-2 flex-wrap">
                  {item.tickers.map((tk) => (
                    <span key={tk.t} className="ticker-tag" style={{ color: tk.v >= 0 ? "var(--green)" : "var(--red)" }}>
                      {tk.t} {tk.v >= 0 ? "+" : ""}{tk.v.toFixed(2)}%
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Planning */}
        <Link href="/wealthsplit">
          <div className="fid-card flex items-center justify-between px-4 py-4">
            <span className="text-sm font-semibold text-white">Planning</span>
            <ChevronRight size={18} color="var(--text-3)" />
          </div>
        </Link>

        {/* Feedback */}
        <div className="flex justify-center py-2">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
            💬 Send us feedback
          </button>
        </div>

      </div>
    </div>
  );
}
