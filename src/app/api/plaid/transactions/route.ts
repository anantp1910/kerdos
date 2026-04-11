import { NextResponse } from 'next/server';
import { PlaidApi, PlaidEnvironments, Configuration, Products } from 'plaid';

const client = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function getTransactionsWithRetry(access_token: string, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const { data } = await client.transactionsGet({
        access_token,
        start_date: '2025-01-01',
        end_date: '2026-04-11',
      });
      return data.transactions;
    } catch (err: unknown) {
      const code = (err as any)?.response?.data?.error_code;
      if (code === 'PRODUCT_NOT_READY' && i < retries - 1) {
        await delay(2000);
        continue;
      }
      throw err;
    }
  }
}

export async function GET() {
  try {
    const { data: { public_token } } = await client.sandboxPublicTokenCreate({
      institution_id: 'ins_109508',
      initial_products: [Products.Transactions],
    });

    const { data: { access_token } } = await client.itemPublicTokenExchange({
      public_token,
    });

    const transactions = await getTransactionsWithRetry(access_token);
    return NextResponse.json(transactions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const plaidError = (err as any)?.response?.data;
    console.error('Plaid error:', plaidError ?? message);
    return NextResponse.json({ error: message, detail: plaidError }, { status: 500 });
  }
}
