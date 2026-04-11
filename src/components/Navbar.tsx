"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { getLinkedCardIds } from "@/lib/linkedCards";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/smartswipe", label: "SmartSwipe" },
  { href: "/rewardvest", label: "RewardVest" },
  { href: "/wealthsplit", label: "WealthSplit" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [cardCount, setCardCount] = useState(5);

  useEffect(() => {
    const ids = getLinkedCardIds();
    if (ids) setCardCount(ids.length);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-sm font-bold text-black">
          C
        </div>
        <span className="font-semibold text-white text-lg tracking-tight">
          Card<span className="text-green-400">IQ</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              pathname === href
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/80 hover:bg-white/5"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs text-white/40">{cardCount} card{cardCount !== 1 ? "s" : ""} linked</span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
          V
        </div>
      </div>
    </nav>
  );
}
