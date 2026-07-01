"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from "lucide-react";
import { put, get, allTrades, allJournals, allWeeklyReviews } from "@/lib/db";
import { fetchOpenPositions } from "@/lib/livePositions";
import { weekStartISO, addDaysISO, fmtUSD, colorClassForPnL } from "@/lib/utils";
import { Markdown } from "@/components/Markdown";
import type { WeeklyReview as WR } from "@/lib/types";

export function WeeklyReview() {
  const [weekStart, setWeekStart] = useState<string>(() => weekStartISO());
  const [review, setReview] = useState<WR | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<WR[]>([]);

  const weekEnd = addDaysISO(weekStart, 6);
  const id = `week-${weekStart}`;
  const isCurrentWeek = weekStart === weekStartISO();

  useEffect(() => {
    get("weeklyReviews", id).then((r) => setReview((r as WR | undefined) ?? null));
    setError(null);
  }, [id]);

  useEffect(() => {
    allWeeklyReviews().then((rs) =>
      setHistory(rs.sort((a, b) => b.weekStart.localeCompare(a.weekStart)))
    );
  }, [review]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const [trades, journals, openPositions] = await Promise.all([
        allTrades(),
        allJournals(),
        fetchOpenPositions(),
      ]);
      const inWeek = trades.filter((t) => t.date >= weekStart && t.date <= weekEnd);
      const journalInWeek = journals.filter((j) => j.date >= weekStart && j.date <= weekEnd);

      const res = await fetch("/api/claude/weekly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: inWeek,
          journals: journalInWeek,
          weekStart,
          weekEnd,
          openPositions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");

      const netPnl = inWeek.reduce((s, t) => s + t.pnl, 0);
      const stored: WR = {
        id,
        weekStart,
        weekEnd,
        tradeCount: inWeek.length,
        netPnl,
        content: data.content,
        generatedAt: new Date().toISOString(),
        model: "claude-sonnet-4-6",
      };
      await put("weeklyReviews", stored);
      setReview(stored);
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
          <Sparkles size={16} className="text-[var(--color-accent-light)]" />
          <h3 className="font-medium">Weekly Review</h3>
          <span className="text-xs text-[var(--color-text-dim)] tabular-nums">
            {weekStart} → {weekEnd}
          </span>
          {isCurrentWeek && <span className="tag tag-accent text-[10px]">This week</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
            className="btn-secondary p-1.5"
            title="Previous week"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setWeekStart(weekStartISO())}
            className="btn-secondary text-xs py-1.5"
            disabled={isCurrentWeek}
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
            className="btn-secondary p-1.5"
            title="Next week"
            disabled={addDaysISO(weekStart, 7) > weekStartISO()}
          >
            <ChevronRight size={14} />
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 ml-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : review ? <RefreshCw size={14} /> : <Sparkles size={14} />}
            {review ? "Regenerate" : "Generate review"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-3 rounded-lg border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
          <AlertCircle size={16} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--color-text-muted)]">{error}</div>
        </div>
      )}

      {review ? (
        <>
          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-[var(--color-border-soft)] text-sm">
            <span className="text-[var(--color-text-muted)]">
              {review.tradeCount} trade{review.tradeCount === 1 ? "" : "s"}
            </span>
            <span className={`tabular-nums font-medium ${colorClassForPnL(review.netPnl)}`}>
              {fmtUSD(review.netPnl, { signed: true })}
            </span>
            <span className="text-[var(--color-text-dim)] text-xs ml-auto">
              Generated {new Date(review.generatedAt).toLocaleString()}
            </span>
          </div>
          <Markdown content={review.content} />
        </>
      ) : loading ? (
        <div className="text-sm text-[var(--color-text-muted)] py-8 text-center">
          <Loader2 className="inline animate-spin mr-2" size={14} />
          Claude is reading your trades…
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-dim)] italic py-2">
          No review yet for this week. Click <span className="text-[var(--color-accent-light)]">Generate review</span> to have Claude analyze your trades and journal entries.
        </p>
      )}

      {history.length > 1 && (
        <div className="mt-5 pt-4 border-t border-[var(--color-border-soft)]">
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-dim)] mb-2">
            Past Reviews
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.slice(0, 12).map((r) => (
              <button
                key={r.id}
                onClick={() => setWeekStart(r.weekStart)}
                className={`px-2.5 py-1 rounded text-xs border tabular-nums transition-colors ${
                  r.weekStart === weekStart
                    ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-light)] border-transparent"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-soft)] hover:text-[var(--color-text)]"
                }`}
                title={`${r.tradeCount} trades · ${fmtUSD(r.netPnl, { signed: true })}`}
              >
                {r.weekStart}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

