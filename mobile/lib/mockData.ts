export type CardColor = 'amex' | 'chase' | 'citi' | 'discover' | 'capital';

export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  last4: string;
  color: CardColor;
  annualFee: number;
  totalEarned: number;
  cashbackRate: number;
  rewardRates: Record<string, number>;
  pointValuation: number;
  pointsBalance: number;
  network: string;
}

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  cardId: string;
  cashback: number;
}

export interface StockData {
  ticker: string;
  name: string;
  price: number;
  changePct: number;
}

export interface GroupMember {
  id: string;
  name: string;
  initials: string;
  owes: number;
  cardSuggestion: string;
}

export const CARDS: CreditCard[] = [
  {
    id: 'amex-gold',
    name: 'Gold Card',
    issuer: 'Amex',
    last4: '4521',
    color: 'amex',
    annualFee: 250,
    totalEarned: 1840,
    cashbackRate: 0,
    rewardRates: { dining: 4, groceries: 4, travel: 3, gas: 1, entertainment: 1, other: 1 },
    pointValuation: 2.0,
    pointsBalance: 84200,
    network: 'Amex',
  },
  {
    id: 'chase-sapphire',
    name: 'Sapphire',
    issuer: 'Chase',
    last4: '7832',
    color: 'chase',
    annualFee: 95,
    totalEarned: 1120,
    cashbackRate: 0,
    rewardRates: { dining: 3, travel: 5, groceries: 3, gas: 2, entertainment: 2, other: 1 },
    pointValuation: 2.05,
    pointsBalance: 52100,
    network: 'Visa',
  },
  {
    id: 'citi-double',
    name: 'Double Cash',
    issuer: 'Citi',
    last4: '2210',
    color: 'citi',
    annualFee: 0,
    totalEarned: 680,
    cashbackRate: 2,
    rewardRates: { dining: 2, travel: 2, groceries: 2, gas: 2, entertainment: 2, other: 2 },
    pointValuation: 1.0,
    pointsBalance: 0,
    network: 'Mastercard',
  },
  {
    id: 'discover-it',
    name: 'it Cash',
    issuer: 'Discover',
    last4: '9103',
    color: 'discover',
    annualFee: 0,
    totalEarned: 420,
    cashbackRate: 1,
    rewardRates: { dining: 5, groceries: 1, travel: 1, gas: 5, entertainment: 5, other: 1 },
    pointValuation: 1.0,
    pointsBalance: 0,
    network: 'Discover',
  },
  {
    id: 'capital-venture',
    name: 'Venture',
    issuer: 'Capital One',
    last4: '6647',
    color: 'capital',
    annualFee: 95,
    totalEarned: 910,
    cashbackRate: 0,
    rewardRates: { dining: 2, travel: 5, groceries: 2, gas: 2, entertainment: 2, other: 2 },
    pointValuation: 1.7,
    pointsBalance: 38500,
    network: 'Visa',
  },
];

export const CATEGORIES = [
  { id: 'dining',        label: 'Dining',         icon: '🍽️' },
  { id: 'groceries',    label: 'Groceries',       icon: '🛒' },
  { id: 'travel',       label: 'Travel',          icon: '✈️' },
  { id: 'gas',          label: 'Gas',             icon: '⛽' },
  { id: 'entertainment',label: 'Entertainment',   icon: '🎬' },
  { id: 'other',        label: 'Other',           icon: '🛍️' },
];

export const RECENT_TRANSACTIONS: Transaction[] = [
  { id: 't1', merchant: 'Nobu Restaurant',  category: 'dining',         amount: 148.5,  date: 'Apr 10', cardId: 'amex-gold',       cashback: 11.88 },
  { id: 't2', merchant: 'Whole Foods',      category: 'groceries',      amount: 89.32,  date: 'Apr 9',  cardId: 'amex-gold',       cashback: 7.15  },
  { id: 't3', merchant: 'Delta Airlines',   category: 'travel',         amount: 420.0,  date: 'Apr 8',  cardId: 'chase-sapphire',  cashback: 43.05 },
  { id: 't4', merchant: 'Shell Station',    category: 'gas',            amount: 62.4,   date: 'Apr 7',  cardId: 'discover-it',     cashback: 6.24  },
  { id: 't5', merchant: 'AMC Theaters',     category: 'entertainment',  amount: 34.0,   date: 'Apr 6',  cardId: 'discover-it',     cashback: 3.4   },
];

export const STOCK_TICKERS: StockData[] = [
  { ticker: 'VOO',  name: 'Vanguard S&P 500',  price: 498.32, changePct:  0.65 },
  { ticker: 'QQQ',  name: 'Invesco Nasdaq 100', price: 432.18, changePct:  1.27 },
  { ticker: 'SPY',  name: 'SPDR S&P 500',       price: 521.67, changePct:  0.56 },
  { ticker: 'VTI',  name: 'Vanguard Total Mkt', price: 242.53, changePct: -0.36 },
  { ticker: 'ARKK', name: 'ARK Innovation',     price: 47.83,  changePct:  2.62 },
  { ticker: 'BND',  name: 'Vanguard Bond',      price: 73.14,  changePct: -0.16 },
];

export const PORTFOLIO_SPLIT = [
  { name: 'VOO',          pct: 60, color: '#4ade80', desc: 'Vanguard S&P 500 ETF' },
  { name: 'QQQ',          pct: 25, color: '#60a5fa', desc: 'Invesco Nasdaq 100' },
  { name: 'Cash Reserve', pct: 15, color: '#a78bfa', desc: 'High-yield savings' },
];

export const GROUP_MEMBERS: GroupMember[] = [
  { id: 'u1', name: 'Arjun', initials: 'AJ', owes:  128.5,  cardSuggestion: 'Amex Gold' },
  { id: 'u2', name: 'Priya', initials: 'PR', owes: -45.0,   cardSuggestion: 'Chase Sapphire' },
  { id: 'u3', name: 'Zara',  initials: 'ZK', owes:  92.3,   cardSuggestion: 'Citi Double' },
];

export const MONTHLY_DATA = [
  { month: 'Nov', rewards: 210, savings: 380 },
  { month: 'Dec', rewards: 290, savings: 440 },
  { month: 'Jan', rewards: 245, savings: 390 },
  { month: 'Feb', rewards: 310, savings: 510 },
  { month: 'Mar', rewards: 318, savings: 495 },
  { month: 'Apr', rewards: 340, savings: 520 },
];

export const BREAKEVEN_CARDS = [
  { name: 'Amex Gold',       fee: 250, months: 2.1, pct: 100 },
  { name: 'Chase Sapphire',  fee: 95,  months: 3.2, pct: 31  },
  { name: 'Capital Venture', fee: 95,  months: 2.5, pct: 26  },
  { name: 'Citi Double Cash',fee: 0,   months: 0,   pct: 100 },
  { name: 'Discover it',     fee: 0,   months: 0,   pct: 100 },
];

export const GROUP_EXPENSES = [
  {
    id: 'e1',
    description: 'Dinner at Nobu',
    total: 386,
    splits: [
      { name: 'You',   amount: 128.67, paid: true  },
      { name: 'Arjun', amount: 128.67, paid: false },
      { name: 'Priya', amount: 128.66, paid: true  },
    ],
  },
  {
    id: 'e2',
    description: 'Airbnb — Miami',
    total: 1200,
    splits: [
      { name: 'You',   amount: 400, paid: true  },
      { name: 'Arjun', amount: 400, paid: false },
      { name: 'Zara',  amount: 400, paid: false },
    ],
  },
  {
    id: 'e3',
    description: 'Grocery run',
    total: 142,
    splits: [
      { name: 'You',   amount: 47.33, paid: true  },
      { name: 'Priya', amount: 47.33, paid: false },
      { name: 'Zara',  amount: 47.34, paid: true  },
    ],
  },
];

export function getRankedCards(category: string, amount: number) {
  return CARDS.map((card) => {
    const rate = card.rewardRates[category] ?? card.rewardRates['other'] ?? 1;
    const score = card.cashbackRate > 0
      ? (card.cashbackRate / 100) * amount
      : (rate / 100) * card.pointValuation * amount;
    return { card, score, rate };
  }).sort((a, b) => b.score - a.score);
}

export const CATEGORY_ICONS: Record<string, string> = {
  dining: '🍽️', groceries: '🛒', travel: '✈️',
  gas: '⛽', entertainment: '🎬', other: '🛍️',
};
