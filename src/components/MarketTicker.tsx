"use client";

const STOCK_TICKERS = [
  { ticker: 'VOO',  name: 'Vanguard S&P 500',   price: 498.32, changePct:  0.65 },
  { ticker: 'QQQ',  name: 'Invesco Nasdaq 100',  price: 432.18, changePct:  1.27 },
  { ticker: 'SPY',  name: 'SPDR S&P 500',        price: 521.67, changePct:  0.56 },
  { ticker: 'VTI',  name: 'Vanguard Total Mkt',  price: 242.53, changePct: -0.36 },
  { ticker: 'ARKK', name: 'ARK Innovation',      price: 47.83,  changePct:  2.62 },
  { ticker: 'BND',  name: 'Vanguard Bond',       price: 73.14,  changePct: -0.16 },
];

export default function MarketTicker() {
  const doubled = [...STOCK_TICKERS, ...STOCK_TICKERS];

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
