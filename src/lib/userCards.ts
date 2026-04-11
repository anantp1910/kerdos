// User-specific card data — in production this comes from Plaid
// cardId maps to the internal IDs used in /api/rewards
export const USER_CARDS: Record<string, { last4: string; pointsBalance: number; totalEarned: number; color: string }> = {
  'amex-gold':       { last4: '4521', pointsBalance: 84200, totalEarned: 1840, color: '#1a1a2e' },
  'chase-sapphire':  { last4: '7832', pointsBalance: 52100, totalEarned: 1120, color: '#1a0533' },
  'citi-double':     { last4: '2210', pointsBalance: 0,     totalEarned: 680,  color: '#0a1628' },
  'discover-it':     { last4: '9103', pointsBalance: 0,     totalEarned: 420,  color: '#1a0a00' },
  'capital-venture': { last4: '6647', pointsBalance: 38500, totalEarned: 910,  color: '#001a0a' },
};
