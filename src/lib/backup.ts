import type { AppData, Transaction } from "./types";
import { fmtDate } from "./format";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function exportJSON(data: AppData) {
  download(
    `vt-flow-backup-${stamp()}.json`,
    JSON.stringify({ app: "vt-flow", version: 1, exportedAt: new Date().toISOString(), data }, null, 2),
    "application/json",
  );
}

export function validateImport(json: string): AppData | null {
  try {
    const parsed = JSON.parse(json);
    const d = parsed?.data ?? parsed;
    if (!d || !Array.isArray(d.accounts) || !Array.isArray(d.txs)) return null;
    return {
      accounts: d.accounts ?? [],
      categories: d.categories ?? [],
      cards: d.cards ?? [],
      txs: d.txs ?? [],
      payments: d.payments ?? [],
      budgets: d.budgets ?? [],
      goals: d.goals ?? [],
      contribs: d.contribs ?? [],
      recurring: d.recurring ?? [],
    };
  } catch {
    return null;
  }
}

const csvEsc = (v: unknown) => {
  const s = String(v ?? "");
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCSV(data: AppData) {
  const acc = new Map(data.accounts.map((a) => [a.id, a.name]));
  const cat = new Map(data.categories.map((c) => [c.id, c.name]));
  const card = new Map(data.cards.map((c) => [c.id, c.name]));
  const typePt = { income: "receita", expense: "despesa", transfer: "transferencia" } as const;
  const rows = [
    ["data", "tipo", "descricao", "valor", "categoria", "conta", "conta_destino", "cartao", "metodo", "parcela"],
    ...[...data.txs].sort((a, b) => a.date.localeCompare(b.date)).map((t: Transaction) => [
      fmtDate(t.date),
      typePt[t.type],
      t.description,
      t.amount.toFixed(2).replace(".", ","),
      t.categoryId ? cat.get(t.categoryId) ?? "" : "",
      t.accountId ? acc.get(t.accountId) ?? "" : "",
      t.toAccountId ? acc.get(t.toAccountId) ?? "" : "",
      t.cardId ? card.get(t.cardId) ?? "" : "",
      t.method ?? "",
      t.installment ? `${t.installment.n}/${t.installment.of}` : "",
    ]),
  ];
  download(
    `vt-flow-transacoes-${stamp()}.csv`,
    "\uFEFF" + rows.map((r) => r.map(csvEsc).join(";")).join("\n"),
    "text/csv;charset=utf-8",
  );
}
