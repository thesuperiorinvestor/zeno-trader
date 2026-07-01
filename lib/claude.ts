// Claude AI helpers — used server-side via API routes.
// Note: requires ANTHROPIC_API_KEY in env.

import Anthropic from "@anthropic-ai/sdk";
import type { Trade, DailyJournal, Opportunity } from "./types";
import { tagLabel } from "./tags";

let _client: Anthropic | null = null;
function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a trading coach reviewing a discretionary day trader's logged trades. The trader (Blake) trades futures (ES, NQ) and equities options. Their methodology centers on:

- The Strat (RevStrat): bar types 1 (inside), 2U/2D (directional), 3 (outside). Common patterns: 212, 221, 232 (reversals/broadening), 122 / 2-2 (continuation), 1-2 breakouts, Time Frame Continuity (TFC).
- Supply & Demand zones: fresh/untested zones, S/D flips.
- Key levels: reclaim, rejection, retest of support/resistance.
- Other: VWAP reclaim/reject, Opening Range Breakouts, gap fills.

When you review a trade, focus on:
1. Whether the entry matched the tagged setup (was the methodology actually present?).
2. Whether emotion (FOMO, hesitant, revenge, confident) and execution grade align — e.g. a 5-star FOMO trade is a contradiction worth flagging.
3. Specific, actionable improvements grounded in the trader's own data — not generic platitudes.
4. Patterns across recent trades when context is provided.

Keep responses to 4-6 short paragraphs maximum. Be direct. Skip hedging like "consider" or "you might want to"—say what to do.`;

// Lightweight shape for live broker positions passed into prompts.
export interface OpenPositionContext {
  description: string;
  quantity: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  openedAt?: string;
  expirationDate?: string;
}

function formatPositions(positions: OpenPositionContext[]): string {
  if (!positions.length) return "";
  const lines = positions.map((p) => {
    const held = p.openedAt
      ? `, held ${Math.max(0, Math.round((Date.now() - new Date(p.openedAt).getTime()) / 86_400_000))}d`
      : "";
    const exp = p.expirationDate ? `, expires ${p.expirationDate}` : "";
    return `${p.description} ×${p.quantity}${held}${exp}, unrealized ${p.unrealizedPnl >= 0 ? "+" : ""}$${p.unrealizedPnl.toFixed(0)} (${(p.unrealizedPct * 100).toFixed(0)}%)`;
  });
  return `\n\nCurrent open positions (live from broker):\n${lines.join("\n")}`;
}

export async function tradeInsight(
  trade: Trade,
  recentTrades: Trade[] = [],
  openPositions: OpenPositionContext[] = []
): Promise<string> {
  const c = client();

  const tradeBlock = formatTrade(trade);
  const contextBlock = recentTrades.length
    ? `\n\nRecent trade history (last ${recentTrades.length}, oldest first):\n${recentTrades.map(formatTrade).join("\n---\n")}`
    : "";
  const positionsBlock = formatPositions(openPositions);

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Review this trade and give me coaching feedback.\n\nTrade:\n${tradeBlock}${contextBlock}${positionsBlock}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return text.trim();
}

export const WEEKLY_MODEL = MODEL;

export async function weeklyReview(
  trades: Trade[],
  journals: DailyJournal[],
  weekStart: string,
  weekEnd: string,
  openPositions: OpenPositionContext[] = []
): Promise<string> {
  const c = client();

  const tradesBlock = trades.length
    ? trades.map(formatTradeShort).join("\n")
    : "(no trades this week)";

  const journalsBlock = journals.length
    ? journals
        .map(
          (j) =>
            `[${j.date}] bias=${j.preMarket.bias} | grade=${j.postSession.dayGrade}\n  plan: ${j.preMarket.plan || "(none)"}\n  lessons: ${j.postSession.lessons || "(none)"}`
        )
        .join("\n")
    : "(no journal entries this week)";

  // Aggregate stats
  const wins = trades.filter((t) => t.pnl > 0).length;
  const losses = trades.filter((t) => t.pnl < 0).length;
  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const grossWin = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = trades.filter((t) => t.pnl < 0).reduce((s, t) => s - t.pnl, 0);
  const pf = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : "∞";
  const winRate = trades.length ? ((wins / trades.length) * 100).toFixed(1) + "%" : "—";

  const summary = `Week ${weekStart} to ${weekEnd}
Trades: ${trades.length} (${wins}W / ${losses}L)
Net P&L: $${netPnl.toFixed(2)}
Win rate: ${winRate}
Profit factor: ${pf}`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Write a weekly trading review.

${summary}

Trades (oldest first):
${tradesBlock}

Journal entries:
${journalsBlock}${formatPositions(openPositions)}

Structure your response as markdown with these sections:

## TL;DR
One punchy sentence on the week.

## What Worked
Specific setups, conditions, or behaviors that produced edge. Cite trade dates and amounts.

## What Hurt
Recurring mistakes, emotional patterns, problem setups. Cite specific examples.

## Next Week
Three concrete focus areas. Be prescriptive — say what to do differently, not "consider doing".

Keep it tight. No filler. No corporate hedging.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text.trim();
}

export async function opportunityReview(
  opp: Opportunity,
  recentTrades: Trade[] = [],
  openPositions: OpenPositionContext[] = []
): Promise<string> {
  const c = client();

  // Adaptive: post-mortem once an outcome is known, otherwise a pre-trade read.
  const hasOutcome = !!opp.wouldHaveOutcome || (opp.didTake && !!opp.tradeId);
  const linkedTrade = opp.tradeId ? recentTrades.find((t) => t.id === opp.tradeId) : undefined;

  const oppBlock = `Symbol: ${opp.symbol}
Setup: ${opp.setupTag ? tagLabel(opp.setupTag) : "untagged"}
Timeframes: ${opp.timeframes?.length ? opp.timeframes.join(", ") : "none"}
Date logged: ${opp.date}
Thesis / trigger conditions: ${opp.description || "(none written)"}
Status: ${opp.didTake ? "TOOK the trade" : "did NOT take"}${opp.wouldHaveOutcome ? ` · outcome: ${opp.wouldHaveOutcome}` : ""}${linkedTrade ? ` · linked trade P&L: $${linkedTrade.pnl.toFixed(2)}, grade ${linkedTrade.executionGrade}/5` : ""}`;

  const recentBlock = recentTrades.length
    ? `\n\nRecent trades for context (oldest first):\n${recentTrades.slice(-8).map(formatTradeShort).join("\n")}`
    : "";

  const instruction = hasOutcome
    ? `This opportunity has already played out. Give a short post-mortem:
- Was the take/skip decision correct given the setup quality?
- What did this opportunity teach about the trader's selection or timing?
- One concrete adjustment for spotting/handling this setup next time.`
    : `This opportunity has not played out yet. Give a pre-trade read:
- Grade the setup quality against the methodology (is the tagged setup actually a high-probability structure here?).
- Key risks / what would invalidate it.
- What confirmation should trigger entry, and what would make you stand down.`;

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Review this trade opportunity from my watchlist.\n\n${oppBlock}${recentBlock}${formatPositions(openPositions)}\n\n${instruction}\n\nRespond in tight markdown. 2-4 short paragraphs or a few bullets. No hedging.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text.trim();
}

export async function monthlyReport(trades: Trade[], monthLabel: string): Promise<string> {
  const c = client();
  const summary = trades.map(formatTradeShort).join("\n");

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Write a monthly trading review for ${monthLabel}. ${trades.length} trades total.\n\n${summary}\n\nStructure your response:\n1. Headline performance summary (one paragraph).\n2. What's working — specific setups, conditions, time-of-day patterns.\n3. What's hurting — recurring mistakes, emotional patterns, problem setups.\n4. Three concrete focus areas for next month.`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return text.trim();
}

function formatTrade(t: Trade): string {
  return `[${t.date}${t.time ? " " + t.time : ""}] ${t.symbol} ${t.side.toUpperCase()} ${t.size} @ ${t.entryPrice} → ${t.exitPrice} | P&L: ${t.pnl.toFixed(2)} | Grade: ${t.executionGrade}/5
Setup: ${t.setupTags.map(tagLabel).join(", ") || "none"}
Key level: ${t.keyLevelNote || "none"}
Emotion entry: ${t.emotionEntry.join(", ") || "none"} | exit: ${t.emotionExit.join(", ") || "none"}
Mistakes: ${t.mistakeTags.map(tagLabel).join(", ") || "none"}
Notes: ${t.thoughtProcess || "(none)"}
Trader's own post-trade review: ${t.postTradeReview || "(none)"}`;
}

function formatTradeShort(t: Trade): string {
  return `${t.date} ${t.symbol} ${t.side} ${t.pnl.toFixed(2)} grade=${t.executionGrade} setup=[${t.setupTags.map(tagLabel).join("|")}] mistakes=[${t.mistakeTags.map(tagLabel).join("|")}] emotion=[${t.emotionEntry.join("|")}]`;
}
