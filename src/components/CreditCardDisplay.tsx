"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

export type CreditCard = {
  id: string;
  issuer: string;
  name: string;
  last4: string;
  network: string;
  color: string;
};

const CARD_GRADIENTS: Record<string, string> = {
  amex: "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
  chase: "from-[#1a0533] via-[#2d0d63] to-[#1a0533]",
  citi: "from-[#0a1628] via-[#1a3a5c] to-[#0a1628]",
  discover: "from-[#1a0a00] via-[#3d1a00] to-[#5c2a00]",
  capital: "from-[#001a0a] via-[#003d1a] to-[#005c26]",
};

const CARD_ACCENTS: Record<string, string> = {
  amex: "text-blue-300 border-blue-400/30",
  chase: "text-purple-300 border-purple-400/30",
  citi: "text-cyan-300 border-cyan-400/30",
  discover: "text-orange-300 border-orange-400/30",
  capital: "text-green-300 border-green-400/30",
};

interface Props {
  card: CreditCard;
  isSelected?: boolean;
  isBest?: boolean;
  score?: number;
  rate?: number;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export default function CreditCardDisplay({
  card,
  isSelected,
  isBest,
  score,
  rate,
  onClick,
  size = "md",
}: Props) {
  const gradient = CARD_GRADIENTS[card.color];
  const accent = CARD_ACCENTS[card.color];

  const sizes = {
    sm: "w-48 h-28",
    md: "w-64 h-40",
    lg: "w-80 h-48",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={clsx(
        "relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
        sizes[size],
        `bg-gradient-to-br ${gradient}`,
        "border",
        isBest
          ? "border-green-400/60 glow-green"
          : isSelected
          ? "border-white/30"
          : accent
      )}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 shimmer opacity-50" />

      {/* Best badge */}
      {isBest && (
        <div className="absolute top-2 right-2 bg-green-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
          BEST
        </div>
      )}

      {/* Card content */}
      <div className="relative z-10 p-4 h-full flex flex-col justify-between">
        {/* Top row */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">{card.issuer}</p>
            <p className="text-sm font-semibold text-white mt-0.5">{card.name}</p>
          </div>
          <div className="w-8 h-5 rounded bg-yellow-400/80 flex items-center justify-center">
            <div className="w-5 h-3 rounded bg-yellow-600/60" />
          </div>
        </div>

        {/* Score display */}
        {score !== undefined && (
          <div className="text-center">
            <p className="text-2xl font-bold text-white">${score.toFixed(2)}</p>
            <p className="text-[10px] text-white/50">{rate}x • back on purchase</p>
          </div>
        )}

        {/* Bottom row */}
        <div className="flex justify-between items-end">
          <p className="text-sm font-mono text-white/60 tracking-widest">
            •••• {card.last4}
          </p>
          <p className="text-[10px] text-white/40">{card.network}</p>
        </div>
      </div>
    </motion.div>
  );
}
