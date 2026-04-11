import fs from 'fs';
import path from 'path';
import { parquetMetadata, parquetRead } from 'hyparquet';
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
}

interface AIAdvice {
  allocations: PortfolioAllocation[];
  summary: string;
  projectedAnnualReturn: number;
  insights: string[];
  marketRegime: MarketRegime;
  threshold: number;
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
// MARKET REGIME DETECTION
// ============================================
async function detectMarketRegime(): Promise<MarketRegime> {
  try {
    const key = process.env.ALPHA_VANTAGE_API_KEY;
    if (!key || key === "your_key_here") {
      return {
        regime: "mixed",
        description: "Unable to fetch market data",
        volatility: "medium",
      };
    }

    // Fetch SPY (market proxy) and VIX proxy
    const spyUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${key}`;
    const spyRes = await fetch(spyUrl);
    const spyJson = await spyRes.json();

    const spyQuote = spyJson["Global Quote"];
    const spyChange = parseFloat(spyQuote?.["10. change percent"]?.replace("%", "") ?? "0");

    // Determine regime based on market indicators
    // In production, you'd fetch VIX and other macro signals
    const volatility: "low" | "medium" | "high" =
      Math.abs(spyChange) > 2 ? "high" : Math.abs(spyChange) > 0.5 ? "medium" : "low";

    const regime: "bullish" | "defensive" | "mixed" =
      spyChange > 1
        ? "bullish"
        : spyChange < -0.5
          ? "defensive"
          : "mixed";

    const bquantData = await extractBQuantSignal(regime);
    
    return {
      regime,
      description: `Market is ${spyChange > 0 ? "up" : "down"} ${Math.abs(spyChange).toFixed(2)}% today`,
      volatility,
      bloombergPrediction: bquantData.prediction,
      bquantScore: bquantData.score,
    };
  } catch {
    return {
      regime: "mixed",
      description: "Unable to determine market regime",
      volatility: "medium",
      bloombergPrediction: "Bloomberg Terminal connection failed. Falling back to simple heuristic.",
      bquantScore: 5.0,
    };
  }
}

// Read last N days of NQ tick data and compute multi-day trend metrics for BQuant score
async function extractBQuantSignal(_currentRegime: string): Promise<{score: number, prediction: string}> {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) throw new Error('Data directory not found');

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.parquet')).sort();
    if (files.length === 0) throw new Error('No parquet files found');

    // Analyze last 10 trading days (or however many we have)
    const daysToAnalyze = Math.min(10, files.length);
    const recentFiles = files.slice(-daysToAnalyze);

    interface DayData {
      date: string;
      open: number;
      close: number;
      numRows: number;
    }

    const dayData: DayData[] = [];

    for (const file of recentFiles) {
      const nodeBuffer = fs.readFileSync(path.join(dataDir, file));
      const arrayBuffer = nodeBuffer.buffer.slice(
        nodeBuffer.byteOffset,
        nodeBuffer.byteOffset + nodeBuffer.byteLength
      );
      const metadata = parquetMetadata(arrayBuffer);
      const numRows = Number(metadata.num_rows);

      let open: number | null = null;
      let close: number | null = null;

      // First 50 rows → open price
      await new Promise<void>((resolve, reject) => {
        parquetRead({
          file: arrayBuffer,
          rowStart: 0,
          rowEnd: Math.min(50, numRows),
          onComplete: (data) => {
            for (const row of data) {
              if (row[1] === 'TRADE' && open === null) {
                open = Number(row[2]);
                break;
              }
            }
            resolve();
          },
        }).catch(reject);
      });

      // Last 50 rows → close price
      await new Promise<void>((resolve, reject) => {
        parquetRead({
          file: arrayBuffer,
          rowStart: Math.max(0, numRows - 50),
          rowEnd: numRows,
          onComplete: (data) => {
            for (let i = data.length - 1; i >= 0; i--) {
              if (data[i][1] === 'TRADE') {
                close = Number(data[i][2]);
                break;
              }
            }
            resolve();
          },
        }).catch(reject);
      });

      if (open !== null && close !== null) {
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        dayData.push({ date: dateMatch?.[1] ?? file, open, close, numRows });
      }
    }

    if (dayData.length === 0) throw new Error('Could not extract day data from parquet files');

    // ── Compute metrics ──────────────────────────────────────────
    const dailyReturns = dayData.map(d => ((d.close - d.open) / d.open) * 100);
    const upDays   = dailyReturns.filter(r => r > 0).length;
    const downDays = dailyReturns.filter(r => r < 0).length;

    // Cumulative momentum over the analysis window
    const firstClose = dayData[0].close;
    const lastClose  = dayData[dayData.length - 1].close;
    const momentum   = ((lastClose - firstClose) / firstClose) * 100;

    // Volume trend: compare second half vs first half by trade count
    const halfIdx       = Math.floor(dayData.length / 2);
    const recentAvgVol  = dayData.slice(halfIdx).reduce((s, d) => s + d.numRows, 0) / (dayData.length - halfIdx);
    const earlierAvgVol = dayData.slice(0, halfIdx).reduce((s, d) => s + d.numRows, 0) / (halfIdx || 1);
    const volumeTrend   = earlierAvgVol > 0 ? recentAvgVol / earlierAvgVol : 1;

    // Average daily return
    const avgDaily = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;

    // ── Score formula (0–10 scale) ───────────────────────────────
    // Base 5 + contributions from momentum, breadth, volume, recency
    let score = 5.0;
    score += Math.max(-2,   Math.min(2,   momentum  * 0.4));          // multi-day trend
    score += Math.max(-1,   Math.min(1,   (upDays - downDays) * 0.2));// breadth
    score += Math.max(-0.5, Math.min(0.5, (volumeTrend - 1) * 2));    // volume direction
    score += Math.max(-1.5, Math.min(1.5, avgDaily * 1.5));           // avg daily return
    score  = Math.max(0, Math.min(10, score));

    // ── Human-readable prediction ────────────────────────────────
    const latestDate = dayData[dayData.length - 1].date;
    let prediction: string;
    if (score >= 8) {
      prediction = `Bloomberg BQuant (${daysToAnalyze}-day NQ analysis through ${latestDate}, last ${lastClose.toFixed(2)}): Strong upward momentum — ${upDays}/${daysToAnalyze} up-days, ${momentum.toFixed(2)}% cumulative move. Institutional tick flow supports tech sector overweight.`;
    } else if (score <= 4) {
      prediction = `Bloomberg BQuant (${daysToAnalyze}-day NQ analysis through ${latestDate}, last ${lastClose.toFixed(2)}): Negative momentum — only ${upDays}/${daysToAnalyze} up-days, ${momentum.toFixed(2)}% cumulative move. Risk-off signals suggest reducing growth exposure.`;
    } else {
      const bias = score >= 6 ? 'mildly bullish' : score <= 4.5 ? 'mildly defensive' : 'neutral';
      prediction = `Bloomberg BQuant (${daysToAnalyze}-day NQ analysis through ${latestDate}, last ${lastClose.toFixed(2)}): ${bias.charAt(0).toUpperCase() + bias.slice(1)} NQ signals — ${upDays} up / ${downDays} down days, ${momentum.toFixed(2)}% net move. Mixed regime favors income-generating positions; covered-call overlays (JEPI) can capture yield while maintaining equity exposure.`;
    }

    return { score: Math.round(score * 100) / 100, prediction };
  } catch (err) {
    console.error("BQuant Parquet Extraction Error:", err);
    throw err;
  }
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
  // THRESHOLDS
  const THRESHOLD_CASH_ONLY = 25;
  const THRESHOLD_CONSERVATIVE = 100;
  const THRESHOLD_NORMAL = 500;

  let threshold = THRESHOLD_CASH_ONLY;
  let allocations: PortfolioAllocation[] = [];

  // ========== RULE 1: Amount-based thresholds ==========
  if (rewardAmount < THRESHOLD_CASH_ONLY) {
    // Under $25: hold as cash
    allocations = [
      {
        ticker: "CASH",
        percentage: 100,
        rationale: "Reward amount too small to deploy efficiently",
        description: "High-yield savings or money market fund",
      },
    ];
    threshold = THRESHOLD_CASH_ONLY;
  } else if (rewardAmount < THRESHOLD_CONSERVATIVE) {
    // $25–$100: conservative split
    allocations = [
      {
        ticker: "VOO",
        percentage: 40,
        rationale: "Broad market exposure, low fees",
        description: "Vanguard S&P 500 ETF",
      },
      {
        ticker: "BND",
        percentage: 35,
        rationale: "Defensive allocation, stability",
        description: "Vanguard Bond ETF",
      },
      {
        ticker: "CASH",
        percentage: 25,
        rationale: "Liquidity buffer for scaling",
        description: "High-yield savings reserve",
      },
    ];
    threshold = THRESHOLD_CONSERVATIVE;
  } else if (rewardAmount < THRESHOLD_NORMAL) {
    // $100–$500: normal split (baseline)
    allocations = [
      {
        ticker: "VOO",
        percentage: 60,
        rationale: "Core equity position, proven long-term returns",
        description: "Vanguard S&P 500 ETF",
      },
      {
        ticker: "QQQ",
        percentage: 25,
        rationale: "Growth exposure to tech, high conviction sector",
        description: "Invesco Nasdaq 100 ETF",
      },
      {
        ticker: "CASH",
        percentage: 15,
        rationale: "Liquidity for buying opportunities",
        description: "High-yield savings reserve",
      },
    ];
    threshold = THRESHOLD_NORMAL;
  } else {
    // Over $500: broader allocation
    allocations = [
      {
        ticker: "VOO",
        percentage: 55,
        rationale: "Stable core holding",
        description: "Vanguard S&P 500 ETF",
      },
      {
        ticker: "QQQ",
        percentage: 25,
        rationale: "Growth allocation to technology",
        description: "Invesco Nasdaq 100 ETF",
      },
      {
        ticker: "VTI",
        percentage: 10,
        rationale: "Total market exposure for diversification",
        description: "Vanguard Total Market Index",
      },
      {
        ticker: "CASH",
        percentage: 10,
        rationale: "Strategic reserve",
        description: "High-yield savings reserve",
      },
    ];
  }

  // ========== RULE 2: Adjust for market regime ==========
  if (marketRegime.regime === "defensive") {
    // Shift away from growth, add bonds/cash
    allocations = allocations.map((alloc) => {
      if (alloc.ticker === "VOO") return { ...alloc, percentage: alloc.percentage + 5 };
      if (alloc.ticker === "QQQ") return { ...alloc, percentage: Math.max(alloc.percentage - 10, 0) };
      if (alloc.ticker === "CASH") return { ...alloc, percentage: alloc.percentage + 5 };
      return alloc;
    });
  } else if (marketRegime.regime === "bullish") {
    // Shift toward growth
    allocations = allocations.map((alloc) => {
      if (alloc.ticker === "QQQ") return { ...alloc, percentage: alloc.percentage + 10 };
      if (alloc.ticker === "CASH") return { ...alloc, percentage: Math.max(alloc.percentage - 8, 0) };
      return alloc;
    });
  }

  // ========== RULE 3: Adjust for risk tolerance ==========
  if (riskTolerance === "conservative") {
    allocations = allocations.map((alloc) => {
      if (alloc.ticker === "QQQ") return { ...alloc, percentage: alloc.percentage * 0.7 };
      if (alloc.ticker === "VOO") return { ...alloc, percentage: alloc.percentage * 1.1 };
      if (alloc.ticker === "CASH" || alloc.ticker === "BND")
        return { ...alloc, percentage: alloc.percentage * 1.2 };
      return alloc;
    });
  } else if (riskTolerance === "aggressive") {
    allocations = allocations.map((alloc) => {
      if (alloc.ticker === "QQQ") return { ...alloc, percentage: alloc.percentage * 1.3 };
      if (alloc.ticker === "CASH") return { ...alloc, percentage: Math.max(alloc.percentage * 0.5, 5) };
      return alloc;
    });
  }

  // ========== RULE 4: Adjust for Bloomberg BQuant ==========
  // If we have Bloomberg data, make highly specific institutional tilts
  if (marketRegime.bquantScore !== undefined && rewardAmount >= 100) {
    if (marketRegime.regime === "bullish" || marketRegime.bquantScore > 8) {
      allocations.push({
        ticker: "ARKK",
        percentage: 15,
        rationale: "BQuant smart money flow models detect heavy accumulation in disruptive tech.",
        description: "ARK Innovation ETF"
      });
      allocations = allocations.map(a => {
        if (a.ticker === "VOO" || a.ticker === "QQQ") return { ...a, percentage: a.percentage * 0.8 };
        return a;
      });
    } else if (marketRegime.regime === "defensive" || marketRegime.bquantScore < 4) {
      allocations.push({
        ticker: "GLD",
        percentage: 20,
        rationale: "BQuant system flags rising volatility and suggests precious metals macro hedge.",
        description: "SPDR Gold Trust"
      });
      allocations = allocations.map(a => {
        if (a.ticker === "VOO" || a.ticker === "QQQ") return { ...a, percentage: a.percentage * 0.7 };
        return a;
      });
    } else {
      allocations.push({
        ticker: "JEPI",
        percentage: 25,
        rationale: "BQuant suggests covered call strategies to generate yield in range-bound markets.",
        description: "JPMorgan Equity Premium Income"
      });
      allocations = allocations.map(a => {
        if (a.ticker === "VOO" || a.ticker === "QQQ") return { ...a, percentage: a.percentage * 0.75 };
        return a;
      });
    }
  }

  // Normalize percentages to 100%
  const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
  allocations = allocations.map((a) => ({
    ...a,
    percentage: Math.round((a.percentage / total) * 100),
  }));

  // Adjust last item to ensure exactly 100%
  const sum = allocations.reduce((s, a, i) => (i < allocations.length - 1 ? s + a.percentage : s), 0);
  if (allocations.length > 0) {
    allocations[allocations.length - 1].percentage = 100 - sum;
  }

  return {
    allocations,
    threshold,
    recommendation: `Based on ${rewardAmount < 25 ? "limited" : rewardAmount < 100 ? "modest" : "substantial"} rewards and ${marketRegime.regime} market conditions.`,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return Response.json(
      { error: "FEATHERLESS_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  if (!isValidAdviceRequest(body)) {
    return Response.json(
      { error: "Invalid request body for AI advice generation" },
      { status: 400 }
    );
  }

  const { totalRewards: _totalRewards, monthlyEarnings, riskTolerance = "moderate" } = body;
  const latestMonth = monthlyEarnings[monthlyEarnings.length - 1] ?? 0;
  const trend =
    monthlyEarnings.length >= 2
      ? monthlyEarnings[monthlyEarnings.length - 1] - monthlyEarnings[monthlyEarnings.length - 2]
      : 0;

  try {
    // ============================================
    // STEP 1: Detect market regime
    // ============================================
    const marketRegime = await detectMarketRegime();

    // ============================================
    // STEP 2: Generate deterministic portfolio rules
    // ============================================
    const {
      allocations: ruleAllocations,
      threshold,
      recommendation,
    } = generatePortfolioRules(latestMonth, riskTolerance, marketRegime);

    // ============================================
    // STEP 3: Use Featherless to write natural language explanation
    // ============================================
    const client = new OpenAI({
      baseURL: "https://api.featherless.ai/v1",
      apiKey,
    });

    // Build allocation summary for Featherless
    const allocationSummary = ruleAllocations
      .map((a) => `${a.percentage}% ${a.ticker} (${a.description})`)
      .join(", ");

    const systemPrompt = `You are a concise financial advisor AI for CardIQ, a credit card rewards optimization app.
Your job is to write a brief, clear explanation of a recommended investment portfolio.

Keep your summary to 2-3 sentences maximum.
Make it conversational and actionable.
Explain WHY the allocation makes sense for the user's situation.
Do NOT return JSON.
Do NOT return markdown code fences.
Just plain text explanation.`;

    const userPrompt = `Here's the recommended portfolio for a CardIQ user:

Reward amount this month: $${latestMonth}
Risk tolerance: ${riskTolerance}
Market regime: ${marketRegime.regime} (${marketRegime.description})
Volatiity: ${marketRegime.volatility}
Bloomberg BQuant Prediction: ${marketRegime.bloombergPrediction}
Suggested allocation: ${allocationSummary}

Please write a concise, friendly explanation of why this portfolio makes sense for them right now. Include why we're suggesting this mix based on their reward amount, market conditions, and the Bloomberg BQuant prediction.`;

    const response = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3-0324",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const summary = response.choices[0]?.message?.content?.trim() ?? recommendation;

    // ============================================
    // STEP 4: Compute projected returns
    // ============================================
    const projectedAnnualReturn = ruleAllocations.reduce((sum, a) => {
      const returnRates: Record<string, number> = {
        VOO: 8.5,
        QQQ: 12.0,
        VTI: 8.2,
        BND: 3.5,
        CASH: 4.5,
        ARKK: 15.0,
        GLD: 7.0,
        JEPI: 9.0,
      };
      return sum + (returnRates[a.ticker] ?? 5) * (a.percentage / 100);
    }, 0);

    // ============================================
    // STEP 5: Generate insights
    // ============================================
    const insights = [
      latestMonth < 25
        ? `Your $${latestMonth} is below the $25 investment threshold—holding in cash lets you reach critical mass before deploying.`
        : `At $${latestMonth}/month, you'll reach $${latestMonth * 12} annually at this earning rate—enough to build a meaningful micro-portfolio.`,

      trend > 0
        ? `Great news: your earnings are trending up ${trend > 50 ? "significantly" : ""}—expect stronger portfolio growth next month.`
        : `Your earnings have been steady—this consistent income is perfect for automated monthly investing.`,

      marketRegime.regime === "defensive"
        ? `Given current defensive market conditions, we're emphasizing stable assets like VOO and cash over growth.`
        : marketRegime.regime === "bullish"
          ? `With bullish market signals, we're tilting more toward growth stocks (QQQ) for upside potential.`
          : `Market conditions are mixed—this balanced allocation hedges both bull and bear scenarios.`,
    ];

    // ============================================
    // STEP 6: Return full advice object
    // ============================================
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
