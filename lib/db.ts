// IndexedDB layer for Zeno Trader
// All data lives in the browser. No backend.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  Trade,
  DailyJournal,
  Opportunity,
  KeyLevel,
  SetupCard,
  AccountabilityDay,
  Goal,
  Screenshot,
  WeeklyReview,
  ImportedTrade,
  EquitySnapshot,
} from "./types";

interface ZenoDB extends DBSchema {
  trades:         { key: string; value: Trade;            indexes: { date: string } };
  journals:       { key: string; value: DailyJournal;     indexes: { date: string } };
  opportunities:  { key: string; value: Opportunity;      indexes: { date: string } };
  keyLevels:      { key: string; value: KeyLevel;         indexes: { symbol: string } };
  setupCards:     { key: string; value: SetupCard };
  accountability: { key: string; value: AccountabilityDay; indexes: { date: string } };
  goals:          { key: string; value: Goal };
  screenshots:    { key: string; value: Screenshot };
  weeklyReviews:  { key: string; value: WeeklyReview;     indexes: { weekStart: string } };
  importQueue:    { key: string; value: ImportedTrade;    indexes: { status: string } };
  equitySnapshots:{ key: string; value: EquitySnapshot;   indexes: { date: string } };
}

const DB_NAME = "zeno-trader";
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<ZenoDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<ZenoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("trades")) {
          const s = db.createObjectStore("trades", { keyPath: "id" });
          s.createIndex("date", "date");
        }
        if (!db.objectStoreNames.contains("journals")) {
          const s = db.createObjectStore("journals", { keyPath: "id" });
          s.createIndex("date", "date");
        }
        if (!db.objectStoreNames.contains("opportunities")) {
          const s = db.createObjectStore("opportunities", { keyPath: "id" });
          s.createIndex("date", "date");
        }
        if (!db.objectStoreNames.contains("keyLevels")) {
          const s = db.createObjectStore("keyLevels", { keyPath: "id" });
          s.createIndex("symbol", "symbol");
        }
        if (!db.objectStoreNames.contains("setupCards")) {
          db.createObjectStore("setupCards", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("accountability")) {
          const s = db.createObjectStore("accountability", { keyPath: "id" });
          s.createIndex("date", "date");
        }
        if (!db.objectStoreNames.contains("goals")) {
          db.createObjectStore("goals", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("screenshots")) {
          db.createObjectStore("screenshots", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("weeklyReviews")) {
          const s = db.createObjectStore("weeklyReviews", { keyPath: "id" });
          s.createIndex("weekStart", "weekStart");
        }
        if (!db.objectStoreNames.contains("importQueue")) {
          const s = db.createObjectStore("importQueue", { keyPath: "id" });
          s.createIndex("status", "status");
        }
        if (!db.objectStoreNames.contains("equitySnapshots")) {
          const s = db.createObjectStore("equitySnapshots", { keyPath: "id" });
          s.createIndex("date", "date");
        }
      },
    });
  }
  return dbPromise;
}

// Generic CRUD helpers ----------------------------------------------------
// Note: idb's generic store name typing is invariant, so we cast through `any`
// at the boundary and re-narrow with the static helpers below.

type StoreName = keyof ZenoDB;

export async function put<S extends StoreName>(store: S, value: ZenoDB[S]["value"]) {
  const db = await getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).put(store, value);
  return value;
}

export async function get<S extends StoreName>(store: S, id: string): Promise<ZenoDB[S]["value"] | undefined> {
  const db = await getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).get(store, id);
}

export async function remove<S extends StoreName>(store: S, id: string) {
  const db = await getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(store, id);
}

export async function all<S extends StoreName>(store: S): Promise<ZenoDB[S]["value"][]> {
  const db = await getDB();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db as any).getAll(store);
}

// Specialized helpers -----------------------------------------------------

export async function allTrades(): Promise<Trade[]> {
  return all("trades");
}

export async function allJournals(): Promise<DailyJournal[]> {
  return all("journals");
}

export async function allOpportunities(): Promise<Opportunity[]> {
  return all("opportunities");
}

export async function allKeyLevels(): Promise<KeyLevel[]> {
  return all("keyLevels");
}

export async function allSetupCards(): Promise<SetupCard[]> {
  return all("setupCards");
}

export async function allAccountability(): Promise<AccountabilityDay[]> {
  return all("accountability");
}

export async function allGoals(): Promise<Goal[]> {
  return all("goals");
}

export async function allWeeklyReviews(): Promise<WeeklyReview[]> {
  return all("weeklyReviews");
}

export async function allImportQueue(): Promise<ImportedTrade[]> {
  return all("importQueue");
}

export async function allEquitySnapshots(): Promise<EquitySnapshot[]> {
  return all("equitySnapshots");
}

// Screenshots are stored as Blobs ----------------------------------------

export async function saveScreenshot(blob: Blob, filename = "screenshot.png"): Promise<string> {
  const id = crypto.randomUUID();
  await put("screenshots", { id, blob, filename, createdAt: new Date().toISOString() });
  return id;
}

export async function getScreenshot(id: string): Promise<Screenshot | undefined> {
  return get("screenshots", id) as Promise<Screenshot | undefined>;
}

export async function getScreenshotURL(id: string): Promise<string | null> {
  const s = await getScreenshot(id);
  if (!s) return null;
  return URL.createObjectURL(s.blob);
}

// Backup / restore --------------------------------------------------------

export async function exportAll() {
  const db = await getDB();
  const [trades, journals, opportunities, keyLevels, setupCards, accountability, goals] = await Promise.all([
    db.getAll("trades"),
    db.getAll("journals"),
    db.getAll("opportunities"),
    db.getAll("keyLevels"),
    db.getAll("setupCards"),
    db.getAll("accountability"),
    db.getAll("goals"),
  ]);
  // Note: screenshots (blobs) are not included in the JSON export.
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    trades, journals, opportunities, keyLevels, setupCards, accountability, goals,
  };
}

export async function importAll(payload: Awaited<ReturnType<typeof exportAll>>) {
  const db = await getDB();
  const tx = db.transaction(
    ["trades", "journals", "opportunities", "keyLevels", "setupCards", "accountability", "goals"],
    "readwrite"
  );
  for (const t of payload.trades)         await tx.objectStore("trades").put(t);
  for (const j of payload.journals)       await tx.objectStore("journals").put(j);
  for (const o of payload.opportunities)  await tx.objectStore("opportunities").put(o);
  for (const k of payload.keyLevels)      await tx.objectStore("keyLevels").put(k);
  for (const s of payload.setupCards)     await tx.objectStore("setupCards").put(s);
  for (const a of payload.accountability) await tx.objectStore("accountability").put(a);
  for (const g of payload.goals)          await tx.objectStore("goals").put(g);
  await tx.done;
}
