const EASTERN_TIME_ZONE = "America/New_York";

export const MARKET_OPEN_MINUTES = 9 * 60 + 30;
export const MARKET_CLOSE_MINUTES = 16 * 60;
export const MARKET_SESSION_MINUTES = MARKET_CLOSE_MINUTES - MARKET_OPEN_MINUTES;
export const TRADING_DAYS_PER_YEAR = 252;
export const TRADING_MINUTES_PER_YEAR = TRADING_DAYS_PER_YEAR * MARKET_SESSION_MINUTES;

const weekdayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const etFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: EASTERN_TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export interface MarketClock {
  dateKey: string;
  weekday: number;
  minutes: number;
  sessionMinute: number;
  sessionProgress: number;
  isTradingDay: boolean;
  isOpen: boolean;
}

function getEtParts(date: Date) {
  const raw = Object.fromEntries(
    etFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return {
    year: Number(raw.year),
    month: Number(raw.month),
    day: Number(raw.day),
    weekday: weekdayMap[raw.weekday] ?? 0,
    hour: Number(raw.hour),
    minute: Number(raw.minute),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getMarketClock(date = new Date()): MarketClock {
  const parts = getEtParts(date);
  const minutes = parts.hour * 60 + parts.minute;
  const isTradingDay = parts.weekday >= 1 && parts.weekday <= 5;
  const sessionMinute = clamp(minutes - MARKET_OPEN_MINUTES, 0, MARKET_SESSION_MINUTES);

  return {
    dateKey: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`,
    weekday: parts.weekday,
    minutes,
    sessionMinute,
    sessionProgress: sessionMinute / MARKET_SESSION_MINUTES,
    isTradingDay,
    isOpen: isTradingDay && minutes >= MARKET_OPEN_MINUTES && minutes < MARKET_CLOSE_MINUTES,
  };
}

export function isTradingDate(dateKey: string) {
  const noon = new Date(`${dateKey}T12:00:00Z`);
  const day = noon.getUTCDay();
  return day >= 1 && day <= 5;
}

export function addDateKeyDays(dateKey: string, days: number) {
  const noon = new Date(`${dateKey}T12:00:00Z`);
  noon.setUTCDate(noon.getUTCDate() + days);
  return noon.toISOString().slice(0, 10);
}

export function getSessionMinuteForTimestamp(timestamp: number) {
  const clock = getMarketClock(new Date(timestamp));
  if (!clock.isTradingDay) return MARKET_SESSION_MINUTES;
  if (clock.minutes <= MARKET_OPEN_MINUTES) return 0;
  if (clock.minutes >= MARKET_CLOSE_MINUTES) return MARKET_SESSION_MINUTES;
  return clock.sessionMinute;
}

export function getMarketStatusLabel(clock = getMarketClock()) {
  if (!clock.isTradingDay) return "Closed · Weekend";
  if (clock.isOpen) return "Open · 9:30 AM-4:00 PM ET";
  if (clock.minutes < MARKET_OPEN_MINUTES) return "Pre-market · Opens 9:30 AM ET";
  return "Closed · Reopens 9:30 AM ET";
}
