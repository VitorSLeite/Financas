import { useMemo, useState } from "react";
import {
  Bell, CalendarDays, CreditCard, House, LayoutGrid, PieChart, Plus, ReceiptText,
  Settings, Target, TriangleAlert, AlertCircle, Info, Wallet,
} from "lucide-react";
import { AppProvider, useStore } from "./store/AppStore";
import { Logo, MonthNav, Seg, Sheet, Wordmark } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { TransactionsPage } from "./pages/TransactionsPage";
import { CardsPage } from "./pages/CardsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { PlanningPage } from "./pages/PlanningPage";
import { ReportsPage } from "./pages/ReportsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { MorePage } from "./pages/MorePage";
import { TransactionSheet, type TxPreset } from "./components/TransactionSheet";
import { InstallPrompt } from "./components/InstallPrompt";
import { buildAlerts } from "./lib/finance";
import type { PageKey, Transaction } from "./lib/types";
import { cn } from "./utils/cn";

type NavItem = { key: PageKey; label: string; icon: typeof House; match?: PageKey[] };

const NAV_SIDE: NavItem[] = [
  { key: "dashboard", label: "Início", icon: House },
  { key: "transactions", label: "Extrato", icon: ReceiptText },
  { key: "cards", label: "Contas & Cartões", icon: Wallet, match: ["accounts"] },
  { key: "planning", label: "Planejamento", icon: Target },
  { key: "reports", label: "Relatórios", icon: PieChart },
];
const NAV_SIDE_2: NavItem[] = [
  { key: "calendar", label: "Calendário", icon: CalendarDays },
  { key: "more", label: "Ajustes", icon: Settings },
];
const NAV_MOBILE: NavItem[] = [
  { key: "dashboard", label: "Início", icon: House },
  { key: "transactions", label: "Extrato", icon: ReceiptText },
  { key: "cards", label: "Cartões", icon: CreditCard, match: ["accounts"] },
  { key: "reports", label: "Relatórios", icon: PieChart },
  { key: "more", label: "Mais", icon: LayoutGrid, match: ["planning", "calendar"] },
];

const MONTH_PAGES: PageKey[] = ["dashboard", "planning", "calendar", "reports"];

function Shell() {
  const { data, loaded, month, setMonth } = useStore();
  const [page, setPage] = useState<PageKey>("dashboard");
  const [txOpen, setTxOpen] = useState(false);
  const [preset, setPreset] = useState<TxPreset | undefined>();
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [payReq, setPayReq] = useState<string | undefined>();
  const [showAlerts, setShowAlerts] = useState(false);

  const alerts = useMemo(() => (loaded ? buildAlerts(data) : []), [data, loaded]);

  const go = (p: PageKey) => { setPage(p); window.scrollTo({ top: 0 }); };
  const openNew = (p?: TxPreset) => { setEditTx(null); setPreset(p); setTxOpen(true); };
  const openEdit = (t: Transaction) => { setPreset(undefined); setEditTx(t); setTxOpen(true); };
  const requestPay = (cardId: string) => { go("cards"); setPayReq(cardId); };

  if (!loaded) {
    return (
      <div className="min-h-dvh grid place-items-center bg-bg">
        <div className="flex flex-col items-center gap-4 animate-[pop-in_.4s_ease]">
          <Logo size={64} />
          <div className="text-[17px] font-bold tracking-tight">VT Flow</div>
        </div>
      </div>
    );
  }

  const isActive = (n: NavItem) => page === n.key || !!n.match?.includes(page);
  const showMonth = MONTH_PAGES.includes(page);

  const pageEl = (() => {
    switch (page) {
      case "dashboard": return <Dashboard go={go} onNew={openNew} onPayCard={requestPay} />;
      case "transactions": return <TransactionsPage onEdit={openEdit} onNew={() => openNew()} />;
      case "cards":
      case "accounts":
        return (
          <>
            <div className="px-4 sm:px-6 pt-4 max-w-5xl mx-auto w-full">
              <Seg
                className="max-w-xs"
                value={page === "cards" ? "cards" : "accounts"}
                onChange={(v) => setPage(v as PageKey)}
                options={[{ value: "cards", label: "Cartões" }, { value: "accounts", label: "Contas" }]}
              />
            </div>
            {page === "cards"
              ? <CardsPage requestPayId={payReq} onConsumePay={() => setPayReq(undefined)} onEditTx={openEdit} onNewTx={(cardId) => openNew({ type: "expense", cardId })} />
              : <AccountsPage onTransfer={(accountId) => openNew({ type: "transfer", accountId })} />}
          </>
        );
      case "planning": return <PlanningPage />;
      case "reports": return <ReportsPage />;
      case "calendar": return <CalendarPage onEdit={openEdit} />;
      case "more": return <MorePage go={go} />;
    }
  })();

  const bell = (
    <button onClick={() => setShowAlerts(true)} className="relative grid size-10 place-items-center rounded-full text-ink active:bg-raise transition" aria-label="Alertas">
      <Bell size={19} strokeWidth={2} />
      {alerts.length > 0 && <span className="absolute top-2 right-2 size-2 rounded-full bg-down ring-2 ring-bg" />}
    </button>
  );

  return (
    <div className="min-h-dvh bg-bg text-ink overflow-x-hidden">
      {/* sidebar desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 z-40 h-dvh w-[240px] flex-col border-r border-line/70 bg-panel px-4 py-6">
        <div className="flex items-center gap-3 px-2 mb-9">
          <Logo size={36} />
          <Wordmark />
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_SIDE.map((n) => <SideBtn key={n.key} n={n} active={isActive(n)} onClick={() => go(n.key)} />)}
          <div className="h-px bg-line/70 my-3 mx-2" />
          {NAV_SIDE_2.map((n) => <SideBtn key={n.key} n={n} active={isActive(n)} onClick={() => go(n.key)} />)}
        </nav>
        <button onClick={() => openNew()} className="mt-auto w-full h-12 rounded-xl bg-brand text-[#04140F] text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[.98] transition">
          <Plus size={17} strokeWidth={2.6} /> Novo lançamento
        </button>
      </aside>

      <div className="md:pl-[240px]">
        {/* header */}
        <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center h-[58px] px-4 sm:px-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-2.5 md:invisible">
              <Logo size={30} />
              <div className="hidden min-[400px]:block"><Wordmark /></div>
            </div>
            <div className="justify-self-center">
              {showMonth ? <MonthNav month={month} onChange={setMonth} /> : <div className="md:hidden"><Wordmark /></div>}
            </div>
            <div className="justify-self-end">{bell}</div>
          </div>
        </header>

        <main key={page}>{pageEl}</main>
      </div>

      {/* FAB mobile */}
      <button
        onClick={() => openNew()}
        className="md:hidden fixed right-4 z-40 grid size-14 place-items-center rounded-2xl bg-brand text-[#04140F] active:scale-90 transition shadow-[0_10px_28px_rgba(0,201,167,.35)]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 84px)" }}
        aria-label="Novo lançamento"
      >
        <Plus size={26} strokeWidth={2.6} />
      </button>

      {/* bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line/70 bg-panel/92 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="grid grid-cols-5 h-[64px]">
          {NAV_MOBILE.map((n) => {
            const a = isActive(n);
            return (
              <button key={n.key} onClick={() => go(n.key)} className="flex flex-col items-center justify-center gap-1 active:scale-90 transition" aria-label={n.label}>
                <n.icon size={21} strokeWidth={a ? 2.4 : 1.9} className={a ? "text-brand" : "text-muted"} />
                <span className={cn("text-[10.5px]", a ? "text-brand font-semibold" : "text-muted font-medium")}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <TransactionSheet open={txOpen} onClose={() => setTxOpen(false)} preset={preset} editTx={editTx} />
      <InstallPrompt />

      <Sheet open={showAlerts} onClose={() => setShowAlerts(false)} title="Alertas">
        {alerts.length === 0 && (
          <div className="py-10 text-center">
            <Bell size={22} className="mx-auto text-muted mb-2" />
            <div className="text-[14px] font-semibold">Tudo em dia</div>
            <div className="text-[12.5px] text-muted mt-1">Sem contas a vencer, faturas próximas ou orçamentos estourados.</div>
          </div>
        )}
        <div className="flex flex-col gap-2 pb-2">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl bg-raise px-3.5 py-3">
              {a.tone === "danger" ? <TriangleAlert size={17} className="text-down mt-0.5 shrink-0" /> :
                a.tone === "warn" ? <AlertCircle size={17} className="text-warn mt-0.5 shrink-0" /> :
                  <Info size={17} className="text-info mt-0.5 shrink-0" />}
              <div>
                <div className="text-[13.5px] font-semibold">{a.title}</div>
                <div className="text-[12px] text-muted mt-0.5">{a.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function SideBtn({ n, active, onClick }: { n: NavItem; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition",
      active ? "bg-brand/10 text-brand font-semibold" : "text-muted font-medium hover:bg-raise hover:text-ink",
    )}>
      {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-brand" />}
      <n.icon size={18} strokeWidth={active ? 2.3 : 1.9} />
      {n.label}
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
