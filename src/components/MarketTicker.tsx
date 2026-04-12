"use client";

import { useState, useEffect } from "react";

interface IndexQuote {
  label: string;
  value: string;
  change: string;
  changePct: number;
  up: boolean;
}

// Fallback shown while loading or if fetch fails
const FALLBACK: IndexQuote[] = [
  { label: "DJIA",    value: "—",  change: "—",     changePct: 0, up: true  },
  { label: "NASDAQ",  value: "—",  change: "—",     changePct: 0, up: true  },
  { label: "S&P 500", value: "—",  change: "—",     changePct: 0, up: true  },
  { label: "VIX",     value: "—",  change: "—",     changePct: 0, up: false },
  { label: "10Y",     value: "—",  change: "—",     changePct: 0, up: true  },
  { label: "BTC",     value: "—",  change: "—",     changePct: 0, up: true  },
];

export default function MarketTicker() {
  const [indices, setIndices] = useState<IndexQuote[]>(FALLBACK);

  useEffect(() => {
    fetch("/api/market-indices")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.length > 0) setIndices(json.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div
      className="flex items-center gap-0 overflow-x-auto no-scrollbar border-b"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {indices.map((idx) => (
        <div
          key={idx.label}
          className="flex items-center gap-2 px-4 py-2 shrink-0 border-r"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>
            {idx.label}
          </span>
          <span className="text-xs font-bold text-white">{idx.value}</span>
          <span
            className="text-xs font-semibold"
            style={{ color: idx.up ? "var(--green)" : "var(--red)" }}
          >
            {idx.change}
          </span>
        </div>
      ))}
    </div>
  );
}
