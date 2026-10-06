import { useMemo, useState } from "react";
import { Minus, Plus, Repeat, Trash2, Waves } from "lucide-react";
import { useStore } from "../store/AppStore";
import {
  Bar, Card, Chip, EmptyState, Field, IconBubble, Money, Seg, Sheet, Toggle,
} from "../components/ui";
import { AreaChart } from "../components/charts";
import type { Goal, Recurring } from "../lib/types";
import { budgetUsage, cashflowProjection, goalSaved } from "../lib/finance";
import { fmtBRL, fmtDate, monthCap, todayISO, uid } from "../lib/format";
import { PALETTE, DynIcon } from "../lib/icons";
import { GROUP_LABELS } from "../lib/labels";
import { cn } from "../utils/cn";

type Tab = "orc" | "metas" | "rec" | "fluxo";

export function PlanningPage() {
  const { data, month, saveBudget, deleteBudget, saveGoal, deleteGoal, addContrib, saveRecurring, deleteRecurring } = useStore();
  const [tab, setTab] = useState<Tab>("orc");

  // ------ sheets state
  const [showBudget, setShowBudget] = useState(false);
  const [bEditId, setBEditId] = useState<string | null>(null);
  const [bCat, setBCat] = useState("");
  const [bAmount, setBAmount] = useState("");

  const [showGoal, setShowGoal] = useState(false);
  const [gEdit, setGEdit] = useState<Goal | null>(null);
  const [gName, setGName] = useState("");
  const [gTarget, setGTarget] = useState("");
  const [gDeadline, setGDeadline] = useState("");
  const [gIcon, setGIcon] = useState("piggy");
  const [gColor, setGColor] = useState(PALETTE[0]);
  const [gConfirm, setGConfirm] = useState(false);

  const [contribOf, setContribOf] = useState<Goal | null>(null);
  const [cAmount, setCAmount] = useState("");
  const [cMode, setCMode] = useState<"in" | "out">("in");

  const [showRec, setShowRec] = useState(false);
  const [rType, setRType] = useState<"expense" | "income">("expense");
  const [rDesc, setRDesc] = useState("");
  const [rAmount, setRAmount] = useState("");
  const [rDay, setRDay] = useState("5");
  const [rCat, setRCat] = useState("");
  const [rAcc, setRAcc] = useState("");
  const [rCredit, setRCredit] = useState(false);
  const [rCard, setRCard] = useState("");

  const [days, setDays] = useState<30 | 60 | 90>(30);

  const usages = useMemo(
    () => budgetUsage(data.budgets, data.categories, data.txs, month).sort((a, b) => b.pct - a.pct),
    [data, month],
  );
  const cf = useMemo(() => cashflowProjection(data, 90), [data]);
  const rootExpenseCats = data.categories.filter((c) => c.kind === "expense" && !c.parentId);
  const parseNum = (s: string) => Number(s.replace(/\./g, "").replace(",", ".")) || 0;

  // ------------------------------------------------------------ orçamentos
  const openBudgetNew = () => {
    setBEditId(null);
    const free = rootExpenseCats.find((c) => !data.budgets.some((b) => b.categoryId === c.id));
    setBCat(free?.id ?? rootExpenseCats[0]?.id ?? "");
    setBAmount("");
    setShowBudget(true);
  };
  const openBudgetEdit = (id: string, catId: string, amount: number) => {
    setBEditId(id); setBCat(catId); setBAmount(String(amount).replace(".", ","));
    setShowBudget(true);
  };
  const saveBudgetForm = () => {
    const amount = parseNum(bAmount);
    if (!bCat || amount <= 0) return;
    saveBudget({ id: bEditId ?? uid(), categoryId: bCat, amount });
    setShowBudget(false);
  };

  // ------------------------------------------------------------ metas
  const openGoalNew = () => {
    setGEdit(null); setGName(""); setGTarget(""); setGDeadline("");
    setGIcon("piggy"); setGColor(PALETTE[(data.goals.length * 5) % PALETTE.length]);
    setGConfirm(false); setShowGoal(true);
  };
  const openGoalEdit = (g: Goal) => {
    setGEdit(g); setGName(g.name); setGTarget(String(g.target).replace(".", ","));
    setGDeadline(g.deadline ?? ""); setGIcon(g.icon); setGColor(g.color);
    setGConfirm(false); setShowGoal(true);
  };
  const saveGoalForm = () => {
    const target = parseNum(gTarget);
    if (!gName.trim() || target <= 0) return;
    saveGoal({
      id: gEdit?.id ?? uid(), name: gName.trim(), target, color: gColor,
      icon: gIcon, deadline: gDeadline || undefined, createdAt: gEdit?.createdAt ?? Date.now(),
    });
    setShowGoal(false);
  };
  const doContrib = () => {
    if (!contribOf) return;
    const v = parseNum(cAmount);
    if (v <= 0) return;
    addContrib({ id: uid(), goalId: contribOf.id, amount: cMode === "in" ? v : -v, date: todayISO() });
    setContribOf(null); setCAmount("");
  };

  // ------------------------------------------------------------ recorrentes
  const openRecNew = () => {
    setRType("expense"); setRDesc(""); setRAmount(""); setRDay("5");
    setRCat(""); setRAcc(data.accounts.find((a) => !a.archived && a.kind !== "investment")?.id ?? "");
    setRCredit(false); setRCard(data.cards[0]?.id ?? "");
    setShowRec(true);
  };
  const saveRec = () => {
    const amount = parseNum(rAmount);
    const day = Math.min(31, Math.max(1, Number(rDay) || 1));
    if (!rDesc.trim() || amount <= 0) return;
    const credit = rType === "expense" && rCredit && rCard;
    const rule: Recurring = {
      id: uid(), type: rType, amount, day, description: rDesc.trim(),
      accountId: credit ? undefined : rAcc || undefined,
      cardId: credit ? rCard : undefined,
      categoryId: rCat || undefined,
      method: credit ? "credit" : "debit",
      start: month, active: true,
    };
    saveRecurring(rule);
    setShowRec(false);
  };

  const goalIcons = ["piggy", "plane", "car", "home", "smartphone", "graduation", "heartPulse", "gift", "trendingUp", "gamepad", "shoppingBag", "sparkles"];

  return (
    <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-5xl mx-auto w-full animate-[page-in_.3s_ease]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-[24px] font-extrabold tracking-tight">Planejar</h1>

      </div>

      <Seg
        className="mb-5"
        value={tab}
        onChange={setTab}
        options={[
          { value: "orc", label: "Orçamentos" },
          { value: "metas", label: "Metas" },
          { value: "rec", label: "Recorrentes" },
          { value: "fluxo", label: "Fluxo de caixa" },
        ]}
      />

      {/* ================================ ORÇAMENTOS */}
      {tab === "orc" && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={openBudgetNew} className="h-10 px-4 rounded-2xl bg-brand text-white text-[13.5px] font-bold flex items-center gap-1.5 active:scale-95 transition">
              <Plus size={15} strokeWidth={3} /> Novo limite
            </button>
          </div>
          {usages.length === 0 && (
            <EmptyState icon="receipt" title="Sem orçamentos" body="Defina quanto quer gastar por categoria em cada mês e acompanhe o percentual usado." />
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {usages.map((u) => (
              <button key={u.budget.id} onClick={() => openBudgetEdit(u.budget.id, u.budget.categoryId, u.budget.amount)} className="rounded-[22px] border border-line bg-surface p-4 text-left active:scale-[.98] transition">
                <div className="flex items-center gap-3 mb-3">
                  <IconBubble icon={u.category?.icon} color={u.category?.color ?? "#64748B"} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold truncate">{u.category?.name}</div>
                    <div className="text-[11px] font-semibold text-muted">{u.category?.group ? GROUP_LABELS[u.category.group] : "—"} · {monthCap(month)}</div>
                  </div>
                  <span className={cn("text-[12px] font-extrabold tabular-nums", u.pct >= 100 ? "text-down" : u.pct >= 80 ? "text-warn" : "text-up")}>
                    {Math.round(u.pct)}%
                  </span>
                </div>
                <Bar pct={u.pct} />
                <div className="flex justify-between mt-2 text-[12px] font-semibold text-muted tabular-nums">
                  <span>{fmtBRL(u.used)} usados</span>
                  <span>{u.pct <= 100 ? `${fmtBRL(u.budget.amount - u.used)} livres` : `${fmtBRL(u.used - u.budget.amount)} acima`}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================================ METAS */}
      {tab === "metas" && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={openGoalNew} className="h-10 px-4 rounded-2xl bg-brand text-white text-[13.5px] font-bold flex items-center gap-1.5 active:scale-95 transition">
              <Plus size={15} strokeWidth={3} /> Nova meta
            </button>
          </div>
          {data.goals.length === 0 && (
            <EmptyState icon="piggy" title="Nenhuma meta ainda" body="Crie sua primeira meta para começar a planejar suas finanças." />
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {data.goals.map((g) => {
              const saved = goalSaved(data.contribs, g);
              const pct = g.target > 0 ? (saved / g.target) * 100 : 0;
              return (
                <div key={g.id} className="rounded-[24px] border border-line bg-surface p-4">
                  <div className="flex items-start gap-3">
                    <IconBubble icon={g.icon} color={g.color} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-bold truncate">{g.name}</div>
                      <div className="text-[12px] font-semibold text-muted tabular-nums">
                        {fmtBRL(saved)} <span className="text-muted/60">de</span> {fmtBRL(g.target)}
                      </div>
                      {g.deadline && <div className="text-[11px] text-muted font-medium">até {fmtDate(g.deadline)}</div>}
                    </div>
                    <span className="text-[13px] font-extrabold tabular-nums" style={{ color: g.color }}>{Math.floor(pct)}%</span>
                  </div>
                  <Bar pct={pct} color={g.color} className="mt-3" />
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => { setContribOf(g); setCMode("in"); setCAmount(""); }} className="flex-1 h-9 rounded-xl text-[12.5px] font-bold text-white active:scale-[.98] transition" style={{ backgroundColor: g.color }}>
                      Depositar
                    </button>
                    <button onClick={() => { setContribOf(g); setCMode("out"); setCAmount(""); }} className="h-9 px-3 rounded-xl bg-raise text-[12.5px] font-bold active:scale-[.98] transition" aria-label="Resgatar">
                      <Minus size={15} />
                    </button>
                    <button onClick={() => openGoalEdit(g)} className="h-9 px-3 rounded-xl bg-raise text-[12.5px] font-bold active:scale-[.98] transition">Editar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================ RECORRENTES */}
      {tab === "rec" && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={openRecNew} className="h-10 px-4 rounded-2xl bg-brand text-white text-[13.5px] font-bold flex items-center gap-1.5 active:scale-95 transition">
              <Plus size={15} strokeWidth={3} /> Novo fixo
            </button>
          </div>
          {data.recurring.length === 0 && (
            <EmptyState icon="receipt" title="Nada recorrente" body="Salário, aluguel, assinaturas: cadastre uma vez e o app lança automaticamente todo mês." />
          )}
          <Card className="p-1.5 divide-y divide-line/70">
            {data.recurring.map((r) => {
              const cat = data.categories.find((c) => c.id === r.categoryId);
              return (
                <div key={r.id} className="flex items-center gap-3 px-2.5 py-3">
                  <IconBubble icon={cat?.icon ?? (r.type === "income" ? "banknote" : "receipt")} color={cat?.color ?? (r.type === "income" ? "var(--up)" : "#64748B")} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13.5px] font-bold truncate">{r.description}</span>
                      <Repeat size={11} className="text-muted shrink-0" />
                    </div>
                    <div className="text-[11.5px] text-muted font-medium truncate">
                      todo dia {r.day} · {r.cardId ? `${data.cards.find((c) => c.id === r.cardId)?.name} (crédito)` : data.accounts.find((a) => a.id === r.accountId)?.name ?? "—"}
                    </div>
                  </div>
                  <Money v={r.amount} className={cn("text-[13.5px] font-extrabold", r.type === "income" ? "text-up" : "text-down")} prefix={r.type === "income" ? "+" : "−"} />
                  <Toggle on={r.active} onChange={(v) => saveRecurring({ ...r, active: v })} />
                  <button onClick={() => deleteRecurring(r.id)} className="text-muted active:scale-90 transition p-1" aria-label="Excluir"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </Card>
          <div className="text-[12px] text-muted font-medium px-1 mt-3">
            Lançamentos são gerados automaticamente até 12 meses à frente — inclusive na aba de fluxo de caixa e no calendário.
          </div>
        </div>
      )}

      {/* ================================ FLUXO DE CAIXA */}
      {tab === "fluxo" && (
        <div>
          <Seg
            className="mb-4 max-w-xs"
            value={String(days) as "30" | "60" | "90"}
            onChange={(v) => setDays(Number(v) as 30 | 60 | 90)}
            options={[{ value: "30", label: "30 dias" }, { value: "60", label: "60 dias" }, { value: "90", label: "90 dias" }]}
          />
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { l: "Hoje", v: cf.start },
              { l: "+30d", v: cf.d30 },
              { l: days === 30 ? "+60d" : `+${days}d`, v: days === 30 ? cf.d60 : days === 60 ? cf.d60 : cf.d90 },
            ].map((x, i) => (
              <Card key={i} className="p-3.5">
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted">{x.l}</div>
                <Money v={x.v} className={cn("text-[14px] sm:text-[16px] font-extrabold block truncate", x.v < 0 && "text-down")} />
              </Card>
            ))}
          </div>
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Waves size={15} className="text-info" />
              <span className="text-[13px] font-bold">Projeção do saldo disponível</span>
            </div>
            <AreaChart
              values={cf.points.slice(0, days + 1).map((p) => p.balance)}
              labels={[fmtDate(cf.points[0].date).slice(0, 5), fmtDate(cf.points[Math.min(days, cf.points.length - 1)].date).slice(0, 5)]}
              height={150}
            />
            <div className="text-[12px] text-muted font-medium mt-3 leading-relaxed">
              Considera saldo atual, receitas e despesas agendadas (inclusive recorrentes) e faturas de cartão a vencer no período.
            </div>
          </Card>
        </div>
      )}

      {/* ================================ SHEETS */}
      <Sheet
        open={showBudget}
        onClose={() => setShowBudget(false)}
        title={bEditId ? "Editar orçamento" : "Novo orçamento"}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={saveBudgetForm} disabled={!bCat || parseNum(bAmount) <= 0} className="w-full h-12 rounded-2xl bg-brand text-white text-[15px] font-bold active:scale-[.98] transition disabled:opacity-40">
              Salvar
            </button>
            {bEditId && (
              <button onClick={() => { deleteBudget(bEditId); setShowBudget(false); }} className="w-full h-10 text-[13px] font-bold text-down">
                Remover orçamento
              </button>
            )}
          </div>
        }
      >
        <Field label="Categoria de despesa">
          <div className="grid grid-cols-4 gap-2">
            {rootExpenseCats.map((c) => {
              const taken = data.budgets.some((b) => b.categoryId === c.id && b.id !== bEditId);
              return (
                <button
                  key={c.id}
                  disabled={taken}
                  onClick={() => setBCat(c.id)}
                  className={cn("flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition active:scale-95", bCat === c.id ? "border-transparent" : "border-line", taken && "opacity-35")}
                  style={bCat === c.id ? { backgroundColor: `${c.color}22`, borderColor: `${c.color}66` } : undefined}
                >
                  <IconBubble icon={c.icon} color={c.color} size={32} />
                  <span className="text-[10px] font-semibold text-center leading-tight line-clamp-2">{c.name}</span>
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Limite mensal (R$)" className="mb-1">
          <input value={bAmount} onChange={(e) => setBAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="input text-[18px] font-bold" />
        </Field>
      </Sheet>

      <Sheet
        open={showGoal}
        onClose={() => setShowGoal(false)}
        title={gEdit ? "Editar meta" : "Nova meta"}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={saveGoalForm} disabled={!gName.trim() || parseNum(gTarget) <= 0} className="w-full h-12 rounded-2xl bg-brand text-white text-[15px] font-bold active:scale-[.98] transition disabled:opacity-40">
              Salvar meta
            </button>
            {gEdit && !gConfirm && <button onClick={() => setGConfirm(true)} className="w-full h-10 text-[13px] font-bold text-down">Excluir meta</button>}
            {gEdit && gConfirm && (
              <button onClick={() => { deleteGoal(gEdit.id); setShowGoal(false); }} className="w-full h-10 rounded-xl bg-down text-white text-[13px] font-bold">Confirmar exclusão</button>
            )}
          </div>
        }
      >
        <Field label="Nome da meta">
          <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Ex.: Reserva de emergência, Viagem, Carro…" className="input" />
        </Field>
        <Field label="Valor objetivo (R$)">
          <input value={gTarget} onChange={(e) => setGTarget(e.target.value)} inputMode="decimal" placeholder="0,00" className="input" />
        </Field>
        <Field label="Prazo (opcional)">
          <input type="date" value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} className="input" />
        </Field>
        <Field label="Ícone">
          <div className="flex gap-2 flex-wrap">
            {goalIcons.map((i) => (
              <button key={i} onClick={() => setGIcon(i)} className={cn("grid size-10 place-items-center rounded-xl transition active:scale-90", gIcon === i ? "text-white" : "bg-raise text-muted")} style={gIcon === i ? { backgroundColor: gColor } : undefined} aria-label={i}>
                <DynIcon name={i} size={17} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cor" className="mb-1">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setGColor(c)} className={cn("size-9 rounded-full transition active:scale-90", gColor === c && "ring-2 ring-offset-2 ring-ink ring-offset-surface")} style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </Field>
      </Sheet>

      <Sheet
        open={!!contribOf}
        onClose={() => setContribOf(null)}
        title={cMode === "in" ? `Depositar — ${contribOf?.name}` : `Resgatar — ${contribOf?.name}`}
        footer={
          <button onClick={doContrib} disabled={parseNum(cAmount) <= 0} className="w-full h-12 rounded-2xl text-white text-[15px] font-bold active:scale-[.98] transition disabled:opacity-40" style={{ backgroundColor: contribOf?.color ?? "var(--brand)" }}>
            Confirmar
          </button>
        }
      >
        <div className="flex gap-2 mb-4">

        </div>
        <Field label="Valor (R$)" className="mb-1">
          <input value={cAmount} onChange={(e) => setCAmount(e.target.value)} inputMode="decimal" autoFocus className="input text-[20px] font-bold" placeholder="0,00" />
        </Field>
        {contribOf && cMode === "out" && (
          <div className="text-[12px] text-muted font-medium">Disponível na meta: {fmtBRL(goalSaved(data.contribs, contribOf))}</div>
        )}
      </Sheet>

      <Sheet
        open={showRec}
        onClose={() => setShowRec(false)}
        title="Novo lançamento recorrente"
        footer={
          <button onClick={saveRec} disabled={!rDesc.trim() || parseNum(rAmount) <= 0} className="w-full h-12 rounded-2xl bg-brand text-white text-[15px] font-bold active:scale-[.98] transition disabled:opacity-40">
            Criar recorrência
          </button>
        }
      >
        <Seg className="mb-4" value={rType} onChange={setRType} options={[{ value: "expense", label: "Despesa fixa" }, { value: "income", label: "Receita fixa" }]} />
        <Field label="Descrição">
          <input value={rDesc} onChange={(e) => setRDesc(e.target.value)} placeholder="Ex.: Aluguel, Salário, Netflix…" className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor (R$)">
            <input value={rAmount} onChange={(e) => setRAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className="input" />
          </Field>
          <Field label="Dia do mês">
            <input value={rDay} onChange={(e) => setRDay(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="input" />
          </Field>
        </div>
        <Field label="Categoria">
          <select value={rCat} onChange={(e) => setRCat(e.target.value)} className="input">
            <option value="">Sem categoria</option>
            {data.categories.filter((c) => c.kind === rType).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {rType === "expense" && (
          <div className="flex items-center justify-between rounded-2xl bg-raise px-4 py-3 mb-4">
            <span className="text-[13.5px] font-bold">No cartão de crédito</span>
            <Toggle on={rCredit} onChange={setRCredit} />
          </div>
        )}
        {rType === "expense" && rCredit ? (
          <Field label="Cartão">
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
              {data.cards.map((c) => (
                <Chip key={c.id} active={rCard === c.id} color={c.color} onClick={() => setRCard(c.id)}>{c.name}</Chip>
              ))}
            </div>
          </Field>
        ) : (
          <Field label="Conta" className="mb-1">
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 pb-0.5">
              {data.accounts.filter((a) => !a.archived && a.kind !== "investment").map((a) => (
                <Chip key={a.id} active={rAcc === a.id} color={a.color} onClick={() => setRAcc(a.id)}>
                  <DynIcon name={a.icon} size={14} /> {a.name}
                </Chip>
              ))}
            </div>
          </Field>
        )}
        {rType === "expense" && rCredit && data.cards.length === 0 && (
          <div className="text-[12px] text-muted font-medium">Cadastre um cartão primeiro.</div>
        )}
        <div className="rounded-2xl bg-raise p-3.5 text-[12.5px] text-muted font-medium">
          Começa em {monthCap(month)} e se repete automaticamente todo mês (gerado até 12 meses à frente).
        </div>
      </Sheet>
    </div>
  );
}
