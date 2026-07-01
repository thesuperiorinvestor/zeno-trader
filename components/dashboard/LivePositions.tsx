"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Briefcase } from "lucide-react";
import { put, get } from "@/lib/db";
import { fmtUSD, fmtPct, colorClassForPnL, todayISO } from "@/lib/utils";
import type { EquitySnapshot } from "@/lib/types";

interface PositionView {
  contract: string;
  underlying: string;
  description: string;
  quantity: number;
  unitCost: number;
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  openedAt?: string;
  expirationDate?: string;
}

export function LivePositions({
  onPositions,
}: {
  onPositions?: (positions: PositionView[]) => void;
}) {
  const [positions, setPositions] = useState<PositionView[]>([]);
  const [accountValue, setAccountValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/positions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setPositions(data.positions ?? []);
      setAccountValue(data.accountValue ?? null);
      onPositions?.(data.positions ?? []);

      // One snapshot per day for the real equity curve.
      if (data.accountValue > 0) {
        const date = todayISO();
        const existing = await get("equitySnapshots", date);
        if (!existing) {
          const snap: EquitySnapshot = { id: date, date, accountValue: data.accountValue, source: "public" };
          await put("equitySnapshots", snap);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-[var(--color-accent-light)]" />
          <h3 className="font-medium">Live Positions</h3>
          {accountValue !== null && accountValue > 0 && (
            <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
              Account {fmtUSD(accountValue)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {positions.length > 0 && (
            <span className={`text-sm tabular-nums font-medium ${colorClassForPnL(totalUnrealized)}`}>
              {fmtUSD(totalUnrealized, { signed: true })} open
            </span>
          )}
          <button onClick={load} disabled={loading} className="btn-secondary p-1.5">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {error.includes("PUBLIC_API_SECRET")
            ? "Connect Public.com: add PUBLIC_API_SECRET to .env.local and restart."
            : error}
        </p>
      ) : loading && positions.length === 0 ? (
        <p className="text-sm text-[var(--color-text-dim)] py-3">Loading positions…</p>
      ) : positions.length === 0 ? (
        <p className="text-sm text-[var(--color-text-dim)] py-3">Flat — no open positions.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--color-text-dim)] border-b border-[var(--color-border-soft)]">
            <tr>
              <th className="text-left py-2 font-medium">Position</th>
              <th className="text-right py-2 font-medium">Qty</th>
              <th className="text-right py-2 font-medium">Avg Cost</th>
              <th className="text-right py-2 font-medium">Last</th>
              <th className="text-right py-2 font-medium">Value</th>
              <th className="text-right py-2 font-medium">Unrealized</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.contract} className="border-b border-[var(--color-border-soft)] last:border-0">
                <td className="py-2.5">
                  <span className="font-medium">{p.description}</span>
                </td>
                <td className="py-2.5 text-right tabular-nums">{p.quantity}</td>
                <td className="py-2.5 text-right tabular-nums">{p.unitCost.toFixed(2)}</td>
                <td className="py-2.5 text-right tabular-nums">{p.lastPrice.toFixed(2)}</td>
                <td className="py-2.5 text-right tabular-nums">{fmtUSD(p.marketValue)}</td>
                <td className={`py-2.5 text-right tabular-nums font-medium ${colorClassForPnL(p.unrealizedPnl)}`}>
                  {fmtUSD(p.unrealizedPnl, { signed: true })}{" "}
                  <span className="text-xs opacity-75">({fmtPct(p.unrealizedPct)})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
