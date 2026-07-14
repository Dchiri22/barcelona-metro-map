import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { X, Volume2, VolumeX, Play, RotateCcw } from "lucide-react";
import type { LineTarget } from "@/app/data/zonaUniversitaria";

const C = {
  accent: "#5B4FCF",
  ink: "#1A1832",
  bg: "#F4F3FF",
  shadow: "0 8px 32px rgba(26,24,50,0.12)",
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function SimulatorCanvas({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<import("@/app/simulator/MetroAccessibilitySimulator").MetroAccessibilitySimulator | null>(null);

  const [line, setLine] = useState<LineTarget>("L3");
  const [subtitle, setSubtitle] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let sim: import("@/app/simulator/MetroAccessibilitySimulator").MetroAccessibilitySimulator | null = null;
    let cancelled = false;

    (async () => {
      const { MetroAccessibilitySimulator } = await import("@/app/simulator/MetroAccessibilitySimulator");
      if (cancelled || !containerRef.current) return;
      sim = new MetroAccessibilitySimulator(containerRef.current, {
        onSubtitle: setSubtitle,
        onWarning: setWarning,
        onWaypoint: () => {},
        onPlayingChange: setPlaying,
      });
      simRef.current = sim;
      setReady(true);
    })();

    const onResize = () => simRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      simRef.current?.dispose();
      simRef.current = null;
    };
  }, []);

  const changeLine = useCallback((l: LineTarget) => {
    setLine(l);
    simRef.current?.setLine(l);
    setWarning(null);
  }, []);

  const move = useCallback((dir: "up" | "down" | "left" | "right") => {
    simRef.current?.move(dir);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      simRef.current?.setMuted(!m);
      return !m;
    });
  }, []);

  const btn =
    "flex items-center justify-center rounded-2xl bg-white active:scale-95 transition-transform touch-manipulation select-none";

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: C.bg }}>
      {/* Header — compact mobile */}
      <div
        className="relative z-20 flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{
          paddingTop: "max(0.625rem, env(safe-area-inset-top))",
          background: "rgba(244,243,255,0.92)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="min-w-0 pr-2">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: C.accent }}>
            Simulador d'accessibilitat
          </p>
          <h2 className="text-sm font-extrabold leading-tight truncate" style={{ color: C.ink }}>
            Zona Universitària
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shrink-0"
          style={{ boxShadow: C.shadow }}
          aria-label="Tancar simulador"
        >
          <X size={17} color={C.ink} />
        </button>
      </div>

      {/* Line selector */}
      <div className="relative z-20 flex gap-1.5 px-3 pb-2 shrink-0">
        {(["L3", "L9S"] as const).map((l) => (
          <button
            key={l}
            onClick={() => changeLine(l)}
            className="flex-1 py-2 rounded-xl text-[11px] font-bold transition-all"
            style={{
              background: line === l ? (l === "L3" ? "#3FAB2E" : "#F58220") : "white",
              color: line === l ? "white" : C.ink,
              boxShadow: line === l ? "none" : C.shadow,
              border: line === l ? "none" : "1px solid rgba(91,79,207,0.12)",
            }}
          >
            {l === "L3" ? "L3 · Trinitat Nova" : "L9S · Aeroport T1"}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="relative flex-1 min-h-0">
        <div ref={containerRef} className="absolute inset-0" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
            <p className="text-sm font-semibold animate-pulse" style={{ color: C.accent }}>
              Carregant estació 3D…
            </p>
          </div>
        )}

        {/* Subtitles */}
        {(subtitle || warning) && (
          <div
            className="absolute left-3 right-3 z-20 px-3 py-2.5 rounded-2xl"
            style={{
              bottom: "calc(11.5rem + env(safe-area-inset-bottom, 0px))",
              background: "rgba(26,24,50,0.88)",
              backdropFilter: "blur(6px)",
            }}
            role="status"
            aria-live="polite"
          >
            {subtitle && <p className="text-xs text-white leading-snug">{subtitle}</p>}
            {warning && (
              <p className="text-[11px] font-bold mt-1" style={{ color: "#FBBF24" }}>
                ⚠ {warning}
              </p>
            )}
          </div>
        )}

        {/* Controls overlay — mobile D-pad & actions */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 px-3 pt-2"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            background: "linear-gradient(transparent, rgba(244,243,255,0.98) 35%)",
          }}
        >
          {/* Action row */}
          <div className="flex gap-2 mb-2.5">
            <button
              onClick={() => (playing ? simRef.current?.stopAuto() : simRef.current?.playAuto())}
              disabled={!ready}
              className={`${btn} flex-1 gap-1.5 py-2.5 text-xs font-bold`}
              style={{ color: C.accent, boxShadow: C.shadow, opacity: ready ? 1 : 0.5 }}
            >
              <Play size={15} fill={playing ? C.accent : "none"} />
              {playing ? "Aturar" : "Reproduir"}
            </button>
            <button
              onClick={() => simRef.current?.reset()}
              disabled={!ready}
              className={`${btn} gap-1 px-3.5 py-2.5 text-xs font-bold`}
              style={{ color: C.ink, boxShadow: C.shadow, opacity: ready ? 1 : 0.5 }}
              aria-label="Reiniciar"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={toggleMute}
              className={`${btn} w-11 h-11`}
              style={{ boxShadow: C.shadow }}
              aria-label={muted ? "Activar veu" : "Silenciar veu"}
            >
              {muted ? <VolumeX size={17} color={C.ink} /> : <Volume2 size={17} color={C.accent} />}
            </button>
          </div>

          {/* D-pad — large touch targets for mobile */}
          <div className="flex justify-center">
            <div className="grid grid-cols-3 gap-1" style={{ width: 148 }}>
              <div />
              <button
                onPointerDown={() => move("up")}
                className={`${btn} h-[52px] text-lg font-bold`}
                style={{ boxShadow: C.shadow, color: C.accent }}
                aria-label="Avançar"
              >
                ↑
              </button>
              <div />
              <button
                onPointerDown={() => move("left")}
                className={`${btn} h-[52px] text-lg font-bold`}
                style={{ boxShadow: C.shadow, color: C.accent }}
                aria-label="Esquerra"
              >
                ←
              </button>
              <div className="h-[52px] flex items-center justify-center">
                <div className="w-7 h-7 rounded-full" style={{ background: C.accent, opacity: 0.15 }} />
              </div>
              <button
                onPointerDown={() => move("right")}
                className={`${btn} h-[52px] text-lg font-bold`}
                style={{ boxShadow: C.shadow, color: C.accent }}
                aria-label="Dreta"
              >
                →
              </button>
              <div />
              <button
                onPointerDown={() => move("down")}
                className={`${btn} h-[52px] text-lg font-bold`}
                style={{ boxShadow: C.shadow, color: C.accent }}
                aria-label="Enrere"
              >
                ↓
              </button>
              <div />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mobile modal — fills the 440px phone frame, not the desktop browser window. */
export function MetroAccessibilitySimulatorModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col overflow-hidden"
      style={{ background: C.bg, maxWidth: 440, margin: "0 auto" }}
      role="dialog"
      aria-modal="true"
      aria-label="Simulador d'accessibilitat Zona Universitària"
    >
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm font-semibold animate-pulse" style={{ color: C.accent }}>
              Iniciant simulador…
            </p>
          </div>
        }
      >
        <SimulatorCanvas onClose={onClose} />
      </Suspense>
    </div>
  );
}

/** Lazy entry — import this in App.tsx so Three.js isn't bundled until needed */
export const LazyMetroAccessibilitySimulatorModal = lazy(async () => ({
  default: MetroAccessibilitySimulatorModal,
}));
