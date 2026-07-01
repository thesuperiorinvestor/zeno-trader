"use client";

import { useState } from "react";
import { CalendarRange, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { allTrades } from "@/lib/db";
import { Markdown } from "@/components/Markdown";
import { fmtUSD, colorClassForPnL } from "@/lib/utils";

function currentMonth(): string {
  // YYYY-MM — Date.now() is unavailable in workflow scripts but fine in the browser.
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function MonthlyReport() {
  const [month, setMonth] = useState<string>(currentMonth());
  const [report, setReport] = useState<string | null>(null);
  const [stats, setStats] = useState<{ count: number; netPnl: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const trades = await allTrades();
      const inMonth = trades.filter((t) => t.date.startsWith(month));
      if (inMonth.length === 0) {
        setStats({ count: 0, netPnl: 0 });
        setError(`No trades logged in ${monthLabel(month)}.`);
        return;
      }
      const netPnl = inMonth.reduce((s, t) => s + t.pnl, 0);
      setStats({ count: inMonth.length, netPnl });

      const res = await fetch("/api/claude/monthly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trades: inMonth, month: monthLabel(month) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={16} className="text-[var(--color-accent-light)]" />
          <h3 className="font-medium">Monthly Report</h3>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="input w-auto text-xs py-1.5"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {report ? "Regenerate" : "Generate report"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[var(--color-border-soft)] text-sm">
          <span className="text-[var(--color-text-muted)]">
            {stats.count} trade{stats.count === 1 ? "" : "s"} · {monthLabel(month)}
          </span>
          {stats.count > 0 && (
            <span className={`tabular-nums font-medium ${colorClassForPnL(stats.netPnl)}`}>
              {fmtUSD(stats.netPnl, { signed: true })}
            </span>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
          <AlertCircle size={16} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--color-text-muted)]">{error}</div>
        </div>
      )}

      {report ? (
        <Markdown content={report} />
      ) : loading ? (
        <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
          <Loader2 className="inline animate-spin mr-2" size={14} />
          Claude is reviewing the month…
        </div>
      ) : (
        !error && (
          <p className="text-sm text-[var(--color-text-dim)] italic py-2">
            Pick a month and click <span className="text-[var(--color-accent-light)]">Generate report</span> for a full performance review.
          </p>
        )
      )}
    </div>
  );
}
