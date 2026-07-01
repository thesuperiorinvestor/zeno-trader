"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import type { EquityPoint } from "@/lib/queries";
import type { EquitySnapshot } from "@/lib/types";
import { fmtUSD } from "@/lib/utils";

interface MergedPoint {
  date: string;
  cumulative?: number;
  accountValue?: number;
}

export function EquityCurve({
  data,
  snapshots = [],
}: {
  data: EquityPoint[];
  snapshots?: EquitySnapshot[];
}) {
  if (data.length === 0 && snapshots.length === 0) {
    return (
      <div className="card p-8 text-center text-[var(--color-text-muted)]">
        Equity curve will appear once you log your first trade.
      </div>
    );
  }

  // Merge journal curve and broker snapshots on date
  const map = new Map<string, MergedPoint>();
  for (const p of data) {
    map.set(p.date, { date: p.date, cumulative: p.cumulative });
  }
  for (const s of snapshots) {
    const existing = map.get(s.date) ?? { date: s.date };
    existing.accountValue = s.accountValue;
    map.set(s.date, existing);
  }
  const merged = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));

  const hasReal = snapshots.length > 0;
  const lastCum = [...data].pop()?.cumulative ?? 0;
  const positive = lastCum >= 0;
  const stroke = positive ? "var(--color-positive)" : "var(--color-negative)";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Equity Curve</h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          {data.length} trading day{data.length === 1 ? "" : "s"}
          {hasReal && " · purple = real account value"}
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={merged} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="var(--color-text-dim)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="journal"
              stroke="var(--color-text-dim)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => fmtUSD(Number(v), { cents: false })}
              width={70}
            />
            {hasReal && (
              <YAxis
                yAxisId="real"
                orientation="right"
                stroke="var(--color-accent-light)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtUSD(Number(v), { cents: false })}
                width={70}
              />
            )}
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-2)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-text)",
              }}
              labelStyle={{ color: "var(--color-text-muted)", fontSize: 12 }}
              formatter={(v, name) => [
                fmtUSD(Number(v), { signed: name === "Journal P&L" }),
                name,
              ]}
            />
            {hasReal && <Legend wrapperStyle={{ fontSize: 12 }} />}
            <ReferenceLine yAxisId="journal" y={0} stroke="var(--color-border)" />
            <Area
              yAxisId="journal"
              type="monotone"
              dataKey="cumulative"
              name="Journal P&L"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#eq)"
              connectNulls
            />
            {hasReal && (
              <Line
                yAxisId="real"
                type="monotone"
                dataKey="accountValue"
                name="Account Value"
                stroke="var(--color-accent-light)"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
