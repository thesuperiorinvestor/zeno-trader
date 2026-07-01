import { NextRequest, NextResponse } from "next/server";
import { opportunityReview, type OpenPositionContext } from "@/lib/claude";
import type { Opportunity, Trade } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      opportunity: Opportunity;
      recentTrades?: Trade[];
      openPositions?: OpenPositionContext[];
    };
    if (!body?.opportunity) {
      return NextResponse.json({ error: "Missing opportunity" }, { status: 400 });
    }
    const review = await opportunityReview(
      body.opportunity,
      body.recentTrades ?? [],
      body.openPositions ?? []
    );
    return NextResponse.json({ review });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
