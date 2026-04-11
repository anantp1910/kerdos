import { NextResponse } from 'next/server';
import { PlaidApi, PlaidEnvironments, Configuration, Products, CountryCode } from 'plaid';

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

export async function POST() {
  try {
    const res = await client.linkTokenCreate({
      user:           { client_user_id: 'user-sandbox' },
      client_name:    'CardIQ',
      products:       [Products.Transactions],
      country_codes:  [CountryCode.Us],
      language:       'en',
    });

    return NextResponse.json({ link_token: res.data.link_token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('create-link-token error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
