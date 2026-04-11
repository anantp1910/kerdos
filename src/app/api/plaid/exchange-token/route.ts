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

// Match official_name / name to internal card IDs
function matchCardId(name: string, officialName: string): string | null {
  const s = `${name} ${officialName}`.toLowerCase();
  if (s.includes('amex') || s.includes('american express') || s.includes('gold card')) return 'amex-gold';
  if (s.includes('sapphire'))                                                           return 'chase-sapphire';
  if (s.includes('double cash') || s.includes('citi'))                                 return 'citi-double';
  if (s.includes('discover'))                                                           return 'discover-it';
  if (s.includes('venture') || s.includes('capital one'))                              return 'capital-venture';
  return null;
}

export async function POST(req: Request) {
  try {
    const { publicToken } = await req.json();

    const exchangeRes = await client.itemPublicTokenExchange({ public_token: publicToken });
    const access_token = exchangeRes.data.access_token;

    const accountsRes = await client.accountsGet({ access_token });

    const creditAccounts = accountsRes.data.accounts.filter(a => a.type === 'credit');

    const mappings = creditAccounts
      .map(a => {
        const cardId = matchCardId(a.name, a.official_name ?? '');
        if (!cardId) return null;
        return {
          plaidAccountId: a.account_id,
          plaidName:      a.name,
          plaidMask:      a.mask ?? '0000',
          cardId,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ mappings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('exchange-token error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
