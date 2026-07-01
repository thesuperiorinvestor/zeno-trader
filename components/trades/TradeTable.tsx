"use client";

import Link from "next/link";
import { tagLabel } from "@/lib/tags";
import { fmtUSD, fmtPctSigned, returnPct, colorClassForPnL } from "@/lib/utils";
import type { Trade } from "@/lib/types";
import { Star } from "lucide-react";

export function TradeTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="card p-8 text-center text-[var(--color-text-muted)]">
        No trades yet. Click <span className="text-[var(--color-accent-light)]">New Trade</span> to log your first one.
      </div>
    );
  }

  const sorted = [...trades].sort((a, b) =>
    (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? ""))
  );

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-[var(--color-text-dim)] border-b border-[var(--color-border-soft)]">
          <tr>
            <Th>Date</Th>
            <Th>Symbol</Th>
            <Th>Side</Th>
            <Th className="text-right">Size</Th>
            <Th className="text-right">Entry</Th>
            <Th className="text-right">Exit</Th>
            <Th className="text-right">P&L</Th>
            <Th className="text-right">Return %</Th>
            <Th>Setup</Th>
            <Th>Grade</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <tr
              key={t.id}
              className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <Td>
                <Link href={`/trades/${t.id}`} className="text-[var(--color-text)] hover:text-[var(--color-accent-light)]">
                  {t.date}
                  {t.time && <span className="text-[var(--color-text-dim)] ml-2">{t.time}</span>}
                </Link>
              </Td>
              <Td className="font-medium">{t.symbol}</Td>
              <Td>
                <span
                  className={`tag ${t.side === "long" ? "tag-positive" : "tag-negative"}`}
                >
                  {t.side === "long" ? "LONG" : "SHORT"}
                </span>
              </Td>
              <Td className="text-right tabular-nums">{t.size}</Td>
              <Td className="text-right tabular-nums">{t.entryPrice}</Td>
              <Td className="text-right tabular-nums">{t.exitPrice}</Td>
              <Td className={`text-right tabular-nums font-medium ${colorClassForPnL(t.pnl)}`}>
                {fmtUSD(t.pnl, { signed: true })}
              </Td>
              <Td className={`text-right tabular-nums font-medium ${colorClassForPnL(t.pnl)}`}>
                {(() => {
                  const r = returnPct(t.side, t.entryPrice, t.exitPrice);
                  return r === null ? "—" : fmtPctSigned(r);
                })()}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  {t.setupTags.slice(0, 2).map((id) => (
                    <span key={id} className="tag">{tagLabel(id)}</span>
                  ))}
                  {t.setupTags.length > 2 && (
                    <span className="text-xs text-[var(--color-text-dim)]">+{t.setupTags.length - 2}</span>
                  )}
                </div>
              </Td>
              <Td>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < t.executionGrade ? "var(--color-accent-light)" : "transparent"}
                      stroke={i < t.executionGrade ? "var(--color-accent-light)" : "var(--color-border)"}
                    />
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
