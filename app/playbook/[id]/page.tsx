"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { TagPicker } from "@/components/trades/TagPicker";
import { get, put, allTrades } from "@/lib/db";
import { SETUP_TAGS, tagLabel } from "@/lib/tags";
import { fmtPct, fmtUSD, colorClassForPnL } from "@/lib/utils";
import type { SetupCard, Trade } from "@/lib/types";

export default function PlaybookDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [card, setCard] = useState<SetupCard | undefined>();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    get("setupCards", id).then(setCard);
    allTrades().then(setTrades);
  }, [id]);

  if (!card) return <div className="p-8 text-[var(--color-text-muted)]">Loading…</div>;

  const linkedTrades = trades.filter((t) => t.setupTags.some((tag) => card.setupTagIds.includes(tag)));
  const total = linkedTrades.length;
  const wins = linkedTrades.filter((t) => t.pnl > 0).length;
  const netPnl = linkedTrades.reduce((s, t) => s + t.pnl, 0);
  const winRate = total ? wins / total : 0;
  const avg = total ? netPnl / total : 0;

  function update<K extends keyof SetupCard>(k: K, v: SetupCard[K]) {
    setCard((c) => (c ? { ...c, [k]: v } : c));
  }

  async function save() {
    if (!card) return;
    await put("setupCards", card);
    setSavedAt(Date.now());
  }

  function setListField(field: "entryRules" | "exitRules" | "invalidationRules" | "timeframes", text: string) {
    update(field, text.split("\n").map((l) => l.trim()).filter(Boolean));
  }

  return (
    <div>
      <PageHeader
        title={card.name || "Untitled Setup"}
        subtitle={card.category}
        actions={
          <>
            <Link href="/playbook" className="btn-secondary inline-flex items-center gap-1">
              <ArrowLeft size={16} /> Back
            </Link>
            <button onClick={save} className="btn-primary inline-flex items-center gap-1">
              <Save size={16} /> Save
              {savedAt && Date.now() - savedAt < 3000 && <span className="text-xs ml-1">✓</span>}
            </button>
          </>
        }
      />

      <div className="px-8 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="font-medium mb-4">Live Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Trades" value={`${total}`} />
              <Stat label="Win Rate" value={fmtPct(winRate)} />
              <Stat label="Net P&L" value={fmtUSD(netPnl, { signed: true })} className={colorClassForPnL(netPnl)} />
              <Stat label="Avg / trade" value={fmtUSD(avg, { signed: true })} className={colorClassForPnL(avg)} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-3">Linked Tags</h3>
            <p className="text-xs text-[var(--color-text-dim)] mb-3">
              Trades tagged with any of these will count for this setup.
            </p>
            <TagPicker
              tags={SETUP_TAGS}
              selected={card.setupTagIds}
              onChange={(v) => update("setupTagIds", v)}
            />
          </div>

          <div className="card p-5">
            <h3 className="font-medium mb-3">Example Trades</h3>
            {linkedTrades.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)]">No trades match this setup yet.</p>
            ) : (
              <div className="space-y-1">
                {linkedTrades.slice(0, 8).map((t) => (
                  <Link
                    key={t.id}
                    href={`/trades/${t.id}`}
                    className="flex items-center justify-between text-sm py-1.5 px-2 -mx-2 rounded hover:bg-[var(--color-surface-2)]"
                  >
                    <span>
                      <span className="font-medium">{t.symbol}</span>
                      <span className="text-[var(--color-text-dim)] ml-2">{t.date}</span>
                    </span>
                    <span className={`tabular-nums ${colorClassForPnL(t.pnl)}`}>
                      {fmtUSD(t.pnl, { signed: true })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5 space-y-4">
            <Field label="Description">
              <textarea
                className="input min-h-[80px]"
                value={card.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="When and where does this setup appear? What makes it valid?"
              />
            </Field>
            <Field label="Timeframes (one per line)">
              <textarea
                className="input min-h-[60px]"
                value={card.timeframes.join("\n")}
                onChange={(e) => setListField("timeframes", e.target.value)}
                placeholder="5m&#10;15m&#10;1h"
              />
            </Field>
          </div>

          <div className="card p-5 space-y-4">
            <Field label="Entry Rules (one per line)">
              <textarea
                className="input min-h-[100px]"
                value={card.entryRules.join("\n")}
                onChange={(e) => setListField("entryRules", e.target.value)}
                placeholder="Wait for 2D close below trigger&#10;Confirm with 5m TFC down&#10;Enter on retest of broken level"
              />
            </Field>
            <Field label="Exit Rules">
              <textarea
                className="input min-h-[80px]"
                value={card.exitRules.join("\n")}
                onChange={(e) => setListField("exitRules", e.target.value)}
                placeholder="Half off at 1R, runner to next level&#10;Trail under 5m highs"
              />
            </Field>
            <Field label="Invalidation Rules">
              <textarea
                className="input min-h-[80px]"
                value={card.invalidationRules.join("\n")}
                onChange={(e) => setListField("invalidationRules", e.target.value)}
                placeholder="Stop above the trigger high&#10;If 2 closes back inside the range, exit"
              />
            </Field>
            <Field label="Notes">
              <textarea
                className="input min-h-[80px]"
                value={card.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-text-dim)] uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${className}`}>{value}</div>
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
