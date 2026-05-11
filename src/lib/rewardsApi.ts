import { readFileSync, existsSync } from "fs";
import { join } from "path";

const CACHE_DIR = join(process.cwd(), "data", "rewardscc");
const CARDS_DIR = join(CACHE_DIR, "cards");

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

function readCard(cardKey: string): Record<string, unknown> | null {
  return readJson(join(CARDS_DIR, `${cardKey}.json`));
}

function loadIndex(): string[] {
  return readJson<string[]>(join(CACHE_DIR, "index.json")) ?? [];
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Detail for a single card by its slug
export function getCardDetail(cardKey: string): unknown[] {
  const card = readCard(cardKey);
  return card ? [card] : [];
}

// Search cards by name — returns array of matches
export function searchCardsByName(name: string): unknown[] {
  const index = loadIndex();
  const q = normalizeText(name);
  if (!q) return [];

  return index
    .flatMap((key) => {
      const card = readCard(key);
      if (!card) return [];
      const haystack = normalizeText(
        `${card.cardIssuer ?? ""} ${card.cardName ?? ""} ${card.cardKey ?? ""}`
      );
      const tokens = q.split(" ").filter(Boolean);
      const score = tokens.filter((t) => haystack.includes(t)).length;
      return score > 0 ? [{ card, score }] : [];
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.card);
}

// Card image URL
export function getCardImage(cardKey: string): unknown[] {
  const card = readCard(cardKey);
  if (!card) return [];
  return [{ cardImageUrl: card.imageUrl ?? null }];
}

// All spend bonus categories
export function getSpendCategories(): unknown[] {
  return readJson<unknown[]>(join(CACHE_DIR, "spend-categories.json")) ?? [];
}

// Cards that earn bonus in a specific category
export function getCardsByCategory(categoryId: number): unknown[] {
  const map = readJson<Record<string, unknown[]>>(join(CACHE_DIR, "category-cards.json")) ?? {};
  return map[categoryId] ?? [];
}

// Best cards for a specific merchant — not available offline; returns empty
export function getTopCardsForMerchant(_merchantName: string, _merchantType: string): unknown[] {
  return [];
}

// Score for a specific card at a specific merchant — not available offline; returns empty
export function getCardSpendAtMerchant(
  _cardKey: string,
  _merchantName: string,
  _merchantType: string
): unknown[] {
  return [];
}

// Plaid spending breakdown by card — not available offline; returns empty
export function getPlaidSpendByCard(_cardKey: string): unknown[] {
  return [];
}

// All point transfer programs
export function getTransferPrograms(): unknown[] {
  return readJson<unknown[]>(join(CACHE_DIR, "transfer-programs.json")) ?? [];
}

// Cards that support a specific transfer program
export function getCardsByTransferProgram(programId: number): unknown[] {
  const map = readJson<Record<string, unknown[]>>(join(CACHE_DIR, "program-cards.json")) ?? {};
  return map[programId] ?? [];
}
