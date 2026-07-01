import { NextResponse } from "next/server";
import { defaultAccountId, getPortfolio, underlyingOf, portfolioValue } from "@/lib/public";

export interface PositionView {
  contract: string;
  underlying: string;
  description: string;
  quantity: number;
  unitCost: number;       // per-contract premium paid
  lastPrice: number;      // current per-contract premium
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  openedAt?: string;
}

export async function GET() {
  try {
    const accountId = await defaultAccountId();
    const portfolio = await getPortfolio(accountId);
    const positions = portfolio.positions ?? [];

    const views: PositionView[] = positions.map((p) => {
      const qty = parseFloat(p.quantity) || 0;
      const unitCost = parseFloat(p.costBasis?.unitCost ?? "0") || 0;
      const last = parseFloat(p.lastPrice?.lastPrice ?? "0") || 0;
      const marketValue = parseFloat(p.currentValue ?? "0") || 0;
      // Public pre-computes unrealized gain; use it directly.
      const unrealized = parseFloat(p.costBasis?.gainValue ?? "0") || 0;
      const unrealizedPct = (parseFloat(p.costBasis?.gainPercentage ?? "0") || 0) / 100;
      return {
        contract: p.instrument.symbol,
        underlying: underlyingOf(p.instrument.symbol),
        // instrument.name is clean and human-readable, e.g. "NFLX $100 Call Sep 18, '26"
        description: p.instrument.name ?? p.instrument.symbol,
        quantity: qty,
        unitCost,
        lastPrice: last,
        marketValue,
        unrealizedPnl: unrealized,
        unrealizedPct,
        openedAt: p.openedAt,
      };
    });

    return NextResponse.json({ accountValue: portfolioValue(portfolio), positions: views });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
