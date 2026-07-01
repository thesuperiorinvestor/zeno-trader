"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { put, get } from "@/lib/db";
import type { DailyJournal, DayGrade } from "@/lib/types";

const empty = (date: string): DailyJournal => ({
  id: date,
  date,
  preMarket: { bias: "neutral", keyLevels: [], watchlist: [], plan: "" },
  postSession: { dayGrade: "C", emotionSummary: "", lessons: "", notes: "" },
});

export function JournalSection({ date }: { date: string }) {
  const [journal, setJournal] = useState<DailyJournal>(empty(date));
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    get("journals", date).then((j) => setJournal((j as DailyJournal | undefined) ?? empty(date)));
  }, [date]);

  async function save() {
    await put("journals", journal);
    setSavedAt(Date.now());
  }

  function updatePre<K extends keyof DailyJournal["preMarket"]>(k: K, v: DailyJournal["preMarket"][K]) {
    setJournal((j) => ({ ...j, preMarket: { ...j.preMarket, [k]: v } }));
  }
  function updatePost<K extends keyof DailyJournal["postSession"]>(k: K, v: DailyJournal["postSession"][K]) {
    setJournal((j) => ({ ...j, postSession: { ...j.postSession, [k]: v } }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-wide text-[var(--color-text-muted)]">Journal</h2>
        <button onClick={save} className="btn-primary inline-flex items-center gap-1 text-xs py-1.5">
          <Save size={14} /> Save journal
          {savedAt && Date.now() - savedAt < 3000 && <span className="text-xs ml-1">✓</span>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pre-market */}
        <section className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="text-[var(--color-warning)]">●</span> Pre-Market
          </h3>
          <Field label="Bias">
            <div className="flex gap-2">
              {(["bullish", "neutral", "bearish"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => updatePre("bias", b)}
                  className={`flex-1 py-2 rounded-lg text-sm capitalize border transition-colors ${
                    journal.preMarket.bias === b
                      ? b === "bullish"
                        ? "bg-[var(--color-positive)]/15 text-[var(--color-positive)] border-[var(--color-positive)]/40"
                        : b === "bearish"
                        ? "bg-[var(--color-negative)]/15 text-[var(--color-negative)] border-[var(--color-negative)]/40"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text)] border-[var(--color-border)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-soft)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Key Levels (one per line)">
            <textarea
              className="input min-h-[80px]"
              value={journal.preMarket.keyLevels.join("\n")}
              onChange={(e) => updatePre("keyLevels", e.target.value.split("\n").filter(Boolean))}
              placeholder="HOOD 100 weekly resistance&#10;NVDA 180 demand zone"
            />
          </Field>
          <Field label="Watchlist (comma separated)">
            <input
              className="input"
              value={journal.preMarket.watchlist.join(", ")}
              onChange={(e) => updatePre("watchlist", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="HOOD, NVDA, TSLA, AMKR"
            />
          </Field>
          <Field label="Game Plan">
            <textarea
              className="input min-h-[140px]"
              value={journal.preMarket.plan}
              onChange={(e) => updatePre("plan", e.target.value)}
              placeholder="What's the plan? Where do you want to enter? Where do you stand down?"
            />
          </Field>
        </section>

        {/* Post-session */}
        <section className="card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="text-[var(--color-accent-light)]">●</span> Post-Session
          </h3>
          <Field label="Day Grade">
            <div className="flex gap-2">
              {(["A", "B", "C", "D", "F"] as DayGrade[]).map((g) => (
                <button
                  key={g}
                  onClick={() => updatePost("dayGrade", g)}
                  className={`w-12 h-12 rounded-lg font-semibold border transition-colors ${
                    journal.postSession.dayGrade === g
                      ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-light)] border-transparent"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-soft)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Emotional Summary">
            <textarea
              className="input min-h-[80px]"
              value={journal.postSession.emotionSummary}
              onChange={(e) => updatePost("emotionSummary", e.target.value)}
              placeholder="How did you feel? Did emotions shift through the day?"
            />
          </Field>
          <Field label="Lessons">
            <textarea
              className="input min-h-[100px]"
              value={journal.postSession.lessons}
              onChange={(e) => updatePost("lessons", e.target.value)}
              placeholder="One thing you'll do differently tomorrow."
            />
          </Field>
          <Field label="Other Notes">
            <textarea
              className="input min-h-[80px]"
              value={journal.postSession.notes}
              onChange={(e) => updatePost("notes", e.target.value)}
            />
          </Field>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
