// Client-side helper: fetch open positions for Claude context.
// Silently returns [] when the broker key isn't configured or the call fails —
// AI features must keep working without Public.com connected.

export interface LivePositionContext {
  description: string;
  quantity: number;
  unrealizedPnl: number;
  unrealizedPct: number;
  openedAt?: string;
  expirationDate?: string;
}

export async function fetchOpenPositions(): Promise<LivePositionContext[]> {
  try {
    const res = await fetch("/api/public/positions");
    if (!res.ok) return [];
    const data = await res.json();
    interface RawPosition {
      description: string;
      quantity: number;
      unrealizedPnl: number;
      unrealizedPct: number;
      openedAt?: string;
      expirationDate?: string;
    }
    return ((data.positions ?? []) as RawPosition[]).map((p) => ({
      description: p.description,
      quantity: p.quantity,
      unrealizedPnl: p.unrealizedPnl,
      unrealizedPct: p.unrealizedPct,
      openedAt: p.openedAt,
      expirationDate: p.expirationDate,
    }));
  } catch {
    return [];
  }
}
