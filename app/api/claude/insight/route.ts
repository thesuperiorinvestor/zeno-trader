import { NextRequest, NextResponse } from "next/server";
import { tradeInsight, type OpenPositionContext } from "@/lib/claude";
import type { Trade } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      trade: Trade;
      recentTrades?: Trade[];
      openPositions?: OpenPositionContext[];
    };
    if (!body?.trade) {
      return NextResponse.json({ error: "Missing trade" }, { status: 400 });
    }
    const insight = await tradeInsight(body.trade, body.recentTrades ?? [], body.openPositions ?? []);
    return NextResponse.json({ insight });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
