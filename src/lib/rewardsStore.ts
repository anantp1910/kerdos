// Persistent rewards accumulator (localStorage)
// SmartSwipe writes → RewardVest reads

export interface RewardEntry {
  date: string;       // ISO date e.g. "2026-04-11"
  amount: number;     // cash value earned
  cardId: string;
  cardName: string;
  category: string;
}

export interface RewardsStore {
  history: RewardEntry[];
  totalEarned: number;
}

const KEY = "kerdos_rewards";

function load(): RewardsStore {
  if (typeof window === "undefined") return { history: [], totalEarned: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { history: [], totalEarned: 0 };
    return JSON.parse(raw) as RewardsStore;
  } catch {
    return { history: [], totalEarned: 0 };
  }
}

function save(store: RewardsStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function logReward(entry: RewardEntry) {
  const store = load();
  store.history.push(entry);
  store.totalEarned = Math.round((store.totalEarned + entry.amount) * 100) / 100;
  save(store);
}

export function getStore(): RewardsStore {
  return load();
}

// Returns { month: "Apr", value: number }[] for the last 6 calendar months
export function getMonthlyChart(): { month: string; value: number }[] {
  const store = load();
  const now = new Date();

  const months: { month: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short" });
    const value = store.history
      .filter((e) => e.date.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    months.push({ month: label, value: Math.round(value * 100) / 100 });
  }
  return months;
}

// Returns earned amount for the current calendar month
export function getThisMonth(): number {
  const store = load();
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return Math.round(
    store.history
      .filter((e) => e.date.startsWith(prefix))
      .reduce((s, e) => s + e.amount, 0) * 100
  ) / 100;
}
