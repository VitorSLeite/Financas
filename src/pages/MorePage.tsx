import { useRef, useState } from "react";
import {
  ArrowLeft, ChevronRight, FileSpreadsheet, FileText,
  Moon, Sun, Trash2, Upload,
} from "lucide-react";
import { useStore } from "../store/AppStore";
import { Card, Field, Seg, Sheet, IconBubble, Logo } from "../components/ui";
import type { Category, CatGroup, PageKey } from "../lib/types";
import { exportCSV, exportJSON, validateImport } from "../lib/backup";
import { uid } from "../lib/format";
import { PALETTE, PICKER_ICONS, DynIcon } from "../lib/icons";
import { GROUP_LABELS } from "../lib/labels";
import { cn } from "../utils/cn";

export function MorePage({ go }: { go: (p: PageKey) => void }) {
  const { data, theme, setTheme, importData, wipe, saveCategory, deleteCategory } = useStore();
  const [view, setView] = useState<"menu" | "cats">("menu");
  const [showCatEdit, setShowCatEdit] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cName, setCName] = useState("");
  const [cKind, setCKind] = useState<"expense" | "income">("expense");
  const [cGroup, setCGroup] = useState<CatGroup>("variable");
  const [cParent, setCParent] = useState("");
  const [cIcon, setCIcon] = useState("tag");
  const [cColor, setCColor] = useState(PALETTE[0]);

  const openCatNew = (kind: "expense" | "income", parentId = "") => {
    setEditing(null); setCName(""); setCKind(kind); setCGroup("variable");
    setCParent(parentId); setCIcon("tag"); setCColor(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    setConfirmDel(false); setShowCatEdit(true);
  };
  const openCatEdit = (c: Category) => {
    setEditing(c); setCName(c.name); setCKind(c.kind); setCGroup(c.group ?? "variable");
    setCParent(c.parentId ?? ""); setCIcon(c.icon); setCColor(c.color);
    setConfirmDel(false); setShowCatEdit(true);
  };
  const saveCatForm = () => {
    if (!cName.trim()) return;
    saveCategory({
      id: editing?.id ?? uid(),
      name: cName.trim(),
      kind: cKind,
      group: cKind === "expense" && !cParent ? cGroup : editing?.group ?? (cKind === "expense" ? cGroup : undefined),
      parentId: cParent || undefined,
      icon: editing?.parentId !== cParent && cParent
        ? cIcon
        : cIcon,
      color: cParent && !editing ? (data.categories.find((p) => p.id === cParent)?.color ?? cColor) : cColor,
    });
    setShowCatEdit(false);
  };

  const onImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const d = validateImport(String(reader.result));
      if (d) {
        importData(d);
        setImportMsg("Backup restaurado com sucesso.");
      } else setImportMsg("Arquivo inválido. Use um backup JSON exportado pelo app.");
      setTimeout(() => setImportMsg(null), 4000);
    };
    reader.readAsText(file);
  };

  const menuItem = (icon: string, color: string, label: string, desc: string, onClick: () => void) => (
    <button key={label} onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-raise transition rounded-2xl">
      <IconBubble icon={icon} color={color} size={40} />
      <div className="flex-1 min-w-0">
        <div className="text-[14.5px] font-bold">{label}</div>
        <div className="text-[12px] text-muted font-medium truncate">{desc}</div>
      </div>
      <ChevronRight size={17} className="text-muted shrink-0" />
    </button>
  );

  // ------------------------------------------------ categorias sub-view
  if (view === "cats") {
    const roots = data.categories.filter((c) => !c.parentId);
    const children = (pid: string) => data.categories.filter((c) => c.parentId === pid);
    return (
      <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-3xl mx-auto w-full animate-[page-in_.3s_ease]">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => setView("menu")} className="grid size-10 place-items-center rounded-full border border-line bg-surface active:scale-90 transition" aria-label="Voltar">
            <ArrowLeft size={17} />
          </button>
          <h1 className="text-[22px] font-extrabold tracking-tight">Categorias</h1>
        </div>
        <p className="text-[12.5px] text-muted font-medium mb-4 px-1">
          Organize despesas em Essenciais, Fixas e Variáveis, com subcategorias à vontade.
        </p>

        {(["expense", "income"] as const).map((kind) => (
          <div key={kind} className="mb-6">
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">
                {kind === "expense" ? "Despesas" : "Receitas"}
              </span>
              <button onClick={() => openCatNew(kind)} className="text-[12.5px] font-bold text-brand active:scale-95 transition">+ adicionar</button>
            </div>
            <Card className="p-1.5">
              {roots.filter((c) => c.kind === kind).map((c) => (
                <div key={c.id}>
                  <button onClick={() => openCatEdit(c)} className="w-full flex items-center gap-3 px-2.5 py-2.5 text-left active:bg-raise rounded-2xl transition">
                    <IconBubble icon={c.icon} color={c.color} size={36} />
                    <span className="flex-1 text-[14px] font-bold">{c.name}</span>
                    {c.group && (
                      <span className="text-[10.5px] font-bold px-2 py-1 rounded-full bg-raise text-muted">{GROUP_LABELS[c.group]}</span>
                    )}
                    {kind === "expense" && (
                      <span
                        onClick={(e) => { e.stopPropagation(); openCatNew(kind, c.id); }}
                        className="text-[11px] font-bold text-brand px-2 py-1 rounded-lg bg-brand/10 active:scale-95 transition"
                      >
                        + sub
                      </span>
                    )}
                  </button>
                  {children(c.id).map((s) => (
                    <button key={s.id} onClick={() => openCatEdit(s)} className="w-full flex items-center gap-3 pl-8 pr-2.5 py-2 text-left active:bg-raise rounded-2xl transition">
                      <span className="size-[5px] rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="flex-1 text-[13px] font-semibold text-ink/85">{s.name}</span>
                      <ChevronRight size={14} className="text-muted" />
                    </button>
                  ))}
                </div>
              ))}
            </Card>
          </div>
        ))}

        {catSheet()}
      </div>
    );
  }

  // ------------------------------------------------ menu principal
  return (
    <div className="px-4 sm:px-6 pt-5 pb-32 md:pb-10 max-w-3xl mx-auto w-full animate-[page-in_.3s_ease]">
      <h1 className="text-[24px] font-extrabold tracking-tight mb-4">Mais</h1>

      {importMsg && (
        <div className="mb-3 rounded-2xl bg-brand/10 border border-brand/30 px-4 py-3 text-[13px] font-bold text-brand animate-[page-in_.3s_ease]">
          {importMsg}
        </div>
      )}

      <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted px-1 mb-2">Gerenciar</div>
      <Card className="p-1.5 mb-5">
        {menuItem("landmark", "#4DA3FF", "Contas e saldos", "Contas correntes, poupança, carteira e investimentos", () => go("accounts"))}
        {menuItem("target", "#00C9A7", "Planejamento", "Orçamentos, metas, recorrentes e fluxo de caixa", () => go("planning"))}
        {menuItem("pieChart", "#00C9A7", "Relatórios", "Gráficos, patrimônio e saúde financeira", () => go("reports"))}
        {menuItem("calendar", "#4DA3FF", "Calendário", "Vencimentos e lançamentos por dia", () => go("calendar"))}
        {menuItem("tag", "#8B7CFF", "Categorias", "Essenciais, fixas, variáveis e subcategorias", () => setView("cats"))}
      </Card>

      <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted px-1 mb-2">Aparência</div>
      <Card className="mb-5">
        <Seg
          value={theme}
          onChange={setTheme}
          options={[{ value: "light", label: "Claro" }, { value: "dark", label: "Escuro" }]}
        />
        <div className="flex items-center gap-2 mt-3 text-[12px] text-muted font-medium">
          {theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}
          A escolha fica salva no dispositivo.
        </div>
      </Card>

      <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted px-1 mb-2">Backup e dados</div>
      <Card className="p-1.5 mb-5">
        <div className="grid sm:grid-cols-2 gap-1.5">
          <button onClick={() => exportJSON(data)} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl active:bg-raise transition text-left">
            <FileText size={17} className="text-brand shrink-0" />
            <div>
              <div className="text-[13.5px] font-bold">Exportar backup (JSON)</div>
              <div className="text-[11px] text-muted font-medium">Todos os dados do app</div>
            </div>
          </button>
          <button onClick={() => exportCSV(data)} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl active:bg-raise transition text-left">
            <FileSpreadsheet size={17} className="text-up shrink-0" />
            <div>
              <div className="text-[13.5px] font-bold">Exportar CSV</div>
              <div className="text-[11px] text-muted font-medium">Lançamentos p/ Excel/Sheets</div>
            </div>
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl active:bg-raise transition text-left">
            <Upload size={17} className="text-info shrink-0" />
            <div>
              <div className="text-[13.5px] font-bold">Importar backup (JSON)</div>
              <div className="text-[11px] text-muted font-medium">Substitui os dados atuais</div>
            </div>
          </button>

        </div>
        <input
          ref={fileRef} type="file" accept="application/json,.json" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportFile(f); e.target.value = ""; }}
        />
        <div className="border-t border-line mt-1.5 pt-1.5">
          {!confirmWipe ? (
            <button onClick={() => setConfirmWipe(true)} className="flex items-center gap-3 px-3.5 py-3 rounded-2xl active:bg-raise transition text-left w-full">
              <Trash2 size={17} className="text-down shrink-0" />
              <div className="text-[13.5px] font-bold text-down">Apagar todos os dados</div>
            </button>
          ) : (
            <div className="flex gap-2 p-2">
              <button onClick={() => { wipe(); setConfirmWipe(false); }} className="flex-1 h-10 rounded-xl bg-down text-white text-[13px] font-bold active:scale-[.98] transition">
                Confirmar exclusão total
              </button>
              <button onClick={() => setConfirmWipe(false)} className="flex-1 h-10 rounded-xl bg-raise text-[13px] font-bold active:scale-[.98] transition">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="rounded-[22px] border border-line bg-surface p-4 text-center">
        <div className="flex justify-center mb-2"><Logo size={36} /></div>
        <div className="text-[13px] font-bold">VT Flow — Finanças Pessoais</div>
        <div className="text-[11.5px] text-muted font-medium mt-0.5">
          PWA offline · dados salvos localmente (IndexedDB) · BRL · DD/MM/AAAA

        </div>
      </div>
    </div>
  );

  function catSheet() {
    return (
      <Sheet
        open={showCatEdit}
        onClose={() => setShowCatEdit(false)}
        title={editing ? "Editar categoria" : "Nova categoria"}
        footer={
          <div className="flex flex-col gap-2">
            <button onClick={saveCatForm} disabled={!cName.trim()} className="w-full h-12 rounded-2xl bg-brand text-white text-[15px] font-bold active:scale-[.98] transition disabled:opacity-40">
              Salvar categoria
            </button>
            {editing && !confirmDel && (
              <button onClick={() => setConfirmDel(true)} className="w-full h-10 text-[13px] font-bold text-down">Excluir categoria</button>
            )}
            {editing && confirmDel && (
              <button onClick={() => { deleteCategory(editing.id); setShowCatEdit(false); }} className="w-full h-10 rounded-xl bg-down text-white text-[13px] font-bold">
                Confirmar exclusão (lançamentos mantidos)
              </button>
            )}
          </div>
        }
      >
        <Field label="Nome">
          <input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Ex.: Assinaturas, PET, Salário…" className="input" />
        </Field>
        <Field label="Tipo">
          <Seg value={cKind} onChange={setCKind} options={[{ value: "expense", label: "Despesa" }, { value: "income", label: "Receita" }]} />
        </Field>
        {cKind === "expense" && !cParent && (
          <Field label="Grupo">
            <Seg value={cGroup} onChange={setCGroup} options={[
              { value: "essential", label: "Essencial" },
              { value: "fixed", label: "Fixa" },
              { value: "variable", label: "Variável" },
            ]} />
          </Field>
        )}
        {cKind === "expense" && (
          <Field label="Subcategoria de (opcional)">
            <select value={cParent} onChange={(e) => setCParent(e.target.value)} className="input">
              <option value="">— categoria principal —</option>
              {data.categories.filter((c) => c.kind === "expense" && !c.parentId && c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Ícone">
          <div className="flex gap-2 flex-wrap">
            {PICKER_ICONS.map((i) => (
              <button key={i} onClick={() => setCIcon(i)} className={cn("grid size-10 place-items-center rounded-xl transition active:scale-90", cIcon === i ? "text-white" : "bg-raise text-muted")} style={cIcon === i ? { backgroundColor: cColor } : undefined} aria-label={i}>
                <DynIcon name={i} size={17} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Cor" className="mb-1">
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button key={c} onClick={() => setCColor(c)} className={cn("size-9 rounded-full transition active:scale-90", cColor === c && "ring-2 ring-offset-2 ring-ink ring-offset-surface")} style={{ backgroundColor: c }} aria-label={c} />
            ))}
          </div>
        </Field>
      </Sheet>
    );
  }
}
