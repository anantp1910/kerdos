import "server-only";

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { normalizeCategory, SMARTSWIPE_CATEGORIES, type SmartSwipeCategory } from "@/lib/server/cardCatalog";

const CACHE_DIR = join(process.cwd(), "data", "rewardscc");
const CARDS_DIR = join(CACHE_DIR, "cards");

export const DEFAULT_FALLBACK_CARD_KEYS = [
  "amex-gold",
  "chase-sapphirepreferred",
  "citi-doublecash",
  "discover-cashback",
  "capitalone-venture",
];

export type RewardCardProfile = {
  id: string;
  cardKey: string;
  cardName: string | null;
  cardIssuer: string | null;
  cardNetwork: string | null;
  annualFee: number | null;
  pointValuation: number | null;
  isCashback: boolean;
  baseSpendEarnCurrency: string;
  rewardRates: Record<SmartSwipeCategory, number>;
  imageUrl: string | null;
};

type CachedProfile = RewardCardProfile & {
  spendBonusCategory?: Array<{
    spendBonusCategoryGroup?: string | null;
    spendBonusCategoryName?: string | null;
    spendBonusSubcategoryGroup?: string | null;
    earnMultiplier?: number | null;
  }>;
};

function readCardFile(cardKey: string): CachedProfile | null {
  const path = join(CARDS_DIR, `${cardKey}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CachedProfile;
  } catch {
    return null;
  }
}

function readJson<T>(filename: string): T | null {
  const path = join(CACHE_DIR, filename);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return null;
  }
}

// Strip internal cache fields before returning to callers
function toProfile(cached: CachedProfile): RewardCardProfile {
  const { spendBonusCategory: _drop, ...profile } = cached;
  return profile;
}

export async function getCardProfile(cardKey: string): Promise<RewardCardProfile> {
  const cached = readCardFile(cardKey);
  if (cached) return toProfile(cached);
  throw new Error(`Card not found in local cache: ${cardKey}`);
}

export async function getCardsByKeys(cardKeys: string[]): Promise<RewardCardProfile[]> {
  const unique = [...new Set(cardKeys.filter(Boolean))];
  return Promise.all(unique.map((k) => getCardProfile(k)));
}

// Returns null — SmartSwipe already falls back to category-based rates when this is null.
// Merchant-specific lookups require live API calls that we no longer make.
export async function getMerchantSpecificValue(
  _cardKey: string,
  _merchant: string,
  _merchantType: string
): Promise<{ estimatedValue: number; rewardRate: number; source: "merchant" } | null> {
  return null;
}

// ── Local card search (replaces the name-search API endpoint) ────────────────

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function loadAllCachedProfiles(): CachedProfile[] {
  const index = readJson<string[]>("index.json");
  if (!index) return [];
  return index.flatMap((key) => {
    const p = readCardFile(key);
    return p ? [p] : [];
  });
}

function scoreProfile(profile: CachedProfile, query: string): number {
  const haystack = normalizeText(
    `${profile.cardIssuer ?? ""} ${profile.cardName ?? ""} ${profile.cardKey ?? ""}`
  );
  const q = normalizeText(query);
  if (!q) return 0;
  if (haystack === q) return 200;
  if (haystack.includes(q)) return 100;
  const tokens = q.split(" ").filter(Boolean);
  return tokens.filter((t) => haystack.includes(t)).length * 10;
}

export async function resolveCardFromPlaidName(input: {
  name: string;
  officialName?: string | null;
}): Promise<RewardCardProfile | null> {
  const profiles = loadAllCachedProfiles();
  if (profiles.length === 0) return null;

  const queries = [input.officialName ?? "", input.name].filter(Boolean);

  const scored = profiles
    .map((p) => ({
      profile: p,
      score: Math.max(...queries.map((q) => scoreProfile(p, q))),
    }))
    .filter((x) => x.score >= 30)
    .sort((a, b) => b.score - a.score);

  if (!scored[0]) return null;
  return toProfile(scored[0].profile);
}

// ── Spend categories ─────────────────────────────────────────────────────────

type SpendCategory = { categoryId?: number; categoryName?: string };

export function getSpendCategories(): SpendCategory[] {
  return readJson<SpendCategory[]>("spend-categories.json") ?? [];
}

export function getCardsByCategory(categoryId: number): unknown[] {
  const map = readJson<Record<string, unknown[]>>("category-cards.json") ?? {};
  return map[categoryId] ?? [];
}

// ── Transfer programs ────────────────────────────────────────────────────────

type TransferProgram = { programId?: number; programName?: string };

export function getTransferPrograms(): TransferProgram[] {
  return readJson<TransferProgram[]>("transfer-programs.json") ?? [];
}

export function getCardsByTransferProgram(programId: number): unknown[] {
  const map = readJson<Record<string, unknown[]>>("program-cards.json") ?? {};
  return map[programId] ?? [];
}

// ── Name search (for rewardsApi.ts compatibility) ────────────────────────────

export function searchCardsByName(name: string): CachedProfile[] {
  const profiles = loadAllCachedProfiles();
  return profiles
    .map((p) => ({ profile: p, score: scoreProfile(p, name) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.profile);
}

// Re-export for any callers that used the old extractRewardRates shape
export function extractRewardRates(
  spendBonusCategory: Array<{
    spendBonusCategoryGroup?: string | null;
    spendBonusCategoryName?: string | null;
    spendBonusSubcategoryGroup?: string | null;
    earnMultiplier?: number | null;
  }>
): Record<SmartSwipeCategory, number> {
  const rates = SMARTSWIPE_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = 1;
    return acc;
  }, {} as Record<SmartSwipeCategory, number>);

  for (const item of spendBonusCategory) {
    const keys = [
      item.spendBonusCategoryName ?? "",
      item.spendBonusSubcategoryGroup ?? "",
      item.spendBonusCategoryGroup ?? "",
    ];
    const rate = item.earnMultiplier ?? 1;
    for (const key of keys) {
      const cat = normalizeCategory(key);
      if (cat && rate > rates[cat]) {
        rates[cat] = rate;
        break;
      }
    }
  }

  return rates;
}
