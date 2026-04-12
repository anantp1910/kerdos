import fs from "fs";
import path from "path";
import OpenAI from "openai";

interface AdviceRequest {
  totalRewards: number;
  monthlyEarnings: number[];
  riskTolerance?: "conservative" | "moderate" | "aggressive";
}

interface MarketRegime {
  regime: "bullish" | "defensive" | "mixed";
  description: string;
  volatility: "low" | "medium" | "high";
  bloombergPrediction?: string;
  bquantScore?: number;
}

interface PortfolioAllocation {
  ticker: string;
  percentage: number;
  rationale: string;
  description: string;
  annualReturn: number;
}

interface AIAdvice {
  allocations: PortfolioAllocation[];
  summary: string;
  projectedAnnualReturn: number;
  insights: string[];
  marketRegime: MarketRegime;
  threshold: number;
}

interface DaySummary {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  session_cum_delta: number;
  avg_absorption: number;
  avg_vpin: number;
  bars: number;
}

interface NQBar {
  t: string;
  close: number;
  rsi_14: number | null;
  absorption: number | null;
  vpin_20: number | null;
  buy_pressure: number | null;
  vol_zscore: number | null;
  session_cum_delta: number | null;
  ema_9: number | null;
  ema_20: number | null;
  delta_pct: number | null;
}

function isValidAdviceRequest(body: unknown): body is AdviceRequest {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Partial<AdviceRequest>;
  return (
    typeof candidate.totalRewards === "number" &&
    Array.isArray(candidate.monthlyEarnings) &&
    candidate.monthlyEarnings.every((value) => typeof value === "number") &&
    (candidate.riskTolerance === undefined ||
      candidate.riskTolerance === "conservative" ||
      candidate.riskTolerance === "moderate" ||
      candidate.riskTolerance === "aggressive")
  );
}

// ============================================
// BLOOMBERG SIGNAL ENGINE (no external API)
// Reads from data/analysis/index.json + latest day bars
// ============================================
async function analyzeBloombergData(): Promise<MarketRegime> {
  const analysisDir = path.join(process.cwd(), "data", "analysis");
  const indexPath = path.join(analysisDir, "index.json");

  if (!fs.existsSync(indexPath)) {
    return {
      regime: "mixed",
      description: "Bloomberg data not available",
      volatility: "medium",
      bquantScore: 5.0,
    };
  }

  const allDays: DaySummary[] = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  if (allDays.length === 0) {
    return { regime: "mixed", description: "No Bloomberg data found", volatility: "medium", bquantScore: 5.0 };
  }

  // ── Multi-day signals (last 10 trading days) ──────────────────────
  const window = allDays.slice(-10);
  const firstClose = window[0].close;
  const lastClose = window[window.length - 1].close;
  const momentum = ((lastClose - firstClose) / firstClose) * 100; // % over window

  const upDays = window.filter((d) => d.close > d.open).length;
  const downDays = window.length - upDays;

  // Average session delta across the window (positive = net buy pressure)
  const avgDelta = window.reduce((s, d) => s + (d.session_cum_delta ?? 0), 0) / window.length;

  // Absorption trend: positive = institutional accumulation
  const avgAbsorption = window.reduce((s, d) => s + (d.avg_absorption ?? 0), 0) / window.length;

  // VPIN: elevated VPIN = informed/toxic flow = risk signal
  const avgVpin = window.reduce((s, d) => s + (d.avg_vpin ?? 0), 0) / window.length;

  // ── Intraday signals (latest available day) ───────────────────────
  const latestDate = allDays[allDays.length - 1].date;
  const latestFilePath = path.join(analysisDir, `${latestDate}.json`);

  let endRsi = 50;
  let endDelta = 0;
  let endBuyPressure = 0.5;
  let closeAboveEma20 = false;
  let endAbsorption = 0;
  let endVolZscore = 1;

  if (fs.existsSync(latestFilePath)) {
    const bars: NQBar[] = JSON.parse(
      fs.readFileSync(latestFilePath, "utf-8").replace(/\bNaN\b/g, "null")
    );

    if (bars.length > 0) {
      const lastBar = bars[bars.length - 1];
      endRsi = lastBar.rsi_14 ?? 50;
      closeAboveEma20 = lastBar.ema_20 != null && lastBar.close > lastBar.ema_20;

      // Average last 10 bars for noise reduction
      const tail = bars.slice(-10);
      endDelta = tail.reduce((s, b) => s + (b.session_cum_delta ?? 0), 0) / tail.length;
      endBuyPressure =
        tail.reduce((s, b) => s + (b.buy_pressure ?? 0.5), 0) / tail.length;
      endAbsorption =
        tail.reduce((s, b) => s + (b.absorption ?? 0), 0) / tail.length;
      endVolZscore =
        tail.reduce((s, b) => s + (b.vol_zscore ?? 1), 0) / tail.length;
    }
  }

  // ── BQuant composite score (0–10 scale) ───────────────────────────
  let score = 5.0;

  // 1. Price momentum over window (±2 pts)
  score += Math.max(-2, Math.min(2, momentum * 0.35));

  // 2. Session delta trend — net buy/sell pressure (±1.5 pts)
  //    Normalize: ±5000 contracts maps to ±1.5
  score += Math.max(-1.5, Math.min(1.5, (avgDelta / 5000) * 1.5));

  // 3. Institutional absorption (±1 pt)
  //    avg_absorption is roughly -1 to +1
  score += Math.max(-1, Math.min(1, avgAbsorption * 3));

  // 4. VPIN risk penalty (0 to -1.5 pts)
  //    vpin > 0.5 = high toxic flow = risk off signal
  score -= Math.max(0, Math.min(1.5, (avgVpin - 0.3) * 3));

  // 5. Intraday RSI (±0.5 pts)
  if (endRsi > 60) score += 0.5;
  else if (endRsi < 40) score -= 0.5;

  // 6. Intraday buy pressure (±0.5 pts)
  score += Math.max(-0.5, Math.min(0.5, (endBuyPressure - 0.5) * 2));

  // 7. Intraday delta confirmation (±0.3 pts)
  score += Math.max(-0.3, Math.min(0.3, (endDelta / 3000) * 0.3));

  // 8. Intraday absorption (±0.2 pts)
  score += Math.max(-0.2, Math.min(0.2, endAbsorption * 0.5));

  // 9. EMA trend confirmation (±0.3 pts)
  score += closeAboveEma20 ? 0.3 : -0.3;

  // 10. Unusual volume bonus/penalty (±0.2 pts)
  if (endVolZscore > 2) score += 0.2;

  score = Math.max(0, Math.min(10, score));
  const roundedScore = Math.round(score * 100) / 100;

  // ── Regime classification ─────────────────────────────────────────
  const regime: "bullish" | "defensive" | "mixed" =
    roundedScore >= 6.5 ? "bullish" : roundedScore <= 4 ? "defensive" : "mixed";

  const volatility: "low" | "medium" | "high" =
    avgVpin > 0.55 || Math.abs(momentum) > 3 ? "high"
    : avgVpin > 0.35 || Math.abs(momentum) > 1 ? "medium"
    : "low";

  // ── Human-readable BQuant prediction ─────────────────────────────
  const deltaDir = avgDelta > 0 ? "net buying" : "net selling";
  const absorptionLabel =
    avgAbsorption > 0.15 ? "bullish absorption (institutional accumulation)"
    : avgAbsorption < -0.15 ? "bearish absorption (institutional distribution)"
    : "neutral absorption";

  let prediction: string;
  if (regime === "bullish") {
    prediction = `Bloomberg BQuant™ (${window.length}-day NQ analysis through ${latestDate}): Bullish — ${upDays}/${window.length} up-days, ${momentum.toFixed(2)}% net move, ${deltaDir} on aggregate delta. ${absorptionLabel}. RSI ${endRsi.toFixed(0)} | VPIN ${avgVpin.toFixed(2)}. BQuant Score: ${roundedScore}/10. Institutional flow supports growth overweight.`;
  } else if (regime === "defensive") {
    prediction = `Bloomberg BQuant™ (${window.length}-day NQ analysis through ${latestDate}): Defensive — only ${upDays}/${window.length} up-days, ${momentum.toFixed(2)}% net move, ${deltaDir}. ${absorptionLabel}. RSI ${endRsi.toFixed(0)} | VPIN ${avgVpin.toFixed(2)} (elevated risk). BQuant Score: ${roundedScore}/10. Risk-off signals suggest reducing growth exposure.`;
  } else {
    prediction = `Bloomberg BQuant™ (${window.length}-day NQ analysis through ${latestDate}): Mixed — ${upDays} up / ${downDays} down days, ${momentum.toFixed(2)}% net move, ${deltaDir}. ${absorptionLabel}. RSI ${endRsi.toFixed(0)} | VPIN ${avgVpin.toFixed(2)}. BQuant Score: ${roundedScore}/10. Range-bound conditions favor income-generating positions.`;
  }

  return {
    regime,
    description: `NQ ${momentum >= 0 ? "+" : ""}${momentum.toFixed(2)}% over ${window.length} days | ${upDays} up / ${downDays} down | BQuant ${roundedScore}/10`,
    volatility,
    bloombergPrediction: prediction,
    bquantScore: roundedScore,
  };
}

// ============================================
// PORTFOLIO RULES ENGINE (DETERMINISTIC)
// ============================================
function generatePortfolioRules(
  rewardAmount: number,
  riskTolerance: string,
  marketRegime: MarketRegime
): {
  allocations: PortfolioAllocation[];
  threshold: number;
  recommendation: string;
} {
  const THRESHOLD_CASH_ONLY = 25;
  const THRESHOLD_CONSERVATIVE = 100;
  const THRESHOLD_NORMAL = 500;

  const RETURN_RATES: Record<string, number> = {
    VOO: 8.5, QQQ: 12.0, VTI: 8.2, BND: 3.5,
    CASH: 4.5, ARKK: 15.0, GLD: 7.0, JEPI: 9.0,
  };
  const r = (ticker: string) => RETURN_RATES[ticker] ?? 5;

  let threshold = THRESHOLD_CASH_ONLY;
  let allocations: PortfolioAllocation[] = [];

  // ── RULE 1: Amount-based base allocation ──────────────────────────
  if (rewardAmount < THRESHOLD_CASH_ONLY) {
    allocations = [
      { ticker: "CASH", percentage: 100, rationale: "Reward amount too small to deploy efficiently", description: "High-yield savings or money market fund", annualReturn: r("CASH") },
    ];
    threshold = THRESHOLD_CASH_ONLY;
  } else if (rewardAmount < THRESHOLD_CONSERVATIVE) {
    allocations = [
      { ticker: "VOO",  percentage: 40, rationale: "Broad market exposure, low fees",        description: "Vanguard S&P 500 ETF",      annualReturn: r("VOO")  },
      { ticker: "BND",  percentage: 35, rationale: "Defensive allocation, stability",         description: "Vanguard Bond ETF",          annualReturn: r("BND")  },
      { ticker: "CASH", percentage: 25, rationale: "Liquidity buffer for scaling",            description: "High-yield savings reserve",  annualReturn: r("CASH") },
    ];
    threshold = THRESHOLD_CONSERVATIVE;
  } else if (rewardAmount < THRESHOLD_NORMAL) {
    allocations = [
      { ticker: "VOO",  percentage: 60, rationale: "Core equity position, proven long-term returns", description: "Vanguard S&P 500 ETF",      annualReturn: r("VOO")  },
      { ticker: "QQQ",  percentage: 25, rationale: "Growth exposure to tech, high conviction sector", description: "Invesco Nasdaq 100 ETF",    annualReturn: r("QQQ")  },
      { ticker: "CASH", percentage: 15, rationale: "Liquidity for buying opportunities",              description: "High-yield savings reserve", annualReturn: r("CASH") },
    ];
    threshold = THRESHOLD_NORMAL;
  } else {
    allocations = [
      { ticker: "VOO",  percentage: 55, rationale: "Stable core holding",                        description: "Vanguard S&P 500 ETF",       annualReturn: r("VOO")  },
      { ticker: "QQQ",  percentage: 25, rationale: "Growth allocation to technology",            description: "Invesco Nasdaq 100 ETF",      annualReturn: r("QQQ")  },
      { ticker: "VTI",  percentage: 10, rationale: "Total market exposure for diversification",  description: "Vanguard Total Market Index", annualReturn: r("VTI")  },
      { ticker: "CASH", percentage: 10, rationale: "Strategic reserve",                          description: "High-yield savings reserve",  annualReturn: r("CASH") },
    ];
  }

  // ── RULE 2: Market regime adjustment ─────────────────────────────
  if (marketRegime.regime === "defensive") {
    allocations = allocations.map((a) => {
      if (a.ticker === "QQQ") return { ...a, percentage: Math.max(a.percentage - 10, 0) };
      if (a.ticker === "VOO") return { ...a, percentage: a.percentage + 5 };
      if (a.ticker === "CASH") return { ...a, percentage: a.percentage + 5 };
      return a;
    });
  } else if (marketRegime.regime === "bullish") {
    allocations = allocations.map((a) => {
      if (a.ticker === "QQQ") return { ...a, percentage: a.percentage + 10 };
      if (a.ticker === "CASH") return { ...a, percentage: Math.max(a.percentage - 8, 0) };
      return a;
    });
  }

  // ── RULE 3: Risk tolerance adjustment ────────────────────────────
  if (riskTolerance === "conservative") {
    allocations = allocations.map((a) => {
      if (a.ticker === "QQQ") return { ...a, percentage: Math.round(a.percentage * 0.7) };
      if (a.ticker === "VOO") return { ...a, percentage: Math.round(a.percentage * 1.1) };
      if (a.ticker === "CASH" || a.ticker === "BND") return { ...a, percentage: Math.round(a.percentage * 1.2) };
      return a;
    });
  } else if (riskTolerance === "aggressive") {
    allocations = allocations.map((a) => {
      if (a.ticker === "QQQ") return { ...a, percentage: Math.round(a.percentage * 1.3) };
      if (a.ticker === "CASH") return { ...a, percentage: Math.max(Math.round(a.percentage * 0.5), 5) };
      return a;
    });
  }

  // ── RULE 4: Bloomberg BQuant tilt ────────────────────────────────
  const score = marketRegime.bquantScore ?? 5;
  if (rewardAmount >= 100) {
    if (score >= 7.5) {
      // Strong bullish: add ARK Innovation for disruptive tech exposure
      allocations.push({
        ticker: "ARKK", percentage: 15,
        rationale: "BQuant detects strong institutional accumulation in disruptive tech.",
        description: "ARK Innovation ETF", annualReturn: r("ARKK"),
      });
      allocations = allocations.map((a) =>
        a.ticker === "VOO" || a.ticker === "QQQ" ? { ...a, percentage: Math.round(a.percentage * 0.8) } : a
      );
    } else if (score <= 3.5) {
      // Strong defensive: add gold as macro hedge
      allocations.push({
        ticker: "GLD", percentage: 20,
        rationale: "BQuant flags elevated VPIN and negative delta — precious metals macro hedge.",
        description: "SPDR Gold Trust", annualReturn: r("GLD"),
      });
      allocations = allocations.map((a) =>
        a.ticker === "VOO" || a.ticker === "QQQ" ? { ...a, percentage: Math.round(a.percentage * 0.7) } : a
      );
    } else if (score > 4.5 && score < 6.5) {
      // Mixed: JEPI for covered-call income in range-bound market
      allocations.push({
        ticker: "JEPI", percentage: 20,
        rationale: "BQuant range-bound signal — covered-call strategy generates yield while waiting.",
        description: "JPMorgan Equity Premium Income", annualReturn: r("JEPI"),
      });
      allocations = allocations.map((a) =>
        a.ticker === "VOO" || a.ticker === "QQQ" ? { ...a, percentage: Math.round(a.percentage * 0.8) } : a
      );
    }
  }

  // ── Normalize to exactly 100% ─────────────────────────────────────
  const total = allocations.reduce((s, a) => s + a.percentage, 0);
  allocations = allocations.map((a) => ({
    ...a,
    percentage: Math.round((a.percentage / total) * 100),
  }));
  const sum = allocations.slice(0, -1).reduce((s, a) => s + a.percentage, 0);
  if (allocations.length > 0) {
    allocations[allocations.length - 1].percentage = 100 - sum;
  }

  return {
    allocations,
    threshold,
    recommendation: `Bloomberg BQuant score ${score.toFixed(1)}/10 — ${marketRegime.regime} regime with ${marketRegime.volatility} volatility.`,
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!isValidAdviceRequest(body)) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { monthlyEarnings, riskTolerance = "moderate" } = body;
  const latestMonth = monthlyEarnings[monthlyEarnings.length - 1] ?? 0;
  const trend =
    monthlyEarnings.length >= 2
      ? monthlyEarnings[monthlyEarnings.length - 1] - monthlyEarnings[monthlyEarnings.length - 2]
      : 0;

  try {
    // ── STEP 1: Bloomberg signal engine (no external API) ────────────
    const marketRegime = await analyzeBloombergData();

    // ── STEP 2: Deterministic portfolio rules ─────────────────────────
    const { allocations: ruleAllocations, threshold, recommendation } =
      generatePortfolioRules(latestMonth, riskTolerance, marketRegime);

    // ── STEP 3: LLM natural language summary (optional) ───────────────
    let summary = recommendation;
    const featherlessKey = process.env.FEATHERLESS_API_KEY;
    if (featherlessKey && featherlessKey !== "your_key_here") {
      try {
        const client = new OpenAI({
          baseURL: "https://api.featherless.ai/v1",
          apiKey: featherlessKey,
        });

        const allocationSummary = ruleAllocations
          .map((a) => `${a.percentage}% ${a.ticker} (${a.description})`)
          .join(", ");

        const response = await client.chat.completions.create({
          model: "deepseek-ai/DeepSeek-V3-0324",
          messages: [
            {
              role: "system",
              content:
                "You are a concise financial advisor AI for CardIQ. Write a 2-3 sentence plain-text explanation of a recommended investment portfolio. Be conversational and actionable. No markdown, no code fences.",
            },
            {
              role: "user",
              content: `Reward amount this month: $${latestMonth}\nRisk tolerance: ${riskTolerance}\nMarket regime: ${marketRegime.regime} (${marketRegime.description})\nBloomberg BQuant: ${marketRegime.bloombergPrediction}\nAllocation: ${allocationSummary}\n\nExplain why this portfolio makes sense right now.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 200,
        });

        summary = response.choices[0]?.message?.content?.trim() ?? recommendation;
      } catch {
        // LLM failed — fall back to template summary, portfolio is still valid
      }
    }

    // ── STEP 4: Projected return ──────────────────────────────────────
    const returnRates: Record<string, number> = {
      VOO: 8.5, QQQ: 12.0, VTI: 8.2, BND: 3.5, CASH: 4.5, ARKK: 15.0, GLD: 7.0, JEPI: 9.0,
    };
    const projectedAnnualReturn = ruleAllocations.reduce(
      (sum, a) => sum + (returnRates[a.ticker] ?? 5) * (a.percentage / 100),
      0
    );

    // ── STEP 5: Insights ──────────────────────────────────────────────
    const score = marketRegime.bquantScore ?? 5;
    const insights = [
      latestMonth < 25
        ? `Your $${latestMonth} is below the $25 investment threshold — holding in cash to build capital before deploying.`
        : `At $${latestMonth}/month, you'll accumulate $${latestMonth * 12} annually — enough to build a meaningful micro-portfolio through dollar-cost averaging.`,

      trend > 0
        ? `Your rewards earnings are trending up — increasing monthly contributions will compound returns significantly over time.`
        : `Steady monthly rewards are ideal for automated DCA (dollar-cost averaging) — removes emotion from timing.`,

      score >= 6.5
        ? `BQuant score ${score.toFixed(1)}/10: Institutional flow and positive delta confirm bullish bias — tilt toward growth is supported.`
        : score <= 4
        ? `BQuant score ${score.toFixed(1)}/10: Elevated VPIN and negative delta signal caution — defensive tilt reduces drawdown risk.`
        : `BQuant score ${score.toFixed(1)}/10: Mixed NQ signals — balanced allocation hedges both bull and bear scenarios while collecting income.`,
    ];

    const advice: AIAdvice = {
      allocations: ruleAllocations,
      summary,
      projectedAnnualReturn: Math.round(projectedAnnualReturn * 10) / 10,
      insights,
      marketRegime,
      threshold,
    };

    return Response.json({ data: advice });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("RewardVest advice generation error:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
