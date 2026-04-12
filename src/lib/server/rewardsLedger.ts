import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LoggedSwipe = {
  id: string;
  userId: string;
  cardId: string;
  amount: number;
  merchant: string | null;
  category: string;
  estimatedValue: number;
  rate: number;
  rewardCurrency: string;
  rewardUnitsEarned: number;
  createdAt: string;
};

type CardRewardsSnapshot = {
  totalEarned: number;
  totalSpend: number;
  totalPoints: number;
  totalCashback: number;
  transactionCount: number;
};

type UserRewardsLedger = {
  transactions: LoggedSwipe[];
  cards: Record<string, CardRewardsSnapshot>;
};

type RewardsStore = {
  users: Record<string, UserRewardsLedger>;
};

const RUNTIME_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data", "runtime");
const STORE_PATH = path.join(RUNTIME_DIR, "rewards-ledger.json");
let storeWriteQueue: Promise<void> = Promise.resolve();

const EMPTY_CARD_SNAPSHOT = (): CardRewardsSnapshot => ({
  totalEarned: 0,
  totalSpend: 0,
  totalPoints: 0,
  totalCashback: 0,
  transactionCount: 0,
});

function createEmptyUserLedger(): UserRewardsLedger {
  return {
    transactions: [],
    cards: {},
  };
}

const EMPTY_STORE: RewardsStore = {
  users: {},
};

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<RewardsStore> {
  await storeWriteQueue;
  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<RewardsStore>;
    return {
      users: parsed.users ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(store: RewardsStore) {
  storeWriteQueue = storeWriteQueue.then(async () => {
    await ensureStoreFile();
    await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  });
  await storeWriteQueue;
}

export async function getUserRewardsLedger(userId: string): Promise<UserRewardsLedger> {
  const store = await readStore();
  return store.users[userId] ?? createEmptyUserLedger();
}

export async function logSwipeTransaction(input: Omit<LoggedSwipe, "id" | "createdAt">): Promise<LoggedSwipe> {
  const store = await readStore();
  const ledger = store.users[input.userId] ?? createEmptyUserLedger();
  const card = ledger.cards[input.cardId] ?? EMPTY_CARD_SNAPSHOT();

  const transaction: LoggedSwipe = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  ledger.transactions.unshift(transaction);
  const isPointsCard = input.rewardCurrency.toLowerCase().includes("point");
  ledger.cards[input.cardId] = {
    totalEarned: Number((card.totalEarned + input.estimatedValue).toFixed(2)),
    totalSpend: Number((card.totalSpend + input.amount).toFixed(2)),
    totalPoints: isPointsCard ? card.totalPoints + input.rewardUnitsEarned : card.totalPoints,
    totalCashback: !isPointsCard ? Number((card.totalCashback + input.rewardUnitsEarned).toFixed(2)) : card.totalCashback,
    transactionCount: card.transactionCount + 1,
  };

  store.users[input.userId] = ledger;
  await writeStore(store);
  return transaction;
}

export async function getUserRewardsSummary(userId: string) {
  const ledger = await getUserRewardsLedger(userId);
  const totalEarned = Object.values(ledger.cards).reduce((sum, card) => sum + card.totalEarned, 0);
  const totalSpend = Object.values(ledger.cards).reduce((sum, card) => sum + card.totalSpend, 0);
  const totalPoints = Object.values(ledger.cards).reduce((sum, card) => sum + card.totalPoints, 0);
  const totalCashback = Object.values(ledger.cards).reduce((sum, card) => sum + card.totalCashback, 0);

  return {
    userId,
    totalEarned: Number(totalEarned.toFixed(2)),
    totalSpend: Number(totalSpend.toFixed(2)),
    totalPoints,
    totalCashback: Number(totalCashback.toFixed(2)),
    cards: ledger.cards,
    transactions: ledger.transactions,
  };
}

export async function resetUserRewardsLedger(userId: string) {
  const store = await readStore();
  store.users[userId] = createEmptyUserLedger();
  await writeStore(store);
  return getUserRewardsSummary(userId);
}
