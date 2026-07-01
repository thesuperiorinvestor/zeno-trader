// Core data models for Zeno Trader

export type Instrument = "options" | "futures";
export type Side = "long" | "short";
export type ExecGrade = 1 | 2 | 3 | 4 | 5;
export type Emotion = "confident" | "fomo" | "hesitant" | "revenge";
export type DayGrade = "A" | "B" | "C" | "D" | "F";

export interface Trade {
  id: string;
  date: string;            // YYYY-MM-DD
  time?: string;           // HH:MM (entry time, optional)
  symbol: string;
  instrument: Instrument;
  side: Side;
  entryPrice: number;
  exitPrice: number;
  size: number;
  pnl: number;             // net after fees
  fees: number;
  // methodology
  setupTags: string[];
  keyLevelId?: string;
  keyLevelNote: string;
  // psychology
  emotionEntry: Emotion[];
  emotionExit: Emotion[];
  executionGrade: ExecGrade;
  thoughtProcess: string;
  postTradeReview: string;   // post-trade: what could I have done better?
  mistakeTags: string[];
  customTags: string[];
  // review
  claudeInsight?: string;
  screenshotIds: string[];
  brokerRef?: string;        // set when imported from Public.com (dedupe key)
  createdAt: string;
  updatedAt: string;
}

export interface DailyJournal {
  id: string;              // YYYY-MM-DD
  date: string;
  preMarket: {
    bias: "bullish" | "bearish" | "neutral";
    keyLevels: string[];
    watchlist: string[];
    plan: string;
  };
  postSession: {
    dayGrade: DayGrade;
    emotionSummary: string;
    lessons: string;
    notes: string;
  };
}

export interface Opportunity {
  id: string;
  date: string;
  symbol: string;
  setupTag: string;
  timeframes: string[];
  description: string;
  screenshotIds: string[];
  didTake: boolean;
  tradeId?: string;
  wouldHaveOutcome?: "win" | "loss" | "unknown";
  notes: string;
  claudeReview?: string;
  claudeReviewAt?: string;
  createdAt: string;
}

export type LevelType = "resistance" | "support" | "supply-zone" | "demand-zone";

export interface KeyLevel {
  id: string;
  symbol: string;
  levelType: LevelType;
  price: number;
  priceHigh?: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

export type SetupCategory = "RevStrat" | "Supply-Demand" | "Key Level" | "Custom";

export interface SetupCard {
  id: string;
  name: string;
  category: SetupCategory;
  description: string;
  entryRules: string[];
  exitRules: string[];
  invalidationRules: string[];
  timeframes: string[];
  setupTagIds: string[];   // which trade tags map to this setup card
  notes: string;
  createdAt: string;
}

export interface AccountabilityDay {
  id: string;              // YYYY-MM-DD
  date: string;
  rulesFollowed: boolean;
  ruleNotes: string;
  habits: { label: string; done: boolean }[];
}

export type GoalType = "pnl" | "winRate" | "consistency" | "custom";

export interface Goal {
  id: string;
  label: string;
  type: GoalType;
  targetValue: number;
  period: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface Screenshot {
  id: string;
  blob: Blob;
  filename: string;
  createdAt: string;
}

// A broker round-trip awaiting review before becoming a Trade.
export interface ImportedTrade {
  id: string;                // = brokerRef
  brokerRef: string;
  brokerOrderIds: string[];
  contract: string;          // OCC option symbol
  underlying: string;
  side: Side;
  openDate: string;
  openTime: string;
  closeDate: string;
  contracts: number;
  entryPrice: number;
  exitPrice: number;
  fees: number;
  pnl: number;
  status: "pending" | "confirmed" | "dismissed";
  importedAt: string;
}

export interface EquitySnapshot {
  id: string;                // = date YYYY-MM-DD
  date: string;
  accountValue: number;
  source: "public";
}

export interface WeeklyReview {
  id: string;            // "week-YYYY-MM-DD" (Monday)
  weekStart: string;     // YYYY-MM-DD (Monday)
  weekEnd: string;       // YYYY-MM-DD (Sunday)
  tradeCount: number;
  netPnl: number;
  content: string;       // Claude-generated markdown
  generatedAt: string;
  model: string;
}
