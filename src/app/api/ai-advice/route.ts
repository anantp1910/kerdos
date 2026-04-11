import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.featherless.ai/v1",
  apiKey: process.env.FEATHERLESS_API_KEY ?? "",
});

interface AdviceRequest {
  totalRewards: number;
  monthlyEarnings: number[];
  riskTolerance?: "conservative" | "moderate" | "aggressive";
}

export async function POST(request: Request) {
  const body: AdviceRequest = await request.json();
  const { totalRewards, monthlyEarnings, riskTolerance = "moderate" } = body;

  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return Response.json(
      { error: "FEATHERLESS_API_KEY not configured" },
      { status: 500 }
    );
  }

  const latestMonth = monthlyEarnings[monthlyEarnings.length - 1] ?? 0;
  const trend =
    monthlyEarnings.length >= 2
      ? monthlyEarnings[monthlyEarnings.length - 1] - monthlyEarnings[monthlyEarnings.length - 2]
      : 0;

  const systemPrompt = `You are a concise financial advisor AI for a credit card rewards optimization app called CardIQ. The user earns cashback and rewards from credit cards and wants to invest them wisely.

Given the user's reward data, suggest a micro-portfolio allocation across ETFs or index funds. Be specific with ticker symbols and percentages.

You MUST respond with ONLY valid JSON in this exact format, no markdown, no code fences, no extra text:
{
  "allocations": [
    { "ticker": "VOO", "percentage": 60, "rationale": "brief reason", "description": "Vanguard S&P 500 ETF" },
    { "ticker": "QQQ", "percentage": 25, "rationale": "brief reason", "description": "Invesco Nasdaq 100" },
    { "ticker": "CASH", "percentage": 15, "rationale": "brief reason", "description": "High-yield savings reserve" }
  ],
  "summary": "One paragraph investment summary with specific reasoning.",
  "projectedAnnualReturn": 8.5,
  "insights": [
    "First actionable insight about the portfolio",
    "Second insight about their earning trend",
    "Third insight about long-term growth potential"
  ]
}`;

  const userPrompt = `My credit card rewards data:
- Total rewards earned (all time): $${totalRewards.toLocaleString()}
- This month's rewards: $${latestMonth}
- Monthly earnings trend (last ${monthlyEarnings.length} months): ${monthlyEarnings.map((v) => "$" + v).join(" → ")}
- Month-over-month change: ${trend >= 0 ? "+" : ""}$${trend}
- Risk tolerance: ${riskTolerance}

Suggest how I should invest my $${latestMonth} in rewards this month.`;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-ai/DeepSeek-V3-0324",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    // Parse the JSON response — strip code fences if the model adds them
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return Response.json({ data: parsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Featherless API error:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
