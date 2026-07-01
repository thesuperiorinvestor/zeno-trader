"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { allTrades } from "@/lib/db";
import {
  filterTrades,
  breakdownByTag,
  breakdownByEmotion,
  breakdownByHour,
  breakdownByDayOfWeek,
  type DateRange,
} from "@/lib/queries";
import { tagLabel, EMOTION_LABELS } from "@/lib/tags";
import { fmtUSD } from "@/lib/utils";
import type { Trade } from "@/lib/types";

export function AnalyticsView() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    allTrades().then(setTrades);
  }, []);

  const filtered = filterTrades(trades, range);
  const setupData = breakdownByTag(filtered, "setupTags").map((s) => ({
    name: tagLabel(s.tagId),
    pnl: s.netPnl,
    count: s.count,
  }));
  const mistakeData = breakdownByTag(filtered, "mistakeTags").map((s) => ({
    name: tagLabel(s.tagId),
    pnl: s.netPnl,
    count: s.count,
  }));
  const emotionData = breakdownByEmotion(filtered).map((s) => ({
    name: EMOTION_LABELS[s.emotion] ?? s.emotion,
    pnl: s.netPnl,
    count: s.count,
  }));
  const hourData = breakdownByHour(filtered).map((s) => ({
    name: `${s.hour}:00`,
    pnl: s.netPnl,
    count: s.count,
  }));
  const dowData = breakdownByDayOfWeek(filtered).map((s) => ({
    name: s.day,
    pnl: s.netPnl,
    count: s.count,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <DateRangePicker value={range} onChange={setRange} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart title="By Setup" data={setupData} />
        <Chart title="By Mistake" data={mistakeData} />
        <Chart title="By Emotion (entry)" data={emotionData} />
        <Chart title="By Hour of Day" data={hourData} />
        <Chart title="By Day of Week" data={dowData} />
      </div>
    </div>
  );
}

function Chart({ title, data }: { title: string; data: { name: string; pnl: number; count: number }[] }) {
  return (
    <div className="card p-5">
      <h3 className="font-medium mb-3">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--color-text-dim)]">No data in this range.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-text-dim)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--color-text-dim)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => fmtUSD(v as number, { cents: false })}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface-2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  color: "var(--color-text)",
                }}
                labelStyle={{ color: "var(--color-text-muted)", fontSize: 12 }}
                formatter={(v, _n, p) => [
                  `${fmtUSD(Number(v), { signed: true })} (${(p as { payload: { count: number } }).payload.count} trades)`,
                  "P&L",
                ]}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.pnl >= 0 ? "var(--color-positive)" : "var(--color-negative)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
