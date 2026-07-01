// Common formatting/utility helpers.

export function fmtUSD(n: number, opts: { signed?: boolean; cents?: boolean } = {}) {
  const cents = opts.cents ?? true;
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  const s = formatter.format(Math.abs(n));
  if (n < 0) return "-" + s;
  if (opts.signed && n > 0) return "+" + s;
  return s;
}

export function fmtPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtPctSigned(n: number, digits = 1) {
  return `${n > 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;
}

/**
 * Return on the option premium for a closed trade, as a fraction.
 * Long: (exit - entry) / entry. Short: (entry - exit) / entry.
 * Returns null when entry price is missing (can't compute a %).
 */
export function returnPct(side: "long" | "short", entry: number, exit: number): number | null {
  if (!entry) return null;
  return side === "long" ? (exit - entry) / entry : (entry - exit) / entry;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** ISO date (YYYY-MM-DD) of the Monday on or before the given date. */
export function weekStartISO(d: Date = new Date()): string {
  const out = new Date(d);
  const day = out.getDay();              // 0=Sun, 1=Mon
  const diff = (day + 6) % 7;            // shift so Mon=0
  out.setDate(out.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out.toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function colorForPnL(n: number): string {
  if (n > 0) return "var(--color-positive)";
  if (n < 0) return "var(--color-negative)";
  return "var(--color-text-muted)";
}

export function colorClassForPnL(n: number): string {
  if (n > 0) return "text-[var(--color-positive)]";
  if (n < 0) return "text-[var(--color-negative)]";
  return "text-[var(--color-text-muted)]";
}
