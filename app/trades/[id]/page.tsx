"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit3, Trash2, Sparkles, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TradeForm } from "@/components/trades/TradeForm";
import { StarRating } from "@/components/trades/StarRating";
import { get, remove, put, getScreenshotURL } from "@/lib/db";
import { fetchOpenPositions } from "@/lib/livePositions";
import { tagLabel, EMOTION_LABELS } from "@/lib/tags";
import { fmtUSD, fmtPctSigned, returnPct, colorClassForPnL } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export default function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trade, setTrade] = useState<Trade | undefined>();
  const [editing, setEditing] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    get("trades", id).then(setTrade);
  }, [id]);

  useEffect(() => {
    if (!trade) return;
    (async () => {
      const next: Record<string, string> = {};
      for (const sid of trade.screenshotIds) {
        const u = await getScreenshotURL(sid);
        if (u) next[sid] = u;
      }
      setUrls(next);
    })();
  }, [trade]);

  async function handleDelete() {
    if (!trade) return;
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    await remove("trades", trade.id);
    router.push("/trades");
  }

  async function getInsight() {
    if (!trade) return;
    setInsightLoading(true);
    setInsightError(null);
    try {
      const openPositions = await fetchOpenPositions();
      const res = await fetch("/api/claude/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, openPositions }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
      const { insight } = await res.json();
      const updated: Trade = { ...trade, claudeInsight: insight, updatedAt: new Date().toISOString() };
      await put("trades", updated);
      setTrade(updated);
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : String(e));
    } finally {
      setInsightLoading(false);
    }
  }

  if (!trade) {
    return <div className="p-8 text-[var(--color-text-muted)]">Loading…</div>;
  }

  if (editing) {
    return (
      <div>
        <PageHeader title="Edit Trade" subtitle={`${trade.symbol} · ${trade.date}`} />
        <div className="px-8 pb-12">
          <TradeForm
            initial={trade}
            onSaved={(t) => {
              setTrade(t);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${trade.symbol} ${trade.side === "long" ? "Long" : "Short"}`}
        subtitle={`${trade.date}${trade.time ? " · " + trade.time : ""} · ${trade.instrument}`}
        actions={
          <>
            <Link href="/trades" className="btn-secondary inline-flex items-center gap-1">
              <ArrowLeft size={16} /> Back
            </Link>
            <button onClick={() => setEditing(true)} className="btn-secondary inline-flex items-center gap-1">
              <Edit3 size={16} /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="btn-secondary inline-flex items-center gap-1 hover:!border-[var(--color-negative)]"
            >
              <Trash2 size={16} /> Delete
            </button>
          </>
        }
      />

      <div className="px-8 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col: stats */}
        <div className="space-y-6">
          <div className="card p-5">
            <div className="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-1">P&L</div>
            <div className={`text-3xl font-semibold tabular-nums ${colorClassForPnL(trade.pnl)}`}>
              {fmtUSD(trade.pnl, { signed: true })}
              {(() => {
                const r = returnPct(trade.side, trade.entryPrice, trade.exitPrice);
                return r === null ? null : (
                  <span className="text-lg ml-2">({fmtPctSigned(r)})</span>
                );
              })()}
            </div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              {trade.size} × ({trade.entryPrice} → {trade.exitPrice}) · fees {fmtUSD(trade.fees)}
            </div>
          </div>

          <Section title="Setup">
            <TagList ids={trade.setupTags} />
            {trade.keyLevelNote && (
              <div className="mt-3 text-sm text-[var(--color-text-muted)]">
                <span className="text-[var(--color-text-dim)]">Level:</span> {trade.keyLevelNote}
              </div>
            )}
          </Section>

          <Section title="Psychology">
            <div className="space-y-2 text-sm">
              <Row label="Entry">
                {trade.emotionEntry.length === 0 ? (
                  <span className="text-[var(--color-text-dim)]">—</span>
                ) : (
                  trade.emotionEntry.map((e) => <span key={e} className="tag mr-1">{EMOTION_LABELS[e]}</span>)
                )}
              </Row>
              <Row label="Exit">
                {trade.emotionExit.length === 0 ? (
                  <span className="text-[var(--color-text-dim)]">—</span>
                ) : (
                  trade.emotionExit.map((e) => <span key={e} className="tag mr-1">{EMOTION_LABELS[e]}</span>)
                )}
              </Row>
              <Row label="Grade">
                <StarRating value={trade.executionGrade} readOnly />
              </Row>
            </div>
          </Section>

          {trade.mistakeTags.length > 0 && (
            <Section title="Mistakes">
              <TagList ids={trade.mistakeTags} variant="negative" />
            </Section>
          )}
        </div>

        {/* Middle/right col: notes + insight + screenshots */}
        <div className="lg:col-span-2 space-y-6">
          <Section title="Thought Process">
            {trade.thoughtProcess ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-text)]">
                {trade.thoughtProcess}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-dim)] italic">No notes recorded.</p>
            )}
          </Section>

          <Section title="Post-Trade Review — What can I do better?">
            {trade.postTradeReview ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-text)]">
                {trade.postTradeReview}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-dim)] italic">
                Not reviewed yet. Edit the trade to add your post-trade takeaways.
              </p>
            )}
          </Section>

          <Section
            title="Claude Insight"
            actions={
              <button
                onClick={getInsight}
                disabled={insightLoading}
                className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5"
              >
                {insightLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {trade.claudeInsight ? "Regenerate" : "Get insight"}
              </button>
            }
          >
            {insightError && (
              <p className="text-sm text-[var(--color-negative)] mb-2">{insightError}</p>
            )}
            {trade.claudeInsight ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-[var(--color-text)]">
                {trade.claudeInsight}
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-dim)] italic">
                Click &ldquo;Get insight&rdquo; to have Claude review this trade in the context of your recent log.
              </p>
            )}
          </Section>

          {trade.screenshotIds.length > 0 && (
            <Section title="Screenshots">
              <div className="grid grid-cols-2 gap-3">
                {trade.screenshotIds.map((sid) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={sid}
                    src={urls[sid]}
                    alt="screenshot"
                    className="w-full rounded-lg border border-[var(--color-border-soft)]"
                  />
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--color-text-dim)] uppercase tracking-wide w-14">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function TagList({ ids, variant }: { ids: string[]; variant?: "negative" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <span key={id} className={`tag ${variant === "negative" ? "tag-negative" : "tag-accent"}`}>
          {tagLabel(id)}
        </span>
      ))}
    </div>
  );
}
