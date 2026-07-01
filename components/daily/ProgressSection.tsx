"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Flame, Save } from "lucide-react";
import { put, remove, get, allAccountability, allGoals, allTrades } from "@/lib/db";
import { todayISO, uuid, fmtUSD, fmtPct, colorClassForPnL } from "@/lib/utils";
import { breakdownByTag, consecutiveDayStreak } from "@/lib/queries";
import { tagLabel } from "@/lib/tags";
import type { AccountabilityDay, Goal, GoalType, Trade } from "@/lib/types";

const DEFAULT_HABITS = [
  "Followed pre-market plan",
  "No revenge trades",
  "Sized within risk limit",
  "Journaled the session",
];

function emptyDay(date: string): AccountabilityDay {
  return {
    id: date,
    date,
    rulesFollowed: false,
    ruleNotes: "",
    habits: DEFAULT_HABITS.map((label) => ({ label, done: false })),
  };
}

export function ProgressSection({ date }: { date: string }) {
  const [day, setDay] = useState<AccountabilityDay>(emptyDay(date));
  const [allDays, setAllDays] = useState<AccountabilityDay[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    get("accountability", date).then((d) => setDay((d as AccountabilityDay | undefined) ?? emptyDay(date)));
  }, [date]);

  function refresh() {
    allAccountability().then(setAllDays);
    allGoals().then(setGoals);
    allTrades().then(setTrades);
  }

  async function save() {
    await put("accountability", day);
    setSavedAt(Date.now());
    refresh();
  }

  function toggleHabit(i: number) {
    setDay((d) => ({
      ...d,
      habits: d.habits.map((h, idx) => (idx === i ? { ...h, done: !h.done } : h)),
    }));
  }

  const ruleAdherenceDates = allDays.filter((d) => d.rulesFollowed).map((d) => d.date);
  const ruleStreak = consecutiveDayStreak(ruleAdherenceDates);
  const journaledDates = allDays.map((d) => d.date);
  const journalStreak = consecutiveDayStreak(journaledDates);
  const mistakeStats = breakdownByTag(trades, "mistakeTags");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Accountability</h2>
        <button onClick={save} className="btn-primary inline-flex items-center gap-1 text-xs py-1.5">
          <Save size={14} /> Save check-in
          {savedAt && Date.now() - savedAt < 3000 && <span className="text-xs ml-1">✓</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Streaks + mistakes */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-medium mb-4">Streaks</h3>
            <div className="space-y-3">
              <StreakRow label="Rule adherence" days={ruleStreak} />
              <StreakRow label="Journaled days" days={journalStreak} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-4">Mistake Frequency</h3>
            {mistakeStats.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)]">No mistakes tagged yet — keep it that way.</p>
            ) : (
              <div className="space-y-2">
                {mistakeStats.slice(0, 8).map((m) => (
                  <div key={m.tagId} className="flex items-center justify-between text-sm">
                    <span>{tagLabel(m.tagId)}</span>
                    <span className="text-[var(--color-text-muted)] tabular-nums">
                      {m.count}× · <span className={colorClassForPnL(m.netPnl)}>{fmtUSD(m.netPnl, { signed: true })}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily checklist */}
        <div className="card p-5 space-y-4">
          <h3 className="font-medium">Daily Check-In ({date})</h3>

          <div className="space-y-2">
            {day.habits.map((h, i) => (
              <button
                key={i}
                onClick={() => toggleHabit(i)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  h.done
                    ? "bg-[var(--color-positive)]/10 border-[var(--color-positive)]/40 text-[var(--color-positive)]"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    h.done
                      ? "bg-[var(--color-positive)] border-[var(--color-positive)] text-white"
                      : "border-[var(--color-border)]"
                  }`}
                >
                  {h.done && "✓"}
                </span>
                <span className="text-sm">{h.label}</span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-2)] cursor-pointer">
            <input
              type="checkbox"
              checked={day.rulesFollowed}
              onChange={(e) => setDay({ ...day, rulesFollowed: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm">I followed all my rules today</span>
          </label>

          <label className="block">
            <span className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Notes</span>
            <textarea
              className="input min-h-[80px]"
              value={day.ruleNotes}
              onChange={(e) => setDay({ ...day, ruleNotes: e.target.value })}
              placeholder="Anything to remember about today's process?"
            />
          </label>
        </div>

        {/* Goals */}
        <GoalsPanel goals={goals} trades={trades} onChange={refresh} />
      </div>
    </div>
  );
}

function StreakRow({ label, days }: { label: string; days: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="inline-flex items-center gap-1 text-lg font-semibold tabular-nums">
        <Flame size={16} className={days > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-text-dim)]"} />
        {days}d
      </span>
    </div>
  );
}

function GoalsPanel({
  goals,
  trades,
  onChange,
}: {
  goals: Goal[];
  trades: Trade[];
  onChange: () => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Goal>(emptyGoal());

  function emptyGoal(): Goal {
    const today = todayISO();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return {
      id: uuid(),
      label: "",
      type: "pnl",
      targetValue: 1000,
      period: "monthly",
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
    };
  }

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.label.trim()) return;
    await put("goals", draft);
    setDraft(emptyGoal());
    setShowNew(false);
    onChange();
  }

  async function delGoal(id: string) {
    await remove("goals", id);
    onChange();
  }

  function progress(g: Goal): { pct: number; label: string } {
    const inRange = trades.filter((t) => t.date >= g.startDate && t.date <= g.endDate);
    if (g.type === "pnl") {
      const cur = inRange.reduce((s, t) => s + t.pnl, 0);
      return { pct: Math.max(0, Math.min(1, cur / g.targetValue)), label: `${fmtUSD(cur)} / ${fmtUSD(g.targetValue)}` };
    }
    if (g.type === "winRate") {
      const wins = inRange.filter((t) => t.pnl > 0).length;
      const wr = inRange.length ? wins / inRange.length : 0;
      return { pct: Math.max(0, Math.min(1, wr / (g.targetValue / 100))), label: `${fmtPct(wr)} / ${g.targetValue}%` };
    }
    return { pct: 0, label: "—" };
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Goals</h3>
        <button onClick={() => setShowNew(!showNew)} className="btn-secondary inline-flex items-center gap-1 text-xs py-1.5">
          <Plus size={14} /> New
        </button>
      </div>

      {showNew && (
        <form onSubmit={addGoal} className="space-y-2 border border-[var(--color-border-soft)] rounded-lg p-3 bg-[var(--color-surface-2)]">
          <input
            className="input"
            placeholder="Label (e.g. June +$3000)"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as GoalType })}>
              <option value="pnl">P&L target</option>
              <option value="winRate">Win rate %</option>
            </select>
            <input
              type="number"
              className="input"
              value={draft.targetValue}
              onChange={(e) => setDraft({ ...draft, targetValue: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className="input" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            <input type="date" className="input" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full">Add Goal</button>
        </form>
      )}

      {goals.length === 0 ? (
        <p className="text-sm text-[var(--color-text-dim)]">No goals set.</p>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const p = progress(g);
            return (
              <div key={g.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{g.label}</span>
                  <button onClick={() => delGoal(g.id)} className="text-[var(--color-text-dim)] hover:text-[var(--color-negative)]">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${p.pct * 100}%` }} />
                </div>
                <div className="text-xs text-[var(--color-text-dim)]">{p.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
