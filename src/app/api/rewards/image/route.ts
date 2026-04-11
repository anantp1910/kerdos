import { NextRequest, NextResponse } from 'next/server';
import { getCardImage } from '@/lib/rewardsApi';

// GET /api/rewards/image?cardKey=amex-gold
export async function GET(req: NextRequest) {
  const cardKey = req.nextUrl.searchParams.get('cardKey');
  if (!cardKey) return NextResponse.json({ error: 'cardKey required' }, { status: 400 });

  try {
    const data = await getCardImage(cardKey);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
