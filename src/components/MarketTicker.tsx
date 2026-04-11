"use client";

import { StockData, STOCK_TICKERS } from "@/lib/mockData";

interface MarketTickerProps {
  data?: StockData[];
}

export default function MarketTicker({ data }: MarketTickerProps) {
  const tickers = data && data.length > 0 ? data : STOCK_TICKERS;
  const doubled = [...tickers, ...tickers];

  return (
    <div className="overflow-hidden border-b border-white/5 bg-[#0d0d14] py-2">
      <div className="flex ticker-animate gap-12 whitespace-nowrap">
        {doubled.map((s, i) => (
          <span key={i} className="flex items-center gap-2 text-xs">
            <span className="font-bold text-white/70">{s.ticker}</span>
            <span className="text-white/40">${s.price.toFixed(2)}</span>
            <span
              className="font-medium"
              style={{ color: s.changePct >= 0 ? "#4ade80" : "#f87171" }}
            >
              {s.changePct >= 0 ? "▲" : "▼"} {Math.abs(s.changePct).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
