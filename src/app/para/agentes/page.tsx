'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { CTASection } from '@/components/home/CTASection';
import { FAQSection } from '@/components/home/FAQSection';
import { TestimonialCarousel } from '@/components/home/TestimonialCarousel';
import { Check, SealCheck, Link as LinkIcon, Users, Crosshair, Copy, Bell, TrendUp, DeviceMobile, Shield, Clock, FileX, UserMinus, Warning, FileText, Lightning, ChartBarHorizontal, ChartBar, ArrowRight } from '@phosphor-icons/react';

// Testimonials data
const testimonials = [
  {
    quote: 'Mis clientes propietarios me piden específicamente que use esta plataforma. Les da confianza ver un reporte profesional con score de riesgo.',
    author: 'Juliana Rodríguez',
    role: 'Agente independiente, Bogotá',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'Antes me tomaba una semana evaluar candidatos. Ahora lo hago en el mismo día de la visita. Mis comisiones se duplicaron en 3 meses.',
    author: 'Nicolás Martínez',
    role: 'Agente inmobiliario, Medellín',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'El link de evaluación es brillante. Lo mando por WhatsApp y los candidatos hacen todo solos. Yo solo reviso el reporte y presento al propietario.',
    author: 'María Fernanda López',
    role: 'Corredora de finca raíz, Cali',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'La app móvil me cambió la vida. Recibo notificaciones cuando aplican candidatos y puedo revisar todo desde el celular sin ir a la oficina.',
    author: 'Andrés Gómez',
    role: 'Agente independiente, Barranquilla',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&q=80',
  },
];

// ============================================
// RICH VISUAL COMPONENTS FOR BENTO CARDS
// ============================================

// 1. Link Generator Visual - Premium phone mockup with WhatsApp share
function LinkGeneratorVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden px-6 py-4">
      {/* Animated glow effects */}
      <motion.div
        className="absolute top-[20%] right-[10%] w-[140px] h-[140px] bg-[#2C7A53]/[0.08] rounded-full blur-[60px] pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.08, 0.14, 0.08],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[15%] w-[100px] h-[100px] bg-neutral-500/[0.06] rounded-full blur-[50px] pointer-events-none"
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.06, 0.1, 0.06],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      <div className="flex flex-col h-full">
        {/* Link card with enhanced animations */}
        <motion.div
          initial={{ y: -15, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
          whileHover={{ y: -2, boxShadow: "0 10px 30px rgba(16,185,129,0.15)" }}
          className="bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-xl px-4 py-3 mb-4 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2C7A53]/20 to-[#6B6B6B]/20 border border-[#2C7A53]/30 flex items-center justify-center"
                whileHover={{ scale: 1.1, rotate: 5 }}
                animate={{
                  boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 15px 3px rgba(16,185,129,0.2)", "0 0 0 0 rgba(16,185,129,0)"]
                }}
                transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <LinkIcon className="w-3.5 h-3.5 text-[#2C7A53]" />
                </motion.div>
              </motion.div>
              <div>
                <span className="text-[11px] font-medium text-white">Apto 302 · Chapinero</span>
                <span className="text-[8px] text-white/40 block">$2.800.000/mes</span>
              </div>
            </div>
            <motion.span
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 12 }}
              className="flex items-center gap-1 bg-[#2C7A53]/15 text-[#2C7A53] text-[8px] font-bold px-2 py-1 rounded-full border border-[#2C7A53]/30"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Check className="w-2.5 h-2.5" />
              </motion.div>
              Activo
            </motion.span>
          </div>
          <motion.div
            className="bg-white/[0.04] rounded-md px-3 py-2 flex items-center gap-2 relative overflow-hidden"
            whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            <code className="text-[10px] text-white/60 font-mono flex-1 truncate relative z-10">arriendo.co/aplicar/ch302-mX9k</code>
            <motion.button
              whileHover={{ scale: 1.15, backgroundColor: "rgba(255,255,255,0.15)" }}
              whileTap={{ scale: 0.9 }}
              className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center relative z-10"
            >
              <Copy className="w-3 h-3 text-white/60" />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Share buttons with stagger and hover */}
        <div className="space-y-2 mb-4">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[8px] text-white/30 font-mono font-normal uppercase tracking-wider"
          >
            Compartir vía
          </motion.span>
          <div className="flex gap-2">
            {[
              { label: 'WhatsApp', color: 'from-[#25D366]/20 to-[#25D366]/10', border: 'border-[#25D366]/20', text: 'text-[#25D366]', hoverGlow: 'rgba(37,211,102,0.3)' },
              { label: 'Email', color: 'from-[#1A40FF]/20 to-[#1A40FF]/10', border: 'border-[#1A40FF]/30', text: 'text-[#1A40FF]', hoverGlow: 'rgba(59,130,246,0.3)' },
              { label: 'SMS', color: 'from-[#6B6B6B]/20 to-[#6B6B6B]/10', border: 'border-neutral-200 dark:border-neutral-700/20', text: 'text-neutral-600 dark:text-neutral-300', hoverGlow: 'rgba(139,92,246,0.3)' },
            ].map((opt, i) => (
              <motion.div
                key={opt.label}
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 150 }}
                whileHover={{
                  scale: 1.05,
                  y: -2,
                  boxShadow: `0 8px 20px ${opt.hoverGlow}`
                }}
                whileTap={{ scale: 0.95 }}
                className={`flex-1 bg-gradient-to-br ${opt.color} border ${opt.border} rounded-md py-2.5 flex items-center justify-center cursor-pointer`}
              >
                <span className={`text-[9px] font-medium ${opt.text}`}>{opt.label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Stats with enhanced animations */}
        <div className="mt-auto space-y-2">
          {[
            { label: "Visitas al link", value: "24", bar: 80, color: "bg-[#2C7A53]", glow: "bg-[#2C7A53]/40" },
            { label: "Aplicaciones", value: "8", bar: 60, color: "bg-[#6B6B6B]", glow: "bg-[#6B6B6B]/40" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.15, type: "spring", stiffness: 100 }}
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <span className="text-[9px] text-white/40 font-medium w-[80px] flex-shrink-0">{stat.label}</span>
              <div className="flex-1 h-[5px] bg-white/[0.04] rounded-full overflow-hidden relative">
                <motion.div
                  className={`h-full rounded-full ${stat.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.bar}%` }}
                  transition={{ delay: 0.7 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.div
                  className={`absolute top-0 h-full rounded-full blur-[4px] ${stat.glow}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.bar}%` }}
                  transition={{ delay: 0.7 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.15, type: "spring" }}
                className="text-[11px] font-bold text-white w-6 text-right tabular-nums"
              >
                {stat.value}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 2. Evaluation Report Visual - Score gauge + metrics (light card)
function EvaluationReportVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden px-5 py-4">
      {/* Score display with enhanced animations */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="flex items-center gap-4 mb-4"
      >
        <motion.div
          className="relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <svg viewBox="0 0 80 80" className="w-[70px] h-[70px]">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r="32" fill="none" stroke="url(#scoreGradient)" strokeWidth="6"
              strokeLinecap="round" strokeDasharray={201} strokeDashoffset={201}
              initial={{ strokeDashoffset: 201 }}
              animate={{ strokeDashoffset: 201 * (1 - 0.91) }}
              transition={{ delay: 0.4, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              transform="rotate(-90 40 40)"
            />
            {/* Glow circle */}
            <motion.circle
              cx="40" cy="40" r="32" fill="none" stroke="url(#scoreGradient)" strokeWidth="10"
              strokeLinecap="round" strokeDasharray={201} strokeDashoffset={201}
              opacity="0.2"
              style={{ filter: "blur(4px)" }}
              initial={{ strokeDashoffset: 201 }}
              animate={{ strokeDashoffset: 201 * (1 - 0.91) }}
              transition={{ delay: 0.4, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              transform="rotate(-90 40 40)"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1A40FF" />
                <stop offset="100%" stopColor="#8A9CFF" />
              </linearGradient>
            </defs>
          </svg>
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
          >
            <motion.span
              className="text-[22px] font-bold text-foreground"
              animate={{
                textShadow: ["0 0 0 transparent", "0 0 10px rgba(16,185,129,0.3)", "0 0 0 transparent"]
              }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            >
              91
            </motion.span>
          </motion.div>
        </motion.div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="text-[12px] font-semibold text-foreground"
            >
              María González P.
            </motion.span>
            <motion.span
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 400, damping: 12 }}
              className="flex items-center gap-0.5 bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70] text-[7px] font-bold px-1.5 py-0.5 rounded-full"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Check className="w-2 h-2" />
              </motion.div>
              Verificado
            </motion.span>
          </div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-[9px] text-muted-foreground"
          >
            Evaluación completada · Hoy
          </motion.span>
        </div>
      </motion.div>

      {/* Metrics bars with enhanced animations */}
      <div className="space-y-2.5">
        {[
          { label: "Capacidad de pago", score: 92, colorClass: "bg-[#2C7A53]", glowClass: "bg-[#2C7A53]/30" },
          { label: "Historial crediticio", score: 88, colorClass: "bg-[#1A40FF]", glowClass: "bg-[#1A40FF]/30" },
          { label: "Estabilidad laboral", score: 85, colorClass: "bg-neutral-500", glowClass: "bg-neutral-500/30" },
          { label: "Referencias", score: 90, colorClass: "bg-[#B7791F]", glowClass: "bg-[#B7791F]/30" },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 100 }}
            whileHover={{ x: 4 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <span className="text-[9px] text-muted-foreground font-medium w-[100px] flex-shrink-0">{m.label}</span>
            <div className="flex-1 h-[5px] bg-black/[0.04] rounded-full overflow-hidden relative">
              <motion.div
                className={`h-full rounded-full ${m.colorClass}`}
                initial={{ width: 0 }}
                animate={{ width: `${m.score}%` }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div
                className={`absolute top-0 h-full rounded-full blur-[3px] ${m.glowClass}`}
                initial={{ width: 0 }}
                animate={{ width: `${m.score}%` }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9 + i * 0.1, type: "spring" }}
              className="text-[10px] font-bold text-foreground w-6 text-right tabular-nums"
            >
              {m.score}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Robottom status with enhanced animations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, type: "spring" }}
        className="flex items-center justify-between mt-4 pt-3 border-t border-black/5"
      >
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-5 h-5 rounded-full bg-[#E8F3EC] flex items-center justify-center"
            animate={{
              boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 10px 3px rgba(16,185,129,0.2)", "0 0 0 0 rgba(16,185,129,0)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Shield className="w-2.5 h-2.5 text-[#2C7A53]" />
            </motion.div>
          </motion.div>
          <span className="text-[9px] text-[#2C7A53] font-medium">Bajo riesgo · Recomendado</span>
        </div>
        <motion.span
          whileHover={{ scale: 1.05, color: "hsl(var(--primary))" }}
          className="text-[8px] text-muted-foreground cursor-pointer"
        >
          PDF disponible
        </motion.span>
      </motion.div>
    </div>
  );
}

// 3. Mobile App Visual - Notification feed (light card)
function MobileAppVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden px-4 pt-3">
      {/* Header with enhanced animations */}
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            animate={{
              boxShadow: ["0 0 0 0 rgba(0,0,0,0)", "0 0 12px 3px rgba(var(--primary),0.15)", "0 0 0 0 rgba(0,0,0,0)"]
            }}
            transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            >
              <Bell className="w-3.5 h-3.5 text-primary" />
            </motion.div>
          </motion.div>
          <div>
            <span className="text-[11px] font-medium text-foreground">Notificaciones</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-[8px] text-muted-foreground block"
            >
              3 nuevas hoy
            </motion.span>
          </div>
        </div>
        <motion.span
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
          className="flex items-center gap-1 bg-primary/10 text-primary text-[8px] font-bold px-2 py-1 rounded-full"
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-primary"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          En vivo
        </motion.span>
      </motion.div>

      {/* Notifications list with enhanced animations */}
      <div className="space-y-2">
        {[
          { icon: "📋", title: "Nueva aplicación", desc: "María González aplicó para Apto 302", time: "Ahora", isNew: true },
          { icon: "🏠", title: "Visita confirmada", desc: "Nicolás Ruiz · Apto Chapinero · 3pm", time: "Hace 5 min", isNew: true },
          { icon: "✅", title: "Contrato firmado", desc: "Casa Usaquén · Comisión: $0.5M", time: "Hace 1h", isNew: false },
          { icon: "📊", title: "Reporte listo", desc: "Evaluación de Ana García disponible", time: "Hace 2h", isNew: false },
        ].map((notif, i) => (
          <motion.div
            key={notif.title + i}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 120 }}
            whileHover={{ x: 4, backgroundColor: notif.isNew ? "rgba(var(--primary),0.06)" : "rgba(0,0,0,0.03)" }}
            className={`flex items-start gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${notif.isNew ? 'bg-primary/[0.04] border-l-2 border-primary' : 'bg-muted/50'}`}
          >
            <motion.span
              className="text-base flex-shrink-0"
              animate={notif.isNew ? { y: [0, -2, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            >
              {notif.icon}
            </motion.span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-medium text-foreground">{notif.title}</span>
                {notif.isNew && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
              <span className="text-[9px] text-muted-foreground block truncate">{notif.desc}</span>
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="text-[8px] text-muted-foreground flex-shrink-0"
            >
              {notif.time}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Robottom badge with animation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, type: "spring" }}
        className="flex items-center justify-center gap-1.5 mt-3"
      >
        <motion.div
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <DeviceMobile className="w-2.5 h-2.5 text-muted-foreground" />
        </motion.div>
        <span className="text-[8px] text-muted-foreground">Disponible en iOS y Android</span>
      </motion.div>
    </div>
  );
}

// 4. Commission Tracking Visual - Earnings dashboard (inside white container)
function CommissionVisual() {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden px-4 py-3">
      {/* Header stats with enhanced animations */}
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="mb-3"
      >
        <div className="flex items-baseline gap-2">
          <motion.span
            className="text-[26px] font-bold text-foreground tracking-tight"
            animate={{
              textShadow: ["0 0 0 transparent", "0 0 15px rgba(16,185,129,0.2)", "0 0 0 transparent"]
            }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            $8.9M
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: -10, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.1 }}
            className="text-[9px] font-bold text-[#2C7A53] bg-[#E8F3EC] px-1.5 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
          >
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <TrendUp className="w-2.5 h-2.5" />
            </motion.div>
            +23%
          </motion.span>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[9px] text-muted-foreground"
        >
          Comisiones este mes
        </motion.span>
      </motion.div>

      {/* Progress bar with shimmer */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="mb-4"
      >
        <div className="flex justify-between text-[9px] mb-1.5">
          <span className="text-muted-foreground font-medium">Meta mensual</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-foreground font-bold"
          >
            89%
          </motion.span>
        </div>
        <div className="h-[6px] bg-black/[0.04] rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full bg-primary relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: '89%' }}
            transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            />
          </motion.div>
          <motion.div
            className="absolute top-0 h-full rounded-full blur-[4px] bg-primary/40"
            initial={{ width: 0 }}
            animate={{ width: '89%' }}
            transition={{ delay: 0.5, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </motion.div>

      {/* Deals list with enhanced animations */}
      <div className="flex-1">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[8px] text-muted-foreground font-mono font-normal uppercase tracking-wider"
        >
          Últimos cierres
        </motion.span>
        <div className="mt-2 space-y-1.5">
          {[
            { property: "Apto Chapinero", amount: "$0.3M", time: "Hace 2 días" },
            { property: "Casa Usaquén", amount: "$0.5M", time: "Hace 5 días" },
            { property: "Loft Zona G", amount: "$0.8M", time: "Hace 1 sem" },
          ].map((deal, i) => (
            <motion.div
              key={deal.property}
              initial={{ opacity: 0, x: -15, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.12, type: "spring", stiffness: 120 }}
              whileHover={{ x: 4, backgroundColor: "rgba(0,0,0,0.03)" }}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-md cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-6 h-6 rounded-md bg-[#E8F3EC] flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.12, type: "spring", stiffness: 300 }}
                >
                  <Check className="w-3 h-3 text-[#2C7A53]" />
                </motion.div>
                <div>
                  <span className="text-[10px] font-medium text-foreground">{deal.property}</span>
                  <span className="text-[8px] text-muted-foreground block">{deal.time}</span>
                </div>
              </div>
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.12 }}
                className="text-[11px] font-bold text-[#2C7A53]"
              >
                {deal.amount}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AgentesPage() {
  const bentoRef = useRef(null);
  const bentoInView = useInView(bentoRef, { once: true, margin: '-50px' });

  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-[600px] overflow-hidden bg-black">
          <Image
            src="/hero-6.jpg"
            alt="Real estate agent"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 z-[1]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40 z-[1]" />

          <div className="relative z-10 h-full container-platform pt-[72px] pb-16 flex items-center">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center w-full">
              {/* Left Content */}
              <div className="space-y-4">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 text-xs font-mono uppercase font-normal text-white/90 bg-white/10 backdrop-blur-2xl rounded-full px-4 py-2 border border-white/15"
                >
                  <SealCheck className="w-3.5 h-3.5" />
                  100% gratis para agentes
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Cierra más arriendos
                  <span className="block mt-2 text-white/90">
                    más <span className="italic">rápido</span>
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Genera tu link, compártelo por WhatsApp, recibe evaluaciones profesionales.
                  <span className="text-white font-medium"> Sin costo para ti.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/auth?role=agent">
                    <Button size="lg" variant="white" className="w-full sm:w-auto h-12 px-6 rounded-xl">
                      Crear cuenta gratis
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium h-12 px-6 rounded-xl"
                    >
                      Ver cómo funciona
                    </Button>
                  </Link>
                </motion.div>

                {/* Hero Stats - No separator line */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-8 pt-6"
                >
                  {[
                    { value: '$0', label: 'Costo para ti' },
                    { value: '2x', label: 'Más cierres' },
                    { value: '48h', label: 'Tiempo promedio' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                      <p className="text-[11px] text-white/50 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Right - Hero Card with glass styling */}
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
                    className="bg-white/10 backdrop-blur-2xl rounded-xl border border-white/15 p-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="flex items-center gap-4 mb-6"
                    >
                      <Image
                        src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face&q=80"
                        alt="Real estate agent"
                        width={56}
                        height={56}
                        className="rounded-xl object-cover ring-2 ring-white/20"
                      />
                      <div>
                        <p className="text-white font-semibold">Juliana Rodríguez</p>
                        <p className="text-white/60 text-sm">Agente verificada</p>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: "spring", stiffness: 400 }}
                      >
                        <SealCheck className="w-5 h-5 text-[#2C7A53] ml-auto" />
                      </motion.div>
                    </motion.div>

                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.4 }}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white/60 text-sm">Comisiones este mes</span>
                          <span className="text-[#2C7A53] text-xs font-medium">+45%</span>
                        </div>
                        <p className="text-3xl font-bold text-white">$8.900.000</p>
                      </motion.div>

                      <div className="grid grid-cols-3 gap-3">
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, duration: 0.4 }}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
                        >
                          <p className="text-xl font-bold text-white">12</p>
                          <p className="text-[9px] text-white/60">Cierres</p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.75, duration: 0.4 }}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
                        >
                          <p className="text-xl font-bold text-white">28</p>
                          <p className="text-[9px] text-white/60">Candidatos</p>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8, duration: 0.4 }}
                          className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10"
                        >
                          <p className="text-xl font-bold text-white">43%</p>
                          <p className="text-[9px] text-white/60">Conversión</p>
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Floating notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] flex items-center justify-center">
                        <Check className="w-5 h-5 text-[#2C7A53]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Evaluación lista</p>
                        <p className="text-xs text-muted-foreground">Score: 87/100 · Aprobado</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Problems Bento Section */}
        <section className="bg-white py-[80px] md:py-[100px]">
          <div className="container-platform">
            {/* 3-column Header */}
            <div className="grid md:grid-cols-12 gap-6 md:gap-12 mb-12">
              <div className="md:col-span-7">
                <h2 className="text-[40px] md:text-[52px] font-heading font-normal text-foreground tracking-[-0.03em] leading-[1.05]">
                  Los agentes pierden tiempo en{' '}
                  <span className="italic">procesos manuales</span>
                </h2>
              </div>
              <div className="md:col-span-5 flex items-end">
                <p className="text-[17px] text-muted-foreground leading-relaxed">
                  Llamadas, WhatsApps, verificaciones manuales. Cada candidato consume horas que podrías usar cerrando más arriendos.
                </p>
              </div>
            </div>

            {/* Problems Bento Grid */}
            <div className="grid md:grid-cols-12 gap-5">
              {/* Card 1: Verification chaos - Image with glass */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden h-[320px]"
              >
                <Image
                  src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg"
                  alt="Agente inmobiliario revisando documentos"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="inline-flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-2xl rounded-full px-3 py-1.5 border border-white/15">
                    <Clock className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-white/70 text-xs font-medium">Problema #1</span>
                  </div>
                  <h3 className="text-white text-2xl font-mono uppercase font-normal mb-2">Horas en verificaciones manuales</h3>
                  <p className="text-white/60 text-sm max-w-md">Llamar referencias, verificar empleo, revisar historial crediticio... Por cada candidato.</p>
                </div>
              </motion.div>

              {/* Card 2: No data - Illustration */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="md:col-span-5 bg-muted rounded-xl p-6 h-[320px] flex flex-col"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-foreground/5 flex items-center justify-center">
                    <FileX className="w-4 h-4 text-foreground/60" />
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">Problema #2</span>
                </div>
                <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-2">Sin datos para decidir</h3>
                <p className="text-muted-foreground text-sm mb-6">Presentas candidatos al propietario sin saber realmente si pueden pagar.</p>
                {/* Visual: Empty documents */}
                <div className="mt-auto grid grid-cols-3 gap-3">
                  {[
                    { icon: FileText, label: 'Ingresos' },
                    { icon: Shield, label: 'Crédito' },
                    { icon: Users, label: 'Referencias' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-xl p-4 border border-border/50">
                      <item.icon className="w-5 h-5 text-muted-foreground/40 mb-3" />
                      <div className="h-2 bg-muted rounded mb-1.5 w-full" />
                      <div className="h-2 bg-muted rounded w-2/3" />
                      <div className="mt-3 flex items-center gap-1">
                        <Warning className="w-3 h-3 text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground">Sin datos</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Card 3: Lost candidates - Illustration */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="md:col-span-5 bg-muted rounded-xl p-6 h-[320px] flex flex-col overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-foreground/5 flex items-center justify-center">
                    <UserMinus className="w-4 h-4 text-foreground/60" />
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">Problema #3</span>
                </div>
                <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-1">Candidatos que se pierden</h3>
                <p className="text-muted-foreground text-sm mb-4">Mientras verificas uno, otros 3 ya encontraron otro apartamento.</p>
                {/* Visual: Candidate timeline */}
                <div className="mt-auto space-y-2">
                  {[
                    { name: 'María González', initials: 'MG', status: 'Cerrado', progress: 100 },
                    { name: 'Nicolás Ruiz', initials: 'CR', status: 'Esperando', progress: 60 },
                    { name: 'Ana Pérez', initials: 'AP', status: 'Perdido', progress: 20 },
                  ].map((candidate, i) => (
                    <div key={candidate.name} className="flex items-center gap-2.5 bg-white rounded-md p-2.5 border border-border/50">
                      <div className="w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center text-[10px] font-semibold text-sand-700 flex-shrink-0">
                        {candidate.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{candidate.name}</p>
                        <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${i === 0 ? 'bg-foreground' : i === 1 ? 'bg-foreground/50' : 'bg-foreground/25'}`}
                            style={{ width: `${candidate.progress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground flex-shrink-0">
                        {candidate.status}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Card 4: Unprofessional look - Image with glass */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden h-[320px]"
              >
                <Image
                  src="https://images.pexels.com/photos/8293778/pexels-photo-8293778.jpeg"
                  alt="Agente presentando propiedad a clientes"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="inline-flex items-center gap-2 mb-4 bg-white/10 backdrop-blur-2xl rounded-full px-3 py-1.5 border border-white/15">
                    <FileText className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-white/70 text-xs font-medium">Problema #4</span>
                  </div>
                  <h3 className="text-white text-2xl font-mono uppercase font-normal mb-2">Te ves poco profesional</h3>
                  <p className="text-white/60 text-sm max-w-md">Los propietarios esperan reportes formales, no &quot;yo creo que este candidato está bien&quot;.</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Solutions Bento Section */}
        <section className="bg-muted py-24 lg:py-32 overflow-hidden">
          <div className="container-platform">
            {/* 3-column Header */}
            <div className="grid md:grid-cols-12 gap-8 mb-14 lg:mb-20">
              <div className="md:col-span-7">
                <h2 className="text-[clamp(2.25rem,5vw,3.5rem)] font-heading font-light text-foreground leading-[1.05] tracking-[-0.03em]">
                  Herramientas para{' '}
                  <span className="italic">cerrar más</span>
                </h2>
              </div>
              <div className="md:col-span-5 flex items-end">
                <p className="text-muted-foreground text-base leading-relaxed">
                  Todo lo que necesitas para impresionar a tus clientes propietarios y cerrar arriendos más rápido. 100% gratis para ti.
                </p>
              </div>
            </div>

            {/* Solutions Bento Grid */}
            <div ref={bentoRef} className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Card 1: Link de evaluación - Dark */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={bentoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="md:col-span-7 bg-foreground rounded-xl p-6"
              >
                <div className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <LinkIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-white text-sm font-semibold">GRATIS</span>
                      <span className="text-white/50 text-xs">para ti</span>
                    </div>
                    <h3 className="text-white text-xl font-medium tracking-[-0.01em] mb-2">Link de evaluación</h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                      Genera un link único para cada propiedad. Compártelo por WhatsApp y recibe el reporte.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['WhatsApp', 'Email', 'SMS', 'QR'].map((feature) => (
                        <span key={feature} className="px-2.5 py-1 bg-white/10 rounded-full text-white/70 text-xs font-mono uppercase font-normal">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Visual: Link Card */}
                  <div className="hidden sm:block w-[180px] flex-shrink-0">
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                          <LinkIcon className="w-3 h-3 text-white/70" />
                        </div>
                        <span className="text-[10px] text-white/70">Apto 302</span>
                        <span className="text-[8px] text-white/50 ml-auto bg-white/10 px-1.5 py-0.5 rounded">Activo</span>
                      </div>
                      <div className="bg-white/5 rounded-md px-2 py-1.5 mb-3">
                        <code className="text-[8px] text-white/40 font-mono">arriendo.co/ch302</code>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-white/40">Visitas</span>
                          <span className="text-white/70">24</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                          <span className="text-white/40">Aplicaciones</span>
                          <span className="text-white/70">8</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 2: Evaluación completa */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={bentoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="md:col-span-5 bg-white rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center mb-4">
                      <Shield className="w-5 h-5 text-sand-700" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-foreground text-sm font-semibold">$24.900</span>
                      <span className="text-muted-foreground text-xs">paga el candidato</span>
                    </div>
                    <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-2">Evaluación completa</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Verificación de identidad, historial crediticio y score de riesgo con IA.
                    </p>
                  </div>
                  {/* Visual: Score Circle */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-[80px]">
                    <div className="relative">
                      <svg viewBox="0 0 60 60" className="w-[60px] h-[60px]">
                        <circle cx="30" cy="30" r="24" fill="none" stroke="#f5f5f4" strokeWidth="5" />
                        <circle cx="30" cy="30" r="24" fill="none" stroke="#1A40FF" strokeWidth="5" strokeLinecap="round" strokeDasharray="151" strokeDashoffset={151 * (1 - 0.91)} transform="rotate(-90 30 30)" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-foreground">91</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#2C7A53] font-medium mt-1">Bajo riesgo</span>
                  </div>
                </div>
              </motion.div>

              {/* Card 3: App móvil */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={bentoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center mb-4">
                      <DeviceMobile className="w-5 h-5 text-sand-700" />
                    </div>
                    <h3 className="text-foreground text-xl font-mono uppercase font-normal mb-2">App móvil</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Notificaciones en tiempo real cuando alguien aplica. iOS y Android.
                    </p>
                  </div>
                  {/* Visual: Notifications */}
                  <div className="hidden sm:block w-[130px] flex-shrink-0">
                    <div className="space-y-1.5">
                      {[
                        { text: 'Nueva aplicación', time: 'Ahora' },
                        { text: 'Contrato firmado', time: '1h' },
                        { text: 'Reporte listo', time: '2h' },
                      ].map((notif, i) => (
                        <div key={i} className="flex items-center gap-2 bg-muted rounded-md px-2.5 py-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-foreground' : 'bg-muted-foreground/30'}`} />
                          <span className="text-[10px] text-foreground flex-1 truncate">{notif.text}</span>
                          <span className="text-[9px] text-muted-foreground">{notif.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 4: Dashboard comisiones - Dark */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={bentoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="md:col-span-7 bg-foreground rounded-xl p-6"
              >
                <div className="flex gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                      <TrendUp className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-white/60 text-xs">Incluido</span>
                      <span className="text-white/40 text-xs">sin costo extra</span>
                    </div>
                    <h3 className="text-white text-xl font-mono uppercase font-normal mb-2">Dashboard de comisiones</h3>
                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                      Rastrea tus cierres, mide tu rendimiento y alcanza tus metas mensuales.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Métricas', 'Metas', 'Histórico', 'Exportar'].map((feature) => (
                        <span key={feature} className="px-2.5 py-1 bg-white/10 rounded-full text-white/70 text-xs font-mono uppercase font-normal">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Visual: Earnings */}
                  <div className="hidden sm:block w-[160px] flex-shrink-0">
                    <div className="bg-white rounded-xl p-3">
                      <div className="flex items-baseline gap-1.5 mb-1">
                        <span className="text-xl font-bold text-foreground">$8.9M</span>
                        <span className="text-[10px] text-[#2C7A53] font-medium">+23%</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground">Comisiones este mes</span>
                      <div className="mt-3">
                        <div className="flex justify-between text-[9px] mb-1">
                          <span className="text-muted-foreground">Meta</span>
                          <span className="text-foreground font-medium">89%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-foreground rounded-full" style={{ width: '89%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Card 5: Contratos digitales */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={bentoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="md:col-span-6 bg-white rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center mb-4">
                      <FileText className="w-5 h-5 text-sand-700" />
                    </div>
                    <h3 className="text-foreground text-lg font-mono uppercase font-normal mb-2">Contratos digitales</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Firma electrónica con validez legal. Genera contratos desde plantillas.
                    </p>
                  </div>
                  {/* Visual: Document preview */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-[70px]">
                    <div className="w-14 h-[72px] bg-muted rounded-md border border-border relative">
                      <div className="absolute top-2 left-2 right-2 space-y-1">
                        <div className="h-1 bg-foreground/10 rounded w-full" />
                        <div className="h-1 bg-foreground/10 rounded w-3/4" />
                        <div className="h-1 bg-foreground/10 rounded w-full" />
                        <div className="h-1 bg-foreground/10 rounded w-1/2" />
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <Check className="w-3.5 h-3.5 text-[#2C7A53]" />
                      </div>
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1.5">Firmado</span>
                  </div>
                </div>
              </motion.div>

              {/* Card 6: Reportes profesionales */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={bentoInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="md:col-span-6 bg-white rounded-xl p-6 border border-border"
              >
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="w-10 h-10 rounded-xl bg-sand-100 flex items-center justify-center mb-4">
                      <ChartBar className="w-5 h-5 text-sand-700" />
                    </div>
                    <h3 className="text-foreground text-lg font-mono uppercase font-normal mb-2">Reportes profesionales</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      PDFs con tu marca para impresionar a propietarios.
                    </p>
                  </div>
                  {/* Visual: Score circle */}
                  <div className="hidden sm:flex flex-col items-center justify-center w-[70px]">
                    <div className="relative">
                      <svg viewBox="0 0 56 56" className="w-[52px] h-[52px]">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#f5f5f4" strokeWidth="4" />
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#1A40FF" strokeWidth="4" strokeLinecap="round" strokeDasharray="138" strokeDashoffset={138 * (1 - 0.87)} transform="rotate(-90 28 28)" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-base font-bold text-foreground">87</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-[#2C7A53] font-medium mt-1">Aprobado</span>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </section>

        <TestimonialCarousel
          testimonials={testimonials}
          title={
            <h2 className="text-[40px] md:text-[52px] font-heading font-normal text-foreground tracking-[-0.03em] leading-[1.05] mb-10">
              Agentes que ya están{' '}
              <span className="italic">cerrando más</span>
            </h2>
          }
          cardClassName="bg-muted"
        />

        {/* FAQ — reusable component from home */}
        <FAQSection />

        {/* CTA — reusable component from home */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
