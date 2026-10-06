import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowLeftRight, ArrowUp, ChevronDown, ChevronRight, Eye, EyeOff, Plus, Target,
} from "lucide-react";
import { useStore } from "../store/AppStore";
import { Bar, IconBubble, Money, ProgressItem } from "../components/ui";
import { HealthSheet, healthMessage } from "../components/HealthSheet";
import type { TxPreset } from "../components/TransactionSheet";
import type { PageKey } from "../lib/types";
import {
  budgetUsage, buildStatement, cardOutstanding, cashflowProjection, financialHealth,
  goalSaved, investedBalance, liquidBalanceAt, monthTotals, safeToSpend, spendingByRootCategory,
} from "../lib/finance";
import { currentMonth, diffDays, fmtBRL, fmtDateShort, fmtRelative, monthCap, todayISO, shiftMonth } from "../lib/format";
import { cn } from "../utils/cn";

export function useHideMoney() {
  const [hide, setHide] = useState(() => localStorage.getItem("grana-hide") === "1");
  const toggle = () => setHide((h) => { localStorage.setItem("grana-hide", h ? "0" : "1"); return !h; });
  return { hide, toggle };
}

export function HiddenMoney({ v, hide, className, prefix }: { v: number; hide: boolean; className?: string; prefix?: string }) {
  return <span className={cn("tabular-nums tracking-tight", className)}>{hide ? "R$ •••••" : `${prefix ?? ""}${fmtBRL(v)}`}</span>;
}

function Section({ title, action, onAction, children, className }: {
  title: string; action?: string; onAction?: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn("mt-8", className)}>
      <div className="flex items-baseline justify-between mb-3 px-0.5">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {action && (
          <button onClick={onAction} className="text-[12.5px] font-medium text-brand flex items-center gap-0.5 active:opacity-60">
            {action} <ChevronRight size={13} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function Dashboard({ go, onNew, onPayCard }: {
  go: (p: PageKey) => void;
  onNew: (p?: TxPreset) => void;
  onPayCard: (cardId: string) => void;
}) {
  const { data, month, setMonth } = useStore();
  const { hide, toggle } = useHideMoney();
  const [showHealth, setShowHealth] = useState(false);
  const [showSafe, setShowSafe] = useState(false);
  const today = todayISO();
  const isCurrent = month === currentMonth();

  const d = useMemo(() => {
    const totals = monthTotals(data.txs, month);
    const dim = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const upto = isCurrent ? today : `${month}-${String(dim).padStart(2, "0")}`;
    const liquid = liquidBalanceAt(data.accounts, data.txs, data.payments, upto);
    const invested = investedBalance(data.accounts, data.txs, data.payments);
    const cf = cashflowProjection(data, 30);
    const usages = budgetUsage(data.budgets, data.categories, data.txs, month).sort((a, b) => b.pct - a.pct);
    const bills = data.cards.map((c) => ({ card: c, st: buildStatement(c, month, data.txs, data.payments) }));
    const upcoming = data.txs
      .filter((t) => t.type === "expense" && !t.cardId && t.method !== "credit" && t.date >= today && t.date <= shiftMonth(currentMonth(), 1) + "-31")
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const spend = spendingByRootCategory(data.txs, data.categories, month);
    const top = [...spend.entries()]
      .map(([id, value]) => ({ cat: data.categories.find((c) => c.id === id), value }))
      .filter((x) => x.value > 0.004).sort((a, b) => b.value - a.value).slice(0, 5);
    return { totals, liquid, invested, cf, usages, bills, upcoming, top, safe: safeToSpend(data), health: financialHealth(data) };
  }, [data, month, isCurrent, today]);

  const { totals, liquid, invested, cf, usages, bills, upcoming, top, safe, health } = d;
  const result = totals.income - totals.expense;

  return (
    <div className="px-4 sm:px-6 pt-4 pb-36 md:pb-12 max-w-5xl mx-auto w-full animate-[page-in_.25s_ease]">
      {/* ===== saldo */}
      <section className="relative overflow-hidden rounded-3xl bg-surface border border-line/70 p-5 sm:p-7">
        <div className="pointer-events-none absolute -top-32 -right-24 size-72 rounded-full opacity-[.10]" style={{ background: "radial-gradient(circle, var(--brand), transparent 65%)" }} />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-muted">
              {isCurrent ? "SALDO DISPONÍVEL" : `SALDO EM ${monthCap(month).toUpperCase()}`}
            </span>
            <button onClick={toggle} className="grid size-9 -mr-2 place-items-center rounded-full text-muted active:bg-raise transition" aria-label="Ocultar valores">
              {hide ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <div className="mt-1 text-[38px] sm:text-[46px] font-extrabold leading-[1.05] tracking-[-0.03em]">
            <HiddenMoney v={liquid} hide={hide} className={liquid < 0 ? "text-down" : ""} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { l: "Receitas", v: totals.income, c: "text-up" },
              { l: "Despesas", v: totals.expense, c: "text-down" },
              { l: "Resultado", v: result, c: result < 0 ? "text-down" : "" },
            ].map((x) => (
              <div key={x.l} className="min-w-0">
                <div className="text-[11.5px] font-medium text-muted">{x.l}</div>
                <HiddenMoney v={x.v} hide={hide} className={cn("text-[14.5px] sm:text-[16px] font-bold block truncate", x.c)} />
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-line/70 flex flex-wrap gap-x-6 gap-y-1.5 text-[12.5px] text-muted">
            {isCurrent && (
              <span>Previsão 30 dias <HiddenMoney v={cf.d30} hide={hide} className={cn("font-semibold ml-1", cf.d30 < 0 ? "text-down" : "text-ink")} /></span>
            )}
            <span>Investido <HiddenMoney v={invested} hide={hide} className="font-semibold text-ink ml-1" /></span>
          </div>
        </div>
      </section>

      {/* ===== ações */}
      <button
        onClick={() => onNew()}
        className="mt-4 w-full h-[52px] rounded-2xl bg-brand text-[#04140F] text-[15px] font-bold flex items-center justify-center gap-2 active:scale-[.98] transition"
      >
        <Plus size={18} strokeWidth={2.6} /> Novo lançamento
      </button>
      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {[
          { l: "Despesa", i: ArrowDown, c: "text-down", f: () => onNew({ type: "expense" }) },
          { l: "Receita", i: ArrowUp, c: "text-up", f: () => onNew({ type: "income" }) },
          { l: "Transferir", i: ArrowLeftRight, c: "text-info", f: () => onNew({ type: "transfer" }) },
          { l: "Metas", i: Target, c: "text-accent", f: () => go("planning") },
        ].map((a) => (
          <button key={a.l} onClick={a.f} className="h-[62px] rounded-2xl bg-surface border border-line/70 flex flex-col items-center justify-center gap-1 active:scale-95 transition">
            <a.i size={18} className={a.c} strokeWidth={2.2} />
            <span className="text-[11.5px] font-medium">{a.l}</span>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-x-6">
        {/* ===== quanto posso gastar */}
        <Section title="Quanto posso gastar">
          <div className="rounded-2xl bg-surface border border-line/70 p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.14em] text-muted">SEGURO PARA GASTAR</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <HiddenMoney v={safe.perDay} hide={hide} className={cn("text-[30px] font-extrabold tracking-[-0.02em]", safe.perDay > 0 ? "text-brand" : "text-muted")} />
                  <span className="text-[13px] text-muted font-medium">por dia</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-bold tabular-nums leading-none">{safe.daysLeft}</div>
                <div className="text-[11.5px] text-muted mt-1">dias restantes</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-[13px]">
              <span className="text-muted">Disponível no mês</span>
              <HiddenMoney v={Math.max(0, safe.remaining)} hide={hide} className="font-bold" />
            </div>
            {safe.reason && (
              <div className="mt-3 rounded-xl bg-raise px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">{safe.reason}</div>
            )}
            <button onClick={() => setShowSafe((s) => !s)} className="mt-3 flex items-center gap-1 text-[12.5px] font-medium text-brand">
              Como é calculado <ChevronDown size={14} className={cn("transition", showSafe && "rotate-180")} />
            </button>
            {showSafe && (
              <div className="mt-3 flex flex-col gap-2 text-[12.5px] animate-[page-in_.2s_ease]">
                {[
                  ["Saldo disponível", safe.balance, ""],
                  ["Receitas previstas", safe.upcomingIncome, "+"],
                  ["Contas a vencer", -safe.upcomingBills, "−"],
                  ["Faturas de cartão", -safe.cardDue, "−"],
                  ["Orçamentos planejados", -safe.planned, "−"],
                  ["Poupança mínima (10%)", -safe.savings, "−"],
                ].map(([l, v, s]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-muted">{s} {l}</span>
                    <HiddenMoney v={Math.abs(v as number)} hide={hide} className="font-medium" />
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-line/70 font-semibold">
                  <span>Livre até o fim do mês</span>
                  <HiddenMoney v={safe.remaining} hide={hide} className={safe.remaining < 0 ? "text-down" : ""} />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ===== saúde */}
        <Section title="Saúde financeira">
          <button onClick={() => setShowHealth(true)} className="w-full rounded-2xl bg-surface border border-line/70 p-5 text-left active:scale-[.99] transition">
            <div className="flex items-center gap-4">
              <div className="relative size-[64px] shrink-0">
                <svg viewBox="0 0 64 64" className="-rotate-90 size-full">
                  <circle cx="32" cy="32" r="27" fill="none" stroke="var(--raise)" strokeWidth="6" />
                  <circle cx="32" cy="32" r="27" fill="none" stroke="var(--brand)" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(health.score / 100) * 169.6} 169.6`} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-[26px] font-extrabold tabular-nums leading-none">{health.score}</span>
                  <span className="text-[13px] text-muted">/ 100</span>
                  <span className={cn("ml-2 text-[13px] font-semibold", health.score >= 60 ? "text-brand" : health.score >= 40 ? "text-warn" : "text-down")}>{health.grade}</span>
                </div>
                <div className="text-[12.5px] text-muted mt-1.5 leading-snug">{healthMessage(health.score)}</div>
              </div>
              <ChevronRight size={17} className="text-muted shrink-0" />
            </div>
          </button>
        </Section>
      </div>

      {/* ===== cartões */}
      {bills.length > 0 && (
        <Section title="Cartões de crédito" action="Ver todos" onAction={() => go("cards")}>
          <div className="grid sm:grid-cols-2 gap-3">
            {bills.map(({ card, st }) => {
              const out = cardOutstanding(card, data.txs, data.payments);
              const pct = card.limit > 0 ? (out / card.limit) * 100 : 0;
              return (
                <div key={card.id} className="rounded-2xl bg-surface border border-line/70 p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[14px] font-semibold">
                      <span className="h-3.5 w-1 rounded-full" style={{ backgroundColor: card.color }} />
                      {card.name}
                    </span>
                    <span className={cn("text-[11.5px] font-medium",
                      st.status === "vencida" ? "text-down" : st.status === "paga" ? "text-brand" : "text-muted")}>
                      {st.status === "vazia" ? "Sem fatura" : `${st.status[0].toUpperCase()}${st.status.slice(1)} · vence ${fmtDateShort(st.dueDate)}`}
                    </span>
                  </div>
                  <div className="mt-4 text-[11.5px] text-muted font-medium">Fatura atual</div>
                  <HiddenMoney v={st.remaining} hide={hide} className="text-[26px] font-extrabold block leading-tight" />
                  <div className="mt-4 flex justify-between text-[12px] mb-1.5">
                    <span className="text-muted">Limite disponível</span>
                    <HiddenMoney v={Math.max(0, card.limit - out)} hide={hide} className="font-semibold" />
                  </div>
                  <Bar pct={pct} color={pct > 80 ? "var(--down)" : "var(--brand)"} className="h-1.5" />
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11.5px] text-muted tabular-nums">{Math.round(pct)}% do limite usado</span>
                    {st.remaining > 0.004 && (
                      <button onClick={() => onPayCard(card.id)} className="h-8 px-3.5 rounded-lg border border-line text-[12.5px] font-semibold active:bg-raise transition">
                        Pagar fatura
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <div className="grid md:grid-cols-2 gap-x-6">
        <div>
          {/* ===== próximas contas */}
          <Section title="Próximas contas" action="Calendário" onAction={() => go("calendar")}>
            <div className="rounded-2xl bg-surface border border-line/70 divide-y divide-line/60">
              {upcoming.length === 0 && <div className="py-8 text-center text-[13px] text-muted">Nenhuma conta agendada.</div>}
              {upcoming.map((t) => {
                const cat = data.categories.find((c) => c.id === t.categoryId);
                const dd = diffDays(today, t.date);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <IconBubble icon={cat?.icon} color={cat?.color ?? "#7E8BA3"} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold">{t.description}</div>
                      <div className={cn("text-[12px]", dd <= 1 ? "text-down" : "text-muted")}>{fmtRelative(t.date)}</div>
                    </div>
                    <Money v={t.amount} className="text-[13.5px] font-bold" />
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ===== orçamentos */}
          <Section title="Orçamentos" action="Gerenciar" onAction={() => go("planning")}>
            <div className="rounded-2xl bg-surface border border-line/70 p-5 flex flex-col gap-5">
              {usages.length === 0 && <div className="py-3 text-center text-[13px] text-muted">Defina limites por categoria em Planejamento.</div>}
              {usages.slice(0, 4).map((u) => (
                <ProgressItem key={u.budget.id} title={u.category?.name ?? "Categoria"} icon={u.category?.icon} color={u.category?.color}
                  used={u.used} total={u.budget.amount} label="usado" />
              ))}
            </div>
          </Section>
        </div>

        <div>
          {/* ===== para onde foi */}
          <Section title="Para onde foi seu dinheiro" action="Relatórios" onAction={() => go("reports")}>
            <div className="rounded-2xl bg-surface border border-line/70 p-5 flex flex-col gap-4">
              {top.length === 0 && <div className="py-3 text-center text-[13px] text-muted">Sem despesas neste mês.</div>}
              {top.map((t, i) => {
                const pct = totals.expense > 0 ? (t.value / totals.expense) * 100 : 0;
                return (
                  <div key={t.cat?.id ?? i}>
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="font-medium truncate">{t.cat?.name ?? "Sem categoria"}</span>
                      <span className="tabular-nums"><HiddenMoney v={t.value} hide={hide} className="font-semibold" /><span className="text-muted ml-2 text-[12px]">{Math.round(pct)}%</span></span>
                    </div>
                    <Bar pct={pct} color={t.cat?.color ?? "#7E8BA3"} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ===== metas */}
          <Section title="Metas" action="Ver metas" onAction={() => go("planning")}>
            <div className="rounded-2xl bg-surface border border-line/70 p-5 flex flex-col gap-5">
              {data.goals.length === 0 && <div className="py-3 text-center text-[13px] text-muted">Crie sua primeira meta.</div>}
              {data.goals.slice(0, 3).map((g) => (
                <ProgressItem key={g.id} title={g.name} icon={g.icon} color={g.color}
                  used={goalSaved(data.contribs, g)} total={g.target} barColor="var(--accent)" />
              ))}
            </div>
          </Section>
        </div>
      </div>

      {!isCurrent && (
        <div className="mt-6 text-center text-[12.5px] text-muted">
          Visualizando {monthCap(month)} · <button className="text-brand font-semibold" onClick={() => setMonth(currentMonth())}>voltar ao mês atual</button>
        </div>
      )}

      <HealthSheet open={showHealth} onClose={() => setShowHealth(false)} health={health} />
    </div>
  );
}
