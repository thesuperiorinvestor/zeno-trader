"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPIRow } from "@/components/dashboard/KPIRow";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { SetupBreakdown } from "@/components/dashboard/SetupBreakdown";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { WeeklyReview } from "@/components/dashboard/WeeklyReview";
import { MonthlyReport } from "@/components/dashboard/MonthlyReport";
import { LivePositions } from "@/components/dashboard/LivePositions";
import { allTrades, allEquitySnapshots } from "@/lib/db";
import {
  computeKPIs,
  equityCurve,
  filterTrades,
  breakdownByTag,
  type DateRange,
} from "@/lib/queries";
import type { Trade, EquitySnapshot } from "@/lib/types";
import { fmtUSD, colorClassForPnL } from "@/lib/utils";

export default function DashboardPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [snapshots, setSnapshots] = useState<EquitySnapshot[]>([]);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return { from: d.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    allTrades().then((t) => {
      setTrades(t);
      setLoaded(true);
    });
    allEquitySnapshots().then(setSnapshots);
  }, []);

  const filtered = filterTrades(trades, range);
  const stats = computeKPIs(filtered);
  const eq = equityCurve(filtered);
  const setupBreakdown = breakdownByTag(filtered, "setupTags");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Daily snapshot of your trading"
        actions={
          <>
            <DateRangePicker value={range} onChange={setRange} />
            <Link href="/trades?new=1" className="btn-primary inline-flex items-center gap-1">
              <Plus size={16} /> New Trade
            </Link>
          </>
        }
      />

      <div className="px-8 pb-12 space-y-6">
        {!loaded ? (
          <div className="text-center text-[var(--color-text-muted)] py-20">Loading…</div>
        ) : (
          <>
            <KPIRow stats={stats} />
            <LivePositions
              onPositions={() => allEquitySnapshots().then(setSnapshots)}
            />
            <EquityCurve
              data={eq}
              snapshots={
                range
                  ? snapshots.filter(
                      (s) =>
                        (!range.from || s.date >= range.from) &&
                        (!range.to || s.date <= range.to)
                    )
                  : snapshots
              }
            />
            <WeeklyReview />
            <MonthlyReport />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SetupBreakdown stats={setupBreakdown} title="Best & Worst Setups" />
              <RecentTrades trades={filtered} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RecentTrades({ trades }: { trades: Trade[] }) {
  const recent = [...trades]
    .sort((a, b) => (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")))
    .slice(0, 8);

  if (recent.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-medium mb-2">Recent Trades</h3>
        <p className="text-sm text-[var(--color-text-muted)]">No trades in this range.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Recent Trades</h3>
        <Link href="/trades" className="text-xs text-[var(--color-accent-light)] hover:underline">
          View all →
        </Link>
      </div>
      <div className="divide-y divide-[var(--color-border-soft)]">
        {recent.map((t) => (
          <Link
            key={t.id}
            href={`/trades/${t.id}`}
            className="flex items-center justify-between py-2.5 text-sm hover:bg-[var(--color-surface-2)] -mx-2 px-2 rounded transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{t.symbol}</span>
              <span className="text-xs text-[var(--color-text-dim)] uppercase">{t.side}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-dim)]">{t.date}</span>
              <span className={`tabular-nums font-medium ${colorClassForPnL(t.pnl)}`}>
                {fmtUSD(t.pnl, { signed: true })}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
