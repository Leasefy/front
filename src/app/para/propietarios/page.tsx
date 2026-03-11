'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { CTASection } from '@/components/home/CTASection';
import { FAQSection } from '@/components/home/FAQSection';
import { SectionLabel } from '@/components/ui/section-label';
import { CheckCircle, Users, CreditCard, FileText, ShareNetwork, Wallet, Bell, TrendUp, Calendar, Buildings, PenNib, Lock, Lightning, Eye } from '@phosphor-icons/react';
import { BentoCard } from '@/components/home/BentoCard';
import { TestimonialCarousel } from '@/components/home/TestimonialCarousel';

// Testimonials data
const testimonials = [
  {
    quote: 'Antes me demoraba semanas buscando inquilino. Ahora en 3 días ya tenía candidatos verificados y listos para firmar. El scoring con IA me dio total confianza.',
    author: 'Carolina Mendoza',
    role: 'Propietaria en Bogotá',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'El cobro automático me cambió la vida. Ya no tengo que estar pendiente cada mes ni perseguir a nadie. El dinero llega puntual a mi cuenta.',
    author: 'Roberto García',
    role: 'Propietario de 3 apartamentos',
    image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'La publicación en múltiples portales con un solo clic es increíble. Recibí 12 candidatos pre-aprobados en menos de una semana.',
    author: 'Ana Lucía Restrepo',
    role: 'Inversionista inmobiliaria',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
  {
    quote: 'Los contratos digitales son rápidos y seguros. Firmamos todo en el mismo día sin necesidad de reunirnos presencialmente.',
    author: 'Diego Fernández',
    role: 'Propietario en Medellín',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

/* ================================================================
   VISUAL 1 — Evaluación de Inquilinos (HERO — 7col, DARK)
   Premium gauge + candidate profile + score bars
   ================================================================ */
function EvaluationVisual() {
  return (
    <div className="relative w-full h-full flex items-center overflow-hidden px-8 py-4">
      {/* Animated glow effects */}
      <motion.div
        className="absolute top-[20%] left-[18%] w-[180px] h-[180px] bg-emerald-500/[0.07] rounded-full blur-[80px] pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.07, 0.12, 0.07],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[10%] right-[20%] w-[120px] h-[120px] bg-blue-500/[0.05] rounded-full blur-[60px] pointer-events-none"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      <div className="flex items-center gap-10 w-full">
        {/* Left: Gauge + score with enhanced animation */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 1, type: "spring", stiffness: 80, damping: 12 }}
          className="relative flex-shrink-0"
        >
          <div className="w-[160px] h-[94px] overflow-hidden">
            <svg viewBox="0 0 160 94" className="w-full h-full">
              <path d="M 16 86 A 64 64 0 0 1 144 86" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
              <motion.path
                d="M 16 86 A 64 64 0 0 1 144 86"
                fill="none" stroke="url(#gaugeProp)" strokeWidth="10" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: 0.87 }}
                transition={{ delay: 0.5, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.path
                d="M 16 86 A 64 64 0 0 1 144 86"
                fill="none" stroke="url(#gaugeProp)" strokeWidth="14" strokeLinecap="round"
                opacity="0.25" style={{ filter: "blur(8px)" }}
                initial={{ pathLength: 0 }} animate={{ pathLength: 0.87 }}
                transition={{ delay: 0.5, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
              />
              <defs>
                <linearGradient id="gaugeProp" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="25%" stopColor="#f59e0b" />
                  <stop offset="55%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.6, type: "spring" }}
            className="text-center mt-1"
          >
            <motion.span
              className="text-[44px] font-bold text-white leading-none tracking-tight inline-block"
              animate={{
                textShadow: ["0 0 20px rgba(52,211,153,0)", "0 0 30px rgba(52,211,153,0.4)", "0 0 20px rgba(52,211,153,0)"]
              }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              87
            </motion.span>
            <span className="text-[12px] text-white/30 font-medium">/100</span>
          </motion.div>
        </motion.div>

        {/* Right: Profile + bars */}
        <div className="flex-1 min-w-0">
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.6, type: "spring" }}
            className="flex items-center gap-3 mb-4"
          >
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center flex-shrink-0"
              whileHover={{ scale: 1.1, borderColor: "rgba(255,255,255,0.3)" }}
              animate={{
                boxShadow: ["0 0 0 0 rgba(255,255,255,0)", "0 0 15px 2px rgba(255,255,255,0.1)", "0 0 0 0 rgba(255,255,255,0)"]
              }}
              transition={{ boxShadow: { duration: 3, repeat: Infinity } }}
            >
              <span className="text-[14px] font-semibold text-white/60">CR</span>
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-[13px] font-semibold text-white"
                >
                  Nicolás Ruiz
                </motion.span>
                <motion.span
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 1.4, type: "spring", stiffness: 400, damping: 12 }}
                  className="flex items-center gap-0.5 bg-emerald-500/15 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <CheckCircle className="w-2.5 h-2.5" />
                  </motion.div>
                  Bajo riesgo
                </motion.span>
              </div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-[9px] text-white/30 block mt-0.5"
              >
                Empleado · 3 años antigüedad
              </motion.span>
            </div>
          </motion.div>

          <div className="space-y-2.5">
            {[
              { label: "Capacidad de pago", score: 92, colorClass: "bg-emerald-400", glowClass: "bg-emerald-400/30" },
              { label: "Historial crediticio", score: 85, colorClass: "bg-blue-400", glowClass: "bg-blue-400/30" },
              { label: "Referencias", score: 88, colorClass: "bg-violet-400", glowClass: "bg-violet-400/30" },
            ].map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  delay: 0.8 + i * 0.15,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ x: 4 }}
                className="flex items-center gap-3 cursor-pointer"
              >
                <span className="text-[9px] text-white/40 font-medium w-[100px] flex-shrink-0">{c.label}</span>
                <div className="flex-1 h-[6px] bg-white/[0.04] rounded-full overflow-hidden relative">
                  <motion.div
                    className={`h-full rounded-full ${c.colorClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.score}%` }}
                    transition={{ delay: 1 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.div
                    className={`absolute top-0 h-full rounded-full blur-[4px] ${c.glowClass}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.score}%` }}
                    transition={{ delay: 1 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.3 + i * 0.15, type: "spring" }}
                  className="text-[12px] font-bold text-white w-7 text-right tabular-nums"
                >
                  {c.score}
                </motion.span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   VISUAL 2 — Cobro Automático (5col)
   Payment dashboard with recent transactions
   ================================================================ */
function PaymentVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden px-4 pt-3">
      {/* Balance card with enhanced animation */}
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        whileHover={{ y: -2, boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}
        className="bg-foreground text-white px-4 py-3 mb-3 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-white/50 font-medium">Balance disponible</span>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            <Wallet className="w-3.5 h-3.5 text-white/30" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="flex items-baseline gap-1"
        >
          <motion.span
            className="text-[24px] font-bold tracking-tight"
            animate={{
              textShadow: ["0 0 0 transparent", "0 0 20px rgba(52,211,153,0.3)", "0 0 0 transparent"]
            }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            $4.850.000
          </motion.span>
          <span className="text-[9px] text-white/40">COP</span>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="h-[3px] bg-emerald-400/30 mt-2 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-emerald-400 rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: "78%" }}
            transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Recent transactions with stagger */}
      <div className="space-y-2">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[8px] text-muted-foreground font-mono font-normal uppercase tracking-wider block"
        >
          Últimos pagos
        </motion.span>
        {[
          { name: "María López", apt: "Apto 301", amount: "+$2.400.000", status: "Recibido", time: "Hoy" },
          { name: "Nicolás Ruiz", apt: "Apto 502", amount: "+$1.850.000", status: "Recibido", time: "Ayer" },
          { name: "Ana García", apt: "Casa 12", amount: "+$3.200.000", status: "Pendiente", time: "En 2 días" },
        ].map((tx, i) => (
          <motion.div
            key={tx.name}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              delay: 0.5 + i * 0.12,
              type: "spring",
              stiffness: 150,
              damping: 15
            }}
            whileHover={{ x: 4, backgroundColor: "rgba(0,0,0,0.03)" }}
            className="flex items-center gap-3 p-2 bg-muted/50 cursor-pointer transition-colors"
          >
            <motion.div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-[10px] font-bold text-foreground"
              whileHover={{ scale: 1.1 }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.12, type: "spring", stiffness: 300 }}
            >
              {tx.name.charAt(0)}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-foreground truncate">{tx.name}</span>
                <span className="text-[8px] text-muted-foreground">· {tx.apt}</span>
              </div>
              <span className="text-[8px] text-muted-foreground">{tx.time}</span>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 + i * 0.12 }}
              className="text-right"
            >
              <motion.span
                className={`text-[11px] font-bold ${tx.status === 'Recibido' ? 'text-emerald-600' : 'text-amber-600'}`}
                animate={tx.status === 'Recibido' ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                {tx.amount}
              </motion.span>
              <span className={`block text-[7px] ${tx.status === 'Recibido' ? 'text-emerald-600/60' : 'text-amber-600/60'}`}>
                {tx.status}
              </span>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Auto-transfer badge with pulse */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-center gap-1.5 mt-3"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Bell className="w-2.5 h-2.5 text-muted-foreground" />
        </motion.div>
        <span className="text-[8px] text-muted-foreground">Transferencia automática cada viernes</span>
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 3 — Contratos Digitales (5col, outline)
   Contract with signature animation
   ================================================================ */
function ContractVisual() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSigned(true), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-5">
      {/* Animated glow effects */}
      <motion.div
        className="absolute top-[30%] left-[20%] w-[100px] h-[100px] bg-violet-500/[0.06] rounded-full blur-[50px] pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.06, 0.1, 0.06],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[20%] right-[15%] w-[80px] h-[80px] bg-emerald-500/[0.05] rounded-full blur-[40px] pointer-events-none"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.05, 0.09, 0.05],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Background pages with subtle animation */}
      <motion.div
        className="absolute top-[24px] left-1/2 -translate-x-1/2 w-[78%] h-[175px] bg-black/[0.01] border border-border translate-y-2 scale-[0.95]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 8 }}
        transition={{ delay: 0.1 }}
      />
      <motion.div
        className="absolute top-[24px] left-1/2 -translate-x-1/2 w-[82%] h-[175px] bg-black/[0.005] border border-border translate-y-1 scale-[0.975]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 4 }}
        transition={{ delay: 0.15 }}
      />

      <motion.div
        initial={{ y: 12, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], type: "spring", stiffness: 100 }}
        whileHover={{ y: -2, boxShadow: "0 8px 25px rgba(0,0,0,0.08)" }}
        className="relative w-full overflow-hidden z-10 bg-white/80 backdrop-blur-sm cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div className="px-4 py-2.5 flex items-center gap-2.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
          </motion.div>
          <div className="flex-1">
            <div className="text-[10px] font-medium text-foreground">Contrato de Arriendo</div>
            <div className="text-[7px] text-muted-foreground font-mono">REF-2026-00847</div>
          </div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
            className={`text-[7px] font-semibold px-2 py-0.5 ${signed ? "border border-emerald-500/25 text-emerald-600" : "border border-amber-500/25 text-amber-600"}`}
          >
            {signed ? "✓ Firmado" : "Pendiente"}
          </motion.div>
        </div>

        <div className="px-4 py-1">
          {[
            { l: "Inquilino", v: "María López" },
            { l: "Canon", v: "$2.800.000" },
            { l: "Duración", v: "12 meses" },
          ].map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 120 }}
              whileHover={{ x: 3 }}
              className="flex items-center justify-between py-1.5 cursor-pointer"
              style={{ borderBottom: i < 2 ? "1px dashed rgba(0,0,0,0.05)" : "none" }}
            >
              <span className="text-[8px] text-muted-foreground">{c.l}</span>
              <motion.span
                className="text-[9px] font-medium text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                {c.v}
              </motion.span>
            </motion.div>
          ))}
        </div>

        <div className="px-4 py-2.5 relative" style={{ borderTop: "1px solid rgba(0,0,0,0.03)" }}>
          <motion.div
            className="h-9 flex items-center justify-center"
            style={{ border: "1px dashed rgba(0,0,0,0.06)" }}
            animate={!signed ? {
              borderColor: ["rgba(0,0,0,0.06)", "rgba(245,158,11,0.2)", "rgba(0,0,0,0.06)"]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {!signed ? (
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-1"
              >
                <motion.div
                  animate={{ x: [0, 3, 0], y: [0, -2, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <PenNib className="w-2.5 h-2.5 text-amber-500" strokeWidth={1.5} />
                </motion.div>
                <span className="text-[7px] text-muted-foreground">Esperando firma...</span>
              </motion.div>
            ) : (
              <motion.svg width="90" height="18" viewBox="0 0 110 24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.path
                  d="M8 18 Q18 4 28 14 Q38 24 48 10 Q58 2 68 12 Q78 20 88 8 L100 6"
                  fill="none" stroke="hsl(var(--neutral-900))" strokeWidth="1.5" strokeLinecap="round" opacity={0.4}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </motion.svg>
            )}
          </motion.div>

          {signed && (
            <motion.div
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 250, damping: 12 }}
              className="absolute -top-3 right-6"
            >
              <motion.div
                className="w-14 h-14 rounded-full border-2 border-emerald-500/40 flex items-center justify-center bg-emerald-50/50 backdrop-blur-sm"
                animate={{
                  boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 20px 5px rgba(16,185,129,0.2)", "0 0 0 0 rgba(16,185,129,0)"]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                <div className="w-10 h-10 rounded-full border border-dashed border-emerald-500/30 flex flex-col items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                  </motion.div>
                  <span className="text-[5px] text-emerald-600 font-mono font-normal uppercase tracking-wider mt-0.5">Legal</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring" }}
        className="flex gap-2 mt-2.5 z-10"
      >
        {[{ icon: Lock, label: "Ley 820" }, { icon: Lightning, label: "Firma digital" }].map(({ icon: Icon, label }, i) => (
          <motion.span
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + i * 0.1, type: "spring" }}
            whileHover={{ scale: 1.05, y: -1 }}
            className="flex items-center gap-1 text-[7px] font-medium text-muted-foreground px-2 py-1 cursor-pointer"
            style={{ border: "1px solid rgba(0,0,0,0.05)" }}
          >
            <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
            {label}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 4 — Publicación Multi-Portal (7col)
   Portal logos with sync animation
   ================================================================ */
function PublishVisual() {
  const portals = [
    { name: "FincaRaíz", color: "#E53935", delay: 0.3 },
    { name: "Metrocuadrado", color: "#1565C0", delay: 0.45 },
    { name: "Properati", color: "#7B1FA2", delay: 0.6 },
    { name: "Ciencuadras", color: "#00897B", delay: 0.75 },
  ];

  return (
    <div className="relative w-full h-full flex flex-col justify-center overflow-hidden px-6">
      {/* Property preview with hover */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        whileHover={{ y: -3, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
        className="bg-white p-3 mb-4 cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="flex gap-3">
          <motion.div
            className="w-16 h-12 bg-gradient-to-br from-amber-100 to-orange-100 flex-shrink-0 flex items-center justify-center overflow-hidden relative"
            whileHover={{ scale: 1.05 }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Buildings className="w-5 h-5 text-amber-600/40" />
            </motion.div>
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[11px] font-semibold text-foreground"
            >
              Apartamento Chapinero
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[9px] text-muted-foreground"
            >
              2 hab · 72m² · $2.800.000/mes
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-1 mt-1"
            >
              <motion.span
                className="text-[7px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 font-medium"
                animate={{
                  boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 8px 2px rgba(16,185,129,0.3)", "0 0 0 0 rgba(16,185,129,0)"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Publicado
              </motion.span>
              <span className="text-[7px] text-muted-foreground">· 12 candidatos</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Portals grid with enhanced animations */}
      <div className="grid grid-cols-2 gap-2">
        {portals.map((portal, i) => (
          <motion.div
            key={portal.name}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              delay: portal.delay,
              duration: 0.4,
              type: "spring",
              stiffness: 200
            }}
            whileHover={{ scale: 1.03, backgroundColor: "rgba(0,0,0,0.03)" }}
            className="flex items-center gap-2 p-2 bg-muted/50 cursor-pointer transition-colors"
          >
            <motion.div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[8px] font-bold"
              style={{ backgroundColor: portal.color }}
              whileHover={{ scale: 1.15, rotate: 5 }}
              animate={{
                boxShadow: ["0 0 0 0 transparent", `0 0 10px 2px ${portal.color}40`, "0 0 0 0 transparent"]
              }}
              transition={{
                boxShadow: { duration: 2, repeat: Infinity, delay: i * 0.3 }
              }}
            >
              {portal.name.charAt(0)}
            </motion.div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-medium text-foreground block truncate">{portal.name}</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: portal.delay + 0.2 }}
                className="text-[7px] text-emerald-600 flex items-center gap-0.5"
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                >
                  ✓
                </motion.span>
                Sincronizado
              </motion.span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats with pop effect */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="flex items-center justify-between mt-4 pt-3"
        style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}
      >
        <motion.div
          className="flex items-center gap-1.5"
          whileHover={{ x: 3 }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <ShareNetwork className="w-3 h-3 text-muted-foreground" />
          </motion.div>
          <span className="text-[8px] text-muted-foreground">Un clic, 4 portales</span>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.1, type: "spring" }}
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-1 bg-primary/10 px-2 py-1 cursor-pointer"
        >
          <motion.div
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <TrendUp className="w-2.5 h-2.5 text-primary" />
          </motion.div>
          <motion.span
            className="text-[8px] font-semibold text-primary"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            +340% visibilidad
          </motion.span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function PropietariosPage() {
  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-[600px] overflow-hidden bg-black">
          <Image
            src="/hero-interior.jpg"
            alt="Modern apartment interior"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40 z-[1]" />

          <div className="relative z-10 h-full container-platform pt-[72px] flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
              {/* Left Content */}
              <div className="space-y-4">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase font-normal text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15"
                >
                  <Lightning className="w-3.5 h-3.5" />
                  Plataforma #1 para propietarios en Colombia
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  <span className="whitespace-nowrap">Arrienda tu propiedad</span>
                  <span className="block mt-2 text-white/90">sin comisiones</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Evaluación de inquilinos gratis, publicación en portales gratis, cobro automatizado.
                  <span className="text-white font-medium"> Tú mantienes el control.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/auth">
                    <Button size="lg" variant="white" className="w-full sm:w-auto font-mono uppercase font-normal h-12 px-6 rounded-xl">
                      Comenzar gratis
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium h-12 px-6 rounded-xl"
                    >
                      Ver precios
                    </Button>
                  </Link>
                </motion.div>

                {/* Hero Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-8 pt-6"
                >
                  {[
                    { value: '$0', label: 'Costo de evaluación' },
                    { value: '48h', label: 'Tiempo promedio' },
                    { value: '4.9', label: 'Satisfacción' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                      <p className="text-[11px] text-white/50 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Hero Card */}
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="hidden lg:flex lg:justify-end"
              >
                <div className="relative">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="bg-white/10 backdrop-blur-2xl rounded-xl border border-white/15 p-5 shadow-2xl w-[300px]"
                  >
                    {/* Header with profile */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10"
                    >
                      <Image
                        src="/images/people/woman-desk-coffee.jpg"
                        alt="Propietaria feliz"
                        width={44}
                        height={44}
                        className="rounded-xl object-cover ring-2 ring-white/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-[14px]">Juan Nicolás M.</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <p className="text-white/50 text-[11px]">Propietario verificado</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Main income card */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10 mb-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/50 text-[11px]">Ingresos este mes</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">
                          <TrendUp className="w-3 h-3" />
                          +12%
                        </span>
                      </div>
                      <p className="text-[28px] font-bold text-white tracking-tight">$4.800.000</p>
                    </motion.div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.4 }}
                        className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Buildings className="w-3.5 h-3.5 text-white/40" />
                          <p className="text-[10px] text-white/50">Propiedades</p>
                        </div>
                        <p className="text-xl font-bold text-white">2</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.4 }}
                        className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-3.5 h-3.5 text-white/40" />
                          <p className="text-[10px] text-white/50">Ocupación</p>
                        </div>
                        <p className="text-xl font-bold text-white">100%</p>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Floating notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-5 -left-4 bg-white rounded-xl shadow-xl p-3.5 border border-neutral-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">Pago recibido</p>
                        <p className="text-[11px] text-muted-foreground">$2.400.000 · Hace 2min</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Bento Section - Problems */}
        <section className="bg-white py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Arrendar no debería ser tan <span className="italic">difícil</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Impagos, vacancia, desalojos interminables. El proceso tradicional está roto. Pero no tiene que ser así.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row - Image Cards with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
              {/* Card 1 - Impago */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-interior.jpg"
                  alt="Interior moderno"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Impago
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    $18M
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    pérdida promedio por impago
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Sin verificación real, el riesgo lo asume completo el propietario
                  </p>
                </div>
              </motion.div>

              {/* Card 2 - Vacancia */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-2.jpg"
                  alt="Espacio moderno"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Vacancia
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    47 días
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    promedio para arrendar
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Documentos, visitas, negociaciones... un proceso del siglo pasado
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Desalojo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-3.jpg"
                  alt="Habitación moderna"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-mono font-normal text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Desalojo
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    14 meses
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    proceso legal promedio
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Sin contrato sólido, recuperar tu propiedad es una pesadilla
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Robottom Row - Illustration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Card 4 - Blind Selection Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                {/* Widget Illustration */}
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl shadow-lg p-4 w-[200px] border border-neutral-100">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-neutral-100">
                      <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center">
                        <Users className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-foreground">Candidato #1</p>
                        <p className="text-[10px] text-muted-foreground">Sin verificar</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Ingresos</span>
                        <span className="text-[10px] text-neutral-300">— — —</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Historial</span>
                        <span className="text-[10px] text-neutral-300">— — —</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Score</span>
                        <span className="text-[10px] text-neutral-300">— — —</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    ?
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}Elegir a ciegas{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Sin datos reales, seleccionar inquilinos es apostar. Un mal candidato puede costarte millones.
                  </p>
                </div>
              </motion.div>

              {/* Card 5 - Payment Tracker Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                {/* Widget Illustration */}
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl shadow-lg p-4 w-[220px] border border-neutral-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-medium text-foreground bg-amber-100 px-2 py-0.5 rounded">Cuenta de arriendo</span>
                      <span className="text-[10px] text-muted-foreground">2024</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { month: 'Ene', paid: true, amount: '$2.5M' },
                        { month: 'Feb', paid: true, amount: '$2.5M' },
                        { month: 'Mar', paid: false, amount: '$2.5M' },
                        { month: 'Abr', paid: false, amount: '$2.5M' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${item.paid ? 'bg-emerald-100' : 'bg-red-100'}`}>
                              <span className={`text-[8px] ${item.paid ? 'text-emerald-600' : 'text-red-600'}`}>
                                {item.paid ? '✓' : '✕'}
                              </span>
                            </div>
                            <span className="text-muted-foreground">{item.month}</span>
                          </div>
                          <span className={item.paid ? 'text-foreground' : 'text-red-500 font-medium'}>{item.amount}</span>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-neutral-100 my-3" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Deuda acumulada:</span>
                      <span className="text-[12px] text-red-600 font-bold">$5.0M</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    4 meses
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}4 meses sin cobrar arriendo{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Sin verificación real, el propietario asume todo el riesgo de impago. Y recuperarlo puede tomar más de un año.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Bento Section - Solutions */}
        <section className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            <div className="mb-14 lg:mb-20">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <h2 className="lg:col-span-2 text-[clamp(2.5rem,5.5vw,4rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Todo lo que necesitas para <span className="italic">arrendar con confianza</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Evaluación, cobro automático, contratos digitales y publicación en múltiples portales. Todo desde una sola plataforma.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Evaluation */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="md:col-span-7 bg-foreground rounded-xl p-8 min-h-[360px] flex flex-col justify-between relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[28px] md:text-[32px] font-mono uppercase font-normal text-white leading-tight mb-3">
                    Evaluación de Inquilinos
                  </h3>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
                    Verificamos capacidad de pago, historial crediticio y referencias. Tú eliges con datos, no con corazonadas.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-6">
                  {['Score de riesgo IA', 'Verificación de identidad', 'Historial crediticio'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Automatic Collection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
                    <Wallet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    Cobro Automático
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Recibe el pago puntual cada mes. Sin perseguir a nadie, sin excusas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['PSE y tarjeta', 'Recordatorios', 'Reporte mensual'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Digital Contracts */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-neutral-200"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    Contratos Digitales
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Firma electrónica con validez legal. Todo conforme a la Ley 820 de Colombia.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Firma electrónica', 'Plantillas legales', 'Descarga PDF'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-neutral-100 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Large Card - Multi Portal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden min-h-[360px] group"
              >
                <Image
                  src="/hero-5.jpg"
                  alt="Propiedad moderna"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <ShareNetwork className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[28px] md:text-[32px] font-mono uppercase font-normal text-white leading-tight mb-3">
                      Publicación Multi-Portal
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-md mb-6">
                      Un clic y tu propiedad aparece en FincaRaíz, Metrocuadrado y más. Candidatos pre-filtrados, sin comisión.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['4 portales', 'Fotos optimizadas', 'Sin comisión'].map((item, i) => (
                        <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/80 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <TestimonialCarousel
          testimonials={testimonials}
          title={
            <>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-[6px] h-[6px] rounded-full bg-primary" />
                <span className="text-[16px] tracking-[-0.32px] leading-[21.6px] text-muted-foreground">
                  Testimonios
                </span>
              </div>
              <h2 className="text-[40px] md:text-[58px] font-heading font-normal text-foreground tracking-[-4.176px] leading-[1.05] mb-10">
                Propietarios que confían en nosotros
              </h2>
            </>
          }
        />

        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
