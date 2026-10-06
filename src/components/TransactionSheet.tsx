import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useStore } from "../store/AppStore";
import { Sheet, Field, Chip, IconBubble, Keypad } from "../components/ui";
import { cn } from "../utils/cn";
import { DynIcon } from "../lib/icons";
import type { PayMethod, Transaction, TxType } from "../lib/types";
import { buildInstallments } from "../lib/finance";
import { centsToValue, fmtBRL, todayISO, uid } from "../lib/format";
import { METHOD_LABELS } from "../lib/labels";

export interface TxPreset {
  type?: TxType;
  cardId?: string;
  accountId?: string;
}

const EXP_METHODS: PayMethod[] = ["debit", "pix", "cash", "credit", "boleto"];
const INC_METHODS: PayMethod[] = ["pix", "debit", "cash", "other"];

export function TransactionSheet({
  open, onClose, preset, editTx,
}: {
  open: boolean;
  onClose: () => void;
  preset?: TxPreset;
  editTx?: Transaction | null;
}) {
  const { data, addTransactions, updateTransaction, deleteTransaction } = useStore();
  const [type, setType] = useState<TxType>("expense");
  const [cents, setCents] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [accountId, setAccountId] = useState<string | undefined>();
  const [toAccountId, setToAccountId] = useState<string | undefined>();
  const [method, setMethod] = useState<PayMethod>("debit");
  const [cardId, setCardId] = useState<string | undefined>();
  const [installments, setInstallments] = useState(1);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmDel(false);
    if (editTx) {
      setType(editTx.type);
      setCents(Math.round(editTx.amount * 100));
      setDescription(editTx.description);
      setDate(editTx.date);
      setCategoryId(editTx.categoryId);
      setAccountId(editTx.accountId);
      setToAccountId(editTx.toAccountId);
      setMethod(editTx.method ?? (editTx.cardId ? "credit" : editTx.type === "income" ? "pix" : "debit"));
      setCardId(editTx.cardId);
      setInstallments(1);
    } else {
      setType(preset?.type ?? "expense");
      setCents(0);
      setDescription("");
      setDate(todayISO());
      setCategoryId(undefined);
      setAccountId(preset?.accountId ?? data.accounts.find((a) => !a.archived)?.id);
      setToAccountId(undefined);
      setMethod(preset?.cardId ? "credit" : "debit");
      setCardId(preset?.cardId ?? data.cards[0]?.id);
      setInstallments(1);
    }
  }, [open, editTx, preset]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => {
    if (type === "transfer") return [];
    return data.categories.filter((c) => c.kind === (type === "income" ? "income" : "expense"));
  }, [data.categories, type]);

  const accounts = data.accounts.filter((a) => !a.archived);
  const amount = centsToValue(cents);
  const isCredit = type === "expense" && method === "credit";

  const valid =
    amount > 0.004 &&
    date &&
    (type === "transfer"
      ? accountId && toAccountId && accountId !== toAccountId
      : isCredit
        ? !!cardId
        : !!accountId);

  const save = () => {
    if (!valid) return;
    const base = {
      type,
      amount,
      date,
      description: description.trim() || fallbackDesc(),
      accountId: isCredit ? undefined : accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      cardId: isCredit ? cardId : undefined,
      categoryId: type === "transfer" ? undefined : categoryId,
      method: type === "transfer" ? ("other" as PayMethod) : method,
    };
    if (editTx) {
      updateTransaction({ ...editTx, ...base, installment: editTx.installment, recurKey: editTx.recurKey });
    } else if (isCredit && installments > 1) {
      addTransactions(buildInstallments(base as Omit<Transaction, "id" | "createdAt" | "installment"> & { date: string }, installments));
    } else {
      addTransactions([{ ...base, id: uid(), createdAt: Date.now() } as Transaction]);
    }
    onClose();
  };

  const fallbackDesc = () => {
    if (type === "transfer") return "Transferência";
    const c = data.categories.find((x) => x.id === categoryId);
    return c?.name ?? (type === "income" ? "Receita" : "Despesa");
  };

  const accent = type === "income" ? "var(--up)" : type === "expense" ? "var(--down)" : "var(--info)";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editTx ? "Editar lançamento" : "Novo lançamento"}
      footer={
        <div className="flex flex-col gap-2">
          <button
            onClick={save}
            disabled={!valid}
            className={cn(
              "w-full h-12 rounded-2xl text-[15px] font-bold text-white transition active:scale-[.98]",
              !valid && "opacity-40 pointer-events-none",
            )}
            style={{ backgroundColor: accent, boxShadow: `0 8px 20px ${accent}44` }}
          >
            {editTx ? "Salvar alterações" : `Salvar ${amount > 0 ? fmtBRL(amount) : ""}`}
            {!editTx && isCredit && installments > 1 && amount > 0
              ? ` · ${installments}x de ${fmtBRL(amount / installments)}`
              : ""}
          </button>
          {editTx && !confirmDel && (
            <button
              onClick={() => setConfirmDel(true)}
              className="w-full h-10 rounded-xl text-[13.5px] font-semibold text-down flex items-center justify-center gap-1.5 active:scale-[.98]"
            >
              <Trash2 size={15} /> Excluir lançamento
            </button>
          )}
          {editTx && confirmDel && (
            <div className="flex gap-2">
              <button onClick={() => { deleteTransaction(editTx, false); onClose(); }} className="flex-1 h-10 rounded-xl bg-down text-white text-[13px] font-bold active:scale-[.98]">
                {editTx.installment ? "Excluir só esta" : "Confirmar exclusão"}
              </button>
              {editTx.installment ? (
                <button onClick={() => { deleteTransaction(editTx, true); onClose(); }} className="flex-1 h-10 rounded-xl bg-down/15 text-down text-[13px] font-bold active:scale-[.98]">
                  Excluir todas {editTx.installment.of}x
                </button>
              ) : (
                <button onClick={() => setConfirmDel(false)} className="flex-1 h-10 rounded-xl bg-raise text-[13px] font-bold active:scale-[.98]">
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      }
    >
      {/* tipo */}
      <div className="flex rounded-2xl bg-raise p-1 gap-1 mb-4">
        {(["expense", "income", "transfer"] as TxType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setCategoryId(undefined); }}
            className={cn(
              "flex-1 rounded-xl px-2 py-2.5 text-[13px] font-bold transition-all active:scale-[.97] flex items-center justify-center gap-1",
              type === t ? "bg-surface border border-line shadow-sm" : "text-muted",
              type === t && t === "expense" && "text-down",
              type === t && t === "income" && "text-up",
              type === t && t === "transfer" && "text-info",
            )}
          >
            {t === "transfer" && <ArrowRightLeft size={13} />}
            {t === "expense" ? "Despesa" : t === "income" ? "Receita" : "Transf."}
          </button>
        ))}
      </div>

      <Keypad cents={cents} onChange={setCents} accent={accent} />

      <div className="h-4" />

      {/* conta origem */}
      {type !== "expense" || !isCredit ? (
        <Field label={type === "transfer" ? "De (origem)" : "Conta"}>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
            {accounts.map((a) => (
              <Chip key={a.id} active={accountId === a.id} color={a.color} onClick={() => setAccountId(a.id)}>
                <DynIcon name={a.icon} size={14} /> {a.name}
              </Chip>
            ))}
          </div>
        </Field>
      ) : null}

      {/* destino transferência */}
      {type === "transfer" && (
        <Field label="Para (destino)">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
            {accounts.filter((a) => a.id !== accountId).map((a) => (
              <Chip key={a.id} active={toAccountId === a.id} color={a.color} onClick={() => setToAccountId(a.id)}>
                <DynIcon name={a.icon} size={14} /> {a.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      {/* método de pagamento */}
      {type !== "transfer" && (
        <Field label="Pagamento">
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
            {(type === "expense" ? EXP_METHODS : INC_METHODS).map((m) => (
              <Chip key={m} active={method === m} onClick={() => setMethod(m)}>
                {METHOD_LABELS[m]}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      {/* cartão + parcelas */}
      {isCredit && (
        <>
          <Field label="Cartão">
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
              {data.cards.map((c) => (
                <Chip key={c.id} active={cardId === c.id} color={c.color} onClick={() => setCardId(c.id)}>
                  <span className="size-2 rounded-full" style={{ backgroundColor: cardId === c.id ? "#fff" : c.color }} />
                  {c.name}
                </Chip>
              ))}
              {data.cards.length === 0 && <span className="text-[13px] text-muted py-2">Nenhum cartão cadastrado — adicione um em Cartões</span>}
            </div>
          </Field>
          <Field label="Parcelas">
            <div className="flex items-center gap-3">
              <button onClick={() => setInstallments((i) => Math.max(1, i - 1))} className="grid size-10 place-items-center rounded-xl bg-raise active:scale-90 transition"><Minus size={16} /></button>
              <div className="flex-1 text-center">
                <span className="text-[17px] font-extrabold tabular-nums">{installments}x</span>
                {installments > 1 && amount > 0 && (
                  <span className="block text-[12px] text-muted tabular-nums">{fmtBRL(amount / installments)} por mês</span>
                )}
              </div>
              <button onClick={() => setInstallments((i) => Math.min(36, i + 1))} className="grid size-10 place-items-center rounded-xl bg-raise active:scale-90 transition"><Plus size={16} /></button>
            </div>
          </Field>
        </>
      )}

      {/* categoria */}
      {type !== "transfer" && (
        <Field label="Categoria">
          <div className="grid grid-cols-4 gap-2">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition active:scale-95",
                  categoryId === c.id ? "border-transparent shadow-sm" : "border-line",
                )}
                style={categoryId === c.id ? { backgroundColor: `${c.color}22`, borderColor: `${c.color}66` } : undefined}
              >
                <IconBubble icon={c.icon} color={c.color} size={34} />
                <span className="text-[10.5px] font-semibold leading-tight text-center line-clamp-2">{c.name}</span>
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Descrição">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={fallbackDesc()}
          className="input"
          maxLength={60}
        />
      </Field>

      <Field label="Data" className="mb-1">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </Field>
    </Sheet>
  );
}
