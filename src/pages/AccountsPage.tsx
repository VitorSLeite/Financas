import { useState } from "react";
import { Archive, ArrowRightLeft, Plus } from "lucide-react";
import { useStore } from "../store/AppStore";
import { Card, EmptyState, Field, IconBubble, Money, Sheet, Seg, Toggle } from "../components/ui";
import type { Account, AccountKind } from "../lib/types";
import { accountBalanceAt } from "../lib/finance";
import { todayISO, uid } from "../lib/format";
import { PALETTE, PICKER_ICONS, DynIcon } from "../lib/icons";
import { KIND_LABELS } from "../lib/labels";
import { cn } from "../utils/cn";

export function AccountsPage({ onTransfer }: { onTransfer: (accountId: string) => void }) {
  const { data, saveAccount, deleteAccount } = useStore();
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirm, setConfirm] = useState(false);

  const [fName, setFName] = useState("");
  const [fKind, setFKind] = useState<AccountKind>("checking");
  const [fBal, setFBal] = useState("0");
  const [fColor, setFColor] = useState(PALETTE[0]);
  const [fIcon, setFIcon] = useState("landmark");
  const [fArchived, setFArchived] = useState(false);

  const today = todayISO();
  const balances = new Map(data.accounts.map((a) => [a.id, accountBalanceAt(a, data.txs, data.payments, today)]));
  const total = data.accounts.filter((a) => !a.archived).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

  const openNew = () => {
    setEditing(null); setFName(""); setFKind("checking"); setFBal("0");
    setFColor(PALETTE[(data.accounts.length * 3) % PALETTE.length]); setFIcon("landmark");
    setFArchived(false); setConfirm(false); setShowEdit(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a); setFName(a.name); setFKind(a.kind);
    const bal = balances.get(a.id) ?? a.initialBalance;
    setFBal(bal.toFixed(2).replace(".", ","));
    setFColor(a.color); setFIcon(a.icon); setFArchived(!!a.archived); setConfirm(false); setShowEdit(true);
  };

  const save = () => {
    if (!fName.trim()) return;
    const target = Number(fBal.replace(/\./g, "").replace(",", ".")) || 0;
    // ajusta o saldo inicial para que o saldo atual seja o informado
    const moves = editing ? (balances.get(editing.id) ?? 0) - editing.initialBalance : 0;
    saveAccount({
      id: editing?.id ?? uid(),
      name: fName.trim(),
      kind: fKind,
      initialBalance: editing ? target - moves : target,
      color: fColor,
      icon: fIcon,
      archived: fArchived || undefined,
    });
    setShowEdit(false);
  };

  const visible = data.accounts.filter((a) => !a.archived);
  const archived = data.accounts.filter((a) => a.archived);

  return (
    <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-5xl mx-auto w-full animate-[page-in_.3s_ease]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight">Contas</h1>
          <div className="text-[13px] font-semibold text-muted">Total: <Money v={total} className="text-ink font-extrabold" /></div>
        </div>
        <button onClick={openNew} className="h-10 px-4 rounded-2xl bg-brand text-white text-[13.5px] font-bold flex items-center gap-1.5 active:scale-95 transition">
          <Plus size={15} strokeWidth={3} /> Nova conta
        </button>
      </div>

      {visible.length === 0 && <EmptyState icon="landmark" title="Nenhuma conta" body="Adicione contas correntes, poupanças, carteiras e investimentos." />}

      <div className="grid sm:grid-cols-2 gap-3">
        {visible.map((a) => {
          const bal = balances.get(a.id) ?? 0;
          return (
            <Card key={a.id} className="flex items-center gap-3.5">
              <IconBubble icon={a.icon} color={a.color} size={46} />
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-bold truncate">{a.name}</div>
                <div className="text-[11.5px] text-muted font-semibold">{KIND_LABELS[a.kind]}</div>
              </div>
              <div className="text-right">
                <Money v={bal} className={cn("text-[16px] font-extrabold block", bal < 0 && "text-down")} />
                <div className="flex gap-1 mt-1.5 justify-end">
                  <button onClick={() => onTransfer(a.id)} className="grid size-8 place-items-center rounded-lg bg-raise text-muted active:scale-90 transition" aria-label="Transferir"><ArrowRightLeft size={14} /></button>
                  <button onClick={() => openEdit(a)} className="h-8 px-3 rounded-lg bg-raise text-[12px] font-bold text-muted active:scale-90 transition">Editar</button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {archived.length > 0 && (
        <>
          <div className="flex items-center gap-2 px-1 mt-6 mb-2 text-muted">
            <Archive size={13} />
            <span className="text-[12px] font-bold uppercase tracking-[0.07em]">Arquivadas</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 opacity-60">
            {archived.map((a) => (
              <Card key={a.id} className="flex items-center gap-3.5">
                <IconBubble icon={a.icon} color={a.color} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate">{a.name}</div>
                </div>
                <button onClick={() => saveAccount({ ...a, archived: undefined })} className="h-8 px-3 rounded-lg bg-raise text-[12px] font-bold active:scale-90 transition">Restaurar</button>
              </Card>
            ))}
          </div>
        </>
      )}

      <Sheet
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title={editing ? "Editar conta" : "Nova conta"}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={save} disabled={!fName.trim()} className="w-full h-12 rounded-2xl bg-brand text-white text-[15px] font-bold active:scale-[.98] transition disabled:opacity-40">
              Salvar conta
            </button>
            {editing && !confirm && (
              <button onClick={() => setConfirm(true)} className="w-full h-10 text-[13px] font-bold text-down">Excluir conta</button>
            )}
            {editing && confirm && (
              <button onClick={() => { deleteAccount(editing.id); setShowEdit(false); }} className="w-full h-10 rounded-xl bg-down text-white text-[13px] font-bold">
                Confirmar exclusão (lançamentos são mantidos)
              </button>
            )}
          </div>
        }
      >
        <Field label="Nome">
          <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex.: Nubank, Itaú, Carteira…" className="input" />
        </Field>
        <Field label="Tipo">
          <Seg
            value={fKind}
            onChange={setFKind}
            options={[
              { value: "checking", label: "Corrente" },
              { value: "savings", label: "Poupança" },
              { value: "wallet", label: "Carteira" },
              { value: "investment", label: "Investim." },
            ]}
          />
        </Field>
        <Field label={editing ? "Saldo atual (R$)" : "Saldo inicial (R$)"}>
          <input value={fBal} onChange={(e) => setFBal(e.target.value)} inputMode="decimal" className="input" />
          {editing && <div className="text-[11.5px] text-muted font-medium mt-1.5">Um ajuste automático é feito para bater o saldo informado.</div>}
        </Field>
        <Field label="Ícone">
          <div className="flex gap-2 flex-wrap">
            {PICKER_ICONS.slice(0, 18).map((i) => (
              <button key={i} onClick={() => setFIcon(i)} className={cn("grid size-10 place-items-center rounded-xl transition active:scale-90", fIcon === i ? "text-white" : "bg-raise text-muted")} style={fIcon === i ? { backgroundColor: fColor } : undefined} aria-label={i}>
                <DynIcon name={i} size={17} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cor">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setFColor(c)} className={cn("size-9 rounded-full transition active:scale-90", fColor === c && "ring-2 ring-offset-2 ring-ink ring-offset-surface")} style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </Field>
        {editing && (
          <div className="flex items-center justify-between rounded-2xl bg-raise px-4 py-3 mb-1">
            <span className="text-[13.5px] font-bold">Arquivar conta</span>
            <Toggle on={fArchived} onChange={setFArchived} />
          </div>
        )}
      </Sheet>
    </div>
  );
}
