import { NextResponse } from 'next/server';

// Maps our internal card IDs to rewardscc.com card keys
const CARD_KEYS: Record<string, string> = {
  'amex-gold':       'amex-gold',
  'chase-sapphire':  'chase-sapphirepreferred',
  'citi-double':     'citi-doublecash',
  'discover-it':     'discover-cashback',
  'capital-venture': 'capitalone-venture',
};

// Maps rewardscc spendBonusCategoryGroup/Name → our internal category keys
const CATEGORY_MAP: Record<string, string> = {
  'dining':          'dining',
  'all dining':      'dining',
  'restaurants':     'dining',
  'grocery stores':  'groceries',
  'grocery':         'groceries',
  'supermarkets':    'groceries',
  'travel':          'travel',
  'all airfare':     'travel',
  'airfare':         'travel',
  'hotels':          'travel',
  'gas stations':    'gas',
  'gas':             'gas',
  'fuel':            'gas',
  'entertainment':   'entertainment',
  'streaming':       'entertainment',
};

async function fetchCardRewards(cardKey: string) {
  const res = await fetch(
    `https://rewards-credit-card-api.p.rapidapi.com/creditcard-detail-bycard/${cardKey}`,
    {
      headers: {
        'X-RapidAPI-Key': process.env.REWARDSCC_API_KEY!,
        'X-RapidAPI-Host': 'rewards-credit-card-api.p.rapidapi.com',
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error(`rewardscc error for ${cardKey}: ${res.status}`);
  }

  return res.json();
}

function extractRewardRates(data: any): Record<string, number> {
  const rates: Record<string, number> = {
    dining: 1,
    groceries: 1,
    travel: 1,
    gas: 1,
    entertainment: 1,
    other: 1,
  };

  const bonusCategories: any[] = data?.spendBonusCategory ?? [];

  for (const cat of bonusCategories) {
    const group = (cat.spendBonusCategoryGroup ?? '').toLowerCase();
    const name  = (cat.spendBonusCategoryName ?? '').toLowerCase();
    const subgroup = (cat.spendBonusSubcategoryGroup ?? '').toLowerCase();
    const rate  = cat.earnMultiplier ?? 1;

    for (const key of [name, subgroup, group]) {
      const mapped = CATEGORY_MAP[key];
      if (mapped && rate > rates[mapped]) {
        rates[mapped] = rate;
        break;
      }
    }
  }

  return rates;
}

export async function GET() {
  try {
    const results = [];
    for (const [internalId, cardKey] of Object.entries(CARD_KEYS)) {
      const raw = await fetchCardRewards(cardKey);
      // API returns an array with one item
      const data = Array.isArray(raw) ? raw[0] : raw;
      const rewardRates = extractRewardRates(data);

      // Citi Double Cash is a flat 2% cashback card — no bonus categories in API
      if (internalId === 'citi-double') {
        Object.keys(rewardRates).forEach(k => rewardRates[k] = 2);
      }

      results.push({
        id: internalId,
        cardKey,
        cardName:      data?.cardName      ?? null,
        cardIssuer:    data?.cardIssuer    ?? null,
        cardNetwork:   data?.cardNetwork   ?? null,
        annualFee:     data?.annualFee     ?? null,
        pointValuation: data?.baseSpendEarnValuation ?? null,
        isCashback:    data?.baseSpendEarnIsCash === 1,
        baseSpendEarnCurrency: data?.baseSpendEarnCurrency ?? 'points',
        rewardRates,
      });
      await new Promise(r => setTimeout(r, 400));
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('rewardscc error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
