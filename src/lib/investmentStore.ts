// Investment store — tracks confirmed "I Invested This" actions
// Separate from rewardsStore (what you earned) — this tracks what you deployed

import {
  MARKET_SESSION_MINUTES,
  TRADING_MINUTES_PER_YEAR,
  addDateKeyDays,
  getMarketClock,
  getSessionMinuteForTimestamp,
  isTradingDate,
} from "@/lib/marketHours";

export interface InvestmentAllocation {
  ticker: string;
  pct: number;
  annualReturn: number;
}

export interface InvestmentTranche {
  id: string;          // unique id
  date: string;        // ISO date "2026-04-11"
  createdAt?: number;  // epoch ms, used for market-session-aware valuation
  amount: number;      // dollar amount invested
  allocations: InvestmentAllocation[];
  blendedReturn: number; // weighted avg annual return %
}

export interface InvestmentStore {
  tranches: InvestmentTranche[];
  totalInvested: number;
}

const KEY = "kerdos_investments";

function load(): InvestmentStore {
  if (typeof window === "undefined") return { tranches: [], totalInvested: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { tranches: [], totalInvested: 0 };
    return JSON.parse(raw) as InvestmentStore;
  } catch {
    return { tranches: [], totalInvested: 0 };
  }
}

function save(store: InvestmentStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function logInvestment(
  amount: number,
  allocations: InvestmentAllocation[],
  blendedReturn: number
): void {
  const store = load();
  const now = new Date();
  const tranche: InvestmentTranche = {
    id: `inv_${now.getTime()}`,
    date: getMarketClock(now).dateKey,
    createdAt: now.getTime(),
    amount: Math.round(amount * 100) / 100,
    allocations,
    blendedReturn,
  };
  store.tranches.push(tranche);
  store.totalInvested = Math.round((store.totalInvested + amount) * 100) / 100;
  save(store);
}

export function getInvestmentStore(): InvestmentStore {
  return load();
}

function getElapsedTradingMinutes(tranche: InvestmentTranche, now = new Date()) {
  const endClock = getMarketClock(now);
  const startDateKey = tranche.date;
  const endDateKey = endClock.dateKey;

  if (startDateKey > endDateKey) return 0;

  const startSessionMinute = tranche.createdAt
    ? getSessionMinuteForTimestamp(tranche.createdAt)
    : 0;

  let cursor = startDateKey;
  let total = 0;

  while (cursor <= endDateKey) {
    if (isTradingDate(cursor)) {
      let start = 0;
      let end = MARKET_SESSION_MINUTES;

      if (cursor === startDateKey) start = startSessionMinute;
      if (cursor === endDateKey) end = endClock.sessionMinute;

      total += Math.max(end - start, 0);
    }

    cursor = addDateKeyDays(cursor, 1);
  }

  return total;
}

function getIntradayOscillation(tranche: InvestmentTranche, now = new Date()) {
  const clock = getMarketClock(now);
  if (!clock.isOpen) return 0;

  const seed = tranche.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const amplitude = Math.min(0.0035, 0.001 + tranche.blendedReturn / 10000);
  const envelope = Math.sin(Math.PI * clock.sessionProgress);
  const wave = Math.sin(clock.sessionProgress * Math.PI * 4 + seed);

  return amplitude * envelope * wave;
}

// Current market value of a single tranche, accruing only during cash-session minutes.
function trancheValue(tranche: InvestmentTranche, now = new Date()): number {
  const tradingMinutes = getElapsedTradingMinutes(tranche, now);
  const baseValue =
    tranche.amount *
    Math.pow(1 + tranche.blendedReturn / 100, tradingMinutes / TRADING_MINUTES_PER_YEAR);

  return baseValue * (1 + getIntradayOscillation(tranche, now));
}

// Total current portfolio value across all tranches
export function getPortfolioValue(): number {
  const store = load();
  if (store.tranches.length === 0) return 0;
  return Math.round(store.tranches.reduce((s, t) => s + trancheValue(t), 0) * 100) / 100;
}

// Total gain = portfolioValue - totalInvested
export function getPortfolioGain(): number {
  return Math.round((getPortfolioValue() - load().totalInvested) * 100) / 100;
}

// How much has already been confirmed as invested this calendar month
export function getInvestedThisMonth(): number {
  const store = load();
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return Math.round(
    store.tranches
      .filter((t) => t.date.startsWith(prefix))
      .reduce((s, t) => s + t.amount, 0) * 100
  ) / 100;
}

// Uninvested balance = thisMonth rewards - already invested this month
export function getUninvestedBalance(thisMonth: number): number {
  return Math.max(0, Math.round((thisMonth - getInvestedThisMonth()) * 100) / 100);
}

// Tranches grouped by month label e.g. "April 2026"
export function getTranchesGroupedByMonth(): { label: string; tranches: InvestmentTranche[]; total: number; currentValue: number }[] {
  const store = load();
  const groups: Record<string, InvestmentTranche[]> = {};

  for (const t of store.tranches) {
    const d = new Date(t.date);
    const key = d.toLocaleString("default", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  }

  return Object.entries(groups)
    .map(([label, tranches]) => ({
      label,
      tranches,
      total: Math.round(tranches.reduce((s, t) => s + t.amount, 0) * 100) / 100,
      currentValue: Math.round(tranches.reduce((s, t) => s + trancheValue(t), 0) * 100) / 100,
    }))
    .reverse(); // most recent first
}
