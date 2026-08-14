'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingChrome } from "@/components/landing-v2/LandingChrome";
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { CTASection } from '@/components/home/CTASection';
import { FAQSection } from '@/components/home/FAQSection';
import { SectionLabel } from '@/components/ui/section-label';
import { Check, CheckCircle, MagnifyingGlass, Sparkle, SealCheck, FileText, MapPin, Bed, Bathtub, ArrowsOut, Clock, Shield, Infinity as InfinityIcon, PenNib, Lock, Lightning, House } from '@phosphor-icons/react';
import { BentoCard } from '@/components/home/BentoCard';
import { TestimonialCarousel } from '@/components/home/TestimonialCarousel';

// Testimonials data
const testimonials = [
  {
    quote: 'Encontré apartamento en Chapinero en solo 2 días. El Arriendo Pass me permitió postularme a 5 inmuebles sin volver a llenar formularios.',
    author: 'Andrés Pereira',
    role: 'Inquilino en Bogotá',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'Me mudé de Medellín a Bogotá por trabajo y pude postularme a inmuebles antes de llegar. El proceso fue 100% digital.',
    author: 'Laura Sánchez',
    role: 'Reubicación laboral',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'Como estudiante extranjero, pensé que sería imposible arrendar. Con mi perfil verificado, el propietario confió en mí de inmediato.',
    author: 'Nicolás Mendez',
    role: 'Estudiante universitario',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face&q=80',
  },
  {
    quote: 'La búsqueda con IA es increíble. Escribí lo que buscaba y me mostró exactamente lo que necesitaba. Firmé contrato en una semana.',
    author: 'María Fernanda López',
    role: 'Inquilina en Medellín',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
  },
];

/* ================================================================
   VISUAL 1 — Búsqueda Inteligente (HERO — 7col, DARK)
   AI search with property cards
   ================================================================ */
function MagnifyingGlassVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden px-6 py-4">
      {/* Animated glow effects */}
      <motion.div
        className="absolute top-[10%] right-[20%] w-[150px] h-[150px] bg-neutral-500/[0.08] rounded-full blur-[60px] pointer-events-none"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.08, 0.12, 0.08],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[20%] left-[10%] w-[120px] h-[120px] bg-[#1A40FF]/[0.06] rounded-full blur-[50px] pointer-events-none"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.06, 0.1, 0.06],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* MagnifyingGlass bar with typing animation */}
      <motion.div
        initial={{ y: -20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        className="w-full bg-white/10 backdrop-blur-sm px-3 py-2.5 flex items-center gap-2 border border-white/10"
      >
        <motion.div
          animate={{ rotate: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <MagnifyingGlass className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
        </motion.div>
        <span className="text-[10px] text-white/40 flex-1">Apartamento pet-friendly en Chapinero...</span>
        <motion.div
          className="bg-white text-foreground text-[8px] font-semibold px-2.5 py-1.5 flex items-center gap-1"
          animate={{ boxShadow: ["0 0 0 0 rgba(255,255,255,0)", "0 0 12px 2px rgba(255,255,255,0.2)", "0 0 0 0 rgba(255,255,255,0)"] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div animate={{ rotate: [0, 180, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
            <Sparkle className="w-2.5 h-2.5" />
          </motion.div>
          IA
        </motion.div>
      </motion.div>

      {/* AI chips with staggered pop-in */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-1.5 mt-3"
      >
        {['Pet-friendly', '2+ habitaciones', 'Cerca al metro', '< $3M'].map((tag, i) => (
          <motion.span
            key={tag}
            initial={{ scale: 0, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              delay: 0.5 + i * 0.12,
              type: "spring",
              stiffness: 300,
              damping: 15
            }}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
            className="flex items-center gap-1 text-[8px] bg-white/10 text-white/70 px-2 py-1 border border-white/10 cursor-pointer transition-colors"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.7 + i * 0.12, type: "spring", stiffness: 400 }}
            >
              <CheckCircle className="w-2.5 h-2.5 text-[#2C7A53]" />
            </motion.div>
            {tag}
          </motion.span>
        ))}
      </motion.div>

      {/* Property cards with floating effect */}
      <div className="relative mt-4">
        {/* Back card with subtle animation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 0.3, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="absolute top-1 left-2 right-2 h-[120px] bg-white/5 border border-white/5"
          style={{ transform: "scale(0.96)" }}
        />

        {/* Main card with hover lift */}
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.7, type: "spring", stiffness: 80 }}
          whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
          className="relative bg-white/10 backdrop-blur-sm border border-white/10 overflow-hidden cursor-pointer transition-shadow"
        >
          <div className="h-[60px] bg-gradient-to-br from-[#B7791F]/20 via-[#B7791F]/15 to-[#C4503B]/20 relative overflow-hidden">
            {/* Animated shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.1 }}
              className="absolute top-2 right-2 bg-white text-foreground text-[8px] font-bold px-2 py-1 flex items-center gap-1"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              >
                <Sparkle className="w-2.5 h-2.5 text-primary" />
              </motion.div>
              96% match
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute top-2 left-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm text-[7px] font-medium text-white px-1.5 py-0.5"
            >
              <MapPin className="w-2 h-2" /> Chapinero Alto
            </motion.div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-2 left-2 flex items-center gap-1 bg-[#2C7A53]/80 text-[7px] font-medium text-white px-1.5 py-0.5"
            >
              <CheckCircle className="w-2 h-2" /> Verificado
            </motion.div>
          </div>
          <div className="p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                  className="text-[11px] font-semibold text-white"
                >
                  Apartamento Moderno
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-[8px] text-white/40 mt-0.5"
                >
                  Bogotá · Arriendo
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: "spring" }}
                className="text-right"
              >
                <div className="text-[14px] font-bold text-white">$2.8M</div>
                <div className="text-[7px] text-white/40">/ mes</div>
              </motion.div>
            </div>
            <div className="flex gap-3 mt-2">
              {[
                { icon: Bed, label: "2 hab" },
                { icon: Bathtub, label: "2 baños" },
                { icon: ArrowsOut, label: "72m²" },
              ].map(({ icon: Icon, label }, i) => (
                <motion.span
                  key={label}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + i * 0.1 }}
                  className="flex items-center gap-1 text-[7px] text-white/50"
                >
                  <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
                  {label}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        className="text-center mt-3 text-[8px] text-white/30"
      >
        <motion.span
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          24 propiedades encontradas
        </motion.span>
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 2 — Arriendo Pass (5col)
   Premium pass card with benefits
   ================================================================ */
function ArriendoPassVisual() {
  return (
    <div className="relative w-full h-full overflow-hidden px-4 pt-4">
      {/* Pass card with 3D tilt effect */}
      <motion.div
        initial={{ y: 20, opacity: 0, rotateX: 15, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, rotateX: 0, scale: 1 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 80 }}
        whileHover={{
          y: -4,
          boxShadow: "0 25px 50px rgba(124, 58, 237, 0.4)",
          rotateX: -2,
        }}
        className="bg-gradient-to-br from-primary via-primary to-[#6B6B6B] p-4 relative overflow-hidden cursor-pointer"
        style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
      >
        {/* Animated decorative circles */}
        <motion.div
          className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-6 -left-6 w-20 h-20 bg-white/5 rounded-full"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          animate={{ x: ["-200%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 3 }}
        />

        <div className="relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex items-center gap-2 mb-3"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
            >
              <SealCheck className="w-5 h-5 text-white" />
            </motion.div>
            <span className="text-[13px] font-bold text-white">Arriendo Pass</span>
          </motion.div>

          <div className="space-y-2 mb-4">
            {[
              { icon: InfinityIcon, label: "Aplicaciones ilimitadas" },
              { icon: Clock, label: "Válido 60 días" },
              { icon: Shield, label: "Perfil verificado" },
              { icon: Lightning, label: "Prioridad con propietarios" },
            ].map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.4 + i * 0.12,
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
                whileHover={{ x: 4, color: "rgba(255,255,255,1)" }}
                className="flex items-center gap-2 text-[9px] text-white/80 cursor-pointer transition-colors"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5 + i * 0.12, type: "spring", stiffness: 300 }}
                >
                  <Icon className="w-3 h-3" />
                </motion.div>
                {label}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="pt-3 border-t border-white/20"
          >
            <div className="flex items-baseline gap-1">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
                className="text-[28px] font-bold text-white"
              >
                $59.900
              </motion.span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-[10px] text-white/60"
              >
                COP
              </motion.span>
            </div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-[8px] text-white/50"
            >
              Pago único · Sin renovación automática
            </motion.span>
          </motion.div>
        </div>
      </motion.div>

      {/* Comparison with pop effect */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
        whileHover={{ scale: 1.02 }}
        className="mt-3 p-3 bg-muted/50 cursor-pointer transition-transform"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] text-muted-foreground block">Evaluación Completa individual</span>
            <span className="text-[8px] text-muted-foreground/60">$39.900 × postulación</span>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
            className="text-right"
          >
            <span className="text-[9px] font-semibold text-[#2C7A53] block">Aplica a 3+ y ahorras</span>
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-[12px] font-bold text-[#2C7A53] inline-block"
            >
              $59.800+
            </motion.span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 3 — Propiedades Verificadas (5col, outline)
   Verification checklist
   ================================================================ */
function VerifiedVisual() {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-5">
      {/* Property preview with hover effect */}
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        whileHover={{ scale: 1.02, y: -2 }}
        className="w-full bg-white overflow-hidden cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <div className="h-[50px] bg-gradient-to-br from-[#1A40FF] via-[#1A40FF] to-[#1A40FF] relative flex items-center justify-center overflow-hidden">
          {/* Animated shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          />
          <motion.span
            className="text-[20px]"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            🏠
          </motion.span>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
            className="absolute top-2 right-2 bg-[#2C7A53] text-white text-[7px] font-bold px-1.5 py-0.5 flex items-center gap-0.5"
          >
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <CheckCircle className="w-2 h-2" />
            </motion.div>
            100%
          </motion.div>
        </div>
        <div className="p-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[10px] font-semibold text-foreground mb-0.5"
          >
            Apto Chapinero Alto
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[8px] text-muted-foreground"
          >
            $2.800.000/mes · 2 hab
          </motion.div>
        </div>
      </motion.div>

      {/* Verification steps with enhanced animations */}
      <div className="w-full mt-3 space-y-2">
        {[
          { label: "Propietario verificado", check: true, delay: 0.4 },
          { label: "Fotos reales confirmadas", check: true, delay: 0.55 },
          { label: "Precio sin sorpresas", check: true, delay: 0.7 },
          { label: "Visita garantizada", check: true, delay: 0.85 },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: item.delay,
              type: "spring",
              stiffness: 150,
              damping: 15
            }}
            whileHover={{ x: 4, backgroundColor: "rgba(16,185,129,0.05)" }}
            className="flex items-center gap-2 p-2 cursor-pointer transition-colors rounded"
            style={{ borderBottom: i < 3 ? "1px solid rgba(0,0,0,0.04)" : "none" }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: item.delay + 0.15,
                type: "spring",
                stiffness: 400,
                damping: 10
              }}
              className="w-5 h-5 rounded-full bg-[#E8F3EC] flex items-center justify-center flex-shrink-0"
            >
              <CheckCircle className="w-3 h-3 text-[#2C7A53]" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: item.delay + 0.2 }}
              className="text-[10px] text-foreground"
            >
              {item.label}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Badge with pulse effect */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.1, type: "spring" }}
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-[#E8F3EC] cursor-pointer"
        style={{ border: "1px solid rgba(16,185,129,0.15)" }}
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 0 4px rgba(16,185,129,0.2)", "0 0 0 0 rgba(16,185,129,0)"]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="rounded-full"
        >
          <Shield className="w-3 h-3 text-[#2C7A53]" />
        </motion.div>
        <span className="text-[8px] font-semibold text-[#2C7A53]">Cero estafas garantizado</span>
      </motion.div>
    </div>
  );
}

/* ================================================================
   VISUAL 4 — Contratos Digitales (7col)
   Contract signing flow
   ================================================================ */
function ContractVisual() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSigned(true), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col justify-center overflow-hidden px-6">
      {/* Timeline with connecting lines */}
      <div className="flex items-center gap-2 mb-4 relative">
        {/* Connecting line */}
        <motion.div
          className="absolute top-3 left-3 right-3 h-[2px] bg-muted -z-10"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ transformOrigin: "left" }}
        />
        {[
          { label: "Revisión", done: true },
          { label: "Firma inquilino", done: signed },
          { label: "Firma propietario", done: false },
          { label: "Activo", done: false },
        ].map((step, i) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 200 }}
            className="flex-1 flex flex-col items-center"
          >
            <motion.div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold transition-colors duration-300 ${
                step.done ? 'bg-[#2C7A53] text-white' : 'bg-muted text-muted-foreground'
              }`}
              animate={step.done ? {
                scale: [1, 1.2, 1],
                boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 0 6px rgba(16,185,129,0.2)", "0 0 0 0 rgba(16,185,129,0)"]
              } : {}}
              transition={{ duration: 0.5 }}
            >
              {step.done ? (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <CheckCircle className="w-3 h-3" />
                </motion.div>
              ) : i + 1}
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-[7px] text-muted-foreground mt-1 text-center"
            >
              {step.label}
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Contract card with hover effect */}
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        whileHover={{ y: -3, boxShadow: "0 15px 30px rgba(0,0,0,0.1)" }}
        className="bg-white overflow-hidden relative cursor-pointer"
        style={{ border: "1px solid rgba(0,0,0,0.08)" }}
      >
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
          </motion.div>
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-[11px] font-medium text-foreground"
            >
              Contrato de Arrendamiento
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[8px] text-muted-foreground"
            >
              Ley 820/2003 · Válido legalmente
            </motion.div>
          </div>
          <motion.div
            key={signed ? "signed" : "pending"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
            className={`text-[8px] font-semibold px-2 py-1 ${
              signed ? 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]' : 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]'
            }`}
          >
            {signed ? '✓ Firmado' : 'Tu turno'}
          </motion.div>
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              { l: "Canon mensual", v: "$2.800.000" },
              { l: "Duración", v: "12 meses" },
              { l: "Depósito", v: "1 mes" },
              { l: "Inicio", v: "1 Feb 2026" },
            ].map((item, i) => (
              <motion.div
                key={item.l}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex justify-between"
              >
                <span className="text-[9px] text-muted-foreground">{item.l}</span>
                <span className="text-[9px] font-medium text-foreground">{item.v}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Signature area with enhanced animation */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <motion.div
            className="h-10 flex items-center justify-center relative overflow-hidden"
            style={{ border: "1px dashed rgba(0,0,0,0.1)" }}
            whileHover={!signed ? { borderColor: "rgba(0,0,0,0.3)" } : {}}
          >
            {!signed ? (
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-1.5"
              >
                <motion.div
                  animate={{ y: [0, -2, 0], rotate: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <PenNib className="w-3 h-3 text-muted-foreground" />
                </motion.div>
                <span className="text-[9px] text-muted-foreground">Toca para firmar</span>
              </motion.div>
            ) : (
              <motion.svg width="100" height="20" viewBox="0 0 110 24" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.path
                  d="M8 18 Q18 4 28 14 Q38 24 48 10 Q58 2 68 12 Q78 20 88 8 L100 6"
                  fill="none" stroke="hsl(var(--neutral-900))" strokeWidth="1.5" strokeLinecap="round" opacity={0.5}
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8 }}
                />
              </motion.svg>
            )}
          </motion.div>
        </div>

        {/* Seal stamp with bounce effect */}
        <AnimatePresence>
          {signed && (
            <motion.div
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              exit={{ scale: 0, rotate: 30, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="absolute top-3 right-3"
            >
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-[#2C7A53]/30 flex items-center justify-center bg-[#E8F3EC]/80"
                animate={{
                  boxShadow: ["0 0 0 0 rgba(16,185,129,0)", "0 0 15px 3px rgba(16,185,129,0.3)", "0 0 0 0 rgba(16,185,129,0)"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle className="w-5 h-5 text-[#2C7A53]" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Pills with stagger */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex gap-2 mt-3"
      >
        {[{ icon: Lock, label: "Encriptado" }, { icon: Lightning, label: "Firma en 30 seg" }].map(({ icon: Icon, label }, i) => (
          <motion.span
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.02)" }}
            className="flex items-center gap-1 text-[8px] font-medium text-muted-foreground px-2 py-1 cursor-pointer transition-colors"
            style={{ border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <Icon className="w-2.5 h-2.5" />
            {label}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

export default function InquilinosPage() {
  return (
    <LandingChrome>
      <main className="overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-[600px] overflow-hidden bg-black">
          <Image
            src="/hero-2.jpg"
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
                  <MagnifyingGlass className="w-3.5 h-3.5" />
                  +2,500 propiedades verificadas
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-white tracking-[-0.03em] leading-[1.1]"
                >
                  Encuentra tu hogar
                  <span className="block mt-2 text-white/90">sin estrés</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="!mt-2 text-lg text-white/70 max-w-lg"
                >
                  Inmuebles verificados, postulación simple, contratos claros.
                  <span className="text-white font-medium"> Cero estafas, cero sorpresas.</span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-3 pt-2"
                >
                  <Link href="/propiedades">
                    <Button size="lg" variant="white" className="w-full sm:w-auto h-12 px-6">
                      Ver propiedades
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 h-12 px-6"
                    >
                      Crear perfil gratis
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
                    { value: '100%', label: 'Verificadas' },
                    { value: '24h', label: 'Respuesta' },
                    { value: '4.8', label: 'Satisfacción' },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl md:text-3xl font-bold text-white font-mono tabular-nums">{stat.value}</p>
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
                    className="bg-white/10 backdrop-blur-2xl rounded-xl border border-white/15 p-5 w-[300px]"
                  >
                    {/* Header with profile */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.4 }}
                      className="flex items-center gap-3 mb-5 pb-4 border-b border-white/10"
                    >
                      <Image
                        src="/images/people/woman-laptop-kitchen.jpg"
                        alt="Inquilina feliz"
                        width={44}
                        height={44}
                        className="rounded-xl object-cover ring-2 ring-white/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-[14px]">María López</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2C7A53]" />
                          <p className="text-white/50 text-[11px]">Inquilina verificada</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Main Pass card */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="bg-white/10 backdrop-blur-sm rounded-md p-4 border border-white/10 mb-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-white/50 text-[11px]">Arriendo Pass</span>
                        <span className="inline-flex items-center gap-1 text-[#2C7A53] text-[11px] font-medium bg-[#2C7A53]/10 px-2 py-0.5 rounded-full">
                          <InfinityIcon className="w-3 h-3" />
                          60 días
                        </span>
                      </div>
                      <p className="text-[20px] font-bold text-white tracking-tight">Aplicaciones ilimitadas</p>
                    </motion.div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.4 }}
                        className="bg-white/10 backdrop-blur-sm rounded-md p-3 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3.5 h-3.5 text-white/40" />
                          <p className="text-[10px] text-white/50">Aplicaciones</p>
                        </div>
                        <p className="text-xl font-bold text-white">12</p>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.4 }}
                        className="bg-white/10 backdrop-blur-sm rounded-md p-3 border border-white/10"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <House className="w-3.5 h-3.5 text-white/40" />
                          <p className="text-[10px] text-white/50">Favoritos</p>
                        </div>
                        <p className="text-xl font-bold text-white">3</p>
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* Floating notification */}
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute -bottom-5 -left-4 bg-white rounded-xl p-3.5 border border-border-faint"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                        <House className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-foreground">¡Nueva propiedad!</p>
                        <p className="text-[11px] text-muted-foreground">Chapinero · $1.8M/mes</p>
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
                  Buscar arriendo es <span className="italic">agotador</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Estafas, rechazos sin explicación, procesos interminables. El sistema actual no está de tu lado.
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row - Image Cards with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
              {/* Card 1 - Estafas */}
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
                  <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Estafas
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    8 de 10
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    han visto anuncios falsos
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Fotos robadas, precios irreales, propiedades que no existen
                  </p>
                </div>
              </motion.div>

              {/* Card 2 - Rechazos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-4.jpg"
                  alt="Espacio moderno"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Rechazos
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    3 veces
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    rechazado sin explicación
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Criterios subjetivos y sesgos que nadie explica
                  </p>
                </div>
              </motion.div>

              {/* Card 3 - Tiempo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative h-[420px] rounded-xl overflow-hidden group"
              >
                <Image
                  src="/hero-6.jpg"
                  alt="Habitación moderna"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
                <div className="absolute top-5 left-5">
                  <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                    Tiempo
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-[64px] md:text-[72px] font-heading font-light text-white leading-none tracking-tight mb-2">
                    47 días
                  </p>
                  <p className="text-[15px] font-medium text-white/90 mb-1">
                    promedio para encontrar
                  </p>
                  <p className="text-[13px] text-white/60 leading-relaxed">
                    Documentos, visitas, negociaciones interminables
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Robottom Row - Illustration Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Card 4 - Scam Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                {/* Widget Illustration */}
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl p-4 w-[200px] border border-border-faint">
                    <div className="aspect-video bg-surface-muted rounded-md mb-3 flex items-center justify-center">
                      <span className="text-[10px] text-fg-subtle">Foto no disponible</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-medium text-foreground">Apto Chapinero</span>
                      <span className="text-[10px] text-[#C4503B] font-medium">¿Real?</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-foreground">$800.000</span>
                      <span className="text-[9px] text-muted-foreground line-through">$2.5M valor real</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#C4503B] rounded-full flex items-center justify-center text-white uppercase tracking-wide font-mono font-bold text-sm">
                    !
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}Precio demasiado bueno{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Anuncios falsos con precios irreales para capturar tu dinero. Sin verificación, estás solo.
                  </p>
                </div>
              </motion.div>

              {/* Card 5 - Paperwork Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="bg-sand-50 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-center min-h-[280px]"
              >
                {/* Widget Illustration */}
                <div className="flex-shrink-0 relative">
                  <div className="bg-white rounded-xl p-4 w-[200px] border border-border-faint">
                    <p className="text-[11px] font-medium text-foreground mb-3">Documentos requeridos</p>
                    <div className="space-y-2">
                      {[
                        'Carta laboral',
                        'Extractos bancarios',
                        'Referencias personales',
                        'Codeudor con finca raíz',
                        'Declaración de renta',
                      ].map((doc, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border border-border flex items-center justify-center">
                            {i < 2 && <Check className="w-2.5 h-2.5 text-[#2C7A53]" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 bg-[#B7791F] text-white text-[9px] font-medium px-2 py-1 rounded-full">
                    +15 más
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    {'"'}Necesitas un codeudor{'"'}
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Requisitos infinitos que varían en cada propiedad. Un proceso diseñado para excluir.
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
                  Todo pensado para <span className="italic">encontrar tu hogar</span>
                </h2>
                <div className="flex items-start pl-0 lg:pl-6 pt-2">
                  <p className="text-[15px] text-muted-foreground leading-relaxed">
                    Búsqueda con IA, inmuebles verificados, postulación simple y contratos claros. Todo desde una app.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5">
              {/* Large Card - Búsqueda con IA */}
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
                    <MagnifyingGlass className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-[28px] md:text-[32px] font-mono uppercase font-normal text-white leading-tight mb-3">
                    Búsqueda con IA
                  </h3>
                  <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
                    Describe lo que buscas en lenguaje natural. Nuestra IA encuentra propiedades que realmente te interesan.
                  </p>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2 mt-6">
                  {['Filtros inteligentes', 'Alertas automáticas', 'Mapa interactivo'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - Arriendo Pass */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-border-faint"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <SealCheck className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    Arriendo Pass
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Paga una vez, postulate sin límite por 60 días. Sin repetir documentos.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Aplicaciones ilimitadas', '60 días', 'Sin repetir docs'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-surface-muted px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Small Card - 100% Verificado */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="md:col-span-5 bg-white rounded-xl p-8 min-h-[360px] flex flex-col justify-between border border-border-faint"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#E8F3EC] flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-[#2C7A53]" />
                  </div>
                  <h3 className="text-[24px] md:text-[28px] font-mono uppercase font-normal text-foreground leading-tight mb-3">
                    100% Verificado
                  </h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    Cada propiedad verificada. Fotos reales, precios reales, cero estafas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-6">
                  {['Fotos verificadas', 'Visitas reales', 'Cero estafas'].map((item, i) => (
                    <span key={i} className="text-[12px] font-mono uppercase font-normal text-muted-foreground bg-surface-muted px-3 py-1.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Large Card - Contratos Digitales */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="md:col-span-7 relative rounded-xl overflow-hidden min-h-[360px] group"
              >
                <Image
                  src="/hero-7.jpg"
                  alt="Espacio moderno"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[28px] md:text-[32px] font-mono uppercase font-normal text-white leading-tight mb-3">
                      Contratos Digitales
                    </h3>
                    <p className="text-[15px] text-white/70 leading-relaxed max-w-md mb-6">
                      Firma desde tu celular con validez legal. Sabes exactamente qué firmas, sin letra pequeña.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['Firma electrónica', 'Ley 820', '100% legal'].map((item, i) => (
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
                Inquilinos que encontraron su hogar
              </h2>
            </>
          }
        />

        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </LandingChrome>
  );
}
