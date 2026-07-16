import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { motion } from "motion/react";
import heroImg from "@/imports/image-8.png";
import trainImg from "@/imports/image-12.png";
import routesImg from "@/imports/wemove-routes-bg.png";
import solmoveLogo from "@/imports/icons/solmove-logo-white.png";
import { SolMoveLogo } from "@/app/components/SolMoveLogo";
import {
  IconProfileWheelchair,
  IconProfileCrutches,
  IconProfilePram,
  IconProfileVisual,
} from "@/app/components/ProfileIllustrations";
import {
  IconElevator, IconReport, IconRoute, IconSaved,
} from "@/app/components/QuickActionIcons";
import {
  Navigation, Bell, ArrowLeft, CheckCircle, Clock, XCircle,
  Mic, ArrowRight, LocateFixed, Accessibility, RefreshCw,
  TriangleAlert, X, Plus, Minus, MapPin, ChevronRight,
  Star, Shield, Search, Mail, Box, Map, Layers,
} from "lucide-react";
import { MetroMap3D, DEFAULT_MAP_LAYERS, type MapLayers } from "@/app/components/MetroMap3D";
import { MetroMap2D, type MetroMap2DHandle } from "@/app/components/MetroMap2D";

const LazyMetroAccessibilitySimulatorModal = lazy(() =>
  import("@/app/components/MetroAccessibilitySimulatorModal").then((m) => ({
    default: m.MetroAccessibilitySimulatorModal,
  })),
);
import {
  STATIONS, PINNED, LINE_COLOR,
  type Station, type ElevStatus, type LineId,
} from "@/app/data/metro";

import { APP_THEME as C, SOLMOVE } from "@/app/theme/solmove";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "onboarding1" | "onboarding2" | "onboarding3"
  | "home" | "map" | "route-input" | "route-results"
  | "station-detail" | "alerts";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<ElevStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ok:    { label: "Working",          color: SOLMOVE.path, icon: <CheckCircle size={13} strokeWidth={2.5} /> },
  maint: { label: "Maintenance",      color: SOLMOVE.sun,  icon: <Clock size={13} strokeWidth={2.5} /> },
  down:  { label: "Out of service",   color: SOLMOVE.ink,  icon: <XCircle size={13} strokeWidth={2.5} /> },
  none:  { label: "No elevator",      color: "#9CA3AF", icon: <Accessibility size={13} /> },
};

function StatusPill({ status }: { status: ElevStatus }) {
  const { label, color, icon } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white whitespace-nowrap"
      style={{ border: `1.5px solid ${color}`, color }}>
      {icon}{label}
    </span>
  );
}

function LineBadge({ line, sm }: { line: LineId; sm?: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-extrabold text-white shrink-0 ${sm ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[11px]"}`}
      style={{ backgroundColor: LINE_COLOR[line] }}>
      {line}
    </span>
  );
}

// Outline-only button
function Btn({ children, onClick, disabled, full, accent = C.accent, sm }:
  { children: React.ReactNode; onClick?: () => void; disabled?: boolean; full?: boolean; accent?: string; sm?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${full ? "w-full" : ""} inline-flex items-center justify-center gap-2 rounded-2xl font-semibold bg-white transition-all active:scale-[0.97] disabled:opacity-30 ${sm ? "px-4 py-2 text-xs" : "px-5 py-3.5 text-sm"}`}
      style={{ border: `1.5px solid ${accent}`, color: accent }}>
      {children}
    </button>
  );
}

// Logo — SolMove wordmark (white, no background)
function Logo() {
  return <SolMoveLogo height={32} />;
}

// Card container
function Card({ children, className = "", onClick, style }: {
  children: React.ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <div onClick={onClick} className={`bg-white rounded-3xl ${onClick ? "cursor-pointer active:scale-[0.98] transition-transform" : ""} ${className}`}
      style={{ boxShadow: C.shadow, ...style }}>
      {children}
    </div>
  );
}

// ─── Bottom nav ───────────────────────────────────────────────────────────────

function Nav({ screen, go }: { screen: Screen; go: (s: Screen) => void }) {
  const items: { id: Screen; icon: React.ReactNode; label: string }[] = [
    { id: "home",        icon: <Shield size={19} />,     label: "Home" },
    { id: "map",         icon: <MapPin size={19} />,     label: "Map" },
    { id: "route-input", icon: <Navigation size={19} />, label: "Route" },
    { id: "alerts",      icon: <Bell size={19} />,       label: "Alerts" },
  ];
  const active = (id: Screen) =>
    screen === id
    || (screen === "route-results" && id === "route-input")
    || (screen === "station-detail" && id === "home");
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2" style={{ background: C.bg }}>
      <div className="flex bg-white rounded-2xl overflow-hidden" style={{ boxShadow: C.shadow }}>
        {items.map((item) => {
          const on = active(item.id);
          return (
            <button key={item.id} onClick={() => go(item.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-bold transition-all rounded-2xl ${on ? "" : ""}`}
              style={{ color: on ? C.accent : SOLMOVE.muted, background: "transparent" }}>
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Onboarding 1 ─────────────────────────────────────────────────────────────

function OB1({ next }: { next: () => void }) {
  const [expanded, setExpanded] = useState(true);

  // Auto swipe-up after 4s if the user doesn't drag
  useEffect(() => {
    if (!expanded) return;
    const t = window.setTimeout(() => setExpanded(false), 4000);
    return () => window.clearTimeout(t);
  }, [expanded]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: C.bg }}>

      {/* Photo hero — starts full-screen, swipe up to collapse (or auto after 4s) */}
      <motion.div
        className="relative shrink-0"
        initial={{ height: "100%" }}
        animate={{ height: expanded ? "100%" : "52%" }}
        transition={{ duration: 0.75, ease: [0.32, 0.72, 0, 1] }}
        style={{ borderBottomLeftRadius: 40, borderBottomRightRadius: 40, overflow: "hidden" }}
        onPanEnd={(_e, info) => { if (info.offset.y < -40) setExpanded(false); }}
      >
        <div className="absolute inset-0"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center 30%" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(15,13,26,0.15) 0%, rgba(15,13,26,0.55) 100%)" }} />

        {/* Centered branding — only while full screen */}
        {expanded && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-0" style={{ paddingBottom: "32%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <SolMoveLogo height={88} />
            <div className="flex flex-col items-center gap-1 mt-3">
              <p className="text-sm font-semibold text-white" style={{ opacity: 0.85 }}>Accessible Barcelona Metro</p>
              <p className="text-xs text-white" style={{ opacity: 0.65 }}>Move easily, safely, and without barriers.</p>
            </div>
          </motion.div>
        )}

        {/* Swipe-up hint */}
        {expanded && (
          <motion.div
            className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            >
              <ArrowLeft size={22} color="white" style={{ transform: "rotate(90deg)", opacity: 0.9 }} />
            </motion.div>
            <p className="text-xs font-semibold text-white" style={{ opacity: 0.75 }}>Desliza hacia arriba</p>
          </motion.div>
        )}
      </motion.div>

      {/* Content — fades in after swipe */}
      <motion.div
        className="flex-1 px-6 pt-8 pb-10 flex flex-col justify-between overflow-hidden"
        animate={{ opacity: expanded ? 0 : 1, y: expanded ? 30 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: expanded ? 0 : 0.2 }}
      >
        <div>
          <h1 className="text-4xl font-extrabold leading-tight mb-2" style={{ color: C.ink, fontFamily: C.display }}>
            Real routes.<br />Zero barriers.
          </h1>
          <p className="text-sm" style={{ color: C.muted }}>
            Live elevator status · Step-free navigation · TMB data
          </p>
        </div>

        <div className="space-y-2.5">
          {/* Google */}
          <button onClick={next}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm text-white"
            style={{ background: C.accent }}>
            <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0"
              style={{ fontSize: 11, fontWeight: 900, color: C.accent }}>G</span>
            Continue with Google
          </button>

          {/* Email */}
          <button onClick={next}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm bg-white"
            style={{ border: `1.5px solid rgba(15,13,26,0.18)`, color: C.ink }}>
            <Mail size={15} color={C.muted} />
            Continue with Email
          </button>

          {/* Quick skip */}
          <p className="text-center pt-1">
            <button onClick={next} className="text-xs font-semibold" style={{ color: C.muted }}>
              Explore without account <ArrowRight size={11} style={{ display: "inline", verticalAlign: "middle" }} />
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Onboarding 2 ─────────────────────────────────────────────────────────────

function OB2({ next, back }: { next: () => void; back: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const profiles = [
    { id: "wheelchair", label: "Wheelchair",        Icon: IconProfileWheelchair },
    { id: "crutches",   label: "Crutches / cane",   Icon: IconProfileCrutches },
    { id: "pram",       label: "Pram / pushchair",  Icon: IconProfilePram },
    { id: "visual",     label: "Visual impairment", Icon: IconProfileVisual },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-6 pt-12 pb-6">
        <button onClick={back} className="mb-6 w-10 h-10 rounded-2xl flex items-center justify-center bg-white" style={{ boxShadow: C.shadowSm }}>
          <ArrowLeft size={18} color={C.ink} />
        </button>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.accent }}>Step 1 of 2</p>
        <h2 className="text-3xl font-extrabold" style={{ color: C.ink, fontFamily: C.display }}>Your profile</h2>
        <p className="text-sm mt-1" style={{ color: C.muted }}>We'll tailor routes and alerts for you.</p>
      </div>

      <div className="flex-1 px-6 grid grid-cols-2 gap-3 content-start overflow-y-auto pb-4">
        {profiles.map((p) => {
          const on = sel === p.id;
          return (
            <button key={p.id} onClick={() => setSel(p.id)}
              className="relative flex flex-col items-center justify-center gap-3 py-8 px-3 rounded-3xl bg-white transition-all"
              style={{
                border: `2px solid ${on ? C.accent : "rgba(36,50,63,0.12)"}`,
                boxShadow: on ? C.shadow : C.shadowSm,
              }}
              aria-pressed={on}>
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                style={{
                  border: `2px solid ${on ? C.accent : SOLMOVE.gray}`,
                  background: on ? C.accent : "transparent",
                }}>
                {on && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>

              <span className="flex items-center justify-center w-14 h-14">
                <p.Icon size={56} />
              </span>

              <span className="text-xs font-bold text-center leading-tight"
                style={{ color: C.ink }}>{p.label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-6 pb-10 pt-4">
        <Btn onClick={next} disabled={!sel} full>Continue <ArrowRight size={15} /></Btn>
      </div>
    </div>
  );
}

// ─── Onboarding 3 ─────────────────────────────────────────────────────────────

function OB3({ finish, back }: { finish: () => void; back: () => void }) {
  const [pinned, setPinned] = useState<string[]>(["sagrada"]);
  const toggle = (id: string) => setPinned((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-6 pt-12 pb-6">
        <button onClick={back} className="mb-6 w-10 h-10 rounded-2xl flex items-center justify-center bg-white" style={{ boxShadow: C.shadowSm }}>
          <ArrowLeft size={18} color={C.ink} />
        </button>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.accent }}>Step 2 of 2</p>
        <h2 className="text-3xl font-extrabold" style={{ color: C.ink, fontFamily: "'Bricolage Grotesque', sans-serif" }}>Pin stations</h2>
        <p className="text-sm mt-1" style={{ color: C.muted }}>See their live status instantly on your home screen.</p>
      </div>
      <div className="flex-1 px-6 space-y-2.5 overflow-y-auto pb-4">
        {STATIONS.map((s) => {
          const on = pinned.includes(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)}
              className="w-full flex flex-col gap-2.5 px-4 py-4 rounded-2xl bg-white text-left transition-all box-border"
              style={{
                border: `2px solid ${on ? C.accent : "transparent"}`,
                boxShadow: C.shadowSm,
              }}
              aria-pressed={on}>
              <div className="flex items-center justify-between gap-3 w-full min-w-0">
                <p className="min-w-0 flex-1 text-sm font-semibold truncate leading-snug" style={{ color: C.ink }}>
                  {s.name}
                </p>
                <span className="shrink-0">
                  <StatusPill status={s.status} />
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {s.lines.map((l) => <LineBadge key={l} line={l} sm />)}
              </div>
            </button>
          );
        })}
      </div>
      <div className="px-6 pb-10 pt-4">
        <Btn onClick={finish} full>
          {pinned.length > 0 ? `Start — ${pinned.length} station${pinned.length > 1 ? "s" : ""} pinned` : "Skip for now"}
        </Btn>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────


function HomeScreen({ go, setSt, onOpenSimulator }: { go: (s: Screen) => void; setSt: (s: Station) => void; onOpenSimulator: () => void }) {
  const sagrada  = STATIONS.find((s) => s.id === "sagrada")!;
  const pggracia = STATIONS.find((s) => s.id === "pggracia")!;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: C.bg, fontFamily: C.body }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative shrink-0" style={{ height: 370 }}>
        {/* Photo */}
        <div className="absolute inset-0"
          style={{ backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center 45%" }} />
        {/* Dark gradient */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, rgba(15,13,26,0.52) 0%, rgba(15,13,26,0.10) 50%, rgba(15,13,26,0.45) 100%)" }} />

        {/* Top bar: logo + actions */}
        <div className="relative flex items-center justify-between px-4 pt-10 pb-0 gap-3">
          <Logo />
          <div className="flex items-center gap-2 shrink-0">
            <button className="w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
              aria-label="Accessibility settings">
              <Accessibility size={16} color="white" />
            </button>
            <button onClick={() => go("alerts")}
              className="relative w-9 h-9 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
              aria-label="Alerts">
              <Bell size={16} color="white" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
            </button>
          </div>
        </div>

        {/* Hero headline */}
        <div className="relative px-5 pt-6">
          <h1 className="text-[28px] font-extrabold text-white leading-tight"
            style={{ fontFamily: C.display, textShadow: "0 2px 12px rgba(0,0,0,0.25)" }}>
            Barcelona<br />is for everyone.
          </h1>
          <p className="text-[11px] text-white mt-1.5 leading-relaxed" style={{ opacity: 0.85 }}>
            Real-time elevator status. Accessible routes.<br />Travel with confidence.
          </p>
        </div>
      </div>

      {/* ── Route card ───────────────────────────────────────────────────── */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-white rounded-3xl px-4 pt-4 pb-4" style={{ boxShadow: "0 8px 32px rgba(47,163,160,0.18)" }}>

          {/* FROM row */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(47,163,160,0.12)" }}>
              <LocateFixed size={14} color={C.accent} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: C.muted }}>From</p>
              <p className="text-sm font-semibold truncate" style={{ color: C.ink }}>My location</p>
            </div>
            <button className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ border: `1.5px solid rgba(47,163,160,0.22)`, color: C.accent }}>
              <Navigation size={13} />
            </button>
          </div>

          {/* Dotted separator */}
          <div className="flex items-center gap-3 my-2">
            <div className="w-8 flex justify-center shrink-0">
              <div className="w-px h-5" style={{ background: `repeating-linear-gradient(to bottom, ${SOLMOVE.gray} 0, ${SOLMOVE.gray} 3px, transparent 3px, transparent 6px)` }} />
            </div>
            <div className="flex-1 h-px" style={{ background: "rgba(36,50,63,0.08)" }} />
          </div>

          {/* WHERE TO row */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#FFF0F0" }}>
              <MapPin size={14} color="#EF4444" />
            </div>
            <button className="flex-1 min-w-0 text-left" onClick={() => go("route-input")}>
              <p className="text-[10px] font-semibold mb-0.5" style={{ color: C.muted }}>Where to?</p>
              <p className="text-sm font-medium" style={{ color: SOLMOVE.muted, opacity: 0.65 }}>Search destination…</p>
            </button>
            <button className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ border: `1.5px solid rgba(47,163,160,0.22)`, color: C.accent }}>
              <Mic size={13} />
            </button>
          </div>

          {/* CTA */}
          <button onClick={() => go("route-input")}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold bg-white"
            style={{ border: `1.5px solid ${C.accent}`, color: C.accent }}>
            Plan accessible route
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <div className="px-4 mt-5">
        <p className="text-sm font-bold mb-3" style={{ color: C.ink, fontFamily: C.body }}>Quick actions</p>
        <div className="grid grid-cols-4 gap-2.5">
          {([
            { label: "Elevator", Icon: IconElevator, fn: () => go("alerts") },
            { label: "Report",   Icon: IconReport,   fn: () => go("station-detail") },
            { label: "Route",    Icon: IconRoute,    fn: () => go("route-input") },
            { label: "Saved",    Icon: IconSaved,    fn: () => go("alerts") },
          ] as const).map((qa) => (
            <button
              key={qa.label}
              onClick={qa.fn}
              className="flex flex-col items-center justify-center gap-2 min-h-[88px] py-3 px-1 rounded-2xl bg-white transition-transform active:scale-[0.97]"
              style={{ boxShadow: C.shadowSm }}
            >
              <span className="flex items-center justify-center w-9 h-9 shrink-0">
                <qa.Icon size={26} />
              </span>
              <span
                className="text-[11px] font-semibold text-center leading-tight"
                style={{ color: C.ink, fontFamily: C.body }}
              >
                {qa.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Live metro status ─────────────────────────────────────────────── */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22C55E" }} />
            <span className="text-xs font-bold" style={{ color: C.ink }}>Live metro status</span>
          </div>
          <button onClick={() => go("map")} className="text-xs font-semibold flex items-center gap-0.5"
            style={{ color: C.accent }}>
            View map <ChevronRight size={13} />
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpenSimulator()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenSimulator(); }}
          className="bg-white rounded-3xl overflow-hidden cursor-pointer transition-transform active:scale-[0.99]"
          style={{ boxShadow: C.shadowSm }}
          aria-label="Obrir simulador d'accessibilitat de Zona Universitària"
        >
          {/* Mini schematic */}
          <div className="px-4 pt-4 pb-2">
            <svg viewBox="0 0 280 70" className="w-full pointer-events-none" style={{ height: 70 }}>
              {/* L2 */}
              <path d="M 20,28 Q 80,18 140,26 Q 180,30 230,24 L 260,25" stroke="#9B2D9E" strokeWidth="4" fill="none" strokeLinecap="round" />
              {/* L3 */}
              <path d="M 20,42 Q 70,38 100,40 Q 140,42 170,38 Q 210,34 260,38" stroke="#3FAB2E" strokeWidth="4" fill="none" strokeLinecap="round" />
              {/* L5 */}
              <path d="M 20,55 Q 80,52 140,50 Q 190,48 260,52" stroke="#0065A7" strokeWidth="4" fill="none" strokeLinecap="round" />

              {/* Sagrada Família interchange */}
              <circle cx="140" cy="26" r="7" fill="white" stroke="#9B2D9E" strokeWidth="2.5" />
              <circle cx="140" cy="50" r="7" fill="white" stroke="#0065A7" strokeWidth="2.5" />
              <line x1="140" y1="33" x2="140" y2="43" stroke="#E0DCFF" strokeWidth="1.5" />
              <text x="140" y="68" textAnchor="middle" fontSize="7.5" fill={SOLMOVE.muted} fontWeight="600" fontFamily="Onest,sans-serif">Sagrada Família</text>
              {/* green dot = working */}
              <circle cx="140" cy="26" r="3.5" fill="#22C55E" />
              <circle cx="140" cy="50" r="3.5" fill="#22C55E" />

              {/* Pg Gràcia node */}
              <circle cx="85" cy="28" r="6" fill="white" stroke="#9B2D9E" strokeWidth="2" />
              <circle cx="85" cy="40" r="6" fill="white" stroke="#3FAB2E" strokeWidth="2" />
              <line x1="85" y1="34" x2="85" y2="40" stroke="#E0DCFF" strokeWidth="1.5" />
              {/* maint = amber dot */}
              <circle cx="85" cy="28" r="3" fill="#F59E0B" />
            </svg>
          </div>

          {/* Station rows */}
          {[sagrada, pggracia].map((s, i) => (
            <div key={s.id}
              className="w-full flex items-center gap-3 px-4 py-3 pointer-events-none"
              style={{ borderTop: i === 0 ? "1px solid rgba(36,50,63,0.07)" : "1px solid rgba(36,50,63,0.07)" }}>
              <div className="flex gap-1 shrink-0">{s.lines.slice(0, 2).map(l => <LineBadge key={l} line={l} sm />)}</div>
              <span className="flex-1 text-xs font-semibold text-left truncate" style={{ color: C.ink }}>{s.name}</span>
              <StatusPill status={s.status} />
            </div>
          ))}

          <div className="px-4 py-2.5 flex items-center justify-center gap-1.5 pointer-events-none"
            style={{ borderTop: "1px solid rgba(36,50,63,0.07)", background: "rgba(47,163,160,0.06)" }}>
            <Accessibility size={13} color={C.accent} />
            <span className="text-[10px] font-bold" style={{ color: C.accent }}>
              Toca per simular ruta accessible · Zona Universitària
            </span>
          </div>
        </div>
      </div>

      {/* ── WeMove Together ───────────────────────────────────────────────── */}
      <div className="px-4 mt-5 mb-24 flex flex-col gap-4">
        <div className="rounded-3xl overflow-hidden relative" style={{ height: 148 }}>
          <img
            src={trainImg}
            alt="Barcelona tram con Sagrada Família"
            decoding="async"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
          />
          <div className="absolute inset-0 flex flex-col justify-center px-5 py-4">
            <h3 className="text-lg font-extrabold leading-tight mb-1" style={{ fontFamily: C.display }}>
              <span style={{ color: C.accent }}>WeMove</span>
              <span style={{ color: C.ink }}> Together</span>
            </h3>
            <p className="text-[11px] mb-3 leading-relaxed" style={{ color: C.ink, opacity: 0.65 }}>
              Making Barcelona more<br />accessible every day.
            </p>
            <button className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white"
              style={{ color: C.ink, border: `1.5px solid rgba(47,163,160,0.18)`, boxShadow: C.shadowSm }}>
              Learn more <ArrowRight size={13} />
            </button>
          </div>
        </div>

        <div className="rounded-3xl overflow-hidden relative" style={{ height: 200 }}>
          <img
            src={routesImg}
            alt="Ruta accesible hacia el MNAC en Barcelona"
            decoding="async"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "65% center" }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to right, rgba(244,243,255,0.97) 0%, rgba(244,243,255,0.88) 42%, rgba(244,243,255,0.35) 68%, transparent 85%)" }}
          />
          <div className="absolute inset-0 flex flex-col justify-center px-5 py-4 gap-2">
            <h3 className="text-lg font-extrabold leading-tight" style={{ fontFamily: C.display }}>
              <span style={{ color: C.accent }}>WeMove</span>
              <span style={{ color: C.ink }}> Together</span>
            </h3>
            <button
              type="button"
              className="self-start flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold"
              style={{ background: C.accent, color: "#fff", boxShadow: C.shadowSm }}>
              <Accessibility size={14} strokeWidth={2.5} />
              Suggested routes
              <ArrowRight size={13} />
            </button>
            <p className="text-[11px] leading-relaxed" style={{ color: C.ink, opacity: 0.65 }}>
              Accessible guides to discover Barcelona
            </p>
            <button
              type="button"
              className="self-start flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white"
              style={{ color: C.ink, border: `1.5px solid rgba(47,163,160,0.18)`, boxShadow: C.shadowSm }}>
              View routes <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <Nav screen="home" go={go} />
    </div>
  );
}

// ─── Map screen ───────────────────────────────────────────────────────────────

function MapScreen({ go, setSt }: { go: (s: Screen) => void; setSt: (s: Station) => void }) {
  const [sheet, setSheet] = useState<Station | null>(null);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [selected3d, setSelected3d] = useState<string | null>(null);
  const [mapLayers, setMapLayers] = useState<MapLayers>(DEFAULT_MAP_LAYERS);
  const map2dRef = useRef<MetroMap2DHandle>(null);

  const toggleLayer = (key: keyof MapLayers) =>
    setMapLayers(prev => ({ ...prev, [key]: !prev[key] }));

  const layerOptions: { key: keyof MapLayers; label: string }[] = [
    { key: "buildings", label: "Buildings" },
    { key: "streets", label: "Streets" },
    { key: "metro", label: "Metro" },
    { key: "stations", label: "Stations" },
    { key: "trees", label: "Trees" },
    { key: "lineLabels", label: "Line names" },
  ];

  const handleStation = (s: Station) => {
    setSheet(s);
    setSelected3d(s.id);
  };

  return (
    <div className="flex flex-col h-full pb-24" style={{ background: C.bg }}>
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-extrabold" style={{ color: C.ink, fontFamily: C.display }}>Metro map</h1>
          <div className="flex gap-1.5 p-1 rounded-xl bg-white" style={{ boxShadow: C.shadowSm }}>
            {([
              ["2d", "2D", Map],
              ["3d", "3D", Box],
            ] as const).map(([mode, label, Icon]) => {
              const on = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: on ? C.accent : "transparent",
                    color: on ? "#fff" : C.muted,
                  }}>
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {[["all","All"],["working","Working"],["issues","Issues"],["mine","My stations"]].map(([val, label]) => {
            const on = filter === val;
            return (
              <button key={val} onClick={() => setFilter(val)}
                className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-white"
                style={{ boxShadow: C.shadowSm, border: `1.5px solid ${on ? C.accent : "transparent"}`, color: on ? C.accent : C.muted }}>
                {label}
              </button>
            );
          })}
        </div>
        {(viewMode === "2d" || viewMode === "3d") && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers size={13} color={C.muted} />
              <span className="text-[11px] font-bold" style={{ color: C.muted }}>Show / hide layers</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {layerOptions.map(({ key, label }) => {
                const on = mapLayers[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleLayer(key)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                    style={{
                      background: on ? C.accent : "white",
                      color: on ? "#fff" : C.muted,
                      boxShadow: C.shadowSm,
                      border: `1.5px solid ${on ? C.accent : "transparent"}`,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Map container */}
      <div className="relative flex-1 min-h-0 mx-4 mb-3 rounded-3xl overflow-hidden" style={{ boxShadow: C.shadow, background: viewMode === "3d" ? "#0e1f36" : "#E4E4E8", minHeight: 320 }}>
        {viewMode === "2d" ? (
          <MetroMap2D
            ref={map2dRef}
            filter={filter}
            onStation={handleStation}
            selectedId={selected3d}
            layers={mapLayers}
          />
        ) : (
          <MetroMap3D
            filter={filter}
            onStation={handleStation}
            selectedId={selected3d}
            layers={mapLayers}
          />
        )}

        {/* Zoom controls (2D only) */}
        {viewMode === "2d" && (
          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            {[
              { icon: <Plus size={14} />, fn: () => map2dRef.current?.zoomIn(), label: "Zoom in" },
              { icon: <Minus size={14} />, fn: () => map2dRef.current?.zoomOut(), label: "Zoom out" },
              { icon: <LocateFixed size={13} />, fn: () => map2dRef.current?.reset(), label: "Reset" },
            ].map(({ icon, fn, label }) => (
              <button key={label} onClick={fn} aria-label={label}
                className="w-9 h-9 rounded-xl bg-white flex items-center justify-center"
                style={{ boxShadow: C.shadowSm, color: C.ink }}>
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Station bottom sheet */}
      {sheet && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(15,13,26,0.25)" }} onClick={() => setSheet(null)}>
          <div className="bg-white rounded-t-[32px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: SOLMOVE.gray }} />
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: C.display }}>{sheet.name}</h3>
                <div className="flex gap-1.5 mt-2">{sheet.lines.map(l => <LineBadge key={l} line={l} sm />)}</div>
              </div>
              <button onClick={() => setSheet(null)} className="p-1.5"><X size={20} color={C.muted} /></button>
            </div>
            <StatusPill status={sheet.status} />
            <p className="text-xs" style={{ color: C.muted }}>{sheet.exits} step-free exits · Updated {sheet.updated}</p>
            <div className="flex gap-3">
              <Btn onClick={() => { setSheet(null); go("route-input"); }} full>Route from here</Btn>
              <Btn onClick={() => { setSheet(null); setSt(sheet); go("station-detail"); }} accent={C.ink} full>Details</Btn>
            </div>
          </div>
        </div>
      )}

      <Nav screen="map" go={go} />
    </div>
  );
}

// ─── Route Input ──────────────────────────────────────────────────────────────

function RouteInput({ go }: { go: (s: Screen) => void }) {
  const [from, setFrom] = useState("Sagrada Família");
  const [to, setTo] = useState("");
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-6 pt-12 pb-5">
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: C.ink, fontFamily: C.display }}>Plan a route</h1>
        <p className="text-sm mb-5" style={{ color: C.muted }}>Step-free routes, live verified.</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white" style={{ boxShadow: C.shadowSm }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: C.accent }}>
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <input value={from} onChange={e => setFrom(e.target.value)} placeholder="From — station"
              className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-normal" style={{ color: C.ink }} />
            <button aria-label="Voice"><Mic size={16} color={C.muted} /></button>
          </div>
          <div className="w-px h-3 mx-7" style={{ background: SOLMOVE.gray }} />
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white" style={{ boxShadow: C.shadowSm, outline: `2px solid ${C.accent}`, outlineOffset: 0 }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white" style={{ border: `2px solid ${C.ink}` }}>
              <MapPin size={12} color={C.ink} />
            </div>
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="To — destination"
              className="flex-1 bg-transparent text-sm font-semibold outline-none placeholder:font-normal" style={{ color: C.ink }} autoFocus />
            <button aria-label="Voice"><Mic size={16} color={C.muted} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-36 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Recent searches</p>
        {["Barceloneta", "Passeig de Gràcia", "Arc de Triomf"].map((r) => (
          <Card key={r} onClick={() => setTo(r)}>
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Clock size={15} color={C.muted} />
              <span className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>{r}</span>
              <ArrowRight size={14} color={C.muted} />
            </div>
          </Card>
        ))}

        <p className="text-[11px] font-bold uppercase tracking-widest pt-2" style={{ color: C.muted }}>Preferences</p>
        {[["Fewest transfers", true], ["Avoid long corridors", true], ["Show backup route", true]].map(([label, on]) => (
          <Card key={label as string}>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm font-semibold" style={{ color: C.ink }}>{label as string}</span>
              <div className="w-11 h-6 rounded-full flex items-center px-0.5 transition-colors"
                style={{ background: on ? C.accent : "#E5E7EB" }}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="absolute z-40 left-0 right-0 px-6" style={{ bottom: 88 }}>
        <Btn onClick={() => go("route-results")} disabled={!to} full>Find accessible routes</Btn>
      </div>
      <Nav screen="route-input" go={go} />
    </div>
  );
}

// ─── Route Results ────────────────────────────────────────────────────────────

function RouteResults({ go }: { go: (s: Screen) => void }) {
  const [sel, setSel] = useState(0);
  const routes = [
    {
      label: "Best accessible", time: "24", unit: "min", transfers: 1, score: 98,
      lines: [{ id: "L5" as LineId, stops: 4 }, { id: "L2" as LineId, stops: 2 }],
      steps: [
        { text: "Enter Exit 2 — Carrer Marina", sub: "Flat, step-free confirmed", ok: true },
        { text: "Elevator to L5 platform", sub: "Working · verified 3 min ago", ok: true },
        { text: "L5 towards Vall d'Hebron · 4 stops", sub: "", ok: true },
        { text: "Transfer at Sagrada Família", sub: "180 m corridor · 2 elevators", ok: true },
        { text: "Arrive Barceloneta · Exit 1", sub: "Flat to street", ok: true },
      ],
      backup: "If elevator fails: bus V19 from Vall d'Hebron.",
      warning: null as string | null,
    },
    {
      label: "Alternative", time: "31", unit: "min", transfers: 2, score: 81,
      lines: [{ id: "L1" as LineId, stops: 3 }, { id: "L2" as LineId, stops: 2 }],
      steps: [
        { text: "Enter Arc de Triomf", sub: "Step-free confirmed", ok: true },
        { text: "L1 to Clot · 3 stops", sub: "", ok: true },
        { text: "Transfer at Clot", sub: "Use Exit 3 only — Exit 1 has stairs", ok: false },
        { text: "L2 to Barceloneta · 2 stops", sub: "", ok: true },
      ],
      backup: "If L2 disrupted: bus H14 from Carrer Pallars.",
      warning: "Avoid Exit 1 at Clot — stairs only",
    },
  ];
  const r = routes[sel];

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => go("route-input")} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white" style={{ boxShadow: C.shadowSm }}>
            <ArrowLeft size={18} color={C.ink} />
          </button>
          <div>
            <p className="text-[11px] font-semibold" style={{ color: C.muted }}>Sagrada Família → Barceloneta</p>
            <h1 className="text-xl font-extrabold" style={{ color: C.ink, fontFamily: C.display }}>Route options</h1>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-2">
          {routes.map((r2, i) => (
            <button key={i} onClick={() => setSel(i)}
              className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all bg-white"
              style={{ boxShadow: C.shadowSm, border: `1.5px solid ${sel === i ? C.accent : "transparent"}`, color: sel === i ? C.accent : C.muted }}>
              {r2.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-3">
        {/* Stats */}
        <div className="flex gap-2">
          {[{ val: r.time + " " + r.unit, lbl: "journey" }, { val: r.score + "", lbl: "access score" }, { val: r.transfers + "", lbl: "transfer" + (r.transfers > 1 ? "s" : "") }].map((s) => (
            <Card key={s.lbl} className="flex-1">
              <div className="px-3 py-3.5 text-center">
                <p className="text-base font-extrabold" style={{ color: C.ink }}>{s.val}</p>
                <p className="text-[10px] font-semibold mt-0.5" style={{ color: C.muted }}>{s.lbl}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Line diagram */}
        <Card>
          <div className="flex items-center gap-3 px-4 py-3.5">
            {r.lines.map((seg, i) => (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <div className="w-6 h-0.5" style={{ background: SOLMOVE.gray }} />}
                <div className="flex items-center gap-1.5">
                  <LineBadge line={seg.id} sm />
                  <span className="text-[11px] font-semibold" style={{ color: C.muted }}>{seg.stops} stops</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Warning */}
        {r.warning && (
          <Card>
            <div className="flex items-start gap-3 px-4 py-3.5" style={{ borderLeft: `3px solid ${C.ink}`, borderRadius: "1.5rem" }}>
              <TriangleAlert size={16} color={C.ink} className="shrink-0 mt-0.5" />
              <p className="text-sm font-semibold" style={{ color: C.ink }}>{r.warning}</p>
            </div>
          </Card>
        )}

        {/* Steps */}
        <Card>
          <div className="px-4 pt-4 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: C.muted }}>Step-by-step</p>
          </div>
          {r.steps.map((step, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 ${i < r.steps.length - 1 ? "border-b" : ""}`} style={{ borderColor: SOLMOVE.bg }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-white"
                style={{ border: `1.5px solid ${step.ok ? C.accent : C.ink}` }}>
                <span className="text-[11px] font-extrabold" style={{ color: step.ok ? C.accent : C.ink }}>{i + 1}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: C.ink }}>{step.text}</p>
                {step.sub && <p className="text-xs mt-0.5" style={{ color: C.muted }}>{step.sub}</p>}
              </div>
              {step.ok
                ? <CheckCircle size={15} color={C.accent} className="shrink-0 mt-1" />
                : <TriangleAlert size={15} color={C.ink} className="shrink-0 mt-1" />}
            </div>
          ))}
        </Card>

        {/* Backup */}
        <Card>
          <div className="flex items-start gap-3 px-4 py-4" style={{ borderLeft: `3px solid ${SOLMOVE.sun}`, borderRadius: "1.5rem" }}>
            <Shield size={15} color={SOLMOVE.sun} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: SOLMOVE.sun }}>Backup plan</p>
              <p className="text-sm" style={{ color: C.ink }}>{r.backup}</p>
            </div>
          </div>
        </Card>
      </div>

      <Nav screen="route-input" go={go} />
    </div>
  );
}

// ─── Station Detail ───────────────────────────────────────────────────────────

function StationDetail({ station, go }: { station: Station; go: (s: Screen) => void }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportStep, setReportStep] = useState(0);
  const [selectedIssue, setSelectedIssue] = useState("");
  const opCount = station.elevators.filter((e) => e.status === "ok").length;

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      {/* Header */}
      <div className="px-6 pt-12 pb-5">
        <button onClick={() => go("home")} className="mb-5 w-10 h-10 rounded-2xl flex items-center justify-center bg-white" style={{ boxShadow: C.shadowSm }}>
          <ArrowLeft size={18} color={C.ink} />
        </button>
        <div className="flex gap-1.5 mb-2">{station.lines.map((l) => <LineBadge key={l} line={l} sm />)}</div>
        <h1 className="text-2xl font-extrabold mb-3 leading-tight" style={{ color: C.ink, fontFamily: C.display }}>{station.name}</h1>
        {/* Status card */}
        <Card>
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-white"
              style={{ border: `2px solid ${STATUS[station.status].color}` }}>
              <span style={{ color: STATUS[station.status].color }}>
                {station.status === "ok" ? <CheckCircle size={22} strokeWidth={2} /> : station.status === "maint" ? <Clock size={22} strokeWidth={2} /> : <XCircle size={22} strokeWidth={2} />}
              </span>
            </div>
            <div>
              <p className="font-extrabold text-base" style={{ color: C.ink }}>{STATUS[station.status].label}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted }}>{opCount}/{station.elevators.length} elevators working · {station.updated}</p>
            </div>
          </div>
          <div className="h-1 rounded-b-3xl" style={{ background: STATUS[station.status].color }} />
        </Card>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-28 space-y-3">
        {/* Elevators */}
        <Card>
          <div className="px-4 pt-4 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Elevators</p>
          </div>
          {station.elevators.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < station.elevators.length - 1 ? "border-b" : ""}`} style={{ borderColor: SOLMOVE.bg }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white shrink-0"
                style={{ border: `1.5px solid ${STATUS[e.status].color}`, color: STATUS[e.status].color }}>
                {e.status === "ok" ? <CheckCircle size={14} /> : e.status === "maint" ? <Clock size={14} /> : <XCircle size={14} />}
              </div>
              <p className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>{e.label}</p>
              <StatusPill status={e.status} />
            </div>
          ))}
        </Card>

        {/* Station levels */}
        <Card>
          <div className="px-4 pt-4 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Station levels</p>
          </div>
          {[
            { label: "Street level", items: ["Exit 2 — Carrer Marina (flat)", "Exit 4 — Avinguda Gaudí (flat)", "Exit 1 — stairs only"] },
            { label: "Mezzanine",    items: ["Ticket barriers", "Customer service"] },
            { label: "Platform L2 / L5", items: ["L2: Badalona / Sant Antoni", "L5: Vall d'Hebron / Cornellà"] },
          ].map((layer, i) => (
            <div key={i} className={`px-4 py-3 ${i < 2 ? "border-b" : ""}`} style={{ borderColor: SOLMOVE.bg }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: C.muted }}>{layer.label}</p>
              {layer.items.map((item) => (
                <p key={item} className={`text-sm ${item.includes("stairs") ? "line-through" : "font-medium"}`}
                  style={{ color: item.includes("stairs") ? SOLMOVE.muted : C.ink, opacity: item.includes("stairs") ? 0.55 : 1 }}>{item}</p>
              ))}
            </div>
          ))}
        </Card>

        {/* Incidents */}
        <Card>
          <div className="px-4 pt-4 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Incidents — last 30 days</p>
          </div>
          {[{ date: "8 Jul", h: "4h", elev: "Entrance → Mezzanine" }, { date: "2 Jul", h: "1.5h", elev: "Mezzanine → L5" }].map((inc, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i === 0 ? "border-b" : ""}`} style={{ borderColor: SOLMOVE.bg }}>
              <span className="text-xs w-10 shrink-0" style={{ color: C.muted }}>{inc.date}</span>
              <span className="flex-1 text-sm font-medium" style={{ color: C.ink }}>{inc.elev}</span>
              <span className="text-xs shrink-0" style={{ color: C.muted }}>{inc.h}</span>
            </div>
          ))}
        </Card>

        <Btn onClick={() => { setReportOpen(true); setReportStep(0); }} accent={C.ink} full>
          <TriangleAlert size={15} /> Report a problem
        </Btn>
      </div>

      {/* Report sheet */}
      {reportOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(15,13,26,0.2)" }} onClick={() => setReportOpen(false)}>
          <div className="bg-white rounded-t-[32px] p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto" style={{ background: SOLMOVE.gray }} />
            {reportStep === 0 && (<>
              <h3 className="text-xl font-extrabold" style={{ color: C.ink }}>What is the problem?</h3>
              <div className="grid grid-cols-2 gap-2.5">
                {["Elevator broken", "Elevator locked", "Obstacle blocking", "Other issue"].map((issue) => (
                  <button key={issue} onClick={() => { setSelectedIssue(issue); setReportStep(1); }}
                    className="py-4 rounded-2xl text-sm font-semibold bg-white transition-all"
                    style={{ border: `1.5px solid ${selectedIssue === issue ? C.accent : SOLMOVE.gray}`, color: selectedIssue === issue ? C.accent : C.ink }}>
                    {issue}
                  </button>
                ))}
              </div>
            </>)}
            {reportStep === 1 && (<>
              <h3 className="text-xl font-extrabold" style={{ color: C.ink }}>Confirm report</h3>
              <div className="px-4 py-3.5 rounded-2xl" style={{ background: C.bg }}>
                <p className="text-xs mb-0.5" style={{ color: C.muted }}>{station.name}</p>
                <p className="font-bold text-base" style={{ color: C.ink }}>{selectedIssue}</p>
              </div>
              <Btn onClick={() => setReportStep(2)} full>Submit report</Btn>
              <button onClick={() => setReportStep(0)} className="w-full py-2 text-sm font-semibold" style={{ color: C.muted }}>Back</button>
            </>)}
            {reportStep === 2 && (
              <div className="text-center py-4 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center mx-auto"
                  style={{ border: `2px solid ${C.accent}`, boxShadow: C.shadow }}>
                  <CheckCircle size={30} color={C.accent} />
                </div>
                <h3 className="text-xl font-extrabold" style={{ color: C.ink }}>Report sent</h3>
                <p className="text-sm" style={{ color: C.muted }}>Thank you. This helps other users.</p>
                <Btn onClick={() => setReportOpen(false)} full>Done</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      <Nav screen="home" go={go} />
    </div>
  );
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function AlertsScreen({ go }: { go: (s: Screen) => void }) {
  const [subs, setSubs] = useState<string[]>(["sagrada", "pggracia"]);
  const toggle = (id: string) => setSubs(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const notifs = [
    { station: "Ciutadella | Vila Olímpica", msg: "Elevator out of service", time: "14m ago", urgent: true },
    { station: "Passeig de Gràcia", msg: "Planned maintenance until 18:00", time: "2h ago", urgent: false },
    { station: "Sagrada Família", msg: "All elevators back online", time: "Yesterday", urgent: false },
  ];
  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>
      <div className="px-6 pt-12 pb-5">
        <h1 className="text-3xl font-extrabold" style={{ color: C.ink, fontFamily: C.display }}>Alerts</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: C.muted }}>Recent</p>
        {notifs.map((n, i) => (
          <Card key={i}>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-white"
                  style={{ border: `1.5px solid ${n.urgent ? C.ink : SOLMOVE.gray}` }}>
                  {n.urgent ? <XCircle size={18} color={C.ink} /> : <Bell size={18} color={C.muted} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold" style={{ color: C.muted }}>{n.station}</p>
                  <p className="text-sm font-bold" style={{ color: C.ink }}>{n.msg}</p>
                </div>
                <span className="text-[11px] shrink-0" style={{ color: C.muted }}>{n.time}</span>
              </div>
              {n.urgent && (
                <Btn onClick={() => go("route-results")} full sm>
                  <Navigation size={12} /> Recalculate route
                </Btn>
              )}
            </div>
          </Card>
        ))}

        <p className="text-[11px] font-bold uppercase tracking-widest pt-2" style={{ color: C.muted }}>Subscriptions</p>
        {STATIONS.map((s) => {
          const on = subs.includes(s.id);
          return (
            <Card key={s.id}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex gap-1">{s.lines.map(l => <LineBadge key={l} line={l} sm />)}</div>
                <p className="flex-1 text-sm font-semibold truncate" style={{ color: C.ink }}>{s.name}</p>
                <button onClick={() => toggle(s.id)} role="switch" aria-checked={on}
                  className="w-11 h-6 rounded-full flex items-center px-0.5 transition-colors"
                  style={{ background: on ? C.accent : SOLMOVE.gray }}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      <Nav screen="alerts" go={go} />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("onboarding1");
  const [selectedStation, setSelectedStation] = useState<Station>(STATIONS[0]);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Preload all images immediately so they're ready before the user navigates
  useEffect(() => {
    [heroImg, trainImg, solmoveLogo].forEach(src => {
      const img = new window.Image();
      img.src = src as string;
    });
  }, []);

  return (
    <div className="flex items-start justify-center min-h-screen" style={{ background: SOLMOVE.gray, fontFamily: "'Onest', sans-serif" }}>
      <div className="relative overflow-hidden" style={{ width: "100%", maxWidth: 440, height: "100svh", display: "flex", flexDirection: "column", background: C.bg }}>
        {screen === "onboarding1"    && <OB1 next={() => setScreen("onboarding2")} />}
        {screen === "onboarding2"    && <OB2 next={() => setScreen("onboarding3")} back={() => setScreen("onboarding1")} />}
        {screen === "onboarding3"    && <OB3 finish={() => setScreen("home")} back={() => setScreen("onboarding2")} />}
        {screen === "home"           && <HomeScreen go={setScreen} setSt={setSelectedStation} onOpenSimulator={() => setSimulatorOpen(true)} />}
        {screen === "map"            && <MapScreen go={setScreen} setSt={setSelectedStation} />}
        {screen === "route-input"    && <RouteInput go={setScreen} />}
        {screen === "route-results"  && <RouteResults go={setScreen} />}
        {screen === "station-detail" && <StationDetail station={selectedStation} go={setScreen} />}
        {screen === "alerts"         && <AlertsScreen go={setScreen} />}

        {simulatorOpen && (
          <Suspense fallback={null}>
            <LazyMetroAccessibilitySimulatorModal open={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
