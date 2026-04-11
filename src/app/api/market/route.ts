const TICKERS = ["VOO", "QQQ", "SPY", "VTI", "ARKK", "BND"];

const TICKER_NAMES: Record<string, string> = {
  VOO: "Vanguard S&P 500",
  QQQ: "Invesco Nasdaq 100",
  SPY: "SPDR S&P 500",
  VTI: "Vanguard Total Mkt",
  ARKK: "ARK Innovation",
  BND: "Vanguard Bond",
};

interface CachedData {
  data: TickerResult[];
  timestamp: number;
}

interface TickerResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

// Cache for 15 minutes — Alpha Vantage free tier = 25 calls/day
const CACHE_TTL = 15 * 60 * 1000;
let cache: CachedData | null = null;

async function fetchQuote(ticker: string): Promise<TickerResult | null> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key || key === "your_key_here") return null;

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${key}`;
  const res = await fetch(url);
  const json = await res.json();

  const quote = json["Global Quote"];
  if (!quote || !quote["05. price"]) return null;

  const price = parseFloat(quote["05. price"]);
  const change = parseFloat(quote["09. change"]);
  const changePct = parseFloat(quote["10. change percent"]?.replace("%", "") ?? "0");

  return {
    ticker,
    name: TICKER_NAMES[ticker] ?? ticker,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
  };
}

export async function GET() {
  // Return cache if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return Response.json({ data: cache.data, cached: true });
  }

  // Fetch tickers sequentially with delay (Alpha Vantage free tier: 5 calls/min)
  const results: TickerResult[] = [];
  for (let i = 0; i < TICKERS.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));
    const result = await fetchQuote(TICKERS[i]);
    if (result) results.push(result);
  }

  // If we got data, cache it
  if (results.length > 0) {
    cache = { data: results, timestamp: Date.now() };
    return Response.json({ data: results, cached: false });
  }

  // Fallback: return empty with a message (frontend will use mock data)
  return Response.json({ data: [], cached: false, fallback: true });
}
