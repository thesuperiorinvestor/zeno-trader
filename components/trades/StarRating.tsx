"use client";

import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  size = 18,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(n)}
            className={`p-0.5 rounded transition-colors ${
              readOnly ? "cursor-default" : "hover:scale-110"
            }`}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            <Star
              size={size}
              fill={filled ? "var(--color-accent-light)" : "transparent"}
              stroke={filled ? "var(--color-accent-light)" : "var(--color-text-dim)"}
            />
          </button>
        );
      })}
    </div>
  );
}
