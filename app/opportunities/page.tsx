"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Check, X, ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TimeframePicker } from "@/components/trades/TimeframePicker";
import { ScreenshotUpload } from "@/components/trades/ScreenshotUpload";
import { Markdown } from "@/components/Markdown";
import { put, remove, allOpportunities, allTrades, getScreenshotURL } from "@/lib/db";
import { fetchOpenPositions } from "@/lib/livePositions";
import { todayISO, uuid, addDaysISO } from "@/lib/utils";
import { SETUP_TAGS, tagLabel } from "@/lib/tags";
import type { Opportunity, Trade } from "@/lib/types";

const empty = (date: string): Opportunity => ({
  id: uuid(),
  date,
  symbol: "",
  setupTag: "",
  timeframes: [],
  description: "",
  screenshotIds: [],
  didTake: false,
  notes: "",
  createdAt: new Date().toISOString(),
});

export default function OpportunitiesPage() {
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<Opportunity[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [draft, setDraft] = useState<Opportunity>(empty(todayISO()));
  const [quote, setQuote] = useState<{ symbol: string; last: number } | null>(null);

  async function lookupQuote(symbol: string) {
    setQuote(null);
    if (!symbol) return;
    try {
      const res = await fetch(`/api/public/quote?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) return; // silent — broker key optional
      const data = await res.json();
      if (data.last) setQuote({ symbol, last: data.last });
    } catch {
      // silent
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    allOpportunities().then(setItems);
    allTrades().then(setTrades);
  }

  const today = items.filter((o) => o.date === date);

  // Dates that have at least one opportunity, newest first, with counts.
  const datesWithOpps = (() => {
    const counts = new Map<string, number>();
    for (const o of items) counts.set(o.date, (counts.get(o.date) ?? 0) + 1);
    return [...counts.entries()]
      .map(([d, count]) => ({ date: d, count }))
      .sort((a, b) => b.date.localeCompare(a.date));
  })();

  function shiftDay(delta: number) {
    setDate(addDaysISO(date, delta));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.symbol) return;
    await put("opportunities", { ...draft, date });
    setDraft(empty(date));
    refresh();
  }

  async function update(o: Opportunity, patch: Partial<Opportunity>) {
    await put("opportunities", { ...o, ...patch });
    refresh();
  }

  async function del(id: string) {
    await remove("opportunities", id);
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="Best Opportunities"
        subtitle="Pre-market watchlist + post-session 'would have' review"
        actions={
          <>
            <button onClick={() => shiftDay(-1)} className="btn-secondary p-2" title="Previous day">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              className="input w-auto"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              onClick={() => shiftDay(1)}
              className="btn-secondary p-2"
              title="Next day"
              disabled={date >= todayISO()}
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setDate(todayISO())}
              className="btn-secondary text-xs"
              disabled={date === todayISO()}
            >
              Today
            </button>
          </>
        }
      />

      <div className="px-8 pb-12 space-y-6">
        {/* Add form */}
        <form onSubmit={add} className="card p-5 space-y-4">
          <h3 className="font-medium">Add Opportunity</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Symbol">
              <input
                className="input uppercase"
                placeholder="HOOD"
                value={draft.symbol}
                onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })}
                onBlur={(e) => lookupQuote(e.target.value.toUpperCase())}
              />
              {quote && quote.symbol === draft.symbol && (
                <span className="block text-xs text-[var(--color-accent-light)] mt-1 tabular-nums">
                  Last: ${quote.last.toFixed(2)}
                </span>
              )}
            </Field>
            <Field label="Setup">
              <select
                className="input"
                value={draft.setupTag}
                onChange={(e) => setDraft({ ...draft, setupTag: e.target.value })}
              >
                <option value="">— Select setup —</option>
                {SETUP_TAGS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </Field>
            <div /> {/* spacer */}
          </div>

          <Field label="Timeframes">
            <TimeframePicker
              selected={draft.timeframes}
              onChange={(tfs) => setDraft({ ...draft, timeframes: tfs })}
            />
          </Field>

          <Field label="Thesis / Trigger Conditions">
            <textarea
              className="input min-h-[100px]"
              placeholder="What are you watching for? Key levels, triggers, invalidation. All your thoughts go here."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>

          <Field label="Charts / Flow Screenshots">
            <ScreenshotUpload
              ids={draft.screenshotIds}
              onChange={(ids) => setDraft({ ...draft, screenshotIds: ids })}
            />
          </Field>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary inline-flex items-center gap-1">
              <Plus size={16} /> Add Opportunity
            </button>
          </div>
        </form>

        {/* List */}
        {today.length === 0 ? (
          <div className="card p-8 text-center text-[var(--color-text-muted)]">
            No opportunities logged for {date}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {today.map((o) => (
              <OpportunityCard
                key={o.id}
                o={o}
                trades={trades}
                onUpdate={(patch) => update(o, patch)}
                onDelete={() => del(o.id)}
              />
            ))}
          </div>
        )}

        {/* Jump to any past day with opportunities */}
        {datesWithOpps.length > 0 && (
          <div className="card p-5">
            <h3 className="font-medium mb-3">Browse Past Days</h3>
            <div className="flex flex-wrap gap-2">
              {datesWithOpps.map(({ date: d, count }) => (
                <button
                  key={d}
                  onClick={() => setDate(d)}
                  className={`px-3 py-1.5 rounded-md text-xs tabular-nums border inline-flex items-center gap-1.5 transition-colors ${
                    d === date
                      ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-light)] border-transparent"
                      : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border-[var(--color-border-soft)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {d}
                  <span className="text-[10px] opacity-70">
                    {count} opp{count === 1 ? "" : "s"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({
  o,
  trades,
  onUpdate,
  onDelete,
}: {
  o: Opportunity;
  trades: Trade[];
  onUpdate: (patch: Partial<Opportunity>) => void;
  onDelete: () => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const sid of o.screenshotIds ?? []) {
        const u = await getScreenshotURL(sid);
        if (u) next[sid] = u;
      }
      if (!cancelled) setUrls(next);
    })();
    return () => { cancelled = true; };
  }, [o.screenshotIds]);

  async function getReview() {
    setReviewing(true);
    setReviewError(null);
    try {
      const openPositions = await fetchOpenPositions();
      const sym = o.symbol.trim().toUpperCase();
      const sameSymbol = trades.filter((t) => t.symbol.trim().toUpperCase() === sym).slice(-8);
      // Always include the explicitly linked trade, even if it's outside the last 8.
      const linked = o.tradeId ? trades.find((t) => t.id === o.tradeId) : undefined;
      const recentTrades =
        linked && !sameSymbol.some((t) => t.id === linked.id) ? [...sameSymbol, linked] : sameSymbol;
      const res = await fetch("/api/claude/opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity: o, recentTrades, openPositions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      onUpdate({ claudeReview: data.review, claudeReviewAt: new Date().toISOString() });
      setShowReview(true);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-lg">{o.symbol}</span>
            {o.timeframes && o.timeframes.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {o.timeframes.map((tf) => (
                  <span key={tf} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-dim)] tabular-nums">
                    {tf}
                  </span>
                ))}
              </div>
            )}
          </div>
          {o.setupTag && (
            <div className="mt-1">
              <span className="tag tag-accent">{tagLabel(o.setupTag)}</span>
            </div>
          )}
        </div>
        <button onClick={onDelete} className="text-[var(--color-text-dim)] hover:text-[var(--color-negative)]">
          <Trash2 size={14} />
        </button>
      </div>

      {o.description && (
        <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-wrap mb-3 leading-relaxed">
          {o.description}
        </p>
      )}

      {/* Screenshots */}
      {o.screenshotIds && o.screenshotIds.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {o.screenshotIds.map((sid) => (
            urls[sid] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <a
                key={sid}
                href={urls[sid]}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={urls[sid]}
                  alt="chart"
                  className="w-full h-20 object-cover rounded border border-[var(--color-border-soft)] hover:border-[var(--color-accent-dim)] transition-colors"
                />
              </a>
            ) : (
              <div key={sid} className="w-full h-20 rounded bg-[var(--color-surface-2)] flex items-center justify-center">
                <ImageIcon size={16} className="text-[var(--color-text-dim)]" />
              </div>
            )
          ))}
        </div>
      )}

      {/* Took it? */}
      <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-soft)] flex-wrap">
        <span className="text-xs text-[var(--color-text-muted)] mr-1">Took it?</span>
        <button
          onClick={() => onUpdate({ didTake: true })}
          className={`p-1.5 rounded ${o.didTake ? "bg-[var(--color-positive)]/15 text-[var(--color-positive)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-dim)]"}`}
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => onUpdate({ didTake: false, tradeId: undefined })}
          className={`p-1.5 rounded ${!o.didTake ? "bg-[var(--color-negative)]/15 text-[var(--color-negative)]" : "bg-[var(--color-surface-2)] text-[var(--color-text-dim)]"}`}
        >
          <X size={14} />
        </button>
        {o.didTake ? (
          <select
            className="input ml-1 w-auto text-xs py-1"
            value={o.tradeId ?? ""}
            onChange={(e) => onUpdate({ tradeId: e.target.value || undefined })}
          >
            <option value="">— link trade —</option>
            {trades
              .filter(
                (t) => t.symbol.trim().toUpperCase() === o.symbol.trim().toUpperCase()
              )
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.date} · {t.symbol} {t.side} ${t.pnl.toFixed(0)}
                </option>
              ))}
          </select>
        ) : (
          <select
            className="input ml-1 w-auto text-xs py-1"
            value={o.wouldHaveOutcome ?? ""}
            onChange={(e) => onUpdate({ wouldHaveOutcome: (e.target.value || undefined) as Opportunity["wouldHaveOutcome"] })}
          >
            <option value="">— outcome —</option>
            <option value="win">Would have won</option>
            <option value="loss">Would have lost</option>
            <option value="unknown">Unknown</option>
          </select>
        )}
        {o.tradeId && (
          <Link href={`/trades/${o.tradeId}`} className="ml-auto text-xs text-[var(--color-accent-light)] inline-flex items-center gap-1">
            View trade <ExternalLink size={12} />
          </Link>
        )}
      </div>

      {/* Claude review */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border-soft)]">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={getReview}
            disabled={reviewing}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5"
          >
            {reviewing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {o.claudeReview ? "Refresh read" : "Claude's read"}
          </button>
          {o.claudeReview && (
            <button
              onClick={() => setShowReview((s) => !s)}
              className="text-xs text-[var(--color-accent-light)] hover:underline"
            >
              {showReview ? "Hide" : "Show review"}
            </button>
          )}
          {o.claudeReviewAt && (
            <span className="text-[10px] text-[var(--color-text-dim)] ml-auto">
              {new Date(o.claudeReviewAt).toLocaleString()}
            </span>
          )}
        </div>

        {reviewError && (
          <div className="flex items-start gap-2 mt-2 text-xs text-[var(--color-text-muted)]">
            <AlertCircle size={14} className="text-[var(--color-warning)] shrink-0 mt-0.5" />
            <span>{reviewError}</span>
          </div>
        )}

        {o.claudeReview && showReview && (
          <div className="mt-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border-soft)] px-3 py-2">
            <Markdown content={o.claudeReview} />
          </div>
        )}
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
