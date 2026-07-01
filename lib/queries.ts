// Derived queries / aggregations on top of the raw IndexedDB data.

import type { Trade } from "./types";

export interface DateRange {
  from?: string;  // YYYY-MM-DD inclusive
  to?: string;    // YYYY-MM-DD inclusive
}

export function inRange(trade: Trade, range?: DateRange): boolean {
  if (!range) return true;
  if (range.from && trade.date < range.from) return false;
  if (range.to && trade.date > range.to) return false;
  return true;
}

export function filterTrades(trades: Trade[], range?: DateRange): Trade[] {
  return trades.filter((t) => inRange(t, range));
}

// ---------------- Aggregate stats ----------------

export interface KPIStats {
  netPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;        // 0-1
  profitFactor: number;   // gross win / gross loss; Infinity if no losses
  avgWin: number;
  avgLoss: number;        // negative
  largestWin: number;
  largestLoss: number;
  currentStreak: { type: "win" | "loss" | "none"; count: number };
}

export function computeKPIs(trades: Trade[]): KPIStats {
  if (trades.length === 0) {
    return {
      netPnl: 0, totalTrades: 0, wins: 0, losses: 0,
      winRate: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
      largestWin: 0, largestLoss: 0, currentStreak: { type: "none", count: 0 },
    };
  }
  const sorted = [...trades].sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  let netPnl = 0;
  let wins = 0, losses = 0;
  let grossWin = 0, grossLoss = 0;
  let largestWin = -Infinity, largestLoss = Infinity;

  for (const t of sorted) {
    netPnl += t.pnl;
    if (t.pnl > 0) { wins++; grossWin += t.pnl; if (t.pnl > largestWin) largestWin = t.pnl; }
    else if (t.pnl < 0) { losses++; grossLoss += -t.pnl; if (t.pnl < largestLoss) largestLoss = t.pnl; }
  }

  // Streak from the most recent trade backwards
  const last = sorted[sorted.length - 1];
  let streakType: "win" | "loss" | "none" = "none";
  let streakCount = 0;
  if (last.pnl > 0) streakType = "win";
  else if (last.pnl < 0) streakType = "loss";
  if (streakType !== "none") {
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i].pnl;
      if ((streakType === "win" && p > 0) || (streakType === "loss" && p < 0)) streakCount++;
      else break;
    }
  }

  const totalTrades = trades.length;
  return {
    netPnl,
    totalTrades,
    wins, losses,
    winRate: totalTrades ? wins / totalTrades : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0),
    avgWin: wins ? grossWin / wins : 0,
    avgLoss: losses ? -grossLoss / losses : 0,
    largestWin: largestWin === -Infinity ? 0 : largestWin,
    largestLoss: largestLoss === Infinity ? 0 : largestLoss,
    currentStreak: { type: streakType, count: streakCount },
  };
}

// ---------------- Equity curve ----------------

export interface EquityPoint {
  date: string;       // YYYY-MM-DD
  pnl: number;        // daily pnl
  cumulative: number; // running total
}

export function equityCurve(trades: Trade[]): EquityPoint[] {
  const byDate = new Map<string, number>();
  for (const t of trades) {
    byDate.set(t.date, (byDate.get(t.date) ?? 0) + t.pnl);
  }
  const dates = [...byDate.keys()].sort();
  let cum = 0;
  return dates.map((d) => {
    const pnl = byDate.get(d)!;
    cum += pnl;
    return { date: d, pnl, cumulative: cum };
  });
}

// ---------------- Breakdown by tag ----------------

export interface TagStat {
  tagId: string;
  count: number;
  netPnl: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
}

export function breakdownByTag(trades: Trade[], tagField: "setupTags" | "mistakeTags" | "customTags" = "setupTags"): TagStat[] {
  const map = new Map<string, TagStat>();
  for (const t of trades) {
    for (const id of t[tagField]) {
      let s = map.get(id);
      if (!s) {
        s = { tagId: id, count: 0, netPnl: 0, wins: 0, losses: 0, winRate: 0, avgPnl: 0 };
        map.set(id, s);
      }
      s.count++;
      s.netPnl += t.pnl;
      if (t.pnl > 0) s.wins++;
      else if (t.pnl < 0) s.losses++;
    }
  }
  for (const s of map.values()) {
    s.winRate = s.count ? s.wins / s.count : 0;
    s.avgPnl = s.count ? s.netPnl / s.count : 0;
  }
  return [...map.values()].sort((a, b) => b.netPnl - a.netPnl);
}

// ---------------- Breakdown by emotion ----------------

export function breakdownByEmotion(trades: Trade[]) {
  const map = new Map<string, { emotion: string; count: number; netPnl: number; winRate: number; wins: number; }>();
  for (const t of trades) {
    for (const e of t.emotionEntry) {
      let s = map.get(e);
      if (!s) { s = { emotion: e, count: 0, netPnl: 0, winRate: 0, wins: 0 }; map.set(e, s); }
      s.count++; s.netPnl += t.pnl; if (t.pnl > 0) s.wins++;
    }
  }
  for (const s of map.values()) s.winRate = s.count ? s.wins / s.count : 0;
  return [...map.values()].sort((a, b) => b.netPnl - a.netPnl);
}

// ---------------- Breakdown by hour & day-of-week ----------------

export function breakdownByHour(trades: Trade[]) {
  const map = new Map<number, { hour: number; count: number; netPnl: number }>();
  for (const t of trades) {
    if (!t.time) continue;
    const hour = parseInt(t.time.split(":")[0], 10);
    if (isNaN(hour)) continue;
    let s = map.get(hour);
    if (!s) { s = { hour, count: 0, netPnl: 0 }; map.set(hour, s); }
    s.count++; s.netPnl += t.pnl;
  }
  return [...map.values()].sort((a, b) => a.hour - b.hour);
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function breakdownByDayOfWeek(trades: Trade[]) {
  const map = new Map<number, { day: string; idx: number; count: number; netPnl: number }>();
  for (const t of trades) {
    const d = new Date(t.date + "T00:00:00").getDay();
    let s = map.get(d);
    if (!s) { s = { day: DOW[d], idx: d, count: 0, netPnl: 0 }; map.set(d, s); }
    s.count++; s.netPnl += t.pnl;
  }
  return [...map.values()].sort((a, b) => a.idx - b.idx);
}

// ---------------- Streak helpers (for habits) ----------------

export function consecutiveDayStreak(dates: string[], today = new Date()): number {
  // dates: ISO YYYY-MM-DD list of "completed" days
  const set = new Set(dates);
  let count = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (set.has(iso)) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return count;
}
