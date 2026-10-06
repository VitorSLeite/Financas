import { openDB, type IDBPDatabase } from "idb";
import type { AppData } from "./types";

const DB_NAME = "grana-finance";
const DB_VERSION = 1;

export const STORES = [
  "accounts", "categories", "cards", "txs", "payments",
  "budgets", "goals", "contribs", "recurring",
] as const;
export type StoreName = (typeof STORES)[number];

let dbp: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbp) {
    dbp = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        for (const s of STORES) d.createObjectStore(s, { keyPath: "id" });
        d.createObjectStore("meta");
      },
    });
  }
  return dbp;
}

export async function loadAll(): Promise<AppData> {
  const d = await db();
  const [accounts, categories, cards, txs, payments, budgets, goals, contribs, recurring] =
    await Promise.all(STORES.map((s) => d.getAll(s)));
  return {
    accounts, categories, cards, txs, payments, budgets, goals, contribs, recurring,
  } as AppData;
}

/** Substitui todo o conteúdo de uma store (volumes pequenos — simples e confiável) */
export async function persist<T extends { id: string }>(store: StoreName, items: T[]) {
  const d = await db();
  const t = d.transaction(store, "readwrite");
  await t.store.clear();
  for (const it of items) await t.store.put(it);
  await t.done;
}

export async function metaGet<T>(key: string): Promise<T | undefined> {
  const d = await db();
  return (await d.get("meta", key)) as T | undefined;
}
export async function metaSet(key: string, value: unknown) {
  const d = await db();
  await d.put("meta", value, key);
}

export async function wipeAll() {
  const d = await db();
  for (const s of STORES) await d.clear(s);
  await d.clear("meta");
}
