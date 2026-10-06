// ---------- ids ----------
export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

// ---------- money ----------
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
export const fmtBRL = (v: number) => brl.format(v);

const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
export const fmtCompact = (v: number) => brlCompact.format(v);

export const centsToValue = (c: number) => c / 100;

// ---------- dates (local, ISO yyyy-mm-dd) ----------
export const pad2 = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export const todayISO = () => toISO(new Date());
export const monthKey = (iso: string) => iso.slice(0, 7);
export const currentMonth = () => todayISO().slice(0, 7);

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** mesma data N meses à frente, limitando o dia ao fim do mês */
export function shiftDateMonths(iso: string, delta: number): string {
  const d = fromISO(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1);
  const mk = `${target.getFullYear()}-${pad2(target.getMonth() + 1)}`;
  return `${mk}-${pad2(Math.min(day, daysInMonth(mk)))}`;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MESES_CURTOS = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export function monthLabel(month: string, short = false): string {
  const [y, m] = month.split("-").map(Number);
  return short ? `${MESES_CURTOS[m - 1]}/${String(y).slice(2)}` : `${MESES[m - 1]} de ${y}`;
}
export const monthCap = (month: string) => {
  const l = monthLabel(month);
  return l.charAt(0).toUpperCase() + l.slice(1);
};

/** DD/MM/YYYY */
export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
export const fmtDateShort = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export function fmtRelative(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Hoje";
  if (iso === addDaysISO(today, 1)) return "Amanhã";
  if (iso === addDaysISO(today, -1)) return "Ontem";
  return fmtDate(iso);
}

export function diffDays(fromISO_: string, toISO_: string): number {
  return Math.round((fromISO(toISO_).getTime() - fromISO(fromISO_).getTime()) / 86400000);
}

export const WEEK_LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
