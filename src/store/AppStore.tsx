import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import type {
  Account, AppData, Budget, Card, CardPayment, Category, Goal,
  GoalContrib, Recurring, Transaction,
} from "../lib/types";
import { loadAll, metaGet, metaSet, persist, wipeAll, type StoreName } from "../lib/db";
import { materializeRecurring } from "../lib/finance";
import { currentMonth, shiftMonth, todayISO } from "../lib/format";
import { recolor, seedCategories } from "../lib/seed";

const EMPTY: AppData = {
  accounts: [], categories: [], cards: [], txs: [], payments: [],
  budgets: [], goals: [], contribs: [], recurring: [],
};

export type Theme = "light" | "dark";

// boot idempotente compartilhado (seguro contra remontagens/StrictMode)
interface BootResult { d: AppData; demo: boolean; theme: Theme }
let bootPromise: Promise<BootResult> | null = null;

function boot(): Promise<BootResult> {
  if (!bootPromise) {
    bootPromise = (async () => {
      let d = await loadAll();
      const seeded = await metaGet<boolean>("seeded");
      const hadDemo = (await metaGet<boolean>("demo")) === true;
      if (!seeded || hadDemo) {
        // estado inicial limpo: zero dados financeiros, só nomes de categorias
        const savedTheme = await metaGet<Theme>("theme");
        await wipeAll();
        d = { ...EMPTY, categories: seedCategories() };
        await persist("categories", d.categories);
        await metaSet("seeded", true);
        await metaSet("demo", false);
        await metaSet("vt-colors", true);
        if (savedTheme) await metaSet("theme", savedTheme);
      }
      if (d.categories.length === 0) {
        d = { ...d, categories: seedCategories() };
        await persist("categories", d.categories);
      }
      // migração única para a paleta VT Flow
      if (!(await metaGet<boolean>("vt-colors"))) {
        d = {
          ...d,
          categories: recolor(d.categories), accounts: recolor(d.accounts),
          cards: recolor(d.cards), goals: recolor(d.goals),
        };
        for (const k of ["categories", "accounts", "cards", "goals"] as const) await persist(k, d[k] as { id: string }[]);
        await metaSet("vt-colors", true);
      }
      const demo = (await metaGet<boolean>("demo")) ?? false;
      const horizon = shiftMonth(currentMonth(), 12);
      const generated = materializeRecurring(d.recurring, d.txs, horizon);
      let txs = d.txs;
      if (generated.length) {
        txs = [...txs, ...generated];
        await persist("txs", txs);
      }
      const savedTheme = await metaGet<Theme>("theme");
      const theme: Theme = savedTheme ?? "dark";
      return { d: { ...d, txs }, demo, theme };
    })();
  }
  return bootPromise;
}

export interface StoreCtx {
  data: AppData;
  loaded: boolean;
  month: string;
  setMonth: (m: string) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  demoMode: boolean;
  // contas
  saveAccount: (a: Account) => void;
  deleteAccount: (id: string) => void;
  // categorias
  saveCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  // cartões
  saveCard: (c: Card) => void;
  deleteCard: (id: string) => void;
  // transações
  addTransactions: (list: Transaction[]) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (t: Transaction, wholeGroup: boolean) => void;
  // faturas
  payCard: (p: CardPayment) => void;
  deletePayment: (id: string) => void;
  // orçamentos
  saveBudget: (b: Budget) => void;
  deleteBudget: (id: string) => void;
  // metas
  saveGoal: (g: Goal) => void;
  deleteGoal: (id: string) => void;
  addContrib: (c: GoalContrib) => void;
  // recorrentes
  saveRecurring: (r: Recurring) => void;
  deleteRecurring: (id: string) => void;
  // backup
  importData: (d: AppData) => void;
  wipe: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export const useStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore fora do provider");
  return ctx;
};

const upsert = <T extends { id: string }>(arr: T[], item: T) => {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i < 0) return [...arr, item];
  const copy = [...arr];
  copy[i] = item;
  return copy;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [theme, setThemeState] = useState<Theme>("dark");
  const [demoMode, setDemoMode] = useState(false);

  // carrega tudo do IndexedDB + seeds + materialização de recorrentes
  useEffect(() => {
    let cancelled = false;
    boot()
      .then(({ d, demo, theme }) => {
        if (cancelled) return;
        setData(d);
        setDemoMode(demo);
        setThemeState(theme);
        setLoaded(true);
      })
      .catch((e) => {
        console.error("Falha ao carregar dados", e);
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    metaSet("theme", t).catch(console.error);
  }, []);

  const apply = useCallback(<K extends StoreName & keyof AppData>(key: K, items: AppData[K]) => {
    setData((prev) => ({ ...prev, [key]: items }));
    persist(key, items as { id: string }[]).catch((e) => console.error("persist", key, e));
  }, []);

  // ---- contas
  const saveAccount = useCallback((a: Account) => apply("accounts", upsert(data.accounts, a)), [data.accounts, apply]);
  const deleteAccount = useCallback((id: string) => apply("accounts", data.accounts.filter((a) => a.id !== id)), [data.accounts, apply]);

  // ---- categorias
  const saveCategory = useCallback((c: Category) => apply("categories", upsert(data.categories, c)), [data.categories, apply]);
  const deleteCategory = useCallback((id: string) => {
    apply("categories", data.categories.filter((c) => c.id !== id && c.parentId !== id));
    apply("budgets", data.budgets.filter((b) => b.categoryId !== id));
  }, [data.categories, data.budgets, apply]);

  // ---- cartões
  const saveCard = useCallback((c: Card) => apply("cards", upsert(data.cards, c)), [data.cards, apply]);
  const deleteCard = useCallback((id: string) => apply("cards", data.cards.filter((c) => c.id !== id)), [data.cards, apply]);

  // ---- transações
  const addTransactions = useCallback((list: Transaction[]) => {
    if (!list.length) return;
    apply("txs", [...data.txs, ...list]);
  }, [data.txs, apply]);

  const updateTransaction = useCallback((t: Transaction) => apply("txs", upsert(data.txs, t)), [data.txs, apply]);

  const deleteTransaction = useCallback((t: Transaction, wholeGroup: boolean) => {
    if (wholeGroup && t.installment) {
      apply("txs", data.txs.filter((x) => x.installment?.group !== t.installment!.group));
    } else {
      apply("txs", data.txs.filter((x) => x.id !== t.id));
    }
  }, [data.txs, apply]);

  // ---- faturas
  const payCard = useCallback((p: CardPayment) => {
    apply("payments", upsert(data.payments, p));
  }, [data.payments, apply]);
  const deletePayment = useCallback((id: string) => apply("payments", data.payments.filter((p) => p.id !== id)), [data.payments, apply]);

  // ---- orçamentos
  const saveBudget = useCallback((b: Budget) => apply("budgets", upsert(data.budgets, b)), [data.budgets, apply]);
  const deleteBudget = useCallback((id: string) => apply("budgets", data.budgets.filter((b) => b.id !== id)), [data.budgets, apply]);

  // ---- metas
  const saveGoal = useCallback((g: Goal) => apply("goals", upsert(data.goals, g)), [data.goals, apply]);
  const deleteGoal = useCallback((id: string) => {
    apply("goals", data.goals.filter((g) => g.id !== id));
    apply("contribs", data.contribs.filter((c) => c.goalId !== id));
  }, [data.goals, data.contribs, apply]);
  const addContrib = useCallback((c: GoalContrib) => apply("contribs", [...data.contribs, c]), [data.contribs, apply]);

  // ---- recorrentes
  const saveRecurring = useCallback((r: Recurring) => {
    const rules = upsert(data.recurring, r);
    apply("recurring", rules);
    const horizon = shiftMonth(currentMonth(), 12);
    const generated = materializeRecurring(rules, data.txs, horizon);
    if (generated.length) apply("txs", [...data.txs, ...generated]);
  }, [data.recurring, data.txs, apply]);
  const deleteRecurring = useCallback((id: string) => {
    apply("recurring", data.recurring.filter((r) => r.id !== id));
    apply("txs", data.txs.filter((t) => !t.recurKey?.startsWith(`${id}:`) || t.date <= todayISO()));
  }, [data.recurring, data.txs, apply]);

  // ---- backup
  const importData = useCallback(async (d: AppData) => {
    setData(d);
    await wipeAll();
    await metaSet("seeded", true);
    await metaSet("demo", false);
    setDemoMode(false);
    for (const key of Object.keys(d) as (keyof AppData)[]) {
      await persist(key as StoreName, d[key] as { id: string }[]);
    }
  }, []);

  const wipe = useCallback(async () => {
    await wipeAll();
    await metaSet("seeded", true);
    setDemoMode(false);
    setData({ ...EMPTY, categories: seedCategories() });
    await persist("categories", seedCategories());
  }, []);

  const value = useMemo<StoreCtx>(() => ({
    data, loaded, month, setMonth, theme, setTheme, demoMode,
    saveAccount, deleteAccount, saveCategory, deleteCategory, saveCard, deleteCard,
    addTransactions, updateTransaction, deleteTransaction, payCard, deletePayment,
    saveBudget, deleteBudget, saveGoal, deleteGoal, addContrib,
    saveRecurring, deleteRecurring, importData, wipe,
  }), [
    data, loaded, month, theme, demoMode, saveAccount, deleteAccount, saveCategory,
    deleteCategory, saveCard, deleteCard, addTransactions, updateTransaction,
    deleteTransaction, payCard, deletePayment, saveBudget, deleteBudget, saveGoal,
    deleteGoal, addContrib, saveRecurring, deleteRecurring, importData, wipe,
    setTheme,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
