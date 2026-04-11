import { NextRequest, NextResponse } from 'next/server';
import { getTopCardsForMerchant } from '@/lib/rewardsApi';

// GET /api/rewards/topcards?merchant=Starbucks&type=Coffee
export async function GET(req: NextRequest) {
  const merchant = req.nextUrl.searchParams.get('merchant');
  const type     = req.nextUrl.searchParams.get('type') ?? 'other';

  if (!merchant) return NextResponse.json({ error: 'merchant required' }, { status: 400 });

  try {
    const data = await getTopCardsForMerchant(merchant, type);
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
