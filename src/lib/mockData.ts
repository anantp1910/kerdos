export type CardColor = "amex" | "chase" | "citi" | "discover" | "capital";

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
  pointValuation: number; // cents per point
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
  change: number;
  changePct: number;
  color: string;
}

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  owes: number;
  cardSuggestion: string;
}

export const CARDS: CreditCard[] = [
  {
    id: "amex-gold",
    name: "Gold Card",
    issuer: "American Express",
    last4: "4521",
    color: "amex",
    annualFee: 250,
    totalEarned: 1840,
    cashbackRate: 0,
    rewardRates: {
      dining: 4,
      groceries: 4,
      travel: 3,
      gas: 1,
      entertainment: 1,
      other: 1,
    },
    pointValuation: 2.0,
    pointsBalance: 84200,
    network: "Amex",
  },
  {
    id: "chase-sapphire",
    name: "Sapphire Preferred",
    issuer: "Chase",
    last4: "7832",
    color: "chase",
    annualFee: 95,
    totalEarned: 1120,
    cashbackRate: 0,
    rewardRates: {
      dining: 3,
      travel: 5,
      groceries: 3,
      gas: 2,
      entertainment: 2,
      other: 1,
    },
    pointValuation: 2.05,
    pointsBalance: 52100,
    network: "Visa",
  },
  {
    id: "citi-double",
    name: "Double Cash",
    issuer: "Citi",
    last4: "2210",
    color: "citi",
    annualFee: 0,
    totalEarned: 680,
    cashbackRate: 2,
    rewardRates: {
      dining: 2,
      travel: 2,
      groceries: 2,
      gas: 2,
      entertainment: 2,
      other: 2,
    },
    pointValuation: 1.0,
    pointsBalance: 0,
    network: "Mastercard",
  },
  {
    id: "discover-it",
    name: "Discover it Cash",
    issuer: "Discover",
    last4: "9103",
    color: "discover",
    annualFee: 0,
    totalEarned: 420,
    cashbackRate: 1,
    rewardRates: {
      dining: 5,
      groceries: 1,
      travel: 1,
      gas: 5,
      entertainment: 5,
      other: 1,
    },
    pointValuation: 1.0,
    pointsBalance: 0,
    network: "Discover",
  },
  {
    id: "capital-venture",
    name: "Venture Rewards",
    issuer: "Capital One",
    last4: "6647",
    color: "capital",
    annualFee: 95,
    totalEarned: 910,
    cashbackRate: 0,
    rewardRates: {
      dining: 2,
      travel: 5,
      groceries: 2,
      gas: 2,
      entertainment: 2,
      other: 2,
    },
    pointValuation: 1.7,
    pointsBalance: 38500,
    network: "Visa",
  },
];

export const CATEGORIES = [
  { id: "dining", label: "Dining", icon: "🍽️" },
  { id: "groceries", label: "Groceries", icon: "🛒" },
  { id: "travel", label: "Travel", icon: "✈️" },
  { id: "gas", label: "Gas", icon: "⛽" },
  { id: "entertainment", label: "Entertainment", icon: "🎬" },
  { id: "other", label: "Other", icon: "🛍️" },
];

export const RECENT_TRANSACTIONS: Transaction[] = [
  { id: "t1", merchant: "Nobu Restaurant", category: "dining", amount: 148.5, date: "2024-04-10", cardId: "amex-gold", cashback: 11.88 },
  { id: "t2", merchant: "Whole Foods", category: "groceries", amount: 89.32, date: "2024-04-09", cardId: "amex-gold", cashback: 7.15 },
  { id: "t3", merchant: "Delta Airlines", category: "travel", amount: 420.0, date: "2024-04-08", cardId: "chase-sapphire", cashback: 43.05 },
  { id: "t4", merchant: "Shell Gas Station", category: "gas", amount: 62.4, date: "2024-04-07", cardId: "discover-it", cashback: 6.24 },
  { id: "t5", merchant: "AMC Theaters", category: "entertainment", amount: 34.0, date: "2024-04-06", cardId: "discover-it", cashback: 3.4 },
  { id: "t6", merchant: "Sweetgreen", category: "dining", amount: 22.75, date: "2024-04-05", cardId: "amex-gold", cashback: 1.82 },
];

export const STOCK_TICKERS: StockData[] = [
  { ticker: "VOO", name: "Vanguard S&P 500", price: 498.32, change: 3.21, changePct: 0.65, color: "#4ade80" },
  { ticker: "QQQ", name: "Invesco Nasdaq", price: 432.18, change: 5.44, changePct: 1.27, color: "#60a5fa" },
  { ticker: "SPY", name: "SPDR S&P 500", price: 521.67, change: 2.89, changePct: 0.56, color: "#4ade80" },
  { ticker: "VTI", name: "Vanguard Total Mkt", price: 242.53, change: -0.87, changePct: -0.36, color: "#f87171" },
  { ticker: "ARKK", name: "ARK Innovation", price: 47.83, change: 1.22, changePct: 2.62, color: "#4ade80" },
  { ticker: "BND", name: "Vanguard Bond", price: 73.14, change: -0.12, changePct: -0.16, color: "#f87171" },
];

export const GROUP_MEMBERS: GroupMember[] = [
  { id: "u1", name: "Arjun", avatar: "AJ", owes: 128.5, cardSuggestion: "Amex Gold" },
  { id: "u2", name: "Priya", avatar: "PR", owes: -45.0, cardSuggestion: "Chase Sapphire" },
  { id: "u3", name: "Zara", avatar: "ZK", owes: 92.3, cardSuggestion: "Citi Double" },
];

export function calculateCardScore(card: CreditCard, category: string, amount: number): number {
  const rate = card.rewardRates[category] ?? card.rewardRates["other"] ?? 1;
  const pointValue = card.pointValuation;
  const cashback = card.cashbackRate;
  if (cashback > 0) {
    return (cashback / 100) * amount;
  }
  return (rate / 100) * pointValue * amount;
}

export function getRankedCards(category: string, amount: number) {
  return CARDS.map((card) => ({
    card,
    score: calculateCardScore(card, category, amount),
    rate: card.rewardRates[category] ?? card.rewardRates["other"] ?? 1,
  })).sort((a, b) => b.score - a.score);
}
