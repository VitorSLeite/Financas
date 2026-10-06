import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Delete, X } from "lucide-react";
import { cn } from "../utils/cn";
import { fmtBRL, monthCap, currentMonth } from "../lib/format";
import { DynIcon } from "../lib/icons";

// ---------------------------------------------------------------- Sheet
export function Sheet({
  open, onClose, title, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-[3px] animate-[fade-in_.2s_ease]"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-[430px] max-h-[94dvh] sm:max-h-[88dvh] flex flex-col rounded-t-[26px] sm:rounded-[26px] bg-surface border border-line shadow-2xl animate-[sheet-in_.34s_cubic-bezier(.32,.72,.35,1)]">
        <div className="pt-2.5 pb-1 shrink-0 sm:hidden">
          <div className="mx-auto h-1.5 w-11 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-3 shrink-0">
          <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-raise text-muted active:scale-90 transition"
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-2 grow no-scrollbar">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(env(safe-area-inset-bottom),14px)] bg-surface rounded-b-[26px]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- basics
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line/70 bg-surface p-4", className)}>{children}</div>
  );
}

export function SectionHead({ title, action, className }: { title: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between px-1 mb-2 mt-6", className)}>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      {action}
    </div>
  );
}

export function Money({ v, className, prefix }: { v: number; className?: string; prefix?: string }) {
  return (
    <span className={cn("tabular-nums tracking-tight", className)}>
      {prefix}{fmtBRL(v)}
    </span>
  );
}

export function IconBubble({
  icon, color, size = 38, className,
}: { icon?: string; color: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("grid place-items-center rounded-[30%] shrink-0", className)}
      style={{ width: size, height: size, backgroundColor: color.startsWith("#") ? `${color}1a` : "var(--raise)", color }}
    >
      <DynIcon name={icon} size={size * 0.44} strokeWidth={2} />
    </div>
  );
}

export function Seg<T extends string>({
  options, value, onChange, className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-2xl bg-raise p-1 gap-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all active:scale-[.97]",
            value === o.value ? "bg-surface text-ink shadow-sm border border-line" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active, onClick, children, color,
}: { active?: boolean; onClick?: () => void; children: ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-all active:scale-95",
        active
          ? "border-transparent text-white"
          : "border-line bg-surface text-ink/80",
      )}
      style={active ? { backgroundColor: color ?? "var(--brand)", boxShadow: `0 4px 14px ${color ?? "var(--brand)"}55` } : undefined}
    >
      {children}
    </button>
  );
}

export function Bar({ pct, color, className }: { pct: number; color?: string; className?: string }) {
  const p = Math.min(100, Math.max(0, pct));
  const c = color ?? (pct >= 100 ? "var(--down)" : pct >= 80 ? "var(--warn)" : "var(--up)");
  return (
    <div className={cn("h-2 w-full rounded-full bg-raise overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${p}%`, backgroundColor: c }}
      />
    </div>
  );
}

export function MonthNav({ month, onChange, onTitleClick }: { month: string; onChange: (m: string) => void; onTitleClick?: () => void }) {
  const shift = (d: number) => {
    const [y, m] = month.split("-").map(Number);
    const dt = new Date(y, m - 1 + d, 1);
    onChange(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  };
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-full text-muted active:scale-90 active:bg-raise transition" aria-label="Mês anterior">
        <ChevronLeft size={18} strokeWidth={2.2} />
      </button>
      <button onClick={onTitleClick ?? (() => onChange(currentMonth()))} className="min-w-[132px] text-center text-[14px] font-semibold tracking-tight active:scale-95 transition">
        {monthCap(month)}
        {!isCurrent && <span className="block mx-auto mt-0.5 size-1 rounded-full bg-brand" />}
      </button>
      <button onClick={() => shift(1)} className="grid size-9 place-items-center rounded-full text-muted active:scale-90 active:bg-raise transition" aria-label="Próximo mês">
        <ChevronRight size={18} strokeWidth={2.2} />
      </button>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4", className)}>
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-muted">{label}</div>
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
      <IconBubble icon={icon} color="var(--muted)" size={52} />
      <div className="text-[15px] font-bold mt-1">{title}</div>
      {body && <div className="text-[13px] text-muted max-w-[260px] leading-relaxed">{body}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors duration-200 shrink-0",
        on ? "bg-brand" : "bg-line",
      )}
      role="switch" aria-checked={on}
    >
      <div className={cn(
        "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform duration-200",
        on ? "translate-x-[22px]" : "translate-x-0.5",
      )} />
    </button>
  );
}

/** Monograma VT: barra do T + V convergindo com a haste central. Usa currentColor. */
export function VTMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path d="M9 12.5H39" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <path d="M12.5 12.5L24 37L35.5 12.5" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 12.5V37" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-[28%] shrink-0"
      style={{ width: size, height: size, backgroundColor: "#00C9A7", color: "#070B14" }}
    >
      <VTMark size={size * 0.66} />
    </div>
  );
}

export function Wordmark({ sub = "FINANÇAS PESSOAIS" }: { sub?: string }) {
  return (
    <div className="leading-none">
      <div className="text-[16px] font-bold tracking-tight">VT Flow</div>
      <div className="text-[9.5px] font-semibold tracking-[0.16em] text-muted mt-1">{sub}</div>
    </div>
  );
}

export function ProgressItem({
  title, icon, color, used, total, label, barColor,
}: {
  title: string; icon?: string; color?: string; used: number; total: number;
  label?: string; barColor?: string;
}) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2">
        {icon && <IconBubble icon={icon} color={color ?? "var(--muted)"} size={30} />}
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-semibold truncate">{title}</div>
          <div className="text-[12px] text-muted tabular-nums">
            {fmtBRL(used)} <span className="opacity-60">/</span> {fmtBRL(total)}
          </div>
        </div>
        <div className={cn("text-[13px] font-bold tabular-nums", pct > 100 && "text-down")}>
          {pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          {label && <span className="text-muted font-medium"> {label}</span>}
        </div>
      </div>
      <Bar pct={pct} color={barColor} className="h-1.5" />
    </div>
  );
}

// ---------------------------------------------------------------- keypad
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "back"] as const;

export function Keypad({ cents, onChange, accent }: { cents: number; onChange: (c: number) => void; accent?: string }) {
  const press = (k: (typeof KEYS)[number]) => {
    if (k === "back") onChange(Math.floor(cents / 10));
    else if (k === "00") onChange(cents === 0 ? 0 : Math.min(cents * 100, 99999999900));
    else onChange(Math.min(cents * 10 + Number(k), 99999999900));
    navigator.vibrate?.(4);
  };
  return (
    <div>
      <div className="text-center text-[34px] font-extrabold tabular-nums tracking-tight mb-3" style={{ color: accent }}>
        {fmtBRL(cents / 100)}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            className="h-12 rounded-2xl bg-raise text-[19px] font-semibold tabular-nums active:bg-line active:scale-[.96] transition grid place-items-center select-none"
          >
            {k === "back" ? <Delete size={20} /> : k}
          </button>
        ))}
      </div>
    </div>
  );
}
