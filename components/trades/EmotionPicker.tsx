"use client";

import { EMOTION_LABELS, EMOTION_OPTIONS } from "@/lib/tags";
import type { Emotion } from "@/lib/types";

const EMOJI: Record<string, string> = {
  confident: "🧘",
  fomo: "😬",
  hesitant: "🤔",
  revenge: "😤",
};

export function EmotionPicker({
  selected,
  onChange,
}: {
  selected: Emotion[];
  onChange: (next: Emotion[]) => void;
}) {
  const sel = Array.isArray(selected) ? selected : [];
  function toggle(e: Emotion) {
    if (sel.includes(e)) onChange(sel.filter((x) => x !== e));
    else onChange([...sel, e]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {EMOTION_OPTIONS.map((e) => {
        const active = sel.includes(e);
        return (
          <button
            key={e}
            type="button"
            onClick={() => toggle(e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
              active
                ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-light)] border-transparent"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-soft)] hover:text-[var(--color-text)]"
            }`}
          >
            <span>{EMOJI[e]}</span>
            <span>{EMOTION_LABELS[e]}</span>
          </button>
        );
      })}
    </div>
  );
}
