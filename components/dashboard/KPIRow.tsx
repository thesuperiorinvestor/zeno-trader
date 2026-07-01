"use client";

import { TrendingUp, TrendingDown, Flame, Target } from "lucide-react";
import { fmtPct, fmtUSD, colorClassForPnL } from "@/lib/utils";
import type { KPIStats } from "@/lib/queries";

function Card({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</div>
      {hint && <div className="text-xs text-[var(--color-text-dim)]">{hint}</div>}
    </div>
  );
}

export function KPIRow({ stats }: { stats: KPIStats }) {
  const streakLabel =
    stats.currentStreak.type === "win"
      ? `🔥 ${stats.currentStreak.count} win streak`
      : stats.currentStreak.type === "loss"
      ? `❄️ ${stats.currentStreak.count} loss streak`
      : "—";

  const pf = stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Net P&L"
        value={fmtUSD(stats.netPnl, { signed: true })}
        accent={colorClassForPnL(stats.netPnl)}
        hint={`${stats.totalTrades} trades`}
        icon={stats.netPnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      />
      <Card
        label="Win Rate"
        value={fmtPct(stats.winRate)}
        hint={`${stats.wins}W / ${stats.losses}L`}
        icon={<Target size={14} />}
      />
      <Card
        label="Profit Factor"
        value={pf}
        hint={`Avg win ${fmtUSD(stats.avgWin)} · Avg loss ${fmtUSD(stats.avgLoss)}`}
      />
      <Card
        label="Streak"
        value={streakLabel}
        hint={`Best win ${fmtUSD(stats.largestWin)} · Worst ${fmtUSD(stats.largestLoss)}`}
        icon={<Flame size={14} />}
      />
    </div>
  );
}
