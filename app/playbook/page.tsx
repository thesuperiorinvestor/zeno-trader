"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { put, remove, allSetupCards, allTrades } from "@/lib/db";
import { uuid } from "@/lib/utils";
import type { SetupCard, SetupCategory, Trade } from "@/lib/types";
import { tagLabel } from "@/lib/tags";
import { fmtPct, fmtUSD, colorClassForPnL } from "@/lib/utils";
import { breakdownByTag } from "@/lib/queries";

type View = "setups" | "analytics";

const empty = (): SetupCard => ({
  id: uuid(),
  name: "",
  category: "RevStrat",
  description: "",
  entryRules: [],
  exitRules: [],
  invalidationRules: [],
  timeframes: [],
  setupTagIds: [],
  notes: "",
  createdAt: new Date().toISOString(),
});

export default function PlaybookPage() {
  const [cards, setCards] = useState<SetupCard[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [view, setView] = useState<View>("setups");

  useEffect(() => {
    refresh();
  }, []);
  function refresh() {
    allSetupCards().then(setCards);
    allTrades().then(setTrades);
  }

  async function add(name: string, category: SetupCategory) {
    if (!name.trim()) return;
    const c = { ...empty(), name: name.trim(), category };
    await put("setupCards", c);
    setShowNew(false);
    refresh();
  }

  async function del(id: string) {
    if (!confirm("Delete this setup card?")) return;
    await remove("setupCards", id);
    refresh();
  }

  // Compute stats per setup card based on its linked tag IDs
  const tagStats = breakdownByTag(trades, "setupTags");

  function statsFor(card: SetupCard) {
    const linked = tagStats.filter((s) => card.setupTagIds.includes(s.tagId));
    const count = linked.reduce((a, b) => a + b.count, 0);
    const netPnl = linked.reduce((a, b) => a + b.netPnl, 0);
    const wins = linked.reduce((a, b) => a + b.wins, 0);
    const winRate = count ? wins / count : 0;
    return { count, netPnl, winRate };
  }

  return (
    <div>
      <PageHeader
        title="Playbook"
        subtitle={view === "setups" ? "Your setup cards — built from tagged trades" : "Performance broken down by setup, emotion, and time"}
        actions={
          <>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border-soft)]">
              {(["setups", "analytics"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    view === v
                      ? "bg-[var(--color-accent-dim)] text-[var(--color-accent-light)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            {view === "setups" && (
              <button onClick={() => setShowNew(true)} className="btn-primary inline-flex items-center gap-1">
                <Plus size={16} /> New Setup
              </button>
            )}
          </>
        }
      />

      {showNew && <NewCardModal onClose={() => setShowNew(false)} onCreate={add} />}

      <div className="px-8 pb-12">
        {view === "analytics" ? (
          <AnalyticsView />
        ) : cards.length === 0 ? (
          <div className="card p-8 text-center text-[var(--color-text-muted)]">
            No setup cards yet. Create one for each pattern you trade — your playbook builds itself as you tag trades.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c) => {
              const s = statsFor(c);
              return (
                <Link
                  key={c.id}
                  href={`/playbook/${c.id}`}
                  className="card card-hover p-5 block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs text-[var(--color-accent-light)] mb-0.5 uppercase tracking-wide">
                        {c.category}
                      </div>
                      <h3 className="font-semibold">{c.name}</h3>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); del(c.id); }}
                      className="text-[var(--color-text-dim)] hover:text-[var(--color-negative)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {c.description && (
                    <p className="text-sm text-[var(--color-text-muted)] mb-3 line-clamp-2">{c.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.setupTagIds.slice(0, 3).map((id) => (
                      <span key={id} className="tag">{tagLabel(id)}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--color-border-soft)]">
                    <Stat label="Trades" value={`${s.count}`} />
                    <Stat label="Win%" value={s.count ? fmtPct(s.winRate) : "—"} />
                    <Stat label="P&L" value={s.count ? fmtUSD(s.netPnl, { signed: true }) : "—"} className={colorClassForPnL(s.netPnl)} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)]">{label}</div>
      <div className={`text-sm font-medium tabular-nums ${className}`}>{value}</div>
    </div>
  );
}

function NewCardModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, category: SetupCategory) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<SetupCategory>("RevStrat");

  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-6">
      <form
        onSubmit={(e) => { e.preventDefault(); onCreate(name, category); }}
        className="card p-6 w-full max-w-md space-y-4"
      >
        <h2 className="font-semibold text-lg">New Setup Card</h2>
        <label className="block">
          <span className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Name</span>
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 212 Reversal at Daily Resistance"
          />
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">Category</span>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as SetupCategory)}>
            <option value="RevStrat">RevStrat</option>
            <option value="Supply-Demand">Supply / Demand</option>
            <option value="Key Level">Key Level</option>
            <option value="Custom">Custom</option>
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Create</button>
        </div>
      </form>
    </div>
  );
}
