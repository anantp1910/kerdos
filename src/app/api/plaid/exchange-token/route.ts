import { NextResponse } from 'next/server';
import { PlaidApi, PlaidEnvironments, Configuration } from 'plaid';

const client = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET':    process.env.PLAID_SECRET,
      },
    },
  })
);

export async function POST(req: Request) {
  try {
    const { publicToken } = await req.json();

    // Exchange public token for access token
    const exchangeRes = await client.itemPublicTokenExchange({ public_token: publicToken });
    const access_token = exchangeRes.data.access_token;

    // Fetch accounts (immediately available — no retry needed unlike transactions)
    const accountsRes = await client.accountsGet({ access_token });

    // Return only credit accounts
    const creditAccounts = accountsRes.data.accounts
      .filter(a => a.type === 'credit')
      .map(a => ({
        account_id: a.account_id,
        name:       a.name,
        mask:       a.mask ?? '0000',
        subtype:    a.subtype,
        type:       a.type,
      }));

    return NextResponse.json({ accounts: creditAccounts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('exchange-token error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
