import { NextRequest, NextResponse } from "next/server";
import { weeklyReview, type OpenPositionContext } from "@/lib/claude";
import type { Trade, DailyJournal } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      trades: Trade[];
      journals: DailyJournal[];
      weekStart: string;
      weekEnd: string;
      openPositions?: OpenPositionContext[];
    };
    if (!body.weekStart || !body.weekEnd) {
      return NextResponse.json({ error: "Missing weekStart or weekEnd" }, { status: 400 });
    }
    const content = await weeklyReview(
      body.trades ?? [],
      body.journals ?? [],
      body.weekStart,
      body.weekEnd,
      body.openPositions ?? []
    );
    return NextResponse.json({ content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
