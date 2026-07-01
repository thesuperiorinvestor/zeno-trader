import { NextResponse } from "next/server";
import { defaultAccountId, getHistory, pairRoundTrips } from "@/lib/public";

export async function GET() {
  try {
    const accountId = await defaultAccountId();
    const history = await getHistory(accountId);
    const roundTrips = pairRoundTrips(history);
    return NextResponse.json({ roundTrips });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
