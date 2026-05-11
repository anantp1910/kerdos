/**
 * One-time seeder: pulls all card data from the RewardsCC API and writes it to
 * data/rewardscc/ so the app can run without an active subscription.
 *
 * Run BEFORE canceling the RapidAPI subscription:
 *   node scripts/seed-card-cache.mjs
 *
 * Requires REWARDSCC_API_KEY in .env.local (loaded automatically via dotenv).
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const API_KEY = process.env.REWARDSCC_API_KEY;
if (!API_KEY) {
  console.error("REWARDSCC_API_KEY is not set. Add it to .env.local and retry.");
  process.exit(1);
}

const BASE = "https://rewards-credit-card-api.p.rapidapi.com";
const HEADERS = {
  "x-rapidapi-key": API_KEY,
  "x-rapidapi-host": "rewards-credit-card-api.p.rapidapi.com",
  "Content-Type": "application/json",
};

const OUT_DIR = join(process.cwd(), "data", "rewardscc");
const CARDS_DIR = join(OUT_DIR, "cards");

// Search queries that collectively surface the major issuers
const SEARCH_QUERIES = [
  "american express", "amex gold", "amex platinum", "amex blue",
  "chase sapphire", "chase freedom", "chase amazon",
  "citi double", "citi custom", "citi premier",
  "discover it", "discover cashback",
  "capital one venture", "capital one quicksilver", "capital one savor",
  "wells fargo active", "wells fargo autograph",
  "bank of america premium", "bank of america customized",
  "us bank altitude", "us bank cash",
  "barclays",
  "navy federal",
  "pnc",
  "truist",
  "synchrony",
  "apple card",
  "bilt",
];

const SMARTSWIPE_CATEGORIES = ["dining", "groceries", "travel", "gas", "entertainment", "other"];

const CATEGORY_MAP = {
  dining: "dining",
  "all dining": "dining",
  restaurants: "dining",
  restaurant: "dining",
  groceries: "groceries",
  "grocery stores": "groceries",
  grocery: "groceries",
  supermarkets: "groceries",
  supermarket: "groceries",
  travel: "travel",
  "all airfare": "travel",
  airfare: "travel",
  flights: "travel",
  hotels: "travel",
  hotel: "travel",
  gas: "gas",
  fuel: "gas",
  "gas stations": "gas",
  entertainment: "entertainment",
  streaming: "entertainment",
  movies: "entertainment",
  other: "other",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function normalizeCategory(input) {
  if (!input) return null;
  return CATEGORY_MAP[input.trim().toLowerCase()] ?? null;
}

function extractRewardRates(card) {
  const rates = Object.fromEntries(SMARTSWIPE_CATEGORIES.map((c) => [c, 1]));
  for (const item of card.spendBonusCategory ?? []) {
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

function buildProfile(detail, imageUrl = null) {
  return {
    id: detail.cardKey ?? "unknown",
    cardKey: detail.cardKey ?? "unknown",
    cardName: detail.cardName ?? null,
    cardIssuer: detail.cardIssuer ?? null,
    cardNetwork: detail.cardNetwork ?? null,
    annualFee: detail.annualFee ?? null,
    pointValuation: detail.baseSpendEarnValuation ?? null,
    isCashback: detail.baseSpendEarnIsCash === 1,
    baseSpendEarnCurrency: detail.baseSpendEarnCurrency ?? "points",
    rewardRates: extractRewardRates(detail),
    imageUrl,
    // Keep raw spendBonusCategory for local category search
    spendBonusCategory: detail.spendBonusCategory ?? [],
  };
}

async function fetchAndSaveCard(cardKey) {
  const [detailRes, imageRes] = await Promise.allSettled([
    get(`/creditcard-detail-bycard/${cardKey}`),
    get(`/creditcard-card-image/${cardKey}`),
  ]);

  const detail = toArray(detailRes.status === "fulfilled" ? detailRes.value : null)[0];
  if (!detail) throw new Error("no detail returned");

  const imageUrl =
    imageRes.status === "fulfilled"
      ? (toArray(imageRes.value)[0]?.cardImageUrl ?? null)
      : null;

  const profile = buildProfile(detail, imageUrl);
  writeFileSync(join(CARDS_DIR, `${cardKey}.json`), JSON.stringify(profile, null, 2));
  return profile;
}

async function main() {
  mkdirSync(CARDS_DIR, { recursive: true });

  // ── 1. Discover card keys via name search ──────────────────────────────────
  console.log("── Discovering cards via name search ──");
  const discovered = new Set();

  for (const query of SEARCH_QUERIES) {
    try {
      const raw = await get(`/creditcard-detail-namesearch/${encodeURIComponent(query)}`);
      const results = toArray(raw);
      for (const r of results) {
        if (r.cardKey) discovered.add(r.cardKey);
      }
      process.stdout.write(`  ${query}: ${results.length} results\n`);
    } catch (err) {
      process.stdout.write(`  ${query}: error – ${err.message}\n`);
    }
    await sleep(400);
  }

  console.log(`\nDiscovered ${discovered.size} unique card keys.\n`);

  // ── 2. Fetch full profile + image for every discovered card ────────────────
  console.log("── Fetching card profiles ──");
  let saved = 0;
  let failed = 0;

  for (const cardKey of discovered) {
    try {
      const profile = await fetchAndSaveCard(cardKey);
      console.log(`  ✓ ${cardKey} — ${profile.cardName}`);
      saved++;
    } catch (err) {
      console.log(`  ✗ ${cardKey} — ${err.message}`);
      failed++;
    }
    await sleep(400);
  }

  console.log(`\nCards: ${saved} saved, ${failed} failed.\n`);

  // ── 3. Spend bonus categories ──────────────────────────────────────────────
  console.log("── Fetching spend categories ──");
  try {
    const raw = await get("/creditcard-spendbonuscategory-categorylist");
    const categories = toArray(raw);
    writeFileSync(join(OUT_DIR, "spend-categories.json"), JSON.stringify(categories, null, 2));
    console.log(`  ✓ ${categories.length} categories\n`);

    // Fetch cards for each category
    console.log("── Fetching cards by category ──");
    const categoryCards = {};
    for (const cat of categories) {
      if (!cat.categoryId) continue;
      try {
        const cardsRaw = await get(`/creditcard-spendbonuscategory-categorycard/${cat.categoryId}`);
        categoryCards[cat.categoryId] = toArray(cardsRaw);
        console.log(`  ✓ category ${cat.categoryId} (${cat.categoryName ?? "?"}): ${categoryCards[cat.categoryId].length} cards`);
      } catch (err) {
        console.log(`  ✗ category ${cat.categoryId}: ${err.message}`);
        categoryCards[cat.categoryId] = [];
      }
      await sleep(300);
    }
    writeFileSync(join(OUT_DIR, "category-cards.json"), JSON.stringify(categoryCards, null, 2));
    console.log("");
  } catch (err) {
    console.log(`  ✗ spend categories: ${err.message}\n`);
  }

  // ── 4. Transfer programs ───────────────────────────────────────────────────
  console.log("── Fetching transfer programs ──");
  try {
    const raw = await get("/creditcard-pointtransfer-transferprogramlist/");
    const programs = toArray(raw);
    writeFileSync(join(OUT_DIR, "transfer-programs.json"), JSON.stringify(programs, null, 2));
    console.log(`  ✓ ${programs.length} programs\n`);

    // Fetch cards per program
    console.log("── Fetching cards by transfer program ──");
    const programCards = {};
    for (const prog of programs) {
      if (!prog.programId) continue;
      try {
        const cardsRaw = await get(`/creditcard-pointtransfer-transferprogramcard/${prog.programId}`);
        programCards[prog.programId] = toArray(cardsRaw);
        console.log(`  ✓ program ${prog.programId} (${prog.programName ?? "?"}): ${programCards[prog.programId].length} cards`);
      } catch (err) {
        console.log(`  ✗ program ${prog.programId}: ${err.message}`);
        programCards[prog.programId] = [];
      }
      await sleep(300);
    }
    writeFileSync(join(OUT_DIR, "program-cards.json"), JSON.stringify(programCards, null, 2));
  } catch (err) {
    console.log(`  ✗ transfer programs: ${err.message}`);
  }

  // ── 5. Write index of all cached card keys ─────────────────────────────────
  const index = [...discovered];
  writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2));

  console.log("\n✓ Seed complete. You can now cancel your RapidAPI subscription.");
  console.log(`  Data written to: data/rewardscc/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
