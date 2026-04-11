import { NextResponse } from 'next/server';

export async function GET() {
  const SEARCHES = ['venture', 'capital venture', 'capitalone'];

  const results = [];
  for (const query of SEARCHES) {
    const res = await fetch(`https://rewards-credit-card-api.p.rapidapi.com/creditcard-detail-namesearch/${encodeURIComponent(query)}`, {
      headers: {
        'X-RapidAPI-Key': process.env.REWARDSCC_API_KEY!,
        'X-RapidAPI-Host': 'rewards-credit-card-api.p.rapidapi.com',
      },
    });
    const data = await res.json();
    const cards = Array.isArray(data) ? data : [data];
    results.push({ query, status: res.status, matches: cards.map((c: any) => ({ cardKey: c.cardKey, cardName: c.cardName })) });
    await new Promise(r => setTimeout(r, 400));
  }
  return NextResponse.json(results);
}
