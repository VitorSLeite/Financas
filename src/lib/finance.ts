import type {
  Account, AppData, Budget, Card, CardPayment, Category, Goal,
  GoalContrib, Recurring, Transaction,
} from "./types";
import {
  addDaysISO, currentMonth, daysInMonth, diffDays, fmtDate, fmtBRL, monthKey,
  pad2, shiftMonth, todayISO, uid, clamp,
} from "./format";

// ---------------------------------------------------------------------------
// lookups
// ---------------------------------------------------------------------------
export const byId = <T extends { id: string }>(arr: T[]) => {
  const m = new Map<string, T>();
  for (const x of arr) m.set(x.id, x);
  return m;
};

export function rootCategory(cat: Category | undefined, cats: Category[]): Category | undefined {
  if (!cat) return undefined;
  let cur = cat;
  let guard = 0;
  while (cur.parentId && guard++ < 10) {
    const p = cats.find((c) => c.id === cur.parentId);
    if (!p) break;
    cur = p;
  }
  return cur;
}

export function categoryAndChildren(rootId: string, cats: Category[]): Set<string> {
  const s = new Set<string>([rootId]);
  for (const c of cats) if (c.parentId === rootId) s.add(c.id);
  return s;
}

// ---------------------------------------------------------------------------
// fatura do cartão
// ---------------------------------------------------------------------------
/** Compras a partir do dia de fechamento caem na fatura do mês seguinte. */
export function statementMonthFor(dateISO: string, closingDay: number): string {
  const day = Number(dateISO.slice(8, 10));
  const m = monthKey(dateISO);
  return day >= closingDay ? shiftMonth(m, 1) : m;
}

export function closingDateFor(month: string, card: Card): string {
  return `${month}-${pad2(Math.min(card.closingDay, daysInMonth(month)))}`;
}

export function dueDateFor(month: string, card: Card): string {
  const m = card.dueDay <= card.closingDay ? shiftMonth(month, 1) : month;
  return `${m}-${pad2(Math.min(card.dueDay, daysInMonth(m)))}`;
}

export type StatementStatus = "vazia" | "aberta" | "fechada" | "vencida" | "paga";

export interface Statement {
  month: string;
  total: number;
  paidAmount: number;
  remaining: number;
  status: StatementStatus;
  items: Transaction[];
  closingDate: string;
  dueDate: string;
}

export function buildStatement(
  card: Card, month: string, txs: Transaction[], payments: CardPayment[],
): Statement {
  const items = txs
    .filter((t) => t.cardId === card.id && t.type === "expense" && statementMonthFor(t.date, card.closingDay) === month)
    .sort((a, b) => a.date.localeCompare(b.date));
  const total = items.reduce((s, t) => s + t.amount, 0);
  const paidAmount = payments
    .filter((p) => p.cardId === card.id && p.month === month)
    .reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - paidAmount);
  const today = todayISO();
  const closingDate = closingDateFor(month, card);
  const dueDate = dueDateFor(month, card);
  let status: StatementStatus;
  if (total <= 0.004) status = "vazia";
  else if (paidAmount >= total - 0.004) status = "paga";
  else if (dueDate < today) status = "vencida";
  else if (closingDate < today) status = "fechada";
  else status = "aberta";
  return { month, total, paidAmount, remaining, status, items, closingDate, dueDate };
}

/** Quanto do limite está comprometido (todas as compras - pagamentos, inclui parcelas futuras). */
export function cardOutstanding(card: Card, txs: Transaction[], payments: CardPayment[], upTo?: string): number {
  const spent = txs
    .filter((t) => t.cardId === card.id && (!upTo || t.date <= upTo))
    .reduce((s, t) => s + t.amount, 0);
  const paid = payments
    .filter((p) => p.cardId === card.id && (!upTo || p.date <= upTo))
    .reduce((s, p) => s + p.amount, 0);
  return Math.max(0, spent - paid);
}

// ---------------------------------------------------------------------------
// saldos
// ---------------------------------------------------------------------------
export function accountBalanceAt(
  acc: Account, txs: Transaction[], payments: CardPayment[], upTo?: string,
): number {
  let bal = acc.initialBalance;
  for (const t of txs) {
    if (upTo && t.date > upTo) continue;
    if (t.type === "income" && t.accountId === acc.id) bal += t.amount;
    else if (t.type === "expense" && t.accountId === acc.id && t.method !== "credit" && !t.cardId) bal -= t.amount;
    else if (t.type === "transfer") {
      if (t.accountId === acc.id) bal -= t.amount;
      if (t.toAccountId === acc.id) bal += t.amount;
    }
  }
  for (const p of payments) {
    if (p.accountId === acc.id && (!upTo || p.date <= upTo)) bal -= p.amount;
  }
  return bal;
}

export const isLiquid = (a: Account) => a.kind !== "investment" && !a.archived;

export function liquidBalanceAt(accounts: Account[], txs: Transaction[], payments: CardPayment[], upTo?: string) {
  return accounts.filter(isLiquid).reduce((s, a) => s + accountBalanceAt(a, txs, payments, upTo), 0);
}

export function investedBalance(accounts: Account[], txs: Transaction[], payments: CardPayment[]) {
  return accounts.filter((a) => a.kind === "investment" && !a.archived)
    .reduce((s, a) => s + accountBalanceAt(a, txs, payments), 0);
}

// ---------------------------------------------------------------------------
// totais do mês
// ---------------------------------------------------------------------------
export interface MonthTotals {
  income: number;
  expense: number; // todas as despesas (inclui crédito) — "para onde foi o dinheiro"
  cashExpense: number; // despesas que saíram da conta
  creditExpense: number;
  result: number;
}

export function monthTotals(txs: Transaction[], month: string): MonthTotals {
  let income = 0, expense = 0, cashExpense = 0, creditExpense = 0;
  for (const t of txs) {
    if (monthKey(t.date) !== month) continue;
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") {
      expense += t.amount;
      if (t.method === "credit" || t.cardId) creditExpense += t.amount;
      else cashExpense += t.amount;
    }
  }
  return { income, expense, cashExpense, creditExpense, result: income - expense };
}

/** despesas do mês por categoria raiz */
export function spendingByRootCategory(txs: Transaction[], cats: Category[], month: string) {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || monthKey(t.date) !== month) continue;
    const cat = cats.find((c) => c.id === t.categoryId);
    const root = rootCategory(cat, cats);
    const key = root?.id ?? "sem";
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }
  return map;
}

// ---------------------------------------------------------------------------
// orçamentos
// ---------------------------------------------------------------------------
export interface BudgetUsage {
  budget: Budget;
  used: number;
  pct: number;
  category?: Category;
}

export function budgetUsage(budgets: Budget[], cats: Category[], txs: Transaction[], month: string): BudgetUsage[] {
  return budgets.map((b) => {
    const ids = categoryAndChildren(b.categoryId, cats);
    let used = 0;
    for (const t of txs) {
      if (t.type === "expense" && monthKey(t.date) === month && t.categoryId && ids.has(t.categoryId))
        used += t.amount;
    }
    return {
      budget: b,
      used,
      pct: b.amount > 0 ? (used / b.amount) * 100 : 0,
      category: cats.find((c) => c.id === b.categoryId),
    };
  });
}

// ---------------------------------------------------------------------------
// recorrências — materializa lançamentos reais até o horizonte
// ---------------------------------------------------------------------------
export function materializeRecurring(
  rules: Recurring[], txs: Transaction[], horizon: string,
): Transaction[] {
  const keys = new Set(txs.filter((t) => t.recurKey).map((t) => t.recurKey!));
  const out: Transaction[] = [];
  for (const r of rules) {
    if (!r.active) continue;
    const end = r.endDate ? monthKey(r.endDate) : null;
    let m = r.start;
    let guard = 0;
    while (m <= horizon && guard++ < 240) {
      if (end && m > end) break;
      const key = `${r.id}:${m}`;
      if (!keys.has(key)) {
        keys.add(key);
        out.push({
          id: uid(),
          type: r.type,
          amount: r.amount,
          date: `${m}-${pad2(Math.min(r.day, daysInMonth(m)))}`,
          description: r.description,
          accountId: r.accountId,
          cardId: r.cardId,
          categoryId: r.categoryId,
          method: r.method,
          recurKey: key,
          createdAt: Date.now(),
        });
      }
      m = shiftMonth(m, 1);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// parcelamento
// ---------------------------------------------------------------------------
export function buildInstallments(
  base: Omit<Transaction, "id" | "createdAt" | "installment"> & { date: string },
  count: number,
): Transaction[] {
  const n = Math.max(1, count);
  const group = uid();
  const totalCents = Math.round(base.amount * 100);
  const per = Math.floor(totalCents / n);
  const rest = totalCents - per * n;
  const out: Transaction[] = [];
  for (let i = 0; i < n; i++) {
    const cents = per + (i === 0 ? rest : 0);
    const d = new Date(
      Number(base.date.slice(0, 4)),
      Number(base.date.slice(5, 7)) - 1 + i,
      1,
    );
    const mk = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const day = Math.min(Number(base.date.slice(8, 10)), daysInMonth(mk));
    out.push({
      ...base,
      id: uid(),
      amount: cents / 100,
      date: `${mk}-${pad2(day)}`,
      installment: { group, n: i + 1, of: n },
      createdAt: Date.now(),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// fluxo de caixa projetado
// ---------------------------------------------------------------------------
export interface CashPoint { date: string; balance: number }

export function cashflowProjection(data: AppData, days: number) {
  const today = todayISO();
  const end = addDaysISO(today, days);
  const liquids = new Set(data.accounts.filter(isLiquid).map((a) => a.id));
  const events = new Map<string, number>();
  const add = (date: string, v: number) => events.set(date, (events.get(date) ?? 0) + v);

  for (const t of data.txs) {
    if (t.date <= today || t.date > end) continue;
    if (t.type === "income" && t.accountId && liquids.has(t.accountId)) add(t.date, t.amount);
    else if (t.type === "expense" && t.accountId && liquids.has(t.accountId) && t.method !== "credit" && !t.cardId)
      add(t.date, -t.amount);
    else if (t.type === "transfer") {
      const from = t.accountId && liquids.has(t.accountId);
      const to = t.toAccountId && liquids.has(t.toAccountId);
      if (from && !to) add(t.date, -t.amount);
      else if (to && !from) add(t.date, t.amount);
    }
  }
  for (const p of data.payments) {
    if (p.date > today && p.date <= end && liquids.has(p.accountId)) add(p.date, -p.amount);
  }
  // faturas a vencer (ainda não pagas)
  const cm = currentMonth();
  for (const card of data.cards) {
    for (let i = -1; i <= 4; i++) {
      const m = shiftMonth(cm, i);
      const st = buildStatement(card, m, data.txs, data.payments);
      if (st.remaining > 0.004 && st.dueDate > today && st.dueDate <= end) add(st.dueDate, -st.remaining);
    }
  }

  let balance = liquidBalanceAt(data.accounts, data.txs, data.payments, today);
  const points: CashPoint[] = [{ date: today, balance }];
  for (let i = 1; i <= days; i++) {
    const d = addDaysISO(today, i);
    balance += events.get(d) ?? 0;
    points.push({ date: d, balance });
  }
  const at = (n: number) => points[Math.min(n, points.length - 1)].balance;
  return { points, d30: at(30), d60: at(60), d90: at(90), start: points[0].balance };
}

// ---------------------------------------------------------------------------
// quanto posso gastar (seguro para gastar até o fim do mês)
// ---------------------------------------------------------------------------
export interface SafeToSpend {
  balance: number;
  upcomingIncome: number;
  upcomingBills: number;
  cardDue: number;
  planned: number;
  savings: number;
  remaining: number;
  perDay: number;
  daysLeft: number;
  reason: string | null;
}

export function safeToSpend(data: AppData): SafeToSpend {
  const today = todayISO();
  const cm = currentMonth();
  const end = `${cm}-${pad2(daysInMonth(cm))}`;
  const daysLeft = diffDays(today, end) + 1;
  const liquids = new Set(data.accounts.filter(isLiquid).map((a) => a.id));
  const balance = liquidBalanceAt(data.accounts, data.txs, data.payments, today);

  let upcomingIncome = 0, upcomingBills = 0;
  for (const t of data.txs) {
    if (t.date <= today || t.date > end) continue;
    if (t.type === "income" && t.accountId && liquids.has(t.accountId)) upcomingIncome += t.amount;
    else if (t.type === "expense" && !t.cardId && t.method !== "credit" && t.accountId && liquids.has(t.accountId))
      upcomingBills += t.amount;
  }
  // faturas em aberto: anterior (se não paga) + atual
  let cardDue = 0;
  for (const card of data.cards) {
    for (const m of [shiftMonth(cm, -1), cm]) cardDue += buildStatement(card, m, data.txs, data.payments).remaining;
  }
  // orçamento planejado ainda não gasto
  const planned = budgetUsage(data.budgets, data.categories, data.txs, cm)
    .reduce((s, u) => s + Math.max(0, u.budget.amount - u.used), 0);
  // meta mínima de poupança: 10% da renda do mês
  const savings = monthTotals(data.txs, cm).income * 0.1;

  const remaining = balance + upcomingIncome - upcomingBills - cardDue - planned - savings;
  const perDay = Math.max(0, remaining) / Math.max(1, daysLeft);

  let reason: string | null = null;
  if (remaining <= 0) {
    const parts = [
      { v: upcomingBills, t: "As contas agendadas até o fim do mês" },
      { v: cardDue, t: "As faturas de cartão em aberto" },
      { v: planned, t: "Os gastos planejados nos orçamentos" },
    ].sort((a, b) => b.v - a.v);
    reason = `${parts[0].t} consomem hoje todo o orçamento disponível do mês.`;
  }
  return { balance, upcomingIncome, upcomingBills, cardDue, planned, savings, remaining, perDay, daysLeft, reason };
}

// ---------------------------------------------------------------------------
// patrimônio líquido
// ---------------------------------------------------------------------------
export function netWorthAt(data: AppData, date: string): number {
  const assets = data.accounts.filter((a) => !a.archived)
    .reduce((s, a) => s + accountBalanceAt(a, data.txs, data.payments, date), 0);
  const debt = data.cards.reduce((s, c) => s + cardOutstanding(c, data.txs, data.payments, date), 0);
  return assets - debt;
}

export function netWorthHistory(data: AppData, months = 12) {
  const cm = currentMonth();
  const out: { month: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const m = shiftMonth(cm, -i);
    const last = `${m}-${pad2(daysInMonth(m))}`;
    out.push({ month: m, value: netWorthAt(data, last) });
  }
  return out;
}

export function patrimonyBreakdown(data: AppData) {
  const today = todayISO();
  const liquid = liquidBalanceAt(data.accounts, data.txs, data.payments, today);
  const invested = investedBalance(data.accounts, data.txs, data.payments);
  const cardDebt = data.cards.reduce((s, c) => s + cardOutstanding(c, data.txs, data.payments), 0);
  const assets = liquid + invested;
  return { liquid, invested, cardDebt, assets, net: assets - cardDebt };
}

// ---------------------------------------------------------------------------
// metas
// ---------------------------------------------------------------------------
export const goalSaved = (contribs: GoalContrib[], goal: Goal) =>
  contribs.filter((c) => c.goalId === goal.id).reduce((s, c) => s + c.amount, 0);

// ---------------------------------------------------------------------------
// saúde financeira
// ---------------------------------------------------------------------------
export interface HealthPart { key: string; label: string; pts: number; of: number; detail: string }
export interface Health { score: number; grade: string; parts: HealthPart[]; insights: string[] }

export function financialHealth(data: AppData): Health {
  const cm = currentMonth();
  const months = [shiftMonth(cm, -2), shiftMonth(cm, -1), cm];
  let ti = 0, te = 0;
  for (const m of months) {
    const t = monthTotals(data.txs, m);
    ti += t.income;
    te += t.expense;
  }
  const avgI = ti / 3, avgE = te / 3;

  // taxa de poupança (40)
  const rate = avgI > 0 ? (avgI - avgE) / avgI : 0;
  const savePts = clamp(rate / 0.25, 0, 1) * 40;

  // reserva de emergência (30)
  const liquid = liquidBalanceAt(data.accounts, data.txs, data.payments, todayISO());
  const monthsCovered = avgE > 0 ? liquid / avgE : 6;
  const emergPts = clamp(monthsCovered / 6, 0, 1) * 30;

  // uso do limite (15)
  const totalLimit = data.cards.reduce((s, c) => s + c.limit, 0);
  const totalOut = data.cards.reduce((s, c) => s + cardOutstanding(c, data.txs, data.payments), 0);
  const util = totalLimit > 0 ? totalOut / totalLimit : 0;
  const utilPts = totalLimit === 0 ? 15 : util <= 0.3 ? 15 : util >= 0.9 ? 0 : 15 * (1 - (util - 0.3) / 0.6);

  // orçamentos (15)
  const usages = budgetUsage(data.budgets, data.categories, data.txs, cm);
  const within = usages.length ? usages.filter((u) => u.pct <= 100).length / usages.length : 0.75;
  const budgetPts = within * 15;

  const parts: HealthPart[] = [
    { key: "save", label: "Taxa de poupança", pts: savePts, of: 40, detail: `${Math.round(rate * 100)}% da renda` },
    { key: "emerg", label: "Reserva de emergência", pts: emergPts, of: 30, detail: `${monthsCovered.toFixed(1)} meses de gastos` },
    { key: "util", label: "Uso do limite", pts: utilPts, of: 15, detail: totalLimit ? `${Math.round(util * 100)}% utilizado` : "Sem cartões" },
    { key: "budget", label: "Orçamentos no azul", pts: budgetPts, of: 15, detail: usages.length ? `${usages.filter((u) => u.pct <= 100).length} de ${usages.length}` : "Defina orçamentos" },
  ];
  const score = Math.round(savePts + emergPts + utilPts + budgetPts);
  const grade = score >= 80 ? "Excelente" : score >= 60 ? "Boa" : score >= 40 ? "Regular" : "Atenção";

  const insights: string[] = [];
  if (avgI > 0) {
    if (rate >= 0.2) insights.push(`Você poupou ${Math.round(rate * 100)}% da renda nos últimos 3 meses. Continue assim.`);
    else if (rate > 0) insights.push(`Sua taxa de poupança é ${Math.round(rate * 100)}%. O ideal é pelo menos 20%.`);
    else insights.push(`Você gastou mais do que ganhou em média nos últimos 3 meses. Revise despesas variáveis.`);
  } else insights.push("Registre suas receitas para calcular sua taxa de poupança.");

  if (avgE > 0) {
    if (monthsCovered >= 6) insights.push(`Sua reserva cobre ${monthsCovered.toFixed(1)} meses de gastos — excelente segurança.`);
    else insights.push(`Sua reserva cobre ${monthsCovered.toFixed(1)} meses de gastos. Busque chegar a 6 meses (${fmtBRL(avgE * 6)}).`);
  }
  if (totalLimit > 0 && util > 0.3)
    insights.push(`Você está usando ${Math.round(util * 100)}% do limite total dos cartões. Tente manter abaixo de 30%.`);
  const over = usages.filter((u) => u.pct > 100);
  if (over.length)
    insights.push(`Orçamento estourado em ${over.map((o) => o.category?.name ?? "—").join(", ")}.`);
  const spend = spendingByRootCategory(data.txs, data.categories, cm);
  let topCat: Category | undefined; let topVal = 0;
  for (const [id, v] of spend) {
    if (v > topVal) { topVal = v; topCat = data.categories.find((c) => c.id === id); }
  }
  if (topCat) insights.push(`${topCat.name} é seu maior gasto do mês: ${fmtBRL(topVal)}.`);

  return { score, grade, parts, insights };
}

// ---------------------------------------------------------------------------
// alertas / notificações
// ---------------------------------------------------------------------------
export interface Alert {
  id: string;
  tone: "danger" | "warn" | "info";
  title: string;
  body: string;
}

export function buildAlerts(data: AppData): Alert[] {
  const alerts: Alert[] = [];
  const today = todayISO();
  const cm = currentMonth();

  // contas a vencer (despesas futuras agendadas, fora do crédito)
  const upcoming = data.txs
    .filter((t) => t.type === "expense" && t.date >= today && t.method !== "credit" && !t.cardId)
    .sort((a, b) => a.date.localeCompare(b.date));
  for (const t of upcoming) {
    const dd = diffDays(today, t.date);
    if (dd <= 5) {
      alerts.push({
        id: `bill-${t.id}`,
        tone: dd <= 1 ? "danger" : "warn",
        title: dd === 0 ? "Conta vence hoje" : `Conta vence em ${dd} dia${dd > 1 ? "s" : ""}`,
        body: `${t.description} · ${fmtBRL(t.amount)} · ${fmtDate(t.date)}`,
      });
    }
  }

  // faturas
  for (const card of data.cards) {
    for (const i of [-1, 0, 1]) {
      const m = shiftMonth(cm, i);
      const st = buildStatement(card, m, data.txs, data.payments);
      if (st.remaining <= 0.004) continue;
      const dd = diffDays(today, st.dueDate);
      if (dd < 0)
        alerts.push({ id: `card-od-${card.id}-${m}`, tone: "danger", title: `Fatura vencida — ${card.name}`, body: `${fmtBRL(st.remaining)} em aberto, venceu em ${fmtDate(st.dueDate)}` });
      else if (dd <= 5 && st.status !== "aberta")
        alerts.push({ id: `card-due-${card.id}-${m}`, tone: dd <= 2 ? "danger" : "warn", title: `Fatura ${card.name} vence ${dd === 0 ? "hoje" : `em ${dd} dias`}`, body: `${fmtBRL(st.remaining)} · vencimento ${fmtDate(st.dueDate)}` });
    }
  }

  // orçamentos
  for (const u of budgetUsage(data.budgets, data.categories, data.txs, cm)) {
    if (u.pct >= 100)
      alerts.push({ id: `bud-x-${u.budget.id}`, tone: "danger", title: `Orçamento estourado: ${u.category?.name ?? ""}`, body: `${fmtBRL(u.used)} de ${fmtBRL(u.budget.amount)} (${Math.round(u.pct)}%)` });
    else if (u.pct >= 85)
      alerts.push({ id: `bud-w-${u.budget.id}`, tone: "warn", title: `Orçamento quase no limite: ${u.category?.name ?? ""}`, body: `${Math.round(u.pct)}% utilizado este mês` });
  }

  // saldo
  const cf = cashflowProjection(data, 30);
  if (cf.start < 0)
    alerts.push({ id: "low-now", tone: "danger", title: "Saldo negativo", body: `Saldo disponível: ${fmtBRL(cf.start)}` });
  else if (cf.d30 < 0)
    alerts.push({ id: "low-30", tone: "warn", title: "Saldo pode ficar negativo", body: `Projeção para 30 dias: ${fmtBRL(cf.d30)}` });

  const order = { danger: 0, warn: 1, info: 2 };
  return alerts.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 10);
}

// ---------------------------------------------------------------------------
// extrato agrupado + filtros
// ---------------------------------------------------------------------------
export interface TxFilters {
  q: string;
  type: "all" | "income" | "expense" | "transfer";
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export function filterTxs(txs: Transaction[], month: string | null, f: TxFilters): Transaction[] {
  const q = f.q.trim().toLowerCase();
  return txs
    .filter((t) => {
      if (month && monthKey(t.date) !== month) return false;
      if (f.type !== "all" && t.type !== f.type) return false;
      if (f.categoryId && t.categoryId !== f.categoryId) return false;
      if (f.accountId && t.accountId !== f.accountId && t.toAccountId !== f.accountId) return false;
      if (f.cardId && t.cardId !== f.cardId) return false;
      if (f.minAmount != null && t.amount < f.minAmount) return false;
      if (f.maxAmount != null && t.amount > f.maxAmount) return false;
      if (q && !t.description.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date)));
}

export function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const map = new Map<string, Transaction[]>();
  for (const t of txs) {
    const arr = map.get(t.date) ?? [];
    arr.push(t);
    map.set(t.date, arr);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
