import { useEffect, useState } from "react";
import { Share, SquarePlus } from "lucide-react";
import { Logo } from "./ui";

const KEY = "vtflow-install-dismissed";

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [iosSteps, setIosSteps] = useState(false);
  const [evt, setEvt] = useState<BIPEvent | null>(null);

  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    if (standalone || localStorage.getItem(KEY)) return;
    const onBIP = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); setShow(true); };
    window.addEventListener("beforeinstallprompt", onBIP);
    let t: number | undefined;
    if (isIOS) t = window.setTimeout(() => setShow(true), 2500);
    return () => { window.removeEventListener("beforeinstallprompt", onBIP); clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = () => { localStorage.setItem(KEY, "1"); setShow(false); };
  const install = async () => {
    if (evt) {
      await evt.prompt();
      localStorage.setItem(KEY, "1");
      setShow(false);
    } else setIosSteps(true);
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 z-[70] md:left-auto md:right-6 md:w-[380px] animate-[sheet-in_.3s_ease]"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)" }}>
      <div className="rounded-2xl border border-line bg-panel p-4 shadow-[0_20px_50px_rgba(0,0,0,.45)]">
        <div className="flex gap-3.5">
          <Logo size={46} />
          <div className="flex-1">
            <div className="text-[15px] font-bold">Instalar VT Flow</div>
            <div className="text-[12.5px] text-muted mt-0.5 leading-snug">
              Adicione o VT Flow à Tela de Início do seu iPhone para uma experiência mais rápida, como um app.
            </div>
          </div>
        </div>
        {iosSteps ? (
          <div className="mt-3 rounded-xl bg-raise p-3 text-[12.5px] leading-relaxed">
            <div className="flex items-center gap-2">1. Toque em <Share size={14} className="text-info" /> <b>Compartilhar</b> no Safari</div>
            <div className="flex items-center gap-2 mt-1">2. Escolha <SquarePlus size={14} className="text-info" /> <b>Adicionar à Tela de Início</b></div>
            <button onClick={dismiss} className="mt-3 w-full h-10 rounded-xl bg-brand text-[#04140F] font-bold">Entendi</button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button onClick={dismiss} className="flex-1 h-11 rounded-xl bg-raise text-[13.5px] font-semibold active:scale-[.98] transition">Agora não</button>
            <button onClick={install} className="flex-1 h-11 rounded-xl bg-brand text-[#04140F] text-[13.5px] font-bold active:scale-[.98] transition">Instalar</button>
          </div>
        )}
      </div>
    </div>
  );
}
