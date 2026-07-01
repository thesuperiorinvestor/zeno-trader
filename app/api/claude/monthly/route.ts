import { NextRequest, NextResponse } from "next/server";
import { monthlyReport } from "@/lib/claude";
import type { Trade } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { trades: Trade[]; month: string };
    if (!body?.trades?.length) {
      return NextResponse.json({ error: "No trades provided" }, { status: 400 });
    }
    const report = await monthlyReport(body.trades, body.month);
    return NextResponse.json({ report });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
