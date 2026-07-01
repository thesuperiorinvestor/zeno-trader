"use client";

import { useState } from "react";
import { X } from "lucide-react";

const PRESETS = ["1m", "5m", "15m", "30m", "1h", "4h", "1D", "1W", "1M"];

export function TimeframePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add(tf: string) {
    const v = tf.trim();
    if (!v) return;
    if (selected.includes(v)) return;
    onChange([...selected, v]);
    setDraft("");
  }

  function remove(tf: string) {
    onChange(selected.filter((x) => x !== tf));
  }

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[2rem] p-1.5 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
        {selected.length === 0 && (
          <span className="text-sm text-[var(--color-text-dim)] px-1.5">No timeframes selected</span>
        )}
        {selected.map((tf) => (
          <span
            key={tf}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-accent-dim)] text-[var(--color-accent-light)] text-xs font-medium"
          >
            {tf}
            <button type="button" onClick={() => remove(tf)} className="hover:text-white">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm px-1 py-0.5"
          placeholder="Type & Enter"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && selected.length) {
              remove(selected[selected.length - 1]);
            }
          }}
        />
      </div>
      {/* Preset quick-adds */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.filter((p) => !selected.includes(p)).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => add(p)}
            className="px-2 py-0.5 rounded text-xs border border-[var(--color-border-soft)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-accent-light)] hover:border-[var(--color-accent-dim)] transition-colors"
          >
            + {p}
          </button>
        ))}
      </div>
    </div>
  );
}
