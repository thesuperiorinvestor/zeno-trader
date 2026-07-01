// Server-side client for the Public.com trading API.
// READ-ONLY by design: this module exposes account, portfolio, history, and
// quote reads. It deliberately implements no order placement/cancel/replace.
// Requires PUBLIC_API_SECRET in env (Account Settings > Security > API).

const AUTH_URL = "https://api.public.com/userapiauthservice/personal/access-tokens";
const BASE = "https://api.public.com/userapigateway";

function secret() {
  const s = process.env.PUBLIC_API_SECRET;
  if (!s) throw new Error("PUBLIC_API_SECRET environment variable is not set");
  return s;
}

// ---------------- Token cache ----------------

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: secret(), validityInMinutes: 60 }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Public.com auth ${res.status}: ${text || res.statusText}`);
  }
  const data = (await res.json()) as { accessToken: string };
  if (!data.accessToken) throw new Error("Public.com auth: no accessToken in response");
  cached = { token: data.accessToken, expiresAt: Date.now() + 60 * 60_000 };
  return data.accessToken;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Public.com ${res.status} on ${path}: ${text || res.statusText}`);
  }
  return res.json();
}

// ---------------- Accounts ----------------

export interface PublicAccount {
  accountId: string;
  accountType?: string;
}

export async function getAccounts(): Promise<PublicAccount[]> {
  const data = await api<{ accounts: PublicAccount[] }>(`/trading/account`);
  return data.accounts ?? [];
}

let cachedAccountId: string | null = null;
export async function defaultAccountId(): Promise<string> {
  if (cachedAccountId) return cachedAccountId;
  const accounts = await getAccounts();
  if (!accounts.length) throw new Error("No Public.com accounts found for this API key");
  cachedAccountId = accounts[0].accountId;
  return cachedAccountId;
}

// ---------------- Portfolio ----------------

export interface PublicPosition {
  instrument: { symbol: string; type?: string; name?: string };
  quantity: string;          // decimal string
  costBasis?: {
    unitCost?: string;
    totalCost?: string;
    gainValue?: string;      // unrealized $ (Public pre-computes this)
    gainPercentage?: string; // unrealized % e.g. "-3.44"
  };
  lastPrice?: { lastPrice?: string; timestamp?: string };
  currentValue?: string;     // market value of the position
  openedAt?: string;
  [k: string]: unknown;
}

export interface PublicPortfolio {
  accountId: string;
  equity?: { value?: string; type?: string; percentageOfPortfolio?: string }[];
  buyingPower?: { buyingPower?: string };
  positions: PublicPosition[];
  [k: string]: unknown;
}

/** True total account value = sum of all equity buckets (cash + positions). */
export function portfolioValue(p: PublicPortfolio): number {
  return (p.equity ?? []).reduce((sum, e) => sum + (parseFloat(e.value ?? "0") || 0), 0);
}

export async function getPortfolio(accountId: string): Promise<PublicPortfolio> {
  return api<PublicPortfolio>(`/trading/${accountId}/portfolio/v2`);
}

// ---------------- History (fills) ----------------

export interface PublicHistoryItem {
  id?: string;
  symbol?: string | null;
  securityType?: string | null;   // "OPTION", "EQUITY", ...
  side?: "BUY" | "SELL" | null;
  type?: string;                   // "TRADE" | "MONEY_MOVEMENT" | ...
  subType?: string;
  quantity?: string | null;        // signed: negative for sells
  principalAmount?: string | null; // signed gross = price * qty * 100
  netAmount?: string | null;
  fees?: string | null;
  timestamp?: string;              // ISO
  [k: string]: unknown;
}

export async function getHistory(accountId: string): Promise<PublicHistoryItem[]> {
  // Paginate if nextToken present
  const out: PublicHistoryItem[] = [];
  let nextToken: string | undefined;
  let guard = 0;
  do {
    const qs = nextToken ? `?nextToken=${encodeURIComponent(nextToken)}` : "";
    const page = await api<{ transactions?: PublicHistoryItem[]; items?: PublicHistoryItem[]; nextToken?: string }>(
      `/trading/${accountId}/history${qs}`
    );
    out.push(...(page.transactions ?? page.items ?? []));
    nextToken = page.nextToken;
    guard++;
  } while (nextToken && guard < 20);
  return out;
}

// ---------------- Quotes ----------------

export interface PublicQuote {
  symbol: string;
  last?: string;
  bid?: string;
  ask?: string;
  [k: string]: unknown;
}

export async function getQuotes(accountId: string, symbols: string[]): Promise<PublicQuote[]> {
  if (!symbols.length) return [];
  const data = await api<{ quotes: PublicQuote[] }>(`/marketdata/${accountId}/quotes`, {
    method: "POST",
    body: JSON.stringify({
      instruments: symbols.map((s) => ({ symbol: s, type: s.length > 6 ? "OPTION" : "EQUITY" })),
    }),
  });
  return data.quotes ?? [];
}

// ---------------- Round-trip pairing ----------------

export interface RoundTrip {
  brokerRef: string;          // stable id derived from the fills involved
  brokerOrderIds: string[];
  contract: string;           // full option symbol e.g. HOOD260620C00005000
  underlying: string;         // HOOD
  side: "long" | "short";     // long = bought to open
  openDate: string;           // YYYY-MM-DD
  openTime: string;           // HH:MM
  closeDate: string;
  contracts: number;
  entryPrice: number;         // per-contract premium
  exitPrice: number;
  fees: number;
  pnl: number;                // (exit-entry)*100*qty - fees, sign-adjusted for side
}

/** Extract underlying ticker from an OCC option symbol (e.g. "HOOD  260620C00005000" → "HOOD"). */
export function underlyingOf(contract: string): string {
  const m = contract.match(/^([A-Z.]+)/);
  return m ? m[1].trim() : contract;
}

interface Fill {
  orderId: string;
  contract: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  fees: number;
  ts: string; // ISO
}

function toFills(history: PublicHistoryItem[]): Fill[] {
  const fills: Fill[] = [];
  for (const h of history) {
    // Only option trade fills.
    if ((h.type ?? "").toUpperCase() !== "TRADE") continue;
    if ((h.securityType ?? "").toUpperCase() !== "OPTION") continue;
    const sym = h.symbol;
    if (!sym || !h.side) continue;

    const qty = Math.abs(parseFloat(h.quantity ?? "0"));
    const principal = Math.abs(parseFloat(h.principalAmount ?? "0"));
    if (!qty || !principal) continue;
    // Public has no explicit price field; derive per-contract premium.
    const price = principal / (qty * 100);

    fills.push({
      orderId: h.id ?? `${sym}-${h.timestamp}`,
      contract: sym,
      side: h.side,
      qty,
      price,
      fees: Math.abs(parseFloat(h.fees ?? "0")) || 0,
      ts: h.timestamp ?? "",
    });
  }
  return fills.sort((a, b) => a.ts.localeCompare(b.ts));
}

/**
 * FIFO-match buys against sells per contract. A long round-trip is
 * BUY(open) → SELL(close); a short one is SELL(open) → BUY(close).
 * Partial closes produce one round-trip per matched lot batch.
 */
export function pairRoundTrips(history: PublicHistoryItem[]): RoundTrip[] {
  const fills = toFills(history);
  const byContract = new Map<string, Fill[]>();
  for (const f of fills) {
    const arr = byContract.get(f.contract) ?? [];
    arr.push(f);
    byContract.set(f.contract, arr);
  }

  const out: RoundTrip[] = [];

  for (const [contract, list] of byContract) {
    // Determine open direction from the first fill
    const open: { fill: Fill; remaining: number }[] = [];
    let openSide: "BUY" | "SELL" | null = null;

    for (const f of list) {
      if (openSide === null || f.side === openSide || open.length === 0) {
        // opening (or adding) — first fill sets direction
        if (openSide === null) openSide = f.side;
        if (f.side === openSide) {
          open.push({ fill: f, remaining: f.qty });
          continue;
        }
      }
      // closing fill: match FIFO against open lots
      let toClose = f.qty;
      while (toClose > 0 && open.length > 0) {
        const lot = open[0];
        const matched = Math.min(lot.remaining, toClose);
        const entry = lot.fill.price;
        const exit = f.price;
        const isLong = openSide === "BUY";
        const gross = (isLong ? exit - entry : entry - exit) * matched * 100;
        const feeShare =
          (lot.fill.fees * (matched / lot.fill.qty)) + (f.fees * (matched / f.qty));
        out.push({
          brokerRef: `${lot.fill.orderId}__${f.orderId}__${matched}`,
          brokerOrderIds: [lot.fill.orderId, f.orderId],
          contract,
          underlying: underlyingOf(contract),
          side: isLong ? "long" : "short",
          openDate: lot.fill.ts.slice(0, 10),
          openTime: lot.fill.ts.slice(11, 16),
          closeDate: f.ts.slice(0, 10),
          contracts: matched,
          entryPrice: entry,
          exitPrice: exit,
          fees: Math.round(feeShare * 100) / 100,
          pnl: Math.round((gross - feeShare) * 100) / 100,
        });
        lot.remaining -= matched;
        toClose -= matched;
        if (lot.remaining <= 0) open.shift();
      }
      // If closes exceed opens (e.g. history window cut off), ignore the excess.
      if (open.length === 0) openSide = null;
    }
  }

  return out.sort((a, b) => b.closeDate.localeCompare(a.closeDate));
}
