import { useId, useMemo } from "react";
import { fmtCompact } from "../lib/format";
import { cn } from "../utils/cn";

// ---------------------------------------------------------------- Donut
export function Donut({
  data, size = 168, thickness = 24, center,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  center?: { top: string; bottom: string };
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = (size - thickness) / 2;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--raise)" strokeWidth={thickness} />
        {total > 0 &&
          data.map((d, i) => {
            const frac = d.value / total;
            const len = Math.max(0, frac * C - 2.5);
            const dashoffset = -acc * C;
            acc += frac;
            return (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={R} fill="none"
                stroke={d.color} strokeWidth={thickness}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={dashoffset}
                strokeLinecap="butt"
                className="transition-all duration-700"
              />
            );
          })}
      </svg>
      {center && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{center.top}</div>
            <div className="text-[19px] font-extrabold tabular-nums tracking-tight">{center.bottom}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DonutLegend({ data, total }: { data: { label: string; value: number; color: string; icon?: React.ReactNode }[]; total: number }) {
  return (
    <div className="flex flex-col gap-2.5 grow min-w-0">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5 text-[13px]">
          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
          <span className="truncate font-medium text-ink/85">{d.label}</span>
          <span className="ml-auto tabular-nums font-bold shrink-0">{fmtCompact(d.value)}</span>
          <span className="w-10 text-right tabular-nums text-muted text-[12px] shrink-0">
            {total > 0 ? `${Math.round((d.value / total) * 100)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Barras agrupadas
export function GroupedBars({
  data, height = 130,
}: {
  data: { label: string; a: number; b: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  return (
    <div className="flex items-end gap-3 sm:gap-4" style={{ height: height + 22 }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <div className="flex items-end gap-1 w-full justify-center" style={{ height }}>
            <div className="flex flex-col items-center justify-end h-full w-[38%] max-w-6">
              <span className="text-[9.5px] font-bold tabular-nums text-up mb-0.5">{d.a > 0 ? fmtCompact(d.a).replace("R$", "").trim() : ""}</span>
              <div
                className="w-full rounded-t-[6px] rounded-b-[2px] bg-gradient-to-t from-up/70 to-up transition-all duration-500"
                style={{ height: `${Math.max(d.a / max * 100, 2)}%` }}
              />
            </div>
            <div className="flex flex-col items-center justify-end h-full w-[38%] max-w-6">
              <span className="text-[9.5px] font-bold tabular-nums text-down mb-0.5">{d.b > 0 ? fmtCompact(d.b).replace("R$", "").trim() : ""}</span>
              <div
                className="w-full rounded-t-[6px] rounded-b-[2px] bg-gradient-to-t from-down/70 to-down transition-all duration-500"
                style={{ height: `${Math.max(d.b / max * 100, 2)}%` }}
              />
            </div>
          </div>
          <span className="text-[11px] font-semibold text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Área / linha
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function AreaChart({
  values, labels, height = 150, className, dangerBelow = 0,
}: {
  values: number[];
  labels?: string[];
  height?: number;
  className?: string;
  dangerBelow?: number | null;
}) {
  const gid = useId();
  const W = 340, H = height, padX = 4, padY = 12;
  const { line, area, min, max, lastPt } = useMemo(() => {
    const min = Math.min(...values, dangerBelow ?? Infinity);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pts: [number, number][] = values.map((v, i) => [
      padX + (i / Math.max(1, values.length - 1)) * (W - padX * 2),
      padY + (1 - (v - min) / span) * (H - padY * 2),
    ]);
    const line = smoothPath(pts);
    const area = `${line} L ${pts[pts.length - 1][0]},${H} L ${pts[0][0]},${H} Z`;
    return { line, area, min, max, lastPt: pts[pts.length - 1] };
  }, [values, H, dangerBelow]);

  const negative = values.some((v) => v < (dangerBelow ?? -Infinity));
  const stroke = negative ? "var(--down)" : "var(--up)";

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {dangerBelow != null && max > dangerBelow && min < dangerBelow && (
          <line x1="0" x2={W} y1={padY + (1 - (dangerBelow - min) / (max - min || 1)) * (H - padY * 2)} y2={padY + (1 - (dangerBelow - min) / (max - min || 1)) * (H - padY * 2)} stroke="var(--down)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={stroke} stroke="var(--surface)" strokeWidth="2" />
      </svg>
      {labels && labels.length > 1 && (
        <div className="flex justify-between text-[10.5px] font-semibold text-muted mt-1 px-0.5">
          <span>{labels[0]}</span>
          {labels.length > 2 && <span>{labels[Math.floor(labels.length / 2)]}</span>}
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- anel de score
export function ScoreRing({ score, size = 168 }: { score: number; size?: number }) {
  const R = (size - 18) / 2;
  const C = 2 * Math.PI * R;
  const p = Math.min(100, Math.max(0, score)) / 100;
  const id = useId();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--info)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--raise)" strokeWidth={13} />
        <circle
          cx={size / 2} cy={size / 2} r={R} fill="none"
          stroke={`url(#${id})`} strokeWidth={13} strokeLinecap="round"
          strokeDasharray={`${p * C} ${C}`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-[38px] font-extrabold tabular-nums tracking-tighter leading-none">{score}</div>
          <div className="text-[11px] font-semibold text-muted mt-1">de 100</div>
        </div>
      </div>
    </div>
  );
}
