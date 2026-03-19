"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkle, Shield, Eye, MagnifyingGlass, CheckCircle, House, FileText, PenNib, Lock, Lightning, CaretRight, Star, TrendUp, MapPin, Bathtub, Bed, ArrowsOut } from '@phosphor-icons/react';
import { SectionLabel } from "@/components/ui/section-label";

/* ================================================================
   VISUAL 1 — Evaluación de Riesgo (HERO — 7col, DARK)
   Clean widget-based scoring display
   ================================================================ */
function RiskVisual() {
  return (
    <div className="relative w-full h-full flex items-center px-6 py-4">
      {/* Glow effects */}
      <div className="absolute top-[20%] left-[10%] w-[120px] h-[120px] bg-success-500/10 rounded-full blur-[50px] pointer-events-none" />

      <div className="flex items-center gap-6 w-full">
        {/* Left: Score gauge with badge inside */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-shrink-0 flex flex-col items-center"
        >
          <div className="relative w-[100px] h-[100px]">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={264}
                initial={{ strokeDashoffset: 264 }}
                animate={{ strokeDashoffset: 264 * 0.09 }}
                transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--success-400))" />
                  <stop offset="100%" stopColor="hsl(var(--success-500))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-heading font-bold text-white leading-none">91</span>
              <span className="text-[9px] text-white/40 mt-0.5">de 100</span>
            </div>
          </div>
          {/* Badge below gauge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1, type: "spring" }}
            className="flex items-center gap-1 bg-success-500/20 text-success-400 text-[9px] font-bold px-2.5 py-1 rounded-full border border-success-500/20 mt-2"
          >
            <CheckCircle className="w-3 h-3" /> Aprobada
          </motion.div>
        </motion.div>

        {/* Right: Profile + bars */}
        <div className="flex-1 min-w-0">
          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2.5 mb-4 bg-white/5 rounded-xl p-2.5 border border-white/10"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-white/10">
              <span className="text-[12px] font-semibold text-white/80">ML</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-heading font-semibold text-white block">María López</span>
              <span className="text-[9px] text-white/40">Riesgo bajo · Verificada</span>
            </div>
          </motion.div>

          {/* Score bars */}
          <div className="space-y-2.5">
            {[
              { label: "Historial pago", score: 95, color: "bg-success-500" },
              { label: "Estabilidad", score: 88, color: "bg-primary" },
              { label: "Referencias", score: 92, color: "bg-indigo-400" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <span className="text-[9px] text-white/50 w-[72px] flex-shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${item.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }}
                  />
                </div>
                <span className="text-[11px] font-bold text-white w-6 text-right tabular-nums">{item.score}</span>
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
   Clean widget-based search results display
   ================================================================ */
function MagnifyingGlassVisual() {
  const results = [
    { match: 96, location: "Chapinero", price: "$2.8M", beds: 2, highlight: true },
    { match: 89, location: "Usaquén", price: "$3.2M", beds: 3, highlight: false },
    { match: 84, location: "Cedritos", price: "$2.4M", beds: 2, highlight: false },
  ];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden px-5 py-4">
      {/* MagnifyingGlass bar */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white px-3 py-2.5 flex items-center gap-2 rounded-xl shadow-sm border border-border mb-4"
      >
        <MagnifyingGlass className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-[11px] text-muted-foreground flex-1">Chapinero, 2 hab, $3M máx</span>
        <div className="bg-foreground text-white text-[9px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Sparkle className="w-3 h-3" /> AI
        </div>
      </motion.div>

      {/* Results label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between mb-3"
      >
        <span className="text-[10px] text-muted-foreground">Resultados para ti</span>
        <span className="text-[10px] font-semibold text-primary">24 propiedades</span>
      </motion.div>

      {/* Property results stack */}
      <div className="flex-1 flex flex-col gap-2.5">
        {results.map((item, i) => (
          <motion.div
            key={item.location}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              item.highlight
                ? "bg-primary/5 border-primary/20 shadow-sm"
                : "bg-white border-border hover:border-primary/20"
            }`}
          >
            {/* Match badge */}
            <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center ${
              item.match >= 90
                ? "bg-success-50 text-success-600"
                : "bg-neutral-100 text-foreground"
            }`}>
              <span className="text-[14px] font-heading font-bold leading-none">{item.match}</span>
              <span className="text-[7px] opacity-60">%</span>
            </div>

            {/* Property info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-[12px] font-heading font-semibold text-foreground">{item.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Bed className="w-3 h-3" /> {item.beds} hab
                </span>
                <span className="text-[10px] text-muted-foreground">· Apto</span>
              </div>
            </div>

            {/* Price */}
            <div className="text-right">
              <div className="text-[14px] font-heading font-bold text-foreground">{item.price}</div>
              <div className="text-[8px] text-muted-foreground">/mes</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Robottom insight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-2 mt-3 pt-3 border-t border-border"
      >
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <TrendUp className="w-3 h-3 text-primary" />
        </div>
        <span className="text-[10px] text-muted-foreground">
          <span className="text-foreground font-semibold">3 propiedades nuevas</span> desde ayer
        </span>
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 3 — Contratos Digitales (LOW — 5col, outline)
   Clean contract widget with signature animation
   ================================================================ */
function ContractVisual() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSigned(true), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden p-5">
      {/* Main contract card */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full bg-white rounded-2xl shadow-lg border border-border overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-heading font-semibold text-foreground">Contrato de Arriendo</div>
            <div className="text-[10px] text-muted-foreground font-mono">REF-2026-00847</div>
          </div>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`text-[10px] font-semibold px-3 py-1.5 rounded-full ${
              signed
                ? "bg-success-50 text-success-600 border border-success-200"
                : "bg-warning-50 text-warning-600 border border-warning-200"
            }`}
          >
            {signed ? "✓ Firmado" : "Pendiente"}
          </motion.div>
        </div>

        {/* Contract details */}
        <div className="px-5 py-3">
          {[
            { label: "Canon mensual", value: "$2.800.000" },
            { label: "Duración", value: "12 meses" },
            { label: "Depósito", value: "1 mes" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex items-center justify-between py-2.5 border-b border-dashed border-border/50 last:border-0"
            >
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
              <span className="text-[12px] font-heading font-semibold text-foreground">{item.value}</span>
            </motion.div>
          ))}
        </div>

        {/* Signature area */}
        <div className="px-5 py-4 bg-neutral-50/50 border-t border-border">
          <div className="h-12 flex items-center justify-center rounded-xl border-2 border-dashed border-border bg-white">
            {!signed ? (
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <PenNib className="w-4 h-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Esperando firma...</span>
              </motion.div>
            ) : (
              <motion.svg width="120" height="24" viewBox="0 0 120 24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.path
                  d="M8 18 Q20 4 32 14 Q44 24 56 10 Q68 2 80 12 Q92 20 104 8 L116 6"
                  fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" opacity={0.5}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
              </motion.svg>
            )}
          </div>
        </div>

        {/* Verified stamp */}
        {signed && (
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: -12 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="absolute top-16 right-4 w-16 h-16 rounded-full border-3 border-success-500 flex items-center justify-center bg-success-50/80 backdrop-blur-sm"
          >
            <div className="text-center">
              <CheckCircle className="w-5 h-5 text-success-500 mx-auto" />
              <span className="text-[7px] text-success-600 font-bold uppercase tracking-wider">Verificado</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Security badges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 mt-4"
      >
        {[
          { icon: Lock, label: "Encriptado" },
          { icon: Lightning, label: "Firma digital" },
        ].map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 4 — Transparencia Total (MEDIUM — 7col)
   Clean pricing breakdown with visual comparison
   ================================================================ */
function TransparencyVisual() {
  const items = [
    { label: "Canon", amount: "$2.8M", pct: 82, colorClass: "bg-foreground" },
    { label: "Admin", amount: "$280K", pct: 8, colorClass: "bg-primary" },
    { label: "Seguro", amount: "$196K", pct: 6, colorClass: "bg-indigo-400" },
    { label: "Fee", amount: "$140K", pct: 4, colorClass: "bg-indigo-300" },
  ];

  return (
    <div className="relative w-full h-full flex items-center overflow-hidden px-5 py-4">
      <div className="w-full">
        {/* Header with badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between mb-4"
        >
          <span className="text-[11px] text-muted-foreground">Desglose mensual</span>
          <div className="flex items-center gap-1.5 bg-success-50 text-success-600 text-[9px] font-semibold px-2 py-1 rounded-full border border-success-100">
            <Eye className="w-3 h-3" />
            Transparente
          </div>
        </motion.div>

        {/* Main card with total and breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden"
        >
          {/* Total section */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Total a pagar</span>
                <span className="text-[28px] font-heading font-bold text-foreground leading-none tracking-tight tabular-nums">$3.416.000</span>
              </div>
              <span className="text-[11px] text-muted-foreground mb-1">COP/mes</span>
            </div>

            {/* Stacked bar */}
            <div className="w-full h-2.5 flex rounded-full overflow-hidden mt-4 gap-0.5">
              {items.map((item, i) => (
                <motion.div
                  key={item.label}
                  className={`h-full first:rounded-l-full last:rounded-r-full ${item.colorClass}`}
                  initial={{ width: 0 }}
                  animate={{ flex: item.pct }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                />
              ))}
            </div>
          </div>

          {/* Compact breakdown grid */}
          <div className="grid grid-cols-2 gap-px bg-border/50">
            {items.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="bg-white px-4 py-3 flex items-center gap-2.5"
              >
                <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${item.colorClass}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-muted-foreground block">{item.label}</span>
                  <span className="text-[13px] font-heading font-semibold text-foreground tabular-nums">{item.amount}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums">{item.pct}%</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Comparison badge */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-2 mt-3"
        >
          <TrendUp className="w-3.5 h-3.5 text-success-500" />
          <span className="text-[10px] text-muted-foreground">
            <span className="text-success-600 font-semibold">12% menos</span> que promedio zona
          </span>
        </motion.div>
      </div>
    </div>
  );
}

/* ================================================================
   BENTO CARD — soft rounded corners, 1px borders
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
      className={`group flex flex-col overflow-hidden rounded-2xl transition-shadow duration-500 ${bg} ${className}`}
      style={{ border: borderStyle }}
    >
      <div className="px-6 pt-5 pb-0">
        <h3 className={`font-mono uppercase text-[20px] sm:text-[24px] font-normal tracking-[-0.02em] leading-tight ${dark ? "text-white" : "text-foreground"}`}>
          {title}
        </h3>
        <p className={`text-[13px] font-sans leading-relaxed mt-1.5 max-w-[380px] ${dark ? "text-white/50" : "text-muted-foreground"}`}>
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
    <section className="bg-neutral-50 pt-12 lg:pt-16 pb-24 lg:pb-32 relative">
      <div className="container-platform relative z-10">
        <div className="mb-14 lg:mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
              Arriendo inteligente, resultados reales
            </h2>
            <div className="flex items-start pl-0 lg:pl-6 pt-2">
              <p className="text-[15px] text-muted-foreground leading-relaxed">
                Inquilinos encuentran hogar en días, no meses. Propietarios tienen inquilinos verificados que pagan a tiempo. Así de simple.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
          <BentoCard
            title="Inquilinos que pagan"
            description="Scoring AI que predice comportamiento de pago. 92% de aprobación."
            index={0}
            className="md:col-span-7 h-[320px]"
            dark
          >
            <RiskVisual />
          </BentoCard>

          <BentoCard
            title="Tu hogar en días"
            description="Propiedades que se ajustan a ti. Sin visitas innecesarias."
            index={1}
            className="md:col-span-5 h-[320px]"
          >
            <MagnifyingGlassVisual />
          </BentoCard>

          <BentoCard
            title="Firmado en minutos"
            description="De aplicación a contrato en 48 horas. Todo digital."
            index={2}
            className="md:col-span-5 h-[320px]"
            outline
          >
            <ContractVisual />
          </BentoCard>

          <BentoCard
            title="Cero sorpresas"
            description="Sabes exactamente qué pagarás. Sin costos ocultos."
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
