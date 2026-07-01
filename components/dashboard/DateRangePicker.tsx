"use client";

import { useState } from "react";
import type { DateRange } from "@/lib/queries";

const PRESETS: { label: string; days: number | "all" }[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
  { label: "All", days: "all" },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
}) {
  const [active, setActive] = useState<string>("30D");

  function pick(label: string, days: number | "all") {
    setActive(label);
    if (days === "all") onChange(undefined);
    else onChange({ from: isoDaysAgo(days), to: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-soft)]">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => pick(p.label, p.days)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            active === p.label
              ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-light)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
