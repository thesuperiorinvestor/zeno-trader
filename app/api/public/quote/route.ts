import { NextRequest, NextResponse } from "next/server";
import { defaultAccountId, getQuotes } from "@/lib/public";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  try {
    const accountId = await defaultAccountId();
    const quotes = await getQuotes(accountId, [symbol]);
    const q = quotes[0];
    if (!q) return NextResponse.json({ error: "No quote" }, { status: 404 });
    return NextResponse.json({
      symbol,
      last: q.last ? parseFloat(q.last) : null,
      bid: q.bid ? parseFloat(q.bid) : null,
      ask: q.ask ? parseFloat(q.ask) : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
