import { Lightbulb } from "lucide-react";
import { Sheet, Bar } from "./ui";
import { ScoreRing } from "./charts";
import type { Health } from "../lib/finance";

export function healthMessage(score: number) {
  if (score >= 80) return "Seus gastos estão sob controle este mês.";
  if (score >= 60) return "Bom caminho — alguns ajustes podem melhorar sua nota.";
  if (score >= 40) return "Atenção a gastos e reserva de emergência.";
  return "Seus gastos estão acima do ideal. Veja a análise.";
}

export function HealthSheet({ open, onClose, health }: { open: boolean; onClose: () => void; health: Health }) {
  return (
    <Sheet open={open} onClose={onClose} title="Saúde financeira">
      <div className="flex flex-col items-center text-center pb-4">
        <ScoreRing score={health.score} size={150} />
        <div className="mt-3 text-[17px] font-bold">{health.grade}</div>
        <div className="text-[13px] text-muted mt-1 max-w-[280px]">{healthMessage(health.score)}</div>
      </div>
      <div className="flex flex-col gap-3.5 pb-4">
        {health.parts.map((p) => (
          <div key={p.key}>
            <div className="flex justify-between text-[13px] mb-1.5">
              <span className="font-semibold">{p.label}</span>
              <span className="text-muted">{p.detail}</span>
            </div>
            <Bar pct={(p.pts / p.of) * 100} color="var(--brand)" className="h-1.5" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb size={15} className="text-accent" />
        <span className="text-[14px] font-semibold">Insights</span>
      </div>
      <div className="flex flex-col gap-2 pb-3">
        {health.insights.map((ins, i) => (
          <div key={i} className="rounded-xl bg-raise px-3.5 py-3 text-[13px] leading-relaxed">{ins}</div>
        ))}
      </div>
    </Sheet>
  );
}
