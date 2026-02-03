"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  Sparkles, Shield, Eye, Search, CheckCircle2,
  Home, FileText, PenTool, Lock, Zap, ChevronRight,
  Star, TrendingUp, MapPin, Bath, Bed, Maximize,
} from "lucide-react";
import { SectionLabel } from "@/components/ui/section-label";

/* ================================================================
   VISUAL 1 — Evaluación de Riesgo (HERO — 7col, DARK)
   Premium dashboard: big gauge + glowing bars + profile
   ================================================================ */
function RiskVisual() {
  return (
    <div className="relative w-full h-full flex items-center overflow-hidden px-8 py-4">
      {/* Glow effects */}
      <div className="absolute top-[20%] left-[18%] w-[180px] h-[180px] bg-emerald-500/[0.07] rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[120px] h-[120px] bg-blue-500/[0.05] rounded-full blur-[60px] pointer-events-none" />

      <div className="flex items-center gap-10 w-full">
        {/* Left: Gauge + score */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex-shrink-0"
        >
          <div className="w-[160px] h-[94px] overflow-hidden">
            <svg viewBox="0 0 160 94" className="w-full h-full">
              {/* Track */}
              <path d="M 16 86 A 64 64 0 0 1 144 86" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
              {/* Colored arc */}
              <motion.path
                d="M 16 86 A 64 64 0 0 1 144 86"
                fill="none" stroke="url(#gaugeDark)" strokeWidth="10" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 0.91 }}
                transition={{ delay: 0.4, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              />
              {/* Glow copy */}
              <motion.path
                d="M 16 86 A 64 64 0 0 1 144 86"
                fill="none" stroke="url(#gaugeDark)" strokeWidth="14" strokeLinecap="round"
                opacity="0.25" style={{ filter: "blur(8px)" }}
                initial={{ pathLength: 0 }} animate={{ pathLength: 0.91 }}
                transition={{ delay: 0.4, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              />
              <defs>
                <linearGradient id="gaugeDark" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--rose-500))" />
                  <stop offset="25%" stopColor="hsl(var(--amber-500))" />
                  <stop offset="55%" stopColor="hsl(var(--emerald-500))" />
                  <stop offset="100%" stopColor="hsl(var(--emerald-400))" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {/* Score below gauge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="text-center mt-1"
          >
            <span className="text-[44px] font-bold text-white leading-none tracking-tight">91</span>
            <span className="text-[12px] text-white/30 font-medium">/100</span>
          </motion.div>
        </motion.div>

        {/* Right: Profile + bars */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-3 mb-4"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[14px] font-semibold text-white/60">ML</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-white">María López</span>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.2, type: "spring", stiffness: 400 }}
                  className="flex items-center gap-0.5 bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" /> Aprobada
                </motion.span>
              </div>
              <span className="text-[9px] text-white/30 block mt-0.5">Riesgo bajo · Verificada</span>
            </div>
          </motion.div>

          {/* Bars with glow */}
          <div className="space-y-2.5">
            {[
              { label: "Pago", score: 95, colorClass: "bg-emerald-400", glowClass: "bg-emerald-400/30" },
              { label: "Crédito", score: 88, colorClass: "bg-blue-400", glowClass: "bg-blue-400/30" },
              { label: "Referencias", score: 92, colorClass: "bg-violet-400", glowClass: "bg-violet-400/30" },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3"
              >
                <span className="text-[9px] text-white/40 font-medium w-[70px] flex-shrink-0">{c.label}</span>
                <div className="flex-1 h-[6px] bg-white/[0.04] rounded-full overflow-hidden relative">
                  <motion.div
                    className={`h-full rounded-full ${c.colorClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.score}%` }}
                    transition={{ delay: 0.9 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {/* Bar glow */}
                  <motion.div
                    className={`absolute top-0 h-full rounded-full blur-[4px] ${c.glowClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.score}%` }}
                    transition={{ delay: 0.9 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-[12px] font-bold text-white w-7 text-right tabular-nums">{c.score}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   VISUAL 2 — Búsqueda Inteligente (MEDIUM — 5col)
   Featured property with depth + stacked card behind + AI pill
   ================================================================ */
function SearchVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden px-4 pt-2">
      {/* Search bar */}
      <motion.div
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full bg-white px-3 py-2 flex items-center gap-2"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <Search className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
        <span className="text-[9px] text-muted-foreground flex-1">Chapinero, 2 hab, $3M</span>
        <div className="bg-foreground text-white text-[7px] font-semibold px-2 py-1 flex items-center gap-1">
          <Sparkles className="w-2 h-2" /> Buscar
        </div>
      </motion.div>

      {/* Stacked cards container */}
      <div className="relative mt-3 h-[160px]">
        {/* Back card (peeking) */}
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 0.4 }}
          transition={{ delay: 0.35, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-2 left-2 right-2 bg-white overflow-hidden"
          style={{ border: "1px solid rgba(0,0,0,0.04)", transform: "scale(0.96) translateY(6px)" }}
        >
          <div className="h-[58px] bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-50" />
          <div className="p-2.5">
            <div className="text-[9px] font-semibold text-foreground">Usaquén Norte</div>
          </div>
        </motion.div>

        {/* Featured front card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white overflow-hidden z-10"
          style={{ border: "1px solid rgba(0,0,0,0.06)" }}
        >
          {/* Photo area - rich warm gradient with building silhouettes */}
          <div className="h-[62px] bg-gradient-to-br from-amber-200 via-orange-100 to-rose-100 relative overflow-hidden">
            {/* City skyline silhouette */}
            <svg className="absolute bottom-0 left-0 right-0 h-[30px] w-full" viewBox="0 0 200 30" preserveAspectRatio="none">
              <path d="M0 30 L0 18 L12 18 L12 10 L18 10 L18 14 L30 14 L30 8 L38 8 L38 14 L50 14 L50 20 L65 20 L65 6 L72 6 L72 2 L78 2 L78 6 L85 6 L85 16 L100 16 L100 12 L110 12 L110 18 L125 18 L125 10 L132 10 L132 4 L138 4 L138 10 L145 10 L145 18 L160 18 L160 14 L170 14 L170 20 L185 20 L185 16 L200 16 L200 30 Z" fill="rgba(0,0,0,0.06)" />
            </svg>
            {/* Match badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 400 }}
              className="absolute top-2 right-2 bg-foreground text-white text-[8px] font-bold px-2 py-1 flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5" /> 96%
            </motion.div>
            {/* Location pin */}
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/80 backdrop-blur-sm text-[7px] font-medium text-foreground px-1.5 py-0.5">
              <MapPin className="w-2 h-2" /> Chapinero Alto
            </div>
          </div>

          {/* Property info */}
          <div className="p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[11px] font-bold text-foreground">Chapinero Alto</div>
                <div className="text-[8px] text-muted-foreground mt-0.5">Bogotá · Apartamento</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-bold text-foreground tracking-tight">$2.8M</div>
                <div className="text-[7px] text-muted-foreground">/ mes</div>
              </div>
            </div>
            {/* Feature chips */}
            <div className="flex gap-2 mt-2">
              {[
                { icon: Bed, label: "2 hab" },
                { icon: Bath, label: "1 baño" },
                { icon: Maximize, label: "72m²" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1 text-[7px] text-muted-foreground">
                  <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI results count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-1.5 mt-1"
      >
        <span className="text-[8px] text-muted-foreground">24 resultados</span>
        <ChevronRight className="w-2.5 h-2.5 text-muted-foreground" />
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 3 — Contratos Digitales (LOW — 5col, outline)
   Stacked contract pages + animated stamp seal
   ================================================================ */
function ContractVisual() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSigned(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-5">
      {/* Background pages */}
      <div className="absolute top-[24px] left-1/2 -translate-x-1/2 w-[78%] h-[175px] bg-black/[0.01] border border-border translate-y-2 scale-[0.95]" />
      <div className="absolute top-[24px] left-1/2 -translate-x-1/2 w-[82%] h-[175px] bg-black/[0.005] border border-border translate-y-1 scale-[0.975]" />

      {/* Main contract */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full overflow-hidden z-10 bg-white/80 backdrop-blur-sm"
        style={{ border: "1px solid rgba(0,0,0,0.08)" }}
      >
        {/* Header */}
        <div className="px-4 py-2.5 flex items-center gap-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <FileText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          <div className="flex-1">
            <div className="text-[10px] font-medium text-foreground">Contrato de Arriendo</div>
            <div className="text-[7px] text-muted-foreground font-mono">REF-2026-00847</div>
          </div>
          <div
            className={`text-[7px] font-semibold px-2 py-0.5 ${
              signed
                ? "border border-emerald-500/25 text-emerald-600"
                : "border border-amber-500/25 text-amber-600"
            }`}
          >
            {signed ? "✓ Firmado" : "Pendiente"}
          </div>
        </div>

        {/* Clauses */}
        <div className="px-4 py-1">
          {[
            { l: "Canon", v: "$2.800.000" },
            { l: "Duración", v: "12 meses" },
            { l: "Depósito", v: "1 mes" },
          ].map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.06 }}
              className="flex items-center justify-between py-1.5"
              style={{ borderBottom: i < 2 ? "1px dashed rgba(0,0,0,0.05)" : "none" }}
            >
              <span className="text-[8px] text-muted-foreground">{c.l}</span>
              <span className="text-[9px] font-medium text-foreground">{c.v}</span>
            </motion.div>
          ))}
        </div>

        {/* Signature area */}
        <div className="px-4 py-2.5 relative" style={{ borderTop: "1px solid rgba(0,0,0,0.03)" }}>
          <div className="h-9 flex items-center justify-center" style={{ border: "1px dashed rgba(0,0,0,0.06)" }}>
            {!signed ? (
              <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 2, repeat: Infinity }} className="flex items-center gap-1">
                <PenTool className="w-2.5 h-2.5 text-muted-foreground" strokeWidth={1.5} />
                <span className="text-[7px] text-muted-foreground">Esperando firma...</span>
              </motion.div>
            ) : (
              <motion.svg width="90" height="18" viewBox="0 0 110 24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.path
                  d="M8 18 Q18 4 28 14 Q38 24 48 10 Q58 2 68 12 Q78 20 88 8 L100 6"
                  fill="none" stroke="hsl(var(--neutral-900))" strokeWidth="1.5" strokeLinecap="round" opacity={0.4}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
              </motion.svg>
            )}
          </div>

          {/* Stamp seal - appears when signed */}
          {signed && (
            <motion.div
              initial={{ scale: 0, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 15 }}
              className="absolute -top-3 right-6"
            >
              <div className="w-14 h-14 rounded-full border-2 border-emerald-500/40 flex items-center justify-center bg-emerald-50/50 backdrop-blur-sm">
                <div className="w-10 h-10 rounded-full border border-dashed border-emerald-500/30 flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-[5px] text-emerald-600 font-bold uppercase tracking-wider mt-0.5">Verified</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Pills */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex gap-2 mt-2.5 z-10">
        {[{ icon: Lock, label: "Encriptado" }, { icon: Zap, label: "Firma digital" }].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1 text-[7px] font-medium text-muted-foreground px-2 py-1" style={{ border: "1px solid rgba(0,0,0,0.05)" }}>
            <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 4 — Transparencia Total (MEDIUM — 7col)
   Premium stacked bar + total + breakdown with proportional widths
   ================================================================ */
function TransparencyVisual() {
  const items = [
    { label: "Canon", amount: "$2.800.000", pct: 82, colorClass: "bg-neutral-900", raw: 2800000 },
    { label: "Administración", amount: "$280.000", pct: 8, colorClass: "bg-neutral-500", raw: 280000 },
    { label: "Seguro", amount: "$196.000", pct: 6, colorClass: "bg-neutral-400", raw: 196000 },
    { label: "Plataforma", amount: "$140.000", pct: 4, colorClass: "bg-neutral-300", raw: 140000 },
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-center overflow-hidden px-6">
      {/* Top: Total + stacked bar */}
      <div className="mb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-baseline gap-2 mb-3"
        >
          <span className="text-[28px] font-bold text-foreground leading-none tracking-tight tabular-nums">$3.416.000</span>
          <span className="text-[10px] text-muted-foreground font-medium">COP / mes</span>
        </motion.div>

        {/* Full-width stacked bar */}
        <div className="w-full h-[10px] flex overflow-hidden" style={{ gap: "2px" }}>
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              className={`h-full ${item.colorClass}`}
              initial={{ width: 0 }}
              animate={{ flex: item.pct }}
              transition={{ delay: 0.3 + i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
      </div>

      {/* Bottom: Breakdown rows */}
      <div className="space-y-0">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 py-2"
            style={{ borderBottom: i < items.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
          >
            <div className={`w-[6px] h-[6px] flex-shrink-0 ${item.colorClass}`} />
            <span className="text-[10px] text-foreground font-medium flex-1">{item.label}</span>
            <span className="text-[9px] text-muted-foreground tabular-nums mr-2">{item.pct}%</span>
            <span className="text-[11px] font-semibold text-foreground tabular-nums">{item.amount}</span>
          </motion.div>
        ))}
      </div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-3 self-start flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1"
        style={{ border: "1px solid rgba(16,185,129,0.15)" }}
      >
        <Eye className="w-3 h-3 text-emerald-600" />
        <span className="text-[8px] text-emerald-700 font-semibold">Sin costos ocultos</span>
      </motion.div>
    </div>
  );
}

/* ================================================================
   BENTO CARD — sharp corners, 1px borders
   ================================================================ */
function BentoCard({
  title,
  description,
  children,
  index,
  className = "",
  dark = false,
  outline = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  index: number;
  className?: string;
  dark?: boolean;
  outline?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const bg = dark
    ? "bg-indigo-950 hover:shadow-[0_8px_40px_rgba(91,95,239,0.15)]"
    : outline
      ? "bg-white hover:shadow-md"
      : "bg-neutral-50 hover:shadow-lg";

  const borderStyle = dark
    ? "1px solid rgba(255,255,255,0.06)"
    : "1px solid rgba(0,0,0,0.08)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`group flex flex-col overflow-hidden transition-shadow duration-500 ${bg} ${className}`}
      style={{ border: borderStyle }}
    >
      <div className="px-6 pt-5 pb-0">
        <h3 className={`text-[20px] sm:text-[24px] font-semibold tracking-tight leading-tight ${dark ? "text-white" : "text-foreground"}`}>
          {title}
        </h3>
        <p className={`text-[12px] leading-relaxed mt-1 max-w-[380px] ${dark ? "text-white/40" : "text-muted-foreground"}`}>
          {description}
        </p>
      </div>
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {isInView && children}
      </div>
    </motion.div>
  );
}

/* ================================================================
   MAIN SECTION
   ================================================================ */
export function AboutSection() {
  return (
    <section className="bg-white py-24 lg:py-32 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 mx-auto max-w-[1400px] px-6 md:px-12 pointer-events-none hidden lg:block">
        <div className="grid grid-cols-3">
          <div className="border-r border-border" style={{ height: "calc(6rem + 2.5rem)" }} />
          <div className="border-r border-border" style={{ height: "calc(6rem + 2.5rem + 10rem + 5rem + 320px)" }} />
          <div />
        </div>
      </div>

      <div className="container-wide relative z-10">
        <div className="mb-14 lg:mb-20">
          <div className="flex items-center gap-4 mb-8">
            <SectionLabel>Nosotros</SectionLabel>
            <div className="flex-1 h-px bg-border -mr-[calc((100vw-100%)/2+1rem)]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-light text-foreground leading-[1.05] tracking-[-0.03em]">
              Nuestra misión te lleva a un mejor hogar
            </h2>
            <div className="flex items-start pl-0 lg:pl-6 pt-2">
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Apoyamos a propietarios e inquilinos en Colombia con herramientas que simplifican decisiones, mejoran resultados y brindan claridad.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
          <BentoCard
            title="Evaluación de Riesgo"
            description="Verificamos capacidad de pago, referencias e historial con nuestro sistema de scoring inteligente."
            index={0}
            className="md:col-span-7 h-[320px]"
            dark
          >
            <RiskVisual />
          </BentoCard>

          <BentoCard
            title="Búsqueda Inteligente"
            description="IA que filtra y recomienda propiedades para ti."
            index={1}
            className="md:col-span-5 h-[320px]"
          >
            <SearchVisual />
          </BentoCard>

          <BentoCard
            title="Contratos Digitales"
            description="Firma electrónica, cláusulas claras y seguimiento en tiempo real."
            index={2}
            className="md:col-span-5 h-[320px]"
            outline
          >
            <ContractVisual />
          </BentoCard>

          <BentoCard
            title="Transparencia Total"
            description="Cada tarifa y cada paso, visible desde el primer momento."
            index={3}
            className="md:col-span-7 h-[320px]"
          >
            <TransparencyVisual />
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
