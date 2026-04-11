"use client";

interface IndexQuote {
  label: string;
  value: string;
  change: string;
  up: boolean;
}

const INDICES: IndexQuote[] = [
  { label: "DJIA",    value: "40,657",  change: "+0.37%", up: true  },
  { label: "NASDAQ",  value: "18,657",  change: "-0.02%", up: false },
  { label: "S&P 500", value: "5,657",   change: "+0.73%", up: true  },
  { label: "VIX",     value: "18.42",   change: "-2.10%", up: false },
  { label: "10Y",     value: "4.38%",   change: "+0.03",  up: true  },
  { label: "BTC",     value: "83,412",  change: "+1.24%", up: true  },
];

export default function MarketTicker() {
  return (
    <div
      className="flex items-center gap-0 overflow-x-auto no-scrollbar border-b"
      style={{ background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {INDICES.map((idx) => (
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
