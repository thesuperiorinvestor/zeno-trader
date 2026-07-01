"use client";

import { Suspense, useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { TradeTable } from "@/components/trades/TradeTable";
import { TradeForm } from "@/components/trades/TradeForm";
import { allTrades } from "@/lib/db";
import type { Trade } from "@/lib/types";

export default function TradesPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--color-text-muted)]">Loading…</div>}>
      <TradesPage />
    </Suspense>
  );
}

function TradesPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    allTrades().then(setTrades);
  }, []);

  useEffect(() => {
    if (sp.get("new") === "1") setShowForm(true);
  }, [sp]);

  function refresh() {
    allTrades().then(setTrades);
  }

  return (
    <div>
      <PageHeader
        title="Trade Log"
        subtitle={`${trades.length} trade${trades.length === 1 ? "" : "s"} logged`}
        actions={
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-1">
            <Plus size={16} /> New Trade
          </button>
        }
      />

      {showForm && (
        <div className="fixed inset-0 z-30 bg-black/60 flex items-start justify-center overflow-y-auto p-6">
          <div className="card w-full max-w-4xl my-8 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Log New Trade</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <TradeForm
              onSaved={() => {
                setShowForm(false);
                router.replace("/trades");
                refresh();
              }}
              onCancel={() => {
                setShowForm(false);
                router.replace("/trades");
              }}
            />
          </div>
        </div>
      )}

      <div className="px-8 pb-12">
        <TradeTable trades={trades} />
      </div>
    </div>
  );
}
