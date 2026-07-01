"use client";

import type { TagStat } from "@/lib/queries";
import { tagLabel } from "@/lib/tags";
import { fmtPct, fmtUSD, colorClassForPnL } from "@/lib/utils";

export function SetupBreakdown({ stats, title = "Setup Performance" }: { stats: TagStat[]; title?: string }) {
  if (stats.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-medium mb-2">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Tag your trades with setup types to see which patterns make or lose you the most.
        </p>
      </div>
    );
  }

  const max = Math.max(...stats.map((s) => Math.abs(s.netPnl)), 1);

  return (
    <div className="card p-5">
      <h3 className="font-medium mb-4">{title}</h3>
      <div className="space-y-2">
        {stats.slice(0, 8).map((s) => {
          const widthPct = (Math.abs(s.netPnl) / max) * 100;
          const positive = s.netPnl >= 0;
          return (
            <div key={s.tagId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text)] truncate">{tagLabel(s.tagId)}</span>
                <span className={`tabular-nums ${colorClassForPnL(s.netPnl)}`}>
                  {fmtUSD(s.netPnl, { signed: true })}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${widthPct}%`,
                      background: positive ? "var(--color-positive)" : "var(--color-negative)",
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--color-text-dim)] tabular-nums w-32 text-right">
                  {s.count} trade{s.count === 1 ? "" : "s"} · {fmtPct(s.winRate)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
