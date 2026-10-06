import { useMemo, useState } from "react";
import { ArrowRightLeft, ChevronLeft, Funnel, Plus, Repeat, Search, X } from "lucide-react";
import { useStore } from "../store/AppStore";
import { Card, EmptyState, IconBubble, MonthNav, Seg, Sheet, Field, Money } from "../components/ui";
import type { Transaction } from "../lib/types";
import { filterTxs, groupByDate, monthTotals } from "../lib/finance";
import { fmtRelative, monthCap, monthKey, todayISO } from "../lib/format";
import { METHOD_LABELS } from "../lib/labels";
import { cn } from "../utils/cn";

interface Filters {
  q: string;
  type: "all" | "income" | "expense" | "transfer";
  categoryId?: string;
  accountId?: string;
  cardId?: string;
  minAmount?: number;
  maxAmount?: number;
}

const EMPTY_F: Filters = { q: "", type: "all" };

export function TransactionsPage({ onEdit, onNew }: { onEdit: (t: Transaction) => void; onNew: () => void }) {
  const { data, month, setMonth } = useStore();
  const [f, setF] = useState<Filters>(EMPTY_F);
  const [mode, setMode] = useState<"mes" | "ano">("mes");
  const [showFilters, setShowFilters] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const accById = useMemo(() => new Map(data.accounts.map((a) => [a.id, a])), [data.accounts]);
  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const cardById = useMemo(() => new Map(data.cards.map((c) => [c.id, c])), [data.cards]);

  const list = useMemo(() => {
    const mk = mode === "mes" ? month : month.slice(0, 4);
    const filtered = filterTxs(data.txs, null, f)
      .filter((t) => (mode === "mes" ? monthKey(t.date) === mk : t.date.startsWith(mk)));
    return filtered;
  }, [data.txs, f, month, mode]);

  const totals = useMemo(() => {
    let inc = 0, exp = 0;
    for (const t of list) {
      if (t.type === "income") inc += t.amount;
      else if (t.type === "expense") exp += t.amount;
    }
    return { inc, exp };
  }, [list]);

  const groups = useMemo(() => {
    if (mode === "mes") return groupByDate(list);
    const byMonth = new Map<string, Transaction[]>();
    for (const t of list) {
      const k = monthKey(t.date);
      byMonth.set(k, [...(byMonth.get(k) ?? []), t]);
    }
    return [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])) as [string, Transaction[]][];
  }, [list, mode]);

  const activeFilters = [f.type !== "all", f.categoryId, f.accountId, f.cardId, f.minAmount != null, f.maxAmount != null]
    .filter(Boolean).length;

  const applyAmounts = () => {
    setF({ ...f, minAmount: min ? Number(min.replace(",", ".")) : undefined, maxAmount: max ? Number(max.replace(",", ".")) : undefined });
    setShowFilters(false);
  };

  return (
    <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-5xl mx-auto w-full animate-[page-in_.3s_ease]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-[24px] font-extrabold tracking-tight">Extrato</h1>
        {mode === "mes" ? <MonthNav month={month} onChange={setMonth} /> : (
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
            <button
              onClick={() => setMonth(`${Number(month.slice(0, 4)) - 1}${month.slice(4)}`)}
              className="grid size-8 place-items-center rounded-full text-muted active:scale-90 transition"
              aria-label="Ano anterior"
            >
              <ChevronLeft size={17} strokeWidth={2.5} />
            </button>
            <span className="min-w-[76px] text-center text-[13.5px] font-bold tabular-nums">{month.slice(0, 4)}</span>
            <button
              onClick={() => setMonth(`${Number(month.slice(0, 4)) + 1}${month.slice(4)}`)}
              className={cn("grid size-8 place-items-center rounded-full transition active:scale-90", month.slice(0, 4) === todayISO().slice(0, 4) ? "text-muted/40 pointer-events-none" : "text-muted")}
              aria-label="Próximo ano"
            >
              <ChevronLeft size={17} strokeWidth={2.5} className="rotate-180" />
            </button>
          </div>
        )}
      </div>

      <Seg
        options={[{ value: "mes", label: "Por mês" }, { value: "ano", label: "Ano inteiro" }]}
        value={mode}
        onChange={setMode}
        className="mb-3 max-w-xs"
      />

      {/* busca + filtro */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            placeholder="Buscar lançamento…"
            className="input pl-9"
          />
          {f.q && (
            <button onClick={() => setF({ ...f, q: "" })} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              <X size={15} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className={cn(
            "relative grid size-[46px] place-items-center rounded-2xl border active:scale-95 transition",
            activeFilters ? "border-transparent bg-brand text-white" : "border-line bg-surface",
          )}
          aria-label="Filtros"
        >
          <Funnel size={17} />
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-down text-white text-[10px] font-bold">{activeFilters}</span>
          )}
        </button>
      </div>

      <div className="text-[11.5px] text-muted font-semibold mb-2 px-1">
        {list.length} lançamento{list.length === 1 ? "" : "s"} {mode === "mes" ? "neste mês" : "neste ano"}
      </div>

      {/* resumo */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-2xl bg-up/10 px-3.5 py-2.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-up">Receitas</div>
          <Money v={totals.inc} className="text-[15px] font-extrabold text-up" />
        </div>
        <div className="flex-1 rounded-2xl bg-down/10 px-3.5 py-2.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-down">Despesas</div>
          <Money v={totals.exp} className="text-[15px] font-extrabold text-down" />
        </div>
        <div className="flex-1 rounded-2xl bg-raise px-3.5 py-2.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Resultado</div>
          <Money v={totals.inc - totals.exp} className={cn("text-[15px] font-extrabold", totals.inc - totals.exp < 0 ? "text-down" : "")} />
        </div>
      </div>

      {/* lista */}
      {groups.length === 0 && (
        <EmptyState
          icon="receipt"
          title="Nenhum lançamento ainda"
          body="Adicione sua primeira receita ou despesa para começar a acompanhar suas finanças."
          action={
            <button onClick={onNew} className="h-10 px-5 rounded-2xl bg-brand text-white text-[13.5px] font-bold flex items-center gap-1.5 active:scale-95 transition">
              <Plus size={15} strokeWidth={3} /> Adicionar
            </button>
          }
        />
      )}

      {groups.map(([key, txs]) => (
        <div key={key} className="mb-5">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted">
              {mode === "mes" ? fmtRelative(key) + (key !== todayISO() ? "" : "") : monthCap(key)}
            </span>
            {mode === "ano" && (
              <span className="text-[11.5px] font-semibold text-muted tabular-nums">
                {(() => { const t = monthTotals(txs, key); return `${t.income > 0 ? "+" : ""}${(t.income - t.expense).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`; })()}
              </span>
            )}
          </div>
          <Card className="p-1.5 divide-y divide-line/70">
            {txs.map((t) => {
              const cat = catById.get(t.categoryId ?? "");
              const acc = accById.get(t.accountId ?? "");
              const toAcc = accById.get(t.toAccountId ?? "");
              const card = cardById.get(t.cardId ?? "");
              const isFuture = t.date > todayISO();
              return (
                <button key={t.id} onClick={() => onEdit(t)} className="w-full flex items-center gap-3 px-2.5 py-3 text-left active:bg-raise rounded-2xl transition">
                  {t.type === "transfer" ? (
                    <div className="grid size-[38px] place-items-center rounded-[14px] bg-info/15 text-info shrink-0">
                      <ArrowRightLeft size={17} />
                    </div>
                  ) : (
                    <IconBubble icon={cat?.icon} color={cat?.color ?? "#64748B"} size={38} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13.5px] font-bold">{t.description}</span>
                      {t.recurKey && <Repeat size={11} className="text-muted shrink-0" />}
                      {t.installment && (
                        <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-raise text-muted tabular-nums">
                          {t.installment.n}/{t.installment.of}
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-muted font-medium truncate">
                      {t.type === "transfer"
                        ? `${acc?.name ?? "?"} → ${toAcc?.name ?? "?"}`
                        : `${cat?.name ?? "Sem categoria"} · ${card ? `${card.name} (crédito)` : acc?.name ?? ""}${t.method && t.method !== "other" && !card ? ` · ${METHOD_LABELS[t.method]}` : ""}`}
                      {isFuture && " · previsto"}
                    </div>
                  </div>
                  <div className={cn(
                    "text-[14px] font-extrabold tabular-nums whitespace-nowrap",
                    t.type === "income" ? "text-up" : t.type === "expense" ? "text-down" : "text-muted",
                  )}>
                    {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                    {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </button>
              );
            })}
          </Card>
        </div>
      ))}

      {/* sheet de filtros */}
      <Sheet
        open={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filtros"
        footer={
          <div className="flex gap-2">
            <button
              onClick={() => { setF(EMPTY_F); setMin(""); setMax(""); setShowFilters(false); }}
              className="flex-1 h-12 rounded-2xl bg-raise text-[14px] font-bold active:scale-[.98] transition"
            >
              Limpar
            </button>
            <button onClick={applyAmounts} className="flex-2 grow h-12 rounded-2xl bg-brand text-white text-[14px] font-bold active:scale-[.98] transition">
              Aplicar filtros
            </button>
          </div>
        }
      >
        <Field label="Tipo">
          <Seg
            options={[
              { value: "all", label: "Todos" },
              { value: "expense", label: "Despesas" },
              { value: "income", label: "Receitas" },
              { value: "transfer", label: "Transf." },
            ]}
            value={f.type}
            onChange={(v) => setF({ ...f, type: v })}
          />
        </Field>
        <Field label="Categoria">
          <select
            value={f.categoryId ?? ""}
            onChange={(e) => setF({ ...f, categoryId: e.target.value || undefined })}
            className="input"
          >
            <option value="">Todas</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.kind === "income" ? "⤴ " : ""}{c.name}{c.parentId ? ` — ${catById.get(c.parentId)?.name ?? ""}` : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="Conta">
          <select value={f.accountId ?? ""} onChange={(e) => setF({ ...f, accountId: e.target.value || undefined })} className="input">
            <option value="">Todas</option>
            {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Cartão">
          <select value={f.cardId ?? ""} onChange={(e) => setF({ ...f, cardId: e.target.value || undefined })} className="input">
            <option value="">Todos</option>
            {data.cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Valor" className="mb-1">
          <div className="flex items-center gap-2">
            <input value={min} onChange={(e) => setMin(e.target.value)} placeholder="Mín (R$)" inputMode="decimal" className="input" />
            <span className="text-muted font-bold">—</span>
            <input value={max} onChange={(e) => setMax(e.target.value)} placeholder="Máx (R$)" inputMode="decimal" className="input" />
          </div>
        </Field>
        <div className="text-[12px] text-muted font-medium pb-2">Período: use o seletor de mês/ano no topo da tela.</div>
      </Sheet>
    </div>
  );
}
