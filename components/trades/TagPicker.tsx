"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { type TagDef, tagLabel } from "@/lib/tags";

export function TagPicker({
  tags,
  selected,
  onChange,
  groupByCategory = true,
  placeholder = "Select tags…",
}: {
  tags: TagDef[];
  selected: string[];
  onChange: (next: string[]) => void;
  groupByCategory?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = Array.isArray(selected) ? selected : [];

  function toggle(id: string) {
    if (sel.includes(id)) onChange(sel.filter((x) => x !== id));
    else onChange([...sel, id]);
  }

  function removeTag(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(sel.filter((x) => x !== id));
  }

  // Close on outside click or Escape. Listener is only attached while open, so
  // the click that opens the menu can't immediately close it.
  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const grouped = new Map<string, TagDef[]>();
  for (const t of tags) {
    const arr = grouped.get(t.category) ?? [];
    arr.push(t);
    grouped.set(t.category, arr);
  }

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(true)}
        className={`input flex items-center justify-between text-left cursor-pointer ${
          open ? "ring-1 ring-[var(--color-accent)]" : ""
        }`}
      >
        <span className="flex items-center gap-1.5 flex-wrap">
          {sel.length === 0 ? (
            <span className="text-[var(--color-text-dim)]">{placeholder}</span>
          ) : (
            sel.map((id) => (
              <span key={id} className="tag tag-accent inline-flex items-center gap-1">
                {tagLabel(id)}
                <button
                  type="button"
                  onClick={(e) => removeTag(id, e)}
                  className="hover:text-white"
                  aria-label={`Remove ${tagLabel(id)}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))
          )}
        </span>
        <ChevronDown
          size={16}
          className={`text-[var(--color-text-dim)] transition-transform shrink-0 ml-2 ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>
      {open && (
        <>
          <div className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto card p-2 shadow-xl">
            <div className="sticky top-0 -mx-2 -mt-2 px-3 py-2 mb-1 flex items-center justify-between bg-[var(--color-surface)] border-b border-[var(--color-border-soft)]">
              <span className="text-xs text-[var(--color-text-dim)]">
                {sel.length} selected · pick multiple
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-light)]"
              >
                Done
              </button>
            </div>
            {groupByCategory
              ? [...grouped.entries()].map(([cat, items]) => (
                  <div key={cat} className="mb-2 last:mb-0">
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">
                      {cat}
                    </div>
                    {items.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggle(t.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-[var(--color-surface-2)]"
                      >
                        <span>{t.label}</span>
                        {sel.includes(t.id) && (
                          <Check size={14} className="text-[var(--color-accent-light)]" />
                        )}
                      </button>
                    ))}
                  </div>
                ))
              : tags.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-[var(--color-surface-2)]"
                  >
                    <span>{t.label}</span>
                    {sel.includes(t.id) && (
                      <Check size={14} className="text-[var(--color-accent-light)]" />
                    )}
                  </button>
                ))}
          </div>
        </>
      )}
    </div>
  );
}
