import { NextResponse } from 'next/server';
import { getTransferPrograms } from '@/lib/rewardsApi';

// GET /api/rewards/transfers
export async function GET() {
  try {
    const data = await getTransferPrograms();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
