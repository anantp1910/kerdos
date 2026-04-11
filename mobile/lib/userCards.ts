// User-specific card data — in production this comes from Plaid
export const USER_CARDS: Record<string, { last4: string; pointsBalance: number; totalEarned: number; color: string }> = {
  'amex-gold':       { last4: '4800', pointsBalance: 84200, totalEarned: 1840, color: 'amex'     },
  'chase-sapphire':  { last4: '3500', pointsBalance: 52100, totalEarned: 1120, color: 'chase'    },
  'citi-double':     { last4: '2700', pointsBalance: 0,     totalEarned: 680,  color: 'citi'     },
  'discover-it':     { last4: '9200', pointsBalance: 0,     totalEarned: 420,  color: 'discover' },
  'capital-venture': { last4: '6100', pointsBalance: 38500, totalEarned: 910,  color: 'capital'  },
};
