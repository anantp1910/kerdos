"use client";

import { motion } from "framer-motion";

interface Props {
  score: number; // 0-100
}

export default function HealthOrb({ score }: Props) {
  const color =
    score >= 80
      ? { from: "#4ade80", to: "#22d3ee", glow: "rgba(74,222,128,0.5)" }
      : score >= 60
      ? { from: "#facc15", to: "#fb923c", glow: "rgba(250,204,21,0.5)" }
      : { from: "#f87171", to: "#c026d3", glow: "rgba(248,113,113,0.5)" };

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      <motion.div
        className="absolute w-52 h-52 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color.glow} 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-white/5"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* SVG ring */}
      <svg width="140" height="140" className="relative z-10 -rotate-90">
        {/* Background ring */}
        <circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <motion.circle
          cx="70"
          cy="70"
          r="54"
          fill="none"
          stroke={`url(#orbGradient)`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
        />
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color.from} />
            <stop offset="100%" stopColor={color.to} />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute z-20 flex flex-col items-center">
        <motion.p
          className="text-4xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {score}
        </motion.p>
        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
          IQ Score
        </p>
      </div>
    </div>
  );
}
