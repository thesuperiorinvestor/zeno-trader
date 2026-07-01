"use client";

import { useState, useEffect } from "react";
import { put, allKeyLevels } from "@/lib/db";
import { SETUP_TAGS, MISTAKE_TAGS } from "@/lib/tags";
import type { Trade, KeyLevel, Emotion, ExecGrade, Side } from "@/lib/types";
import { todayISO, uuid } from "@/lib/utils";
import { TagPicker } from "./TagPicker";
import { EmotionPicker } from "./EmotionPicker";
import { StarRating } from "./StarRating";
import { ScreenshotUpload } from "./ScreenshotUpload";

const empty = (): Trade => ({
  id: uuid(),
  date: todayISO(),
  time: "",
  symbol: "",
  instrument: "options",
  side: "long",
  entryPrice: 0,
  exitPrice: 0,
  size: 1,
  pnl: 0,
  fees: 0,
  setupTags: [],
  keyLevelId: undefined,
  keyLevelNote: "",
  emotionEntry: [],
  emotionExit: [],
  executionGrade: 3,
  thoughtProcess: "",
  postTradeReview: "",
  mistakeTags: [],
  customTags: [],
  screenshotIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Older / imported records may be missing array fields (e.g. setupTags undefined),
// which would crash the tag/emotion pickers. Fill any gaps before editing.
function normalize(t: Trade): Trade {
  return {
    ...t,
    setupTags: t.setupTags ?? [],
    mistakeTags: t.mistakeTags ?? [],
    customTags: t.customTags ?? [],
    emotionEntry: t.emotionEntry ?? [],
    emotionExit: t.emotionExit ?? [],
    screenshotIds: t.screenshotIds ?? [],
    keyLevelNote: t.keyLevelNote ?? "",
    thoughtProcess: t.thoughtProcess ?? "",
    postTradeReview: t.postTradeReview ?? "",
  };
}

export function TradeForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Trade;
  onSaved?: (t: Trade) => void;
  onCancel?: () => void;
}) {
  const [t, setT] = useState<Trade>(initial ? normalize(initial) : empty());
  const [levels, setLevels] = useState<KeyLevel[]>([]);
  // null = auto-compute from prices; a number = user typed a manual override.
  // When editing an existing trade, keep its stored P&L as an override if it
  // doesn't match the auto formula (it was likely entered by hand).
  const [pnlOverride, setPnlOverride] = useState<number | null>(() => {
    if (!initial) return null;
    const mult = initial.instrument === "options" ? 100 : 1;
    const computed =
      (initial.side === "long"
        ? initial.exitPrice - initial.entryPrice
        : initial.entryPrice - initial.exitPrice) *
        initial.size * mult -
      initial.fees;
    return Math.abs(initial.pnl - computed) < 0.005 ? null : initial.pnl;
  });

  useEffect(() => {
    allKeyLevels().then(setLevels);
  }, []);

  function update<K extends keyof Trade>(key: K, value: Trade[K]) {
    setT((prev) => ({ ...prev, [key]: value }));
  }

  // Live-computed P&L. Options contracts control 100 shares per contract.
  const multiplier = t.instrument === "options" ? 100 : 1;
  const autoPnl =
    (t.side === "long" ? t.exitPrice - t.entryPrice : t.entryPrice - t.exitPrice) *
      t.size * multiplier -
    t.fees;
  const effectivePnl = pnlOverride ?? autoPnl;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const finalTrade: Trade = {
      ...t,
      pnl: effectivePnl,
      updatedAt: new Date().toISOString(),
    };
    await put("trades", finalTrade);
    onSaved?.(finalTrade);
  }

  const symbolsForLevels = levels.filter((l) => !t.symbol || l.symbol.toUpperCase() === t.symbol.toUpperCase());

  return (
    <form onSubmit={save} className="space-y-6">
      {/* Row 1: identity */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Field label="Date">
          <input className="input" type="date" value={t.date} onChange={(e) => update("date", e.target.value)} />
        </Field>
        <Field label="Time">
          <input className="input" type="time" value={t.time ?? ""} onChange={(e) => update("time", e.target.value)} />
        </Field>
        <Field label="Symbol">
          <input
            className="input uppercase"
            value={t.symbol}
            onChange={(e) => update("symbol", e.target.value.toUpperCase())}
            placeholder="HOOD"
            required
          />
        </Field>
        <Field label="Side">
          <select className="input" value={t.side} onChange={(e) => update("side", e.target.value as Side)}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Contracts">
          <input
            className="input"
            type="number"
            step="1"
            min="0"
            value={t.size}
            onChange={(e) => update("size", parseFloat(e.target.value) || 0)}
          />
        </Field>
      </div>

      {/* Row 2: pricing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Entry Price">
          <input
            className="input"
            type="number"
            step="0.01"
            value={t.entryPrice}
            onChange={(e) => update("entryPrice", parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Exit Price">
          <input
            className="input"
            type="number"
            step="0.01"
            value={t.exitPrice}
            onChange={(e) => update("exitPrice", parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field label="Fees">
          <input
            className="input"
            type="number"
            step="0.01"
            value={t.fees}
            onChange={(e) => update("fees", parseFloat(e.target.value) || 0)}
          />
        </Field>
        <Field
          label={
            pnlOverride === null
              ? `P&L (auto${t.instrument === "options" ? " · ×100/contract" : ""})`
              : "P&L (manual)"
          }
        >
          <div className="relative">
            <input
              className={`input ${
                effectivePnl > 0
                  ? "text-[var(--color-positive)]"
                  : effectivePnl < 0
                  ? "text-[var(--color-negative)]"
                  : ""
              }`}
              type="number"
              step="0.01"
              value={pnlOverride === null ? autoPnl.toFixed(2) : pnlOverride}
              onChange={(e) => {
                const v = e.target.value;
                setPnlOverride(v === "" ? null : parseFloat(v) || 0);
              }}
            />
            {pnlOverride !== null && (
              <button
                type="button"
                onClick={() => setPnlOverride(null)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-light)]"
                title="Recompute from entry/exit prices"
              >
                auto
              </button>
            )}
          </div>
        </Field>
      </div>

      {/* Setup methodology */}
      <div className="space-y-3">
        <Field label="Setup Tags">
          <TagPicker tags={SETUP_TAGS} selected={t.setupTags} onChange={(v) => update("setupTags", v)} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Key Level / Zone">
            <select
              className="input"
              value={t.keyLevelId ?? ""}
              onChange={(e) => update("keyLevelId", e.target.value || undefined)}
            >
              <option value="">— None / ad-hoc —</option>
              {symbolsForLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.symbol} · {l.levelType} · {l.price}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Level Note (free text)">
            <input
              className="input"
              value={t.keyLevelNote}
              onChange={(e) => update("keyLevelNote", e.target.value)}
              placeholder="e.g. 4815 daily resistance / fresh demand 4790-4795"
            />
          </Field>
        </div>
      </div>

      {/* Psychology */}
      <div className="space-y-3">
        <Field label="Emotion at Entry">
          <EmotionPicker selected={t.emotionEntry} onChange={(v) => update("emotionEntry", v as Emotion[])} />
        </Field>
        <Field label="Emotion at Exit">
          <EmotionPicker selected={t.emotionExit} onChange={(v) => update("emotionExit", v as Emotion[])} />
        </Field>
        <Field label="Execution Grade">
          <StarRating
            value={t.executionGrade}
            onChange={(v) => update("executionGrade", v as ExecGrade)}
          />
        </Field>
      </div>

      {/* Notes */}
      <Field label="Thought Process / Thesis">
        <textarea
          className="input min-h-[120px]"
          value={t.thoughtProcess}
          onChange={(e) => update("thoughtProcess", e.target.value)}
          placeholder="What did you see? What was your thesis going in? What were you watching for?"
        />
      </Field>

      <Field label="Post-Trade Review — What can I do better?">
        <textarea
          className="input min-h-[100px]"
          value={t.postTradeReview ?? ""}
          onChange={(e) => update("postTradeReview", e.target.value)}
          placeholder="After the dust settles: what would you change about the entry, sizing, management, or exit? What's the lesson?"
        />
      </Field>

      <Field label="Mistakes (if any)">
        <TagPicker
          tags={MISTAKE_TAGS}
          selected={t.mistakeTags}
          onChange={(v) => update("mistakeTags", v)}
          groupByCategory={false}
        />
      </Field>

      <Field label="Screenshots">
        <ScreenshotUpload ids={t.screenshotIds} onChange={(v) => update("screenshotIds", v)} />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary">
          Save Trade
        </button>
      </div>
    </form>
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
