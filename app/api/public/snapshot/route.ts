import { NextResponse } from "next/server";
import { defaultAccountId, getPortfolio, portfolioValue } from "@/lib/public";

export async function GET() {
  try {
    const accountId = await defaultAccountId();
    const portfolio = await getPortfolio(accountId);
    const accountValue = portfolioValue(portfolio);
    return NextResponse.json({
      date: new Date().toISOString().slice(0, 10),
      accountValue,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
