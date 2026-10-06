import { useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { useStore } from "../store/AppStore";
import { Card, IconBubble, Money } from "../components/ui";
import type { Transaction } from "../lib/types";
import { buildStatement } from "../lib/finance";
import {
  WEEK_LETTERS, fmtBRL, monthKey, pad2, todayISO, fmtRelative,
} from "../lib/format";
import { cn } from "../utils/cn";

export function CalendarPage({ onEdit }: { onEdit: (t: Transaction) => void }) {
  const { data, month } = useStore();
  const [selected, setSelected] = useState<string | null>(todayISO());

  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const dim = new Date(y, m, 0).getDate();
  const today = todayISO();

  const dayMap = useMemo(() => {
    const map = new Map<string, { inc: number; exp: number; txs: Transaction[] }>();
    for (const t of data.txs) {
      if (monthKey(t.date) !== month) continue;
      const e = map.get(t.date) ?? { inc: 0, exp: 0, txs: [] };
      e.txs.push(t);
      if (t.type === "income") e.inc += t.amount;
      if (t.type === "expense") e.exp += t.amount;
      map.set(t.date, e);
    }
    return map;
  }, [data.txs, month]);

  const dues = useMemo(() => {
    const out: { date: string; card: string; amount: number; color: string }[] = [];
    for (const card of data.cards) {
      const st = buildStatement(card, month, data.txs, data.payments);
      if (st.remaining > 0.004 && monthKey(st.dueDate) === month)
        out.push({ date: st.dueDate, card: card.name, amount: st.remaining, color: card.color });
    }
    return out;
  }, [data, month]);

  const selDay = selected && monthKey(selected) === month ? selected : null;
  const selTxs = selDay ? [...(dayMap.get(selDay)?.txs ?? [])].sort((a, b) => b.createdAt - a.createdAt) : [];
  const selDues = selDay ? dues.filter((d) => d.date === selDay) : [];

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(`${month}-${pad2(d)}`);

  return (
    <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-3xl mx-auto w-full animate-[page-in_.3s_ease]">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="text-[24px] font-extrabold tracking-tight">Calendário</h1>

      </div>

      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-7 mb-1">
          {WEEK_LETTERS.map((w, i) => (
            <div key={i} className={cn("text-center text-[10.5px] font-extrabold py-1.5", i === 0 ? "text-down/70" : "text-muted")}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((iso, i) => {
            if (!iso) return <div key={`e${i}`} />;
            const d = dayMap.get(iso);
            const due = dues.find((x) => x.date === iso);
            const isToday = iso === today;
            const isSel = iso === selDay;
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                className={cn(
                  "relative flex flex-col items-center rounded-2xl py-2 min-h-[58px] sm:min-h-[66px] transition active:scale-95",
                  isSel ? "bg-brand text-white" : isToday ? "bg-raise" : "hover:bg-raise/70",
                )}
              >
                <span className={cn("text-[13px] font-bold tabular-nums", isSel ? "text-white" : isToday ? "text-brand" : "")}>
                  {Number(iso.slice(8, 10))}
                </span>
                <div className="flex gap-[3px] mt-1 h-[5px]">
                  {d && d.inc > 0 && <span className={cn("size-[5px] rounded-full", isSel ? "bg-white" : "bg-up")} />}
                  {d && d.exp > 0 && <span className={cn("size-[5px] rounded-full", isSel ? "bg-white/80" : "bg-down")} />}
                  {due && <span className={cn("size-[5px] rounded-full", isSel ? "bg-white/60" : "bg-warn")} />}
                </div>
                {d && (d.inc > 0 || d.exp > 0) && (
                  <span className={cn("text-[8.5px] font-bold tabular-nums mt-0.5 hidden sm:block", isSel ? "text-white/85" : d.exp > d.inc ? "text-down/90" : "text-up/90")}>
                    {fmtBRL(Math.abs(d.inc - d.exp)).replace("R$", "").trim()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 px-1 text-[10.5px] font-bold text-muted">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-up" /> Receitas</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-down" /> Despesas</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warn" /> Fatura vence</span>
        </div>
      </Card>

      {/* dia selecionado */}
      <div className="mt-5">
        <div className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted px-1 mb-2">
          {selDay ? fmtRelative(selDay) : "Selecione um dia"}
        </div>
        <Card className="p-1.5 divide-y divide-line/70 min-h-[70px]">
          {selDay && selTxs.length === 0 && selDues.length === 0 && (
            <div className="py-8 text-center text-[13px] text-muted font-medium">Nenhum lançamento neste dia.</div>
          )}
          {selDues.map((d, i) => (
            <div key={`due${i}`} className="flex items-center gap-3 px-2.5 py-3">
              <IconBubble icon="creditCard" color="var(--warn)" size={38} />
              <div className="flex-1">
                <div className="text-[13.5px] font-bold">Vencimento da fatura {d.card}</div>
                <div className="text-[11.5px] text-muted font-medium">valor restante da fatura</div>
              </div>
              <Money v={d.amount} className="text-[13.5px] font-extrabold text-warn" />
            </div>
          ))}
          {selTxs.map((t) => {
            const cat = data.categories.find((c) => c.id === t.categoryId);
            return (
              <button key={t.id} onClick={() => onEdit(t)} className="w-full flex items-center gap-3 px-2.5 py-3 text-left active:bg-raise rounded-2xl transition">
                {t.type === "transfer" ? (
                  <div className="grid size-[38px] place-items-center rounded-[14px] bg-info/15 text-info shrink-0"><ArrowRightLeft size={17} /></div>
                ) : (
                  <IconBubble icon={cat?.icon} color={cat?.color ?? "#64748B"} size={38} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-bold truncate">{t.description}</div>
                  <div className="text-[11.5px] text-muted font-medium truncate">
                    {cat?.name ?? (t.type === "transfer" ? "Transferência" : "Sem categoria")}
                    {t.installment && ` · parcela ${t.installment.n}/${t.installment.of}`}
                    {t.recurKey && " · recorrente"}
                  </div>
                </div>
                <Money v={t.amount} className={cn("text-[13.5px] font-extrabold", t.type === "income" ? "text-up" : t.type === "expense" ? "text-down" : "text-muted")} prefix={t.type === "income" ? "+" : t.type === "expense" ? "−" : ""} />
              </button>
            );
          })}
        </Card>
      </div>
    </div>
  );
}
