"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Check,
  X,
  ExternalLink,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TagPicker } from "@/components/trades/TagPicker";
import { EmotionPicker } from "@/components/trades/EmotionPicker";
import { StarRating } from "@/components/trades/StarRating";
import { put, allTrades, allImportQueue, allOpportunities } from "@/lib/db";
import { SETUP_TAGS, MISTAKE_TAGS } from "@/lib/tags";
import { fmtUSD, colorClassForPnL, todayISO, addDaysISO } from "@/lib/utils";
import type { ImportedTrade, Trade, Emotion, ExecGrade } from "@/lib/types";
import type { RoundTrip } from "@/lib/public";

export default function ImportPage() {
  const [queue, setQueue] = useState<ImportedTrade[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<{ added: number; skipped: number } | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    allImportQueue().then((q) =>
      setQueue(q.sort((a, b) => b.closeDate.localeCompare(a.closeDate)))
    );
  }

  async function sync() {
    setSyncing(true);
    setError(null);
    setLastSync(null);
    try {
      const res = await fetch("/api/public/import");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const roundTrips: RoundTrip[] = data.roundTrips ?? [];

      const [trades, existing] = await Promise.all([allTrades(), allImportQueue()]);
      const knownRefs = new Set<string>([
        ...trades.map((t) => t.brokerRef).filter(Boolean) as string[],
        ...existing.map((q) => q.brokerRef),
      ]);

      let added = 0;
      let skipped = 0;
      for (const rt of roundTrips) {
        if (knownRefs.has(rt.brokerRef)) {
          skipped++;
          continue;
        }
        const item: ImportedTrade = {
          id: rt.brokerRef,
          brokerRef: rt.brokerRef,
          brokerOrderIds: rt.brokerOrderIds,
          contract: rt.contract,
          underlying: rt.underlying,
          side: rt.side,
          openDate: rt.openDate,
          openTime: rt.openTime,
          closeDate: rt.closeDate,
          contracts: rt.contracts,
          entryPrice: rt.entryPrice,
          exitPrice: rt.exitPrice,
          fees: rt.fees,
          pnl: rt.pnl,
          status: "pending",
          importedAt: new Date().toISOString(),
        };
        await put("importQueue", item);
        added++;
      }
      setLastSync({ added, skipped });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  const pending = queue.filter((q) => q.status === "pending");
  const staleCutoff = addDaysISO(todayISO(), -2);
  const staleCount = pending.filter((q) => q.closeDate < staleCutoff).length;

  return (
    <div>
      <PageHeader
        title="Import"
        subtitle="Sync filled trades from Public.com, review, and journal them"
        actions={
          <button onClick={sync} disabled={syncing} className="btn-primary inline-flex items-center gap-1.5">
            {syncing ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            Sync from Public.com
          </button>
        }
      />

      <div className="px-8 pb-12 space-y-5">
        {error && <ApiKeyHint error={error} />}

        {lastSync && (
          <div className="card p-4 text-sm text-[var(--color-text-muted)]">
            Sync complete: <span className="text-[var(--color-positive)]">{lastSync.added} new</span>
            {" · "}
            {lastSync.skipped} already imported or journaled
          </div>
        )}

        {staleCount > 0 && (
          <div className="card p-4 border-[var(--color-warning)]/40 flex items-center gap-3">
            <AlertTriangle size={18} className="text-[var(--color-warning)] shrink-0" />
            <div className="text-sm">
              <span className="font-medium">{staleCount} unjournaled trade{staleCount === 1 ? "" : "s"}</span>
              <span className="text-[var(--color-text-muted)]">
                {" "}closed more than 2 days ago. Review them below — fresh memory writes better journals.
              </span>
            </div>
          </div>
        )}

        {pending.length === 0 ? (
          <div className="card p-10 text-center text-[var(--color-text-muted)]">
            <p className="mb-1">No trades waiting for review.</p>
            <p className="text-sm text-[var(--color-text-dim)]">
              Hit &ldquo;Sync from Public.com&rdquo; after you close positions and they&rsquo;ll land here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <ReviewCard key={item.id} item={item} onDone={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewCard({ item, onDone }: { item: ImportedTrade; onDone: () => void }) {
  const [setupTags, setSetupTags] = useState<string[]>([]);
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);
  const [emotionEntry, setEmotionEntry] = useState<Emotion[]>([]);
  const [emotionExit, setEmotionExit] = useState<Emotion[]>([]);
  const [grade, setGrade] = useState<ExecGrade>(3);
  const [thoughtProcess, setThoughtProcess] = useState("");
  const [postTradeReview, setPostTradeReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [linkedOpp, setLinkedOpp] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const trade: Trade = {
        id: crypto.randomUUID(),
        date: item.closeDate,
        time: item.openTime,
        symbol: item.underlying,
        instrument: "options",
        side: item.side,
        entryPrice: item.entryPrice,
        exitPrice: item.exitPrice,
        size: item.contracts,
        pnl: item.pnl,
        fees: item.fees,
        setupTags,
        keyLevelNote: "",
        emotionEntry,
        emotionExit,
        executionGrade: grade,
        thoughtProcess,
        postTradeReview,
        mistakeTags,
        customTags: [],
        screenshotIds: [],
        brokerRef: item.brokerRef,
        createdAt: now,
        updatedAt: now,
      };
      await put("trades", trade);
      await put("importQueue", { ...item, status: "confirmed" });

      // Auto-link matching opportunity (same underlying, watched on open or close date)
      const opps = await allOpportunities();
      const match = opps.find(
        (o) =>
          !o.tradeId &&
          o.symbol.toUpperCase() === item.underlying.toUpperCase() &&
          (o.date === item.openDate || o.date === item.closeDate)
      );
      if (match) {
        await put("opportunities", { ...match, didTake: true, tradeId: trade.id });
        setLinkedOpp(match.symbol);
      }
      onDone();
    } finally {
      setSaving(false);
    }
  }

  async function dismiss() {
    await put("importQueue", { ...item, status: "dismissed" });
    onDone();
  }

  const held =
    item.openDate === item.closeDate
      ? "day trade"
      : `${Math.round(
          (new Date(item.closeDate).getTime() - new Date(item.openDate).getTime()) / 86_400_000
        )}d hold`;

  return (
    <div className="card p-5">
      {/* Broker facts */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-semibold text-lg">{item.underlying}</span>
            <span className="text-xs text-[var(--color-text-dim)] font-mono">{item.contract}</span>
            <span className={`tag ${item.side === "long" ? "tag-positive" : "tag-negative"}`}>
              {item.side.toUpperCase()}
            </span>
            <span className="tag">{held}</span>
          </div>
          <div className="text-sm text-[var(--color-text-muted)] mt-1 tabular-nums">
            {item.openDate} {item.openTime} → {item.closeDate} · {item.contracts} contract{item.contracts === 1 ? "" : "s"} ·{" "}
            {item.entryPrice.toFixed(2)} → {item.exitPrice.toFixed(2)} · fees {fmtUSD(item.fees)}
          </div>
        </div>
        <div className={`text-2xl font-semibold tabular-nums ${colorClassForPnL(item.pnl)}`}>
          {fmtUSD(item.pnl, { signed: true })}
        </div>
      </div>

      {/* Journal fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <Field label="Setup Tags">
            <TagPicker tags={SETUP_TAGS} selected={setupTags} onChange={setSetupTags} />
          </Field>
          <Field label="Mistakes (if any)">
            <TagPicker tags={MISTAKE_TAGS} selected={mistakeTags} onChange={setMistakeTags} groupByCategory={false} />
          </Field>
          <Field label="Emotion at Entry">
            <EmotionPicker selected={emotionEntry} onChange={(v) => setEmotionEntry(v as Emotion[])} />
          </Field>
          <Field label="Emotion at Exit">
            <EmotionPicker selected={emotionExit} onChange={(v) => setEmotionExit(v as Emotion[])} />
          </Field>
          <Field label="Execution Grade">
            <StarRating value={grade} onChange={(v) => setGrade(v as ExecGrade)} />
          </Field>
        </div>
        <div className="space-y-3">
          <Field label="Thought Process / Thesis">
            <textarea
              className="input min-h-[90px]"
              value={thoughtProcess}
              onChange={(e) => setThoughtProcess(e.target.value)}
              placeholder="Why did you take this trade?"
            />
          </Field>
          <Field label="Post-Trade Review — What can I do better?">
            <textarea
              className="input min-h-[90px]"
              value={postTradeReview}
              onChange={(e) => setPostTradeReview(e.target.value)}
              placeholder="Entry, sizing, management, exit — what's the lesson?"
            />
          </Field>
        </div>
      </div>

      {linkedOpp && (
        <div className="text-xs text-[var(--color-accent-light)] mb-3 inline-flex items-center gap-1">
          <ExternalLink size={12} /> Linked to your {linkedOpp} opportunity automatically
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border-soft)]">
        <button onClick={dismiss} className="btn-secondary inline-flex items-center gap-1.5">
          <X size={15} /> Dismiss
        </button>
        <button onClick={confirm} disabled={saving} className="btn-primary inline-flex items-center gap-1.5">
          <Check size={15} /> Confirm → Trade Log
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ApiKeyHint({ error }: { error: string }) {
  const missing = error.includes("PUBLIC_API_SECRET");
  return (
    <div className="card p-5 border-[var(--color-warning)]/40">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-[var(--color-warning)] shrink-0 mt-0.5" size={20} />
        <div>
          <div className="font-medium mb-1">{missing ? "Public.com API key required" : "Sync failed"}</div>
          <div className="text-sm text-[var(--color-text-muted)]">
            {missing ? (
              <>
                In the Public app: Settings → Security → API → generate a secret key. Then add{" "}
                <code className="bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">PUBLIC_API_SECRET=your_key</code>{" "}
                to <code className="bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded">.env.local</code> and restart
                the dev server.
              </>
            ) : (
              error
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
