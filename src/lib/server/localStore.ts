import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredLinkedCard = {
  plaidAccountId: string;
  plaidName: string;
  plaidMask: string;
  cardId: string;
  cardKey?: string;
  cardName?: string;
  cardIssuer?: string;
  cardNetwork?: string;
};

export type StoredPlaidItem = {
  itemId: string;
  accessToken: string;
  linkedCards: StoredLinkedCard[];
};

export type StoredPlaidUser = {
  userId: string;
  items: StoredPlaidItem[];
  linkedCards: StoredLinkedCard[];
  updatedAt: string;
  itemId?: string;
  accessToken?: string;
};

type StoreShape = {
  plaidUsers: Record<string, StoredPlaidUser>;
};

const RUNTIME_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data", "runtime");
const STORE_PATH = path.join(RUNTIME_DIR, "plaid-store.json");

const EMPTY_STORE: StoreShape = {
  plaidUsers: {},
};

let storeWriteQueue = Promise.resolve();

async function ensureStoreFile() {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf8");
  }
}

async function readStore(): Promise<StoreShape> {
  await ensureStoreFile();
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      plaidUsers: parsed.plaidUsers ?? {},
    };
  } catch {
    return EMPTY_STORE;
  }
}

async function writeStore(store: StoreShape) {
  await ensureStoreFile();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function withStoreWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = storeWriteQueue;
  let release!: () => void;
  storeWriteQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
}

function dedupeLinkedCards(linkedCards: StoredLinkedCard[]) {
  const byAccountId = new Map<string, StoredLinkedCard>();

  for (const card of linkedCards) {
    byAccountId.set(card.plaidAccountId, card);
  }

  return [...byAccountId.values()];
}

function normalizeStoredPlaidUser(user: StoredPlaidUser | null): StoredPlaidUser | null {
  if (!user) return null;

  const items =
    user.items?.length
      ? user.items.map((item) => ({
          itemId: item.itemId,
          accessToken: item.accessToken,
          linkedCards: dedupeLinkedCards(item.linkedCards ?? []),
        }))
      : user.itemId && user.accessToken
        ? [{
            itemId: user.itemId,
            accessToken: user.accessToken,
            linkedCards: dedupeLinkedCards(user.linkedCards ?? []),
          }]
        : [];

  return {
    userId: user.userId,
    items,
    linkedCards: dedupeLinkedCards(items.flatMap((item) => item.linkedCards)),
    updatedAt: user.updatedAt,
  };
}

export async function getStoredPlaidUser(userId: string): Promise<StoredPlaidUser | null> {
  const store = await readStore();
  return normalizeStoredPlaidUser(store.plaidUsers[userId] ?? null);
}

export async function upsertStoredPlaidUser(user: StoredPlaidUser): Promise<StoredPlaidUser> {
  return withStoreWriteLock(async () => {
    const store = await readStore();
    store.plaidUsers[user.userId] = normalizeStoredPlaidUser(user)!;
    await writeStore(store);
    return store.plaidUsers[user.userId];
  });
}

export async function mergeStoredPlaidUserItem(input: {
  userId: string;
  itemId: string;
  accessToken: string;
  linkedCards: StoredLinkedCard[];
}): Promise<StoredPlaidUser> {
  return withStoreWriteLock(async () => {
    const store = await readStore();
    const existing = normalizeStoredPlaidUser(store.plaidUsers[input.userId] ?? null);

    const items = [...(existing?.items ?? [])];
    const nextItem: StoredPlaidItem = {
      itemId: input.itemId,
      accessToken: input.accessToken,
      linkedCards: dedupeLinkedCards(input.linkedCards),
    };

    const existingIndex = items.findIndex((item) => item.itemId === input.itemId);
    if (existingIndex >= 0) {
      items[existingIndex] = nextItem;
    } else {
      items.push(nextItem);
    }

    const mergedUser = normalizeStoredPlaidUser({
      userId: input.userId,
      items,
      linkedCards: items.flatMap((item) => item.linkedCards),
      updatedAt: new Date().toISOString(),
    });

    store.plaidUsers[input.userId] = mergedUser!;
    await writeStore(store);
    return mergedUser!;
  });
}

export async function resetStoredPlaidUser(userId: string) {
  return withStoreWriteLock(async () => {
    const store = await readStore();
    delete store.plaidUsers[userId];
    await writeStore(store);
    return { userId, cleared: true };
  });
}
