import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useStore } from "../store/AppStore";
import { Bar, Card, Chip, EmptyState, Field, IconBubble, Money, Sheet } from "../components/ui";
import type { Card as CardT, Transaction } from "../lib/types";
import { buildStatement, cardOutstanding } from "../lib/finance";
import { currentMonth, fmtBRL, fmtDate, fmtDateShort, monthLabel, shiftMonth, todayISO, uid } from "../lib/format";
import { PALETTE, DynIcon } from "../lib/icons";
import { cn } from "../utils/cn";

function MiniRing({ pct, color, size = 54 }: { pct: number; color: string; size?: number }) {
  const R = (size - 8) / 2;
  const C = 2 * Math.PI * R;
  const p = Math.min(1, Math.max(0, pct / 100));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--raise)" strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={p > 0.85 ? "var(--down)" : color} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${p * C} ${C}`} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[10px] font-extrabold tabular-nums">{Math.round(pct)}%</div>
    </div>
  );
}

export function CardsPage({
  requestPayId, onConsumePay, onEditTx, onNewTx,
}: {
  requestPayId?: string;
  onConsumePay: () => void;
  onEditTx: (t: Transaction) => void;
  onNewTx: (cardId: string) => void;
}) {
  const { data, saveCard, deleteCard, payCard, deletePayment } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stMonth, setStMonth] = useState(currentMonth());
  const [showPay, setShowPay] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<CardT | null>(null);
  const [confirmDelCard, setConfirmDelCard] = useState(false);

  // form do cartão
  const [fName, setFName] = useState("");
  const [fLimit, setFLimit] = useState("");
  const [fClose, setFClose] = useState("10");
  const [fDue, setFDue] = useState("17");
  const [fColor, setFColor] = useState(PALETTE[4]);
  const [fAcc, setFAcc] = useState("");

  // pagamento
  const [pAmount, setPAmount] = useState("");
  const [pAcc, setPAcc] = useState("");
  const [pDate, setPDate] = useState(todayISO());

  const selected = data.cards.find((c) => c.id === selectedId) ?? null;

  const statement = useMemo(() => {
    if (!selected) return null;
    return buildStatement(selected, stMonth, data.txs, data.payments);
  }, [selected, stMonth, data.txs, data.payments]);

  const statementPayments = useMemo(
    () => (selected ? data.payments.filter((p) => p.cardId === selected.id && p.month === stMonth) : []),
    [data.payments, selected, stMonth],
  );

  useEffect(() => {
    if (requestPayId) {
      setSelectedId(requestPayId);
      setStMonth(currentMonth());
      setShowPay(true);
      onConsumePay();
    }
  }, [requestPayId, onConsumePay]);

  useEffect(() => {
    if (showPay && statement) {
      setPAmount(statement.remaining > 0.004 ? statement.remaining.toFixed(2).replace(".", ",") : "");
      setPAcc(selected?.accountId ?? data.accounts.find((a) => !a.archived)?.id ?? "");
      setPDate(todayISO());
    }
  }, [showPay]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => {
    setEditing(null);
    setFName(""); setFLimit(""); setFClose("10"); setFDue("17");
    setFColor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    setFAcc(data.accounts.find((a) => !a.archived)?.id ?? "");
    setConfirmDelCard(false);
    setShowEdit(true);
  };
  const openEdit = (c: CardT) => {
    setEditing(c);
    setFName(c.name); setFLimit(String(c.limit).replace(".", ","));
    setFClose(String(c.closingDay)); setFDue(String(c.dueDay));
    setFColor(c.color); setFAcc(c.accountId ?? "");
    setConfirmDelCard(false);
    setShowEdit(true);
  };

  const saveCardForm = () => {
    const limit = Number(fLimit.replace(/\./g, "").replace(",", ".")) || 0;
    if (!fName.trim() || limit <= 0) return;
    saveCard({
      id: editing?.id ?? uid(),
      name: fName.trim(),
      limit,
      closingDay: Math.min(31, Math.max(1, Number(fClose) || 1)),
      dueDay: Math.min(31, Math.max(1, Number(fDue) || 1)),
      color: fColor,
      accountId: fAcc || undefined,
    });
    setShowEdit(false);
  };

  const confirmPay = () => {
    if (!selected || !statement) return;
    const amount = Number(pAmount.replace(/\./g, "").replace(",", "."));
    if (!pAcc || !(amount > 0)) return;
    payCard({ id: uid(), cardId: selected.id, month: statement.month, amount, date: pDate, accountId: pAcc });
    setShowPay(false);
  };

  // ---------------------------------------------------------------- lista
  if (!selected) {
    return (
      <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-5xl mx-auto w-full animate-[page-in_.3s_ease]">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[24px] font-extrabold tracking-tight">Cartões</h1>
          <button onClick={openNew} className="h-10 px-4 rounded-2xl bg-brand text-white text-[13.5px] font-bold flex items-center gap-1.5 active:scale-95 transition">
            <Plus size={15} strokeWidth={3} /> Novo cartão
          </button>
        </div>

        {data.cards.length === 0 && (
          <EmptyState icon="creditCard" title="Nenhum cartão cadastrado" body="Adicione um cartão de crédito para acompanhar faturas e limites." />
        )}

        <div className="grid sm:grid-cols-2 gap-3.5">
          {data.cards.map((c) => {
            const st = buildStatement(c, currentMonth(), data.txs, data.payments);
            const out = cardOutstanding(c, data.txs, data.payments);
            const avail = Math.max(0, c.limit - out);
            const pct = c.limit > 0 ? (out / c.limit) * 100 : 0;
            return (
              <div key={c.id} className="rounded-2xl border border-line/70 bg-surface p-5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[15px] font-semibold">
                    <span className="h-4 w-1 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                  <span className="text-[11.5px] text-muted">fecha {c.closingDay} · vence {c.dueDay}</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[11.5px] text-muted font-medium">
                      Fatura atual · <span className={cn(st.status === "vencida" ? "text-down" : st.status === "paga" ? "text-brand" : "")}>{st.status === "vazia" ? "sem lançamentos" : `${st.status}, vence ${fmtDateShort(st.dueDate)}`}</span>
                    </div>
                    <Money v={st.remaining} className="text-[28px] font-extrabold leading-tight block" />
                  </div>
                  <MiniRing pct={pct} color="var(--brand)" size={48} />
                </div>
                <div className="mt-4 flex justify-between text-[12.5px] mb-1.5">
                  <span className="text-muted">Limite disponível</span>
                  <span className="font-semibold tabular-nums">{fmtBRL(avail)} <span className="text-muted font-normal">de {fmtBRL(c.limit)}</span></span>
                </div>
                <Bar pct={pct} color={pct > 80 ? "var(--down)" : "var(--brand)"} className="h-1.5 mb-4" />
                <div className="pt-0">
                  <div className="flex gap-2">
                    <button onClick={() => { setSelectedId(c.id); setStMonth(currentMonth()); }} className="flex-1 h-10 rounded-xl bg-raise text-[13px] font-semibold active:scale-[.98] transition">
                      Ver fatura
                    </button>
                    {st.remaining > 0.004 && (
                      <button
                        onClick={() => { setSelectedId(c.id); setStMonth(currentMonth()); setShowPay(true); }}
                        className="flex-1 h-10 rounded-xl border border-line text-[13px] font-semibold active:scale-[.98] transition"
                      >
                        Pagar fatura
                      </button>
                    )}
                    <button onClick={() => openEdit(c)} className="h-10 px-3.5 rounded-xl border border-line text-[13px] font-bold text-muted active:scale-[.98] transition" aria-label="Editar">
                      <DynIcon name="wrench" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {renderEditSheet()}
        {renderPaySheet()}
      </div>
    );
  }

  // ---------------------------------------------------------------- detalhe/fatura
  const st = statement!;
  const nextMonths = [currentMonth(), shiftMonth(currentMonth(), 1)].includes(stMonth);
  return (
    <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-5xl mx-auto w-full animate-[page-in_.3s_ease]">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setSelectedId(null)} className="grid size-10 place-items-center rounded-full border border-line bg-surface active:scale-90 transition" aria-label="Voltar">
          <ArrowLeft size={17} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
          <h1 className="text-[20px] font-extrabold tracking-tight truncate">{selected.name}</h1>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          <button onClick={() => setStMonth(shiftMonth(stMonth, -1))} className="grid size-8 place-items-center rounded-full text-muted active:scale-90 transition" aria-label="Fatura anterior">
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <span className="min-w-[96px] text-center text-[13px] font-bold">{monthLabel(stMonth, true).replace("/", "/20")}</span>
          <button onClick={() => setStMonth(shiftMonth(stMonth, 1))} className="grid size-8 place-items-center rounded-full text-muted active:scale-90 transition" aria-label="Próxima fatura">
            <ChevronLeft size={16} strokeWidth={2.5} className="rotate-180" />
          </button>
        </div>
      </div>

      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold text-muted">Fatura de {fmtDate(st.closingDate).slice(3)}</div>
            <Money v={st.total} className="text-[30px] font-extrabold tracking-tighter block" />
            <div className="text-[12.5px] font-medium text-muted mt-0.5">
              fecha {fmtDate(st.closingDate)} · vence {fmtDate(st.dueDate)}
            </div>
          </div>
          <span className={cn(
            "text-[12px] font-bold px-3 py-1.5 rounded-full",
            st.status === "paga" && "bg-up/15 text-up",
            st.status === "vencida" && "bg-down/15 text-down",
            st.status === "fechada" && "bg-warn/15 text-warn",
            st.status === "aberta" && "bg-info/15 text-info",
            st.status === "vazia" && "bg-raise text-muted",
          )}>
            {st.status === "vazia" ? "sem lançamentos" : st.status}
          </span>
        </div>
        {st.total > 0.004 && (
          <div className="mt-4">
            <div className="flex justify-between text-[12px] font-semibold text-muted mb-1.5">
              <span>Pago: {fmtBRL(st.paidAmount)}</span>
              <span>Restante: {fmtBRL(st.remaining)}</span>
            </div>
            <Bar pct={(st.paidAmount / st.total) * 100} color={st.status === "paga" ? "var(--up)" : selected.color} />
          </div>
        )}
        <div className="flex gap-2 mt-4">
          {st.remaining > 0.004 && (
            <button onClick={() => setShowPay(true)} className="flex-1 h-11 rounded-2xl bg-brand text-white text-[14px] font-bold active:scale-[.98] transition">
              Pagar {fmtBRL(st.remaining)}
            </button>
          )}
          <button onClick={() => onNewTx(selected.id)} className="flex-1 h-11 rounded-2xl border border-line bg-raise text-[14px] font-bold active:scale-[.98] transition">
            Lançar compra
          </button>
        </div>
      </Card>

      {/* pagamentos desta fatura */}
      {statementPayments.length > 0 && (
        <div className="mb-4">
          <div className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted px-1 mb-1.5">Pagamentos</div>
          <Card className="p-1.5">
            {statementPayments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-2.5 py-2.5">
                <div className="grid size-9 place-items-center rounded-[12px] bg-up/15 text-up"><BadgeCheck size={17} /></div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-bold">Pagamento recebido</div>
                  <div className="text-[11.5px] text-muted font-medium">{fmtDate(p.date)} · {data.accounts.find((a) => a.id === p.accountId)?.name}</div>
                </div>
                <Money v={p.amount} className="text-[13.5px] font-extrabold text-up" />
                <button onClick={() => deletePayment(p.id)} className="text-muted active:scale-90 transition p-1" aria-label="Excluir pagamento"><Trash2 size={15} /></button>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* itens */}
      <div className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted px-1 mb-1.5">
        Lançamentos{nextMonths && st.status === "aberta" ? " (fatura em aberto, ainda acumulando)" : ""}
      </div>
      <Card className="p-1.5 divide-y divide-line/70">
        {st.items.length === 0 && <div className="py-8 text-center text-[13px] text-muted font-medium">Nenhuma compra nesta fatura.</div>}
        {st.items.map((t) => {
          const cat = data.categories.find((c) => c.id === t.categoryId);
          return (
            <button key={t.id} onClick={() => onEditTx(t)} className="w-full flex items-center gap-3 px-2.5 py-3 text-left active:bg-raise rounded-2xl transition">
              <IconBubble icon={cat?.icon} color={cat?.color ?? "#64748B"} size={38} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13.5px] font-bold">{t.description}</span>
                  {t.installment && (
                    <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-raise text-muted tabular-nums">{t.installment.n}/{t.installment.of}</span>
                  )}
                </div>
                <div className="text-[11.5px] text-muted font-medium">{fmtDate(t.date)} · {cat?.name ?? "Sem categoria"}</div>
              </div>
              <Money v={t.amount} className="text-[13.5px] font-extrabold" />
            </button>
          );
        })}
      </Card>
      {renderEditSheet()}
      {renderPaySheet()}
    </div>
  );

  function renderPaySheet() {
    return (
      <Sheet
        open={showPay}
        onClose={() => setShowPay(false)}
        title={`Pagar fatura — ${selected?.name ?? ""}`}
        footer={
          <button onClick={confirmPay} className="w-full h-12 rounded-2xl bg-brand text-white text-[15px] font-bold active:scale-[.98] transition">
            Confirmar pagamento
          </button>
        }
      >
        <div className="rounded-2xl bg-raise p-3.5 text-[12.5px] text-muted font-medium mb-4">
          O valor sai da conta escolhida e baixa a fatura — sem contar como nova despesa.
        </div>
        {selected && statement && (
          <div className="flex gap-2 mb-4">
            {[statement.remaining].filter((v) => v > 0.004).map((v) => (
              <Chip key="all" active onClick={() => setPAmount(v.toFixed(2).replace(".", ","))} color={selected.color}>
                Total: {fmtBRL(v)}
              </Chip>
            ))}
            {statement.remaining > 500 && (
              <Chip onClick={() => setPAmount((statement.remaining / 2).toFixed(2).replace(".", ","))}>
                Metade: {fmtBRL(statement.remaining / 2)}
              </Chip>
            )}
          </div>
        )}
        <Field label="Valor do pagamento">
          <input value={pAmount} onChange={(e) => setPAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="input text-[20px] font-bold" />
        </Field>
        <Field label="Conta de débito">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
            {data.accounts.filter((a) => !a.archived && a.kind !== "investment").map((a) => (
              <Chip key={a.id} active={pAcc === a.id} color={a.color} onClick={() => setPAcc(a.id)}>
                <DynIcon name={a.icon} size={14} /> {a.name}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Data" className="mb-1">
          <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)} className="input" />
        </Field>
      </Sheet>
    );
  }

  function renderEditSheet() {
    return (
      <Sheet
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title={editing ? "Editar cartão" : "Novo cartão"}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={saveCardForm} disabled={!fName.trim() || !(Number(fLimit.replace(",", ".")) > 0)} className="w-full h-12 rounded-2xl bg-brand text-white text-[15px] font-bold active:scale-[.98] transition disabled:opacity-40">
              Salvar cartão
            </button>
            {editing && !confirmDelCard && (
              <button onClick={() => setConfirmDelCard(true)} className="w-full h-10 text-[13px] font-bold text-down">Excluir cartão</button>
            )}
            {editing && confirmDelCard && (
              <button
                onClick={() => { deleteCard(editing.id); setShowEdit(false); setSelectedId(null); }}
                className="w-full h-10 rounded-xl bg-down text-white text-[13px] font-bold"
              >
                Confirmar exclusão (lançamentos são mantidos)
              </button>
            )}
          </div>
        }
      >
        <Field label="Nome do cartão">
          <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex.: Nubank, Inter, XP…" className="input" />
        </Field>
        <Field label="Limite total (R$)">
          <input value={fLimit} onChange={(e) => setFLimit(e.target.value)} inputMode="decimal" placeholder="0,00" className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia de fechamento">
            <input value={fClose} onChange={(e) => setFClose(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="input" />
          </Field>
          <Field label="Dia de vencimento">
            <input value={fDue} onChange={(e) => setFDue(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="input" />
          </Field>
        </div>
        <Field label="Conta padrão p/ pagamento">
          <select value={fAcc} onChange={(e) => setFAcc(e.target.value)} className="input">
            <option value="">Nenhuma</option>
            {data.accounts.filter((a) => !a.archived && a.kind !== "investment").map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="Cor" className="mb-1">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setFColor(c)} className={cn("size-9 rounded-full transition active:scale-90", fColor === c && "ring-2 ring-offset-2 ring-ink ring-offset-surface")} style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </Field>
      </Sheet>
    );
  }
}
