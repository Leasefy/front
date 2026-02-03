'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  Users,
  FileText,
  Star,
  Zap,
  Lock,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Search,
  BadgeCheck,
  Building2,
  CreditCard,
  Briefcase,
  Phone,
  Globe,
  ChevronRight,
  Sparkles,
  Eye,
  Activity,
  Database,
  Fingerprint,
  Scale,
  UserCheck,
  AlertCircle,
  CheckCheck,
  ArrowUpRight,
  Play,
} from 'lucide-react';

// Animated counter hook with input validation
function useCounter(end: number, duration: number = 2000, start: number = 0) {
  // Validate inputs
  const safeEnd = Number.isFinite(end) ? end : 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 2000;
  const safeStart = Number.isFinite(start) ? start : 0;

  const [count, setCount] = useState(safeStart);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / safeDuration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(safeStart + (safeEnd - safeStart) * easeOut));

      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, safeEnd, safeDuration, safeStart]);

  return { count, setIsInView };
}

// Floating particle
function Particle({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-violet-400/60"
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        y: [0, -100],
        x: [0, Math.random() * 40 - 20],
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        repeatDelay: Math.random() * 2,
      }}
    />
  );
}

// Live score dashboard mockup
function ScoreDashboard() {
  const score = useCounter(847, 2500, 300);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="relative"
      style={{ perspective: '1000px' }}
    >
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-violet-600/20 via-cyan-600/20 to-violet-600/20 rounded-3xl blur-2xl" />

      {/* Main dashboard */}
      <div className="relative bg-product-elevated/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-violet-950/50">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-white/50">EVALUACIÓN EN VIVO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Candidate header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Image
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=320&h=320&fit=crop&crop=face&q=80"
                  alt="Candidate"
                  width={56}
                  height={56}
                  className="rounded-xl ring-2 ring-violet-500/50"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1.5 }}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <CheckCheck className="w-3 h-3 text-white" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Carlos Andrés Rodríguez</h3>
                <p className="text-sm text-white/40">CC 1.020.456.789 · Bogotá</p>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2 }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30"
            >
              <span className="text-sm font-medium text-emerald-400">✓ APROBADO</span>
            </motion.div>
          </div>

          {/* Score display */}
          <div className="relative mb-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-mono text-white/40 mb-1">SCORE ARRIENDO FÁCIL</p>
                <motion.div
                  className="flex items-baseline gap-2"
                  onViewportEnter={() => score.setIsInView(true)}
                >
                  <span className="text-6xl font-bold tabular-nums bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                    {score.count}
                  </span>
                  <span className="text-lg text-white/30 font-medium">/1000</span>
                </motion.div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 mb-1">RIESGO</p>
                <span className="text-2xl font-bold text-emerald-400">BAJO</span>
              </div>
            </div>

            {/* Score bar */}
            <div className="mt-4 h-3 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '84.7%' }}
                transition={{ delay: 0.8, duration: 1.5, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-500 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </motion.div>
            </div>
          </div>

          {/* Mini metrics grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Crédito', value: 92, icon: CreditCard, color: 'violet' },
              { label: 'Empleo', value: 88, icon: Briefcase, color: 'cyan' },
              { label: 'Referencias', value: 85, icon: Users, color: 'emerald' },
              { label: 'Judicial', value: 100, icon: Scale, color: 'amber' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="relative bg-white/[0.03] rounded-xl p-3 border border-white/5 group hover:bg-white/[0.06] transition-colors"
                >
                  <Icon className="w-4 h-4 text-white/30 mb-2" />
                  <p className="text-2xl font-bold text-white tabular-nums">{item.value}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">{item.label}</p>
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
                    item.color === 'violet' ? 'from-violet-500 to-purple-500' :
                    item.color === 'cyan' ? 'from-cyan-500 to-blue-500' :
                    item.color === 'emerald' ? 'from-emerald-500 to-teal-500' :
                    'from-amber-500 to-orange-500'
                  } rounded-b-xl opacity-60`} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <motion.div
        initial={{ opacity: 0, x: 50, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 2.5 }}
        className="absolute -right-4 top-20 bg-product-elevated rounded-xl border border-white/10 p-3 shadow-xl max-w-[200px]"
      >
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-white">DataCrédito</p>
            <p className="text-[10px] text-white/40">Sin deudas en mora</p>
          </div>
        </div>
      </motion.div>

      {/* Floating particles */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
        {[...Array(6)].map((_, i) => (
          <Particle key={i} delay={i * 0.5} />
        ))}
      </div>
    </motion.div>
  );
}

// Bento grid item
function BentoItem({
  children,
  className = '',
  delay = 0,
  hover = true
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={`relative bg-product-elevated/80 backdrop-blur-sm rounded-2xl border border-white/[0.08] overflow-hidden group ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function EvaluacionPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <>
      <Navbar />
      <main className="overflow-hidden">
        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-screen flex items-center pt-20">
          {/* Background with real image */}
          <motion.div className="absolute inset-0 z-0" style={{ y: heroY }}>
            <Image
              src="/hero-5.jpg"
              alt="Modern home interior"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Dark overlays for legibility - like home page */}
            <div className="absolute inset-0 bg-black/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/40" />
          </motion.div>

          <motion.div
            className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-12"
            style={{ opacity: heroOpacity, scale: heroScale }}
          >
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
              {/* Left Content */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2"
                >
                  <span className="relative flex items-center gap-2 text-xs font-medium text-white/90 bg-white/10 backdrop-blur-2xl rounded-full pl-2 pr-4 py-1.5 border border-white/15">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                    </span>
                    Evaluación con inteligencia artificial
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.05] tracking-tight"
                >
                  Conoce a tu
                  <br />
                  inquilino{' '}
                  <span className="text-white/90">
                    antes
                  </span>
                  <br />
                  de firmar
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed"
                >
                  Evaluación crediticia, laboral y de antecedentes integrada.{' '}
                  <span className="text-white font-medium">
                    Score predictivo con 92% de precisión en menos de 24 horas.
                  </span>
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <Link href="/auth">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-foreground hover:bg-white/90 font-semibold text-base h-14 px-8 rounded-sm shadow-lg group"
                    >
                      <span>Evaluar inquilino</span>
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="#como-funciona">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent border-white/20 text-white hover:bg-white/10 font-medium text-base h-14 px-8 rounded-sm backdrop-blur-2xl group"
                    >
                      <Play className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Ver demo
                    </Button>
                  </Link>
                </motion.div>

                {/* Trust badges */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="flex items-center gap-6 pt-4"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-white/80" />
                    <span className="text-sm text-white/50">Habeas Data</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-white/80" />
                    <span className="text-sm text-white/50">Encriptado</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-white/80" />
                    <span className="text-sm text-white/50">&lt; 24h</span>
                  </div>
                </motion.div>
              </div>

              {/* Right - Dashboard mockup */}
              <div className="hidden lg:block">
                <ScoreDashboard />
              </div>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-xs text-white/30 uppercase tracking-widest">Descubre más</span>
              <div className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5">
                <motion.div
                  animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1 h-1 rounded-full bg-white/60"
                />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Stats Bar */}
        <section className="relative py-8 border-y border-white/[0.05] bg-white/[0.01]">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '50K+', label: 'Evaluaciones realizadas' },
                { value: '92%', label: 'Precisión predictiva' },
                { value: '-70%', label: 'Reducción de impagos' },
                { value: '<24h', label: 'Tiempo de respuesta' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-sm text-white/40 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento Grid - What we evaluate */}
        <section className="py-24 md:py-32 relative">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-full px-3 py-1 mb-4 border border-cyan-500/20">
                <Eye className="w-3 h-3" />
                Análisis 360°
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Todo lo que evaluamos
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                Cuatro pilares de verificación para una imagen completa
              </p>
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]">
              {/* Credit - Large */}
              <BentoItem className="md:col-span-2 md:row-span-2" delay={0}>
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent" />
                <div className="relative h-full p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">Historial Crediticio</h3>
                      <p className="text-sm text-white/40">DataCrédito · TransUnion</p>
                    </div>
                  </div>

                  {/* Mock credit data */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-white/40 mb-1">Score DataCrédito</p>
                        <p className="text-2xl font-bold text-white">712</p>
                        <span className="text-xs text-emerald-400">Bueno</span>
                      </div>
                      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                        <p className="text-xs text-white/40 mb-1">Comportamiento</p>
                        <p className="text-2xl font-bold text-emerald-400">A</p>
                        <span className="text-xs text-white/40">Excelente pago</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-white/60">Obligaciones activas</span>
                        <span className="text-sm font-medium text-white">2</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Tarjeta Bancolombia</span>
                          <span className="text-emerald-400">Al día</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Crédito Davivienda</span>
                          <span className="text-emerald-400">Al día</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                </div>
              </BentoItem>

              {/* Employment */}
              <BentoItem delay={0.1}>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-transparent" />
                <div className="relative h-full p-5 flex flex-col">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-3">
                    <Briefcase className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Estabilidad Laboral</h3>
                  <p className="text-xs text-white/40 mb-4">Empleo verificado</p>

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">Empresa</span>
                      <span className="text-white font-medium">Globant</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">Antigüedad</span>
                      <span className="text-cyan-400 font-medium">3.5 años</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/40">Contrato</span>
                      <span className="text-emerald-400 font-medium">Indefinido</span>
                    </div>
                  </div>
                </div>
              </BentoItem>

              {/* References */}
              <BentoItem delay={0.2}>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-transparent" />
                <div className="relative h-full p-5 flex flex-col">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                    <Users className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Referencias</h3>
                  <p className="text-xs text-white/40 mb-4">3 verificadas</p>

                  <div className="mt-auto">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full bg-white/10 border-2 border-product-elevated flex items-center justify-center">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-emerald-400 mt-2">
                      &ldquo;Excelente inquilino&rdquo;
                    </p>
                  </div>
                </div>
              </BentoItem>

              {/* Background check */}
              <BentoItem delay={0.3}>
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-transparent" />
                <div className="relative h-full p-5 flex flex-col">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
                    <Scale className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Antecedentes</h3>
                  <p className="text-xs text-white/40 mb-4">Verificación judicial</p>

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-white/60">Sin antecedentes penales</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-white/60">Sin procesos activos</span>
                    </div>
                  </div>
                </div>
              </BentoItem>

              {/* Identity */}
              <BentoItem delay={0.4}>
                <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 to-transparent" />
                <div className="relative h-full p-5 flex flex-col">
                  <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center mb-3">
                    <Fingerprint className="w-5 h-5 text-rose-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Identidad</h3>
                  <p className="text-xs text-white/40 mb-4">Registraduría Nacional</p>

                  <div className="mt-auto">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">Verificado</span>
                    </div>
                  </div>
                </div>
              </BentoItem>
            </div>
          </div>
        </section>

        {/* How it works - Timeline */}
        <section id="como-funciona" className="py-24 md:py-32 relative bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 rounded-full px-3 py-1 mb-4 border border-violet-500/20">
                <Activity className="w-3 h-3" />
                Proceso simple
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                De invitación a reporte
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                En menos de 24 horas
              </p>
            </motion.div>

            {/* Timeline */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/50 via-cyan-500/50 to-emerald-500/50 hidden lg:block" />

              <div className="space-y-12 lg:space-y-0">
                {[
                  {
                    number: '01',
                    title: 'Invita al candidato',
                    description: 'Genera un link único o ingresa el email del candidato. Envío automático de invitación.',
                    visual: (
                      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-violet-400" />
                          </div>
                          <span className="text-sm font-medium text-white">Nuevo link generado</span>
                        </div>
                        <code className="text-xs text-violet-300 bg-violet-500/10 px-2 py-1 rounded font-mono">
                          arriendofacil.co/e/c8f2a...
                        </code>
                      </div>
                    ),
                    color: 'violet',
                  },
                  {
                    number: '02',
                    title: 'El candidato completa',
                    description: 'El inquilino llena sus datos y autoriza la consulta. Proceso 100% digital y móvil.',
                    visual: (
                      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                        <div className="space-y-2">
                          {['Datos personales', 'Información laboral', 'Autorización consulta'].map((item, i) => (
                            <div key={item} className="flex items-center gap-2">
                              <motion.div
                                initial={{ scale: 0 }}
                                whileInView={{ scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.5 + i * 0.2 }}
                                className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center"
                              >
                                <CheckCheck className="w-3 h-3 text-cyan-400" />
                              </motion.div>
                              <span className="text-sm text-white/60">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                    color: 'cyan',
                  },
                  {
                    number: '03',
                    title: 'IA analiza todo',
                    description: 'Nuestro algoritmo cruza información de múltiples fuentes y genera un score predictivo.',
                    visual: (
                      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"
                          >
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                          </motion.div>
                          <span className="text-sm font-medium text-white">Procesando...</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: '100%' }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, delay: 0.5 }}
                          />
                        </div>
                      </div>
                    ),
                    color: 'emerald',
                  },
                  {
                    number: '04',
                    title: 'Recibe el reporte',
                    description: 'Reporte completo con score, semáforo de riesgo y recomendación clara.',
                    visual: (
                      <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-white/40 mb-1">Score final</p>
                            <p className="text-2xl font-bold text-emerald-400">847</p>
                          </div>
                          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                            <span className="text-sm font-medium text-emerald-400">APROBAR</span>
                          </div>
                        </div>
                      </div>
                    ),
                    color: 'amber',
                  },
                ].map((step, i) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative grid lg:grid-cols-2 gap-8 items-center ${i % 2 === 1 ? 'lg:text-right' : ''}`}
                  >
                    {/* Number indicator - desktop */}
                    <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-product-elevated border-2 border-white/10 items-center justify-center z-10">
                      <span className={`text-sm font-bold ${
                        step.color === 'violet' ? 'text-violet-400' :
                        step.color === 'cyan' ? 'text-cyan-400' :
                        step.color === 'emerald' ? 'text-emerald-400' :
                        'text-amber-400'
                      }`}>{step.number}</span>
                    </div>

                    {/* Content */}
                    <div className={`${i % 2 === 1 ? 'lg:order-2 lg:pl-16' : 'lg:pr-16'}`}>
                      <div className={`${i % 2 === 1 ? 'lg:text-left' : ''}`}>
                        <span className={`inline-block text-5xl font-bold mb-4 ${
                          step.color === 'violet' ? 'text-violet-500/20' :
                          step.color === 'cyan' ? 'text-cyan-500/20' :
                          step.color === 'emerald' ? 'text-emerald-500/20' :
                          'text-amber-500/20'
                        }`}>{step.number}</span>
                        <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                        <p className="text-white/50">{step.description}</p>
                      </div>
                    </div>

                    {/* Visual */}
                    <div className={`${i % 2 === 1 ? 'lg:order-1 lg:pr-16' : 'lg:pl-16'}`}>
                      {step.visual}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 md:py-32 relative">
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-full px-3 py-1 mb-4 border border-amber-500/20">
                Precios transparentes
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
                Elige tu plan
              </h2>
              <p className="text-white/40 max-w-xl mx-auto text-lg">
                Paga por evaluación, sin suscripciones
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  name: 'Básica',
                  price: '29.900',
                  description: 'Verificación rápida',
                  features: ['Consulta DataCrédito', 'Verificación de identidad', 'Score de riesgo básico', 'Reporte PDF'],
                  color: 'slate',
                  popular: false,
                },
                {
                  name: 'Completa',
                  price: '49.900',
                  description: 'La más popular',
                  features: ['Todo en Básica', 'Verificación laboral', 'Referencias personales', 'Antecedentes judiciales', 'Score IA avanzado'],
                  color: 'violet',
                  popular: true,
                },
                {
                  name: 'Premium',
                  price: '79.900',
                  description: 'Máxima seguridad',
                  features: ['Todo en Completa', 'Visita domiciliaria virtual', 'Verificación de ingresos', 'Garantía de resultado', 'Soporte prioritario'],
                  color: 'amber',
                  popular: false,
                },
              ].map((plan, i) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative rounded-2xl p-px overflow-hidden ${
                    plan.popular
                      ? 'bg-gradient-to-b from-violet-500 via-cyan-500/50 to-violet-500/0'
                      : 'bg-white/[0.08]'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                  )}

                  <div className={`relative h-full bg-product-elevated rounded-2xl p-6 ${plan.popular ? 'ring-1 ring-violet-500/20' : ''}`}>
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-gradient-to-r from-violet-600 to-cyan-600 text-white rounded-full">
                        Recomendado
                      </span>
                    )}

                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="text-sm text-white/40">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-bold text-white">${plan.price}</span>
                      <span className="text-white/40 text-sm ml-1">COP</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            plan.popular ? 'text-violet-400' : 'text-white/40'
                          }`} />
                          <span className="text-sm text-white/60">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white border-0'
                          : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                      }`}
                    >
                      Seleccionar
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/30 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)]" />

          <div className="relative max-w-4xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight">
                Arrienda con
                <span className="block bg-gradient-to-r from-violet-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  confianza
                </span>
              </h2>
              <p className="text-xl text-white/50 max-w-2xl mx-auto">
                Primera evaluación con 50% de descuento. Sin suscripción, paga por uso.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white text-product-elevated hover:bg-white/90 font-semibold text-lg h-14 px-10 rounded-sm shadow-lg shadow-white/10 group"
                  >
                    Evaluar mi primer inquilino
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4 text-sm text-white/30">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  Habeas Data
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4" />
                  256-bit SSL
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  Resultados &lt;24h
                </span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Add shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </>
  );
}
