// Live macro index data via Yahoo Finance (free, no API key)
// Symbols: ^DJI, ^IXIC, ^GSPC, ^VIX, ^TNX, BTC-USD

interface IndexResult {
  label: string;
  value: string;
  change: string;
  changePct: number;
  up: boolean;
}

interface CachedData {
  data: IndexResult[];
  timestamp: number;
}

const CACHE_TTL = 15 * 60 * 1000; // 15 min
let cache: CachedData | null = null;

const SYMBOLS: { symbol: string; label: string; format: "number" | "percent" | "crypto" }[] = [
  { symbol: "^DJI",   label: "DJIA",    format: "number"  },
  { symbol: "^IXIC",  label: "NASDAQ",  format: "number"  },
  { symbol: "^GSPC",  label: "S&P 500", format: "number"  },
  { symbol: "^VIX",   label: "VIX",     format: "number"  },
  { symbol: "^TNX",   label: "10Y",     format: "percent" },
  { symbol: "BTC-USD",label: "BTC",     format: "crypto"  },
];

async function fetchQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePct: number;
} | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? meta.previousClose ?? 0;
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    return {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
    };
  } catch {
    return null;
  }
}

function formatValue(price: number, format: "number" | "percent" | "crypto"): string {
  if (format === "percent") return `${price.toFixed(2)}%`;
  if (format === "crypto") return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return price.toFixed(2);
}

function formatChange(change: number, changePct: number, format: "number" | "percent" | "crypto"): string {
  const sign = change >= 0 ? "+" : "";
  if (format === "percent") return `${sign}${change.toFixed(3)}`;
  return `${sign}${changePct.toFixed(2)}%`;
}

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return Response.json({ data: cache.data, cached: true });
  }

  const results = await Promise.all(
    SYMBOLS.map(async ({ symbol, label, format }) => {
      const quote = await fetchQuote(symbol);
      if (!quote) return null;
      const result: IndexResult = {
        label,
        value: formatValue(quote.price, format),
        change: formatChange(quote.change, quote.changePct, format),
        changePct: quote.changePct,
        up: quote.change >= 0,
      };
      return result;
    })
  );

  const valid = results.filter((r): r is IndexResult => r !== null);

  if (valid.length > 0) {
    cache = { data: valid, timestamp: Date.now() };
    return Response.json({ data: valid, cached: false });
  }

  return Response.json({ data: [], cached: false, fallback: true });
}
