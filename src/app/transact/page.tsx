"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { CreditCard, ArrowRight, RefreshCw, Plus, Minus } from "lucide-react";
import MarketTicker from "@/components/MarketTicker";

const ACTIONS = [
  { href: "/smartswipe", icon: CreditCard,  label: "Best Card",    sub: "Find optimal card for purchase",   color: "var(--green)" },
  { href: "#",           icon: Plus,        label: "Add Funds",    sub: "Deposit to rewards wallet",         color: "#5ac8fa" },
  { href: "#",           icon: Minus,       label: "Redeem",       sub: "Cash out your rewards balance",     color: "#bf5af2" },
  { href: "#",           icon: RefreshCw,   label: "Transfer",     sub: "Move points between cards",         color: "#ff9f0a" },
  { href: "/rewardvest", icon: ArrowRight,  label: "Invest",       sub: "Auto-invest your cashback",         color: "#30d158" },
];

export default function TransactPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white mb-1">Transact</h1>
        <p className="text-sm" style={{ color: "var(--text-2)" }}>Quick actions for your rewards</p>
      </div>

      <MarketTicker />

      <div className="px-4 pt-4 space-y-3">
        {ACTIONS.map(({ href, icon: Icon, label, sub, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link href={href}>
              <div className="fid-card flex items-center gap-4 px-4 py-4 active:opacity-70 transition-opacity">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${color}20` }}
                >
                  <Icon size={20} color={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>{sub}</p>
                </div>
                <ArrowRight size={16} color="var(--text-3)" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
