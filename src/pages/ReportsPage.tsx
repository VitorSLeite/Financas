import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb } from "lucide-react";
import { useStore } from "../store/AppStore";
import { Bar, Card, SectionHead, Seg, Money } from "../components/ui";
import { AreaChart, Donut, DonutLegend, GroupedBars, ScoreRing } from "../components/charts";
import {
  budgetUsage, financialHealth, monthTotals, netWorthHistory, patrimonyBreakdown,
  spendingByRootCategory,
} from "../lib/finance";
import { currentMonth, fmtBRL, fmtDate, monthLabel, shiftMonth } from "../lib/format";
import { cn } from "../utils/cn";

const PAL = ["#00C9A7", "#4DA3FF", "#8B7CFF", "#FF5C6C", "#F5B94A", "#5E7BD6", "#7E8BA3", "#2BD9BA", "#5B6880"];

export function ReportsPage() {
  const { data, month } = useStore();
  const [period, setPeriod] = useState<"3" | "6" | "12">("6");
  const n = Number(period);

  const derived = useMemo(() => {
    const months: string[] = [];
    for (let i = n - 1; i >= 0; i--) months.push(shiftMonth(month, -i));
    const perMonth = months.map((m) => ({ m, t: monthTotals(data.txs, m) }));
    const sumI = perMonth.reduce((s, x) => s + x.t.income, 0);
    const sumE = perMonth.reduce((s, x) => s + x.t.expense, 0);
    const spend = spendingByRootCategory(data.txs, data.categories, month);
    const donut = [...spend.entries()]
      .map(([id, value], i) => ({
        label: data.categories.find((c) => c.id === id)?.name ?? "Sem categoria",
        value,
        color: data.categories.find((c) => c.id === id)?.color ?? PAL[i % PAL.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
    const usages = budgetUsage(data.budgets, data.categories, data.txs, month);
    const nw = netWorthHistory(data, 12);
    const pat = patrimonyBreakdown(data);
    const health = financialHealth(data);
    return { months, perMonth, sumI, sumE, donut, usages, nw, pat, health };
  }, [data, month, n]);

  const { perMonth, sumI, sumE, donut, usages, nw, pat, health } = derived;
  const saveRate = sumI > 0 ? ((sumI - sumE) / sumI) * 100 : 0;
  const donutTotal = donut.reduce((s, d) => s + d.value, 0);

  return (
    <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-5xl mx-auto w-full animate-[page-in_.3s_ease]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h1 className="text-[24px] font-extrabold tracking-tight">Relatórios</h1>
        <Seg
          className="w-[220px]"
          value={period}
          onChange={setPeriod}
          options={[{ value: "3", label: "3 meses" }, { value: "6", label: "6 meses" }, { value: "12", label: "1 ano" }]}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2.5 mb-2">
        <Card className="p-3.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Receita média</div>
          <Money v={sumI / n} className="text-[14px] sm:text-[16px] font-extrabold text-up block truncate" />
        </Card>
        <Card className="p-3.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Despesa média</div>
          <Money v={sumE / n} className="text-[14px] sm:text-[16px] font-extrabold text-down block truncate" />
        </Card>
        <Card className="p-3.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-muted">Taxa de poupança</div>
          <span className={cn("text-[14px] sm:text-[16px] font-extrabold tabular-nums", saveRate >= 20 ? "text-up" : saveRate >= 0 ? "text-warn" : "text-down")}>
            {Math.round(saveRate)}%
          </span>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 md:gap-4">
        {/* receitas x despesas */}
        <Card className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-bold">Receitas x despesas</span>
            <div className="flex gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-up" /> Receitas</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-down" /> Despesas</span>
            </div>
          </div>
          <GroupedBars data={perMonth.map((x) => ({ label: monthLabel(x.m, true).slice(0, 3), a: x.t.income, b: x.t.expense }))} height={128} />
        </Card>

        {/* donut por categoria */}
        <Card className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-bold">Gastos por categoria</span>
            <span className="text-[11.5px] font-semibold text-muted">{monthLabel(month)}</span>
          </div>
          {donutTotal <= 0.004 ? (
            <div className="py-10 text-center text-[13px] text-muted font-medium">Sem despesas no mês selecionado.</div>
          ) : (
            <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
              <Donut data={donut} size={150} thickness={22} center={{ top: "Total", bottom: fmtBRL(donutTotal) }} />
              <DonutLegend data={donut} total={donutTotal} />
            </div>
          )}
        </Card>

        {/* orçamento x realizado */}
        <Card className="mt-4">
          <div className="text-[14px] font-bold mb-1">Orçamento x realizado</div>
          <div className="text-[11.5px] font-semibold text-muted mb-4">{monthLabel(month)} · limites definidos em Planejar</div>
          {usages.length === 0 && <div className="py-8 text-center text-[13px] text-muted font-medium">Nenhum orçamento definido.</div>}
          <div className="flex flex-col gap-4">
            {usages.map((u) => (
              <div key={u.budget.id}>
                <div className="flex justify-between text-[12.5px] font-bold mb-1.5">
                  <span>{u.category?.name}</span>
                  <span className="tabular-nums text-muted">{fmtBRL(u.used)} / {fmtBRL(u.budget.amount)}</span>
                </div>
                <div className="relative">
                  <Bar pct={u.pct} color={u.category?.color} />
                  <span className={cn("absolute right-0 -top-4 text-[10.5px] font-extrabold tabular-nums", u.pct > 100 ? "text-down" : "text-muted")}>
                    {Math.round(u.pct)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* patrimônio líquido */}
        <Card className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[14px] font-bold">Patrimônio líquido</span>
            <Money v={pat.net} className={cn("text-[16px] font-extrabold", pat.net < 0 && "text-down")} />
          </div>
          <div className="mb-3" />
          <AreaChart values={nw.map((x) => x.value)} labels={[monthLabel(nw[0].month, true), monthLabel(nw[nw.length - 1].month, true)]} height={130} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-xl bg-up/10 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-up">Disponível</div>
              <Money v={pat.liquid} className="text-[12.5px] font-extrabold block truncate" />
            </div>
            <div className="rounded-xl bg-info/10 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-info">Investido</div>
              <Money v={pat.invested} className="text-[12.5px] font-extrabold block truncate" />
            </div>
            <div className="rounded-xl bg-down/10 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-down">Dívidas cartão</div>
              <Money v={pat.cardDebt} className="text-[12.5px] font-extrabold block truncate" />
            </div>
          </div>
        </Card>
      </div>

      {/* saúde financeira */}
      <SectionHead title="Saúde financeira" />
      <Card>
        <div className="flex items-center gap-6 flex-wrap">
          <ScoreRing score={health.score} />
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn(
                "text-[13px] font-extrabold px-3 py-1.5 rounded-full",
                health.score >= 80 ? "bg-up/15 text-up" : health.score >= 60 ? "bg-info/15 text-info" : health.score >= 40 ? "bg-warn/15 text-warn" : "bg-down/15 text-down",
              )}>
                {health.grade}
              </span>
              <span className="text-[12px] text-muted font-medium">baseada nos últimos 3 meses</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {health.parts.map((p) => (
                <div key={p.key}>
                  <div className="flex justify-between text-[12px] font-bold mb-1">
                    <span>{p.label}</span>
                    <span className="text-muted font-semibold">{p.detail}</span>
                  </div>
                  <Bar pct={(p.pts / p.of) * 100} color="var(--brand)" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Lightbulb size={15} className="text-warn" />
            <span className="text-[13.5px] font-bold">Insights</span>
          </div>
          <div className="flex flex-col gap-2">
            {health.insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-2xl bg-raise px-3.5 py-3 text-[13px] font-medium leading-relaxed">
                {i === 0 && health.score >= 60 ? <CheckCircle2 size={15} className="text-up mt-0.5 shrink-0" /> :
                  ins.includes("estourad") || ins.includes("mais do que ganhou") ? <AlertTriangle size={15} className="text-down mt-0.5 shrink-0" /> :
                    <Info size={15} className="text-info mt-0.5 shrink-0" />}
                {ins}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-4 text-[12px] text-muted font-medium text-center">
        Dados calculados localmente no seu dispositivo · {fmtDate(currentMonth() + "-01")}
      </div>
    </div>
  );
}
