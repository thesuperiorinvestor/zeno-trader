// Tag taxonomy for Zeno Trader
// All tags are referenced by id throughout the app.
// Categories help group tags in the picker UI.

export type TagCategory =
  | "RevStrat"
  | "Supply-Demand"
  | "Key Level"
  | "Other Setup"
  | "Mistake"
  | "Custom";

export interface TagDef {
  id: string;
  label: string;
  category: TagCategory;
  description?: string;
}

export const SETUP_TAGS: TagDef[] = [
  // RevStrat — bar types
  { id: "rev-1",        label: "1 — Inside Bar",            category: "RevStrat", description: "Bar contained within prior bar's range" },
  { id: "rev-2u",       label: "2U — Outside Bar Up",       category: "RevStrat", description: "Breaks prior high but not prior low" },
  { id: "rev-2d",       label: "2D — Outside Bar Down",     category: "RevStrat", description: "Breaks prior low but not prior high" },
  { id: "rev-3u",       label: "3 — Directional Up",         category: "RevStrat", description: "Outside bar breaking both sides" },
  { id: "rev-3d",       label: "3 — Directional Down",       category: "RevStrat", description: "Outside bar breaking both sides" },
  // RevStrat — combos
  { id: "rev-212",      label: "212 Reversal",              category: "RevStrat" },
  { id: "rev-221",      label: "221 Reversal",              category: "RevStrat" },
  { id: "rev-232",      label: "232 Broadening",            category: "RevStrat" },
  { id: "rev-122",      label: "122 Continuation",          category: "RevStrat" },
  { id: "rev-22-cont",  label: "2-2 Continuation",          category: "RevStrat" },
  { id: "rev-12-bo",    label: "1-2 Breakout",              category: "RevStrat" },
  { id: "rev-tfc",      label: "Full TFC (Time Frame Continuity)", category: "RevStrat" },
  { id: "rev-asb",      label: "Actionable Signal Bar",     category: "RevStrat" },
  { id: "rev-failed-2u", label: "Failed 2U",                category: "RevStrat", description: "2U bar that fails to follow through — bearish reversal signal" },
  { id: "rev-failed-2d", label: "Failed 2D",                category: "RevStrat", description: "2D bar that fails to follow through — bullish reversal signal" },

  // Supply / Demand
  { id: "sd-supply",    label: "Supply Zone",               category: "Supply-Demand" },
  { id: "sd-demand",    label: "Demand Zone",               category: "Supply-Demand" },
  { id: "sd-flip",      label: "S/D Zone Flip",             category: "Supply-Demand" },
  { id: "sd-fresh",     label: "Fresh Zone (untested)",     category: "Supply-Demand" },

  // Key Level
  { id: "kl-reclaim",   label: "Key Level Reclaim",         category: "Key Level" },
  { id: "kl-reject",    label: "Key Level Rejection",       category: "Key Level" },
  { id: "kl-retest",    label: "Key Level Retest",          category: "Key Level" },

  // Other Setups
  { id: "gap-fill",     label: "Gap Fill",                   category: "Other Setup" },
  { id: "orb",          label: "Opening Range Breakout",     category: "Other Setup" },
  { id: "vwap-reclaim", label: "VWAP Reclaim",               category: "Other Setup" },
  { id: "vwap-reject",  label: "VWAP Rejection",             category: "Other Setup" },
  { id: "ote",          label: "OTE (Optimal Trade Entry)",  category: "Other Setup", description: "ICT — 62–79% Fib retracement zone" },
  { id: "tmg",          label: "TMG",                         category: "Other Setup" },
];

export const MISTAKE_TAGS: TagDef[] = [
  { id: "m-early-entry",  label: "Entered Early",       category: "Mistake" },
  { id: "m-late-entry",   label: "Chased Entry",        category: "Mistake" },
  { id: "m-oversized",    label: "Oversized",           category: "Mistake" },
  { id: "m-no-stop",      label: "No Stop Set",         category: "Mistake" },
  { id: "m-moved-stop",   label: "Moved Stop",          category: "Mistake" },
  { id: "m-early-exit",   label: "Exited Too Early",    category: "Mistake" },
  { id: "m-late-exit",    label: "Held Too Long",       category: "Mistake" },
  { id: "m-broke-rules",  label: "Broke Rules",         category: "Mistake" },
  { id: "m-no-setup",     label: "No Valid Setup",      category: "Mistake" },
  { id: "m-revenge",      label: "Revenge Trade",       category: "Mistake" },
];

export const ALL_BUILTIN_TAGS = [...SETUP_TAGS, ...MISTAKE_TAGS];

export const EMOTION_LABELS: Record<string, string> = {
  confident: "Confident / In the Zone",
  fomo: "FOMO / Chasing",
  hesitant: "Hesitant / Doubt",
  revenge: "Revenge / Frustration",
};

export const EMOTION_OPTIONS = ["confident", "fomo", "hesitant", "revenge"] as const;

export function tagLabel(id: string): string {
  return ALL_BUILTIN_TAGS.find((t) => t.id === id)?.label ?? id;
}

export function tagsByCategory(category: TagCategory) {
  return ALL_BUILTIN_TAGS.filter((t) => t.category === category);
}

export const SETUP_CATEGORIES: TagCategory[] = ["RevStrat", "Supply-Demand", "Key Level", "Other Setup"];
