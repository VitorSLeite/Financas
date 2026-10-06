import type { AppData, CardPayment, Category, Recurring, Transaction } from "./types";
import { addDaysISO, currentMonth, pad2, shiftMonth, todayISO, uid } from "./format";
import { buildStatement } from "./finance";

/** Paleta semântica reduzida (VT Flow). Subcategorias herdam a cor da raiz. */
const ROOT_COLORS: Record<string, string> = {
  "cat-casa": "#4DA3FF", "cat-alimentacao": "#00C9A7", "cat-transporte": "#8B7CFF",
  "cat-saude": "#FF5C6C", "cat-assinaturas": "#5E7BD6", "cat-lazer": "#A99CFF",
  "cat-educacao": "#F5B94A", "cat-compras": "#7E8BA3", "cat-outros": "#5B6880",
  "cat-salario": "#00C9A7", "cat-freelance": "#2BD9BA", "cat-rendimentos": "#4DA3FF",
  "cat-reembolso": "#8B7CFF", "cat-outras-receitas": "#7E8BA3",
  "acc-nubank": "#8B7CFF", "acc-poup": "#00C9A7", "acc-carteira": "#7E8BA3", "acc-inv": "#4DA3FF",
  "card-nubank": "#8B7CFF", "goal-reserva": "#00C9A7", "goal-viagem": "#8B7CFF",
};

export function recolor<T extends { id: string; color: string; parentId?: string }>(items: T[]): T[] {
  return items.map((c) => {
    const col = ROOT_COLORS[c.parentId ?? c.id] ?? ROOT_COLORS[c.id];
    return col ? { ...c, color: col } : c;
  });
}

export function seedCategories(): Category[] {
  return recolor(rawCategories());
}

function rawCategories(): Category[] {
  const c = (
    id: string, name: string, kind: "income" | "expense", color: string, icon: string,
    group?: "essential" | "fixed" | "variable", parentId?: string,
  ): Category => ({ id, name, kind, color, icon, group, parentId });
  return [
    // despesas
    c("cat-casa", "Casa", "expense", "#3B82F6", "home", "fixed"),
    c("cat-aluguel", "Aluguel", "expense", "#3B82F6", "home", "fixed", "cat-casa"),
    c("cat-condominio", "Condomínio", "expense", "#3B82F6", "landmark", "fixed", "cat-casa"),
    c("cat-energia", "Energia", "expense", "#EAB308", "zap", "fixed", "cat-casa"),
    c("cat-internet", "Internet", "expense", "#0EA5E9", "wifi", "fixed", "cat-casa"),
    c("cat-alimentacao", "Alimentação", "expense", "#F97316", "utensils", "essential"),
    c("cat-mercado", "Supermercado", "expense", "#F97316", "shoppingCart", "essential", "cat-alimentacao"),
    c("cat-restaurante", "Restaurantes", "expense", "#EF4444", "utensils", "variable", "cat-alimentacao"),
    c("cat-delivery", "Delivery", "expense", "#F43F5E", "shoppingBag", "variable", "cat-alimentacao"),
    c("cat-transporte", "Transporte", "expense", "#0EA5E9", "car", "essential"),
    c("cat-combustivel", "Combustível", "expense", "#0EA5E9", "fuel", "essential", "cat-transporte"),
    c("cat-apps-transporte", "Apps de transporte", "expense", "#06B6D4", "smartphone", "variable", "cat-transporte"),
    c("cat-saude", "Saúde", "expense", "#F43F5E", "heartPulse", "essential"),
    c("cat-farmacia", "Farmácia", "expense", "#F43F5E", "stethoscope", "essential", "cat-saude"),
    c("cat-academia", "Academia", "expense", "#10B981", "dumbbell", "essential", "cat-saude"),
    c("cat-assinaturas", "Assinaturas", "expense", "#A855F7", "clapper", "fixed"),
    c("cat-streaming", "Streaming", "expense", "#A855F7", "clapper", "fixed", "cat-assinaturas"),
    c("cat-celular", "Celular", "expense", "#6366F1", "smartphone", "fixed", "cat-assinaturas"),
    c("cat-lazer", "Lazer", "expense", "#EC4899", "gamepad", "variable"),
    c("cat-viagem", "Viagem", "expense", "#14B8A6", "plane", "variable", "cat-lazer"),
    c("cat-educacao", "Educação", "expense", "#EAB308", "graduation", "essential"),
    c("cat-compras", "Compras", "expense", "#6366F1", "shoppingBag", "variable"),
    c("cat-roupas", "Roupas", "expense", "#8B5CF6", "shirt", "variable", "cat-compras"),
    c("cat-outros", "Outros", "expense", "#64748B", "tag", "variable"),
    // receitas
    c("cat-salario", "Salário", "income", "#10B981", "briefcase"),
    c("cat-freelance", "Freelance", "income", "#34D399", "banknote"),
    c("cat-rendimentos", "Rendimentos", "income", "#0EA5E9", "trendingUp"),
    c("cat-reembolso", "Reembolsos", "income", "#F59E0B", "receipt"),
    c("cat-outras-receitas", "Outras receitas", "income", "#64748B", "circleDollar"),
  ];
}

// gerador pseudo-aleatório determinístico p/ dados de exemplo
function lcg(seed: number) {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

export function seedDemo(): AppData {
  const categories = seedCategories();
  const accounts = [
    { id: "acc-nubank", name: "Nubank", kind: "checking" as const, initialBalance: 1450, color: "#8B5CF6", icon: "landmark" },
    { id: "acc-poup", name: "Poupança", kind: "savings" as const, initialBalance: 6200, color: "#10B981", icon: "piggy" },
    { id: "acc-carteira", name: "Carteira", kind: "wallet" as const, initialBalance: 180, color: "#F59E0B", icon: "wallet" },
    { id: "acc-inv", name: "Investimentos", kind: "investment" as const, initialBalance: 12400, color: "#0EA5E9", icon: "trendingUp" },
  ];
  const cards = [
    { id: "card-nubank", name: "Nubank", limit: 6500, closingDay: 10, dueDay: 17, color: "#A855F7", accountId: "acc-nubank" },
  ];

  const cm = currentMonth();
  const start = shiftMonth(cm, -4);
  const rand = lcg(42);
  const r = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100) / 100;

  const txs: Transaction[] = [];
  const push = (t: Omit<Transaction, "id" | "createdAt">) =>
    txs.push({ ...t, id: uid(), createdAt: Date.now() });

  const today = todayISO();
  // despesas variadas nos últimos 4 meses + mês atual
  for (let i = 4; i >= 0; i--) {
    const m = shiftMonth(cm, -i);
    const maxDay = i === 0 ? Number(today.slice(8, 10)) : 28;
    const d = (day: number) => `${m}-${pad2(Math.min(day, maxDay))}`;

    for (const day of [3, 11, 19, 26].filter((x) => x <= maxDay))
      push({ type: "expense", amount: r(280, 540), date: d(day), description: "Supermercado", accountId: "acc-nubank", categoryId: "cat-mercado", method: "debit" });
    for (const day of [6, 15, 23].filter((x) => x <= maxDay))
      push({ type: "expense", amount: r(45, 160), date: d(day), description: "Restaurante", accountId: "acc-nubank", categoryId: "cat-restaurante", method: "pix" });
    for (const day of [8, 22].filter((x) => x <= maxDay))
      push({ type: "expense", amount: r(160, 240), date: d(day), description: "Posto de gasolina", accountId: "acc-carteira", categoryId: "cat-combustivel", method: "cash" });
    if (maxDay >= 13)
      push({ type: "expense", amount: r(60, 130), date: d(13), description: "Farmácia", accountId: "acc-nubank", categoryId: "cat-farmacia", method: "debit" });
    if (maxDay >= 4)
      push({ type: "expense", amount: r(140, 175), date: d(4), description: "Conta de energia", accountId: "acc-nubank", categoryId: "cat-energia", method: "debit" });
    if (maxDay >= 25)
      push({ type: "income", amount: r(600, 1200), date: d(25), description: "Freelance", accountId: "acc-nubank", categoryId: "cat-freelance", method: "pix" });

    // compras no cartão de crédito
    const cardSpend: [number, string, string, number, number][] = [
      [2, "iFood", "cat-delivery", 35, 90],
      [7, "Uber", "cat-apps-transporte", 18, 60],
      [12, "Amazon", "cat-compras", 80, 320],
      [16, "Cinema", "cat-lazer", 40, 110],
      [21, "Loja de roupas", "cat-roupas", 90, 260],
      [27, "iFood", "cat-delivery", 35, 95],
    ];
    for (const [day, desc, cat, min, max] of cardSpend.filter(([x]) => x <= maxDay))
      push({ type: "expense", amount: r(min, max), date: d(day), description: desc, cardId: "card-nubank", categoryId: cat, method: "credit" });
  }

  // compra parcelada (10x) começando há 2 meses
  const big = { type: "expense" as const, amount: 2899, date: `${shiftMonth(cm, -2)}-18`, description: "Geladeira", cardId: "card-nubank", categoryId: "cat-compras", method: "credit" as const };
  const g = uid();
  for (let i = 0; i < 10; i++) {
    const m = shiftMonth(cm, -2 + i);
    txs.push({
      ...big, id: uid(), createdAt: Date.now(), amount: 289.9,
      date: `${m}-18`, installment: { group: g, n: i + 1, of: 10 },
    });
  }

  // pagamentos das faturas passadas (quitadas)
  const payments: CardPayment[] = [];
  for (let i = 5; i >= 1; i--) {
    const m = shiftMonth(cm, -i);
    const st = buildStatement(cards[0], m, txs, []);
    if (st.total > 0 && st.dueDate <= today) {
      payments.push({ id: uid(), cardId: "card-nubank", month: m, amount: st.total, date: st.dueDate, accountId: "acc-nubank" });
    }
  }

  const recurring: Recurring[] = [
    { id: "rec-salario", type: "income", amount: 8500, day: 5, description: "Salário", accountId: "acc-nubank", categoryId: "cat-salario", method: "pix", start, active: true },
    { id: "rec-aluguel", type: "expense", amount: 1950, day: 10, description: "Aluguel", accountId: "acc-nubank", categoryId: "cat-aluguel", method: "pix", start, active: true },
    { id: "rec-net", type: "expense", amount: 99.9, day: 15, description: "Internet fibra", accountId: "acc-nubank", categoryId: "cat-internet", method: "debit", start, active: true },
    { id: "rec-stream", type: "expense", amount: 55.9, day: 20, description: "Streaming", accountId: "acc-nubank", categoryId: "cat-streaming", method: "debit", start, active: true },
    { id: "rec-gym", type: "expense", amount: 89.9, day: 2, description: "Academia", accountId: "acc-nubank", categoryId: "cat-academia", method: "debit", start, active: true },
    { id: "rec-previa", type: "expense", amount: 350, day: 28, description: "Prev. conta de luz extra", accountId: "acc-nubank", categoryId: "cat-energia", method: "boleto", start: shiftMonth(cm, 1), active: true },
  ];

  const budgets = [
    { id: "bud-1", categoryId: "cat-alimentacao", amount: 1900 },
    { id: "bud-2", categoryId: "cat-transporte", amount: 550 },
    { id: "bud-3", categoryId: "cat-lazer", amount: 650 },
    { id: "bud-4", categoryId: "cat-compras", amount: 900 },
    { id: "bud-5", categoryId: "cat-casa", amount: 2400 },
  ];

  const goals = [
    { id: "goal-reserva", name: "Reserva de emergência", target: 30000, color: "#10B981", icon: "piggy", createdAt: Date.now() },
    { id: "goal-viagem", name: "Viagem para o Japão", target: 12000, color: "#0EA5E9", icon: "plane", deadline: `${shiftMonth(cm, 10)}-15`, createdAt: Date.now() },
  ];
  const contribs = [];
  for (let i = 5; i >= 1; i--) {
    const m = shiftMonth(cm, -i);
    contribs.push({ id: uid(), goalId: "goal-reserva", amount: 1500, date: `${m}-06` });
    if (i <= 4) contribs.push({ id: uid(), goalId: "goal-viagem", amount: 700, date: `${m}-08` });
  }

  // aporte mensal nos investimentos
  for (let i = 4; i >= 0; i--) {
    const m = shiftMonth(cm, -i);
    const date = `${m}-06`;
    if (date <= addDaysISO(today, 40))
      push({ type: "transfer", amount: 1200, date, description: "Aporte mensal", accountId: "acc-nubank", toAccountId: "acc-inv", method: "other" });
  }

  return {
    accounts: recolor(accounts), categories, cards: recolor(cards), txs, payments,
    budgets, goals: recolor(goals), contribs, recurring,
  };
}
